#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_LOG_BYTES = 256_000;
const MAX_TIMEOUT_MS = 300_000;

/** Return the named section from the living plan without interpreting its status. */
export function readTaskBlocks (markdown) {
  const blocks = new Map();
  const tasksStart = /^## Tasks\s*$/m.exec(markdown);
  if (!tasksStart) throw new Error('Living plan has no Tasks section');
  const sectionStart = tasksStart.index + tasksStart[0].length;
  const nextSection = /^## (?!#).+$/m.exec(markdown.slice(sectionStart));
  const tasks = markdown.slice(sectionStart, nextSection ? sectionStart + nextSection.index : undefined);
  const headers = [...tasks.matchAll(/^### (.+)$/gm)];
  for (let index = 0; index < headers.length; index += 1) {
    const heading = headers[index][1].trim();
    const start = headers[index].index + headers[index][0].length;
    const end = headers[index + 1]?.index ?? tasks.length;
    const body = tasks.slice(start, end);
    blocks.set(heading, {
      state: body.match(/^\*\*State:\*\* (.+)$/m)?.[1] ?? 'Not recorded',
      owner: body.match(/^\*\*Owner:\*\* (.+)$/m)?.[1] ?? 'Not assigned',
      nextProof: body.match(/^\*\*Next (?:proof|check):\*\* (.+)$/m)?.[1] ?? 'Not recorded'
    });
  }
  return blocks;
}

/** Keep scenario paths inside the selected repository. */
export function resolveInside (root, relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error(`Absolute path is not allowed: ${relativePath}`);
  const resolved = path.resolve(root, relativePath);
  const fromRoot = path.relative(root, resolved);
  if (fromRoot === '..' || fromRoot.startsWith(`..${path.sep}`)) {
    throw new Error(`Path leaves repository: ${relativePath}`);
  }
  return resolved;
}

function appendCapped (previous, chunk) {
  if (Buffer.byteLength(previous) >= MAX_LOG_BYTES) return previous;
  const remaining = MAX_LOG_BYTES - Buffer.byteLength(previous);
  return previous + chunk.toString('utf8').slice(0, remaining);
}

/** Run one declared command without invoking a shell. */
export function runCommand (argv, cwd, timeoutMs) {
  return new Promise(resolve => {
    const start = Date.now();
    let output = '';
    let timedOut = false;
    let failure = null;
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      shell: false,
      env: { ...process.env, CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.stdout.on('data', chunk => { output = appendCapped(output, chunk); });
    child.stderr.on('data', chunk => { output = appendCapped(output, chunk); });
    child.on('error', error => { failure = error.message; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);
    child.on('close', code => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        elapsedMs: Date.now() - start,
        timedOut,
        failure,
        output
      });
    });
  });
}

function validateManifest (manifest) {
  if (manifest.version !== 1 || !Array.isArray(manifest.scenarios)) {
    throw new Error('Manifest must have version 1 and a scenarios list');
  }
  const ids = new Set();
  for (const scenario of manifest.scenarios) {
    if (!/^[a-z0-9-]+$/.test(scenario.id) || ids.has(scenario.id)) {
      throw new Error(`Scenario ID is invalid or duplicated: ${scenario.id}`);
    }
    ids.add(scenario.id);
    if (typeof scenario.title !== 'string' || typeof scenario.handoffHeading !== 'string'
      || typeof scenario.liveProof !== 'string' || !Array.isArray(scenario.checks)) {
      throw new Error(`Scenario is incomplete: ${scenario.id}`);
    }
    for (const check of scenario.checks) {
      if (!Array.isArray(check.argv) || !check.argv.length
        || check.argv.some(value => typeof value !== 'string' || value.length === 0)
        || typeof check.cwd !== 'string' || !Array.isArray(check.requires)) {
        throw new Error(`Check is incomplete: ${scenario.id}`);
      }
      if (check.timeoutMs !== undefined
        && (!Number.isInteger(check.timeoutMs) || check.timeoutMs < 1 || check.timeoutMs > MAX_TIMEOUT_MS)) {
        throw new Error(`Check timeout is invalid: ${scenario.id}`);
      }
    }
  }
}

function escapeCell (value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

/** Produce a concise report that never equates a passing code check with live acceptance. */
export function renderReport (result) {
  const lines = [
    `# Virtual QA: ${result.name}`,
    '',
    `Generated: ${result.generatedAt}`,
    `Code under test: \`${result.repo}\` (${result.revision}${result.dirty ? ', uncommitted changes' : ''})`,
    '',
    `**Automated:** ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.notRun} not run.`,
    `**Live product proof:** See each scenario below. This report does not mark product work Done.`,
    '',
    '| Scenario | Automated check | Recorded state | Owner |',
    '| --- | --- | --- | --- |'
  ];
  for (const scenario of result.scenarios) {
    lines.push(`| ${escapeCell(scenario.title)} | ${scenario.automated} | ${escapeCell(scenario.task.state)} | ${escapeCell(scenario.task.owner)} |`);
  }
  if (result.unmappedTasks.length) {
    lines.push('', '## Living-plan tasks without a QA scenario', '',
      'These remain visible until someone maps a check or explicitly scopes them out.', '');
    for (const task of result.unmappedTasks) lines.push(`- ${task}`);
  }
  lines.push('', '## Evidence and next proof', '');
  for (const scenario of result.scenarios) {
    lines.push(`### ${scenario.title}`, '',
      `- **Automated result:** ${scenario.automated}${scenario.reason ? ` — ${scenario.reason}` : ''}.`,
      `- **Live proof required:** ${scenario.liveProof}`,
      `- **Living-plan next proof:** ${scenario.task.nextProof}`);
    for (const check of scenario.checks) {
      lines.push(`- **Check:** \`${check.argv.join(' ')}\` — ${check.status}${check.elapsedMs !== undefined ? ` (${(check.elapsedMs / 1000).toFixed(1)} s)` : ''}${check.log ? `; [log](${check.log})` : ''}.`);
    }
    lines.push('');
  }
  lines.push('The recorded task state comes from the living handoff. Automated checks prove only the named code behavior; a real-room observation and human acceptance stay separate.', '');
  return lines.join('\n');
}

/** An all-unmapped manifest is an incomplete setup, not a successful QA run. */
export function exitCodeForSummary (summary) {
  return summary.failed > 0 ? 1 : summary.passed === 0 ? 3 : 0;
}

function gitState (root) {
  try {
    const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim().length > 0;
    return { revision, dirty };
  } catch {
    return { revision: 'revision unknown', dirty: false };
  }
}

/** Execute the manifest against a checkout and write private local evidence. */
export async function runQa ({ repo, manifestPath, handoffPath, outDir, execute = runCommand }) {
  const root = path.resolve(repo);
  const output = path.resolve(outDir);
  const sourceState = gitState(root);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const taskBlocks = readTaskBlocks(await readFile(handoffPath, 'utf8'));
  validateManifest(manifest);
  await mkdir(output, { recursive: true });
  const scenarios = [];
  for (const scenario of manifest.scenarios) {
    const task = taskBlocks.get(scenario.handoffHeading);
    if (!task) throw new Error(`Living-plan task is missing: ${scenario.handoffHeading}`);
    const checks = [];
    for (const check of scenario.checks) {
      const cwd = resolveInside(root, check.cwd);
      const missing = check.requires.filter(file => !existsSync(resolveInside(root, file)));
      if (missing.length) {
        checks.push({ argv: check.argv, status: 'NOT RUN', reason: `Missing ${missing.join(', ')}` });
        continue;
      }
      const outcome = await execute(check.argv, cwd, check.timeoutMs ?? 120_000);
      const status = outcome.exitCode === 0 && !outcome.timedOut ? 'PASS' : 'FAIL';
      const log = `logs/${scenario.id}-${checks.length + 1}.txt`;
      await mkdir(path.join(output, 'logs'), { recursive: true });
      await writeFile(path.join(output, log), outcome.output || outcome.failure || '', 'utf8');
      checks.push({
        argv: check.argv,
        status,
        elapsedMs: outcome.elapsedMs,
        exitCode: outcome.exitCode,
        timedOut: outcome.timedOut,
        reason: outcome.failure ?? (outcome.timedOut ? 'Timed out' : undefined),
        log
      });
    }
    const automated = checks.some(check => check.status === 'FAIL') ? 'FAIL'
      : checks.length === 0 || checks.some(check => check.status === 'NOT RUN') ? 'NOT RUN' : 'PASS';
    scenarios.push({
      id: scenario.id,
      title: scenario.title,
      liveProof: scenario.liveProof,
      automated,
      reason: automated === 'NOT RUN' && !checks.length ? 'No automated check is defined' : undefined,
      task,
      checks
    });
  }
  const mapped = new Set(manifest.scenarios.map(scenario => scenario.handoffHeading));
  const unmappedTasks = [...taskBlocks.entries()]
    .filter(([heading, task]) => task.state !== 'Not recorded' && !mapped.has(heading))
    .map(([heading]) => heading);
  const result = {
    name: manifest.name || 'Project check',
    generatedAt: new Date().toISOString(),
    repo: root,
    ...sourceState,
    unmappedTasks,
    summary: {
      passed: scenarios.filter(scenario => scenario.automated === 'PASS').length,
      failed: scenarios.filter(scenario => scenario.automated === 'FAIL').length,
      notRun: scenarios.filter(scenario => scenario.automated === 'NOT RUN').length
    },
    scenarios
  };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(result, null, 2) + '\n');
  await writeFile(path.join(output, 'report.md'), renderReport(result));
  return result;
}

function parseArgs (args) {
  const options = {
    repo: process.cwd(),
    manifestPath: path.join(here, 'scenarios.json'),
    handoffPath: path.resolve(here, '..', 'TEAM_STATUS_HANDOFF.md'),
    outDir: path.join(process.cwd(), 'virtual-qa-output')
  };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!value || !['--repo', '--manifest', '--handoff', '--out'].includes(key)) {
      throw new Error('Usage: node runner.mjs [--repo PATH] [--manifest PATH] [--handoff PATH] [--out PATH]');
    }
    options[{ '--repo': 'repo', '--manifest': 'manifestPath', '--handoff': 'handoffPath', '--out': 'outDir' }[key]] = value;
  }
  return options;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const result = await runQa(parseArgs(process.argv.slice(2)));
    process.stdout.write(`Virtual QA: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.notRun} not run\n`);
    process.exitCode = exitCodeForSummary(result.summary);
  } catch (error) {
    process.stderr.write(`Virtual QA could not run: ${error.message}\n`);
    process.exitCode = 2;
  }
}
