#!/usr/bin/env python3
"""Record shared-branch code activity in VIRTUAL_PM.md after GitHub pushes.

Only activity and a mapped task's Working state are inferred from changed code.
This never marks a task Done or changes product decisions or acceptance proof.
"""

from __future__ import annotations

import json
import os
from fnmatch import fnmatch
from pathlib import Path
import re
import subprocess
import time


CONFIG_PATH = Path(".virtual-pm.json")
SYNC_RE = re.compile(r"<!-- virtual-pm-synced: ([0-9a-f]{40}) -->")
START = "<!-- virtual-pm-activity:start -->"
END = "<!-- virtual-pm-activity:end -->"
LATEST = "**Latest code activity (automatic):**"
SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
REPO_RE = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\Z")
IGNORED_SUFFIXES = (".md", ".lock")
IGNORED_NAMES = {"package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml"}


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args], check=check, capture_output=True, text=True
    )


def validate_sha(sha: str) -> str:
    if not SHA_RE.fullmatch(sha):
        raise ValueError("Invalid Virtual PM sync revision")
    return sha


def load_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text())
    if config.get("version") != 1:
        raise ValueError("Unsupported Virtual PM configuration")
    if not REPO_RE.fullmatch(config.get("repository", "")):
        raise ValueError("Invalid GitHub repository in Virtual PM configuration")
    branch = config.get("branch")
    if not isinstance(branch, str) or not branch or "\n" in branch:
        raise ValueError("Invalid branch in Virtual PM configuration")
    if git("check-ref-format", "--branch", branch, check=False).returncode:
        raise ValueError("Invalid Git branch in Virtual PM configuration")
    plan = config.get("plan")
    if plan != "VIRTUAL_PM.md":
        raise ValueError("Unexpected Virtual PM plan path")
    tasks = config.get("tasks")
    if not isinstance(tasks, dict):
        raise ValueError("Virtual PM task map must be an object")
    for title, patterns in tasks.items():
        if not isinstance(title, str) or not isinstance(patterns, list) or not all(
            isinstance(pattern, str) for pattern in patterns
        ):
            raise ValueError("Virtual PM task mapping is malformed")
    return config


def changed_paths(base: str, head: str) -> list[str]:
    validate_sha(base)
    validate_sha(head)
    if git("cat-file", "-e", f"{base}^{{commit}}", check=False).returncode:
        git("fetch", "--no-tags", "--filter=blob:none", "--depth=1", "origin", base)
    if git("merge-base", "--is-ancestor", base, head, check=False).returncode:
        raise ValueError("Virtual PM marker is not an ancestor of this branch")
    result = git("diff", "--name-only", "--diff-filter=ACMRD", base, head, "--")
    return sorted(set(result.stdout.splitlines()))


def code_paths(paths: list[str]) -> list[str]:
    return [
        path for path in paths
        if not path.startswith(".github/")
        and not path.startswith(".virtual-pm")
        and path != "VIRTUAL_PM.md"
        and Path(path).name not in IGNORED_NAMES
        and not path.endswith(IGNORED_SUFFIXES)
    ]


def task_matches(paths: list[str], tasks: dict[str, list[str]]) -> dict[str, list[str]]:
    return {
        title: [path for path in paths if any(fnmatch(path, pattern) for pattern in patterns)]
        for title, patterns in tasks.items()
        if any(any(fnmatch(path, pattern) for pattern in patterns) for path in paths)
    }


def update_task(content: str, title: str, activity: str) -> str:
    heading = f"### {title}\n"
    start_at = content.find("## Tasks")
    if start_at < 0:
        raise ValueError("Virtual PM plan has no Tasks section")
    start = content.find(heading, start_at)
    if start < 0:
        raise ValueError(f"Virtual PM task heading is missing: {title}")
    end = content.find("\n## ", start + len(heading))
    other_task = content.find("\n### ", start + len(heading))
    if end < 0 or (other_task >= 0 and other_task < end):
        end = other_task
    if end < 0:
        raise ValueError(f"Virtual PM task has no closing heading: {title}")
    block = content[start:end]
    if block.count(LATEST) != 1:
        raise ValueError(f"Virtual PM task must have one activity line: {title}")
    block = re.sub(
        r"^\*\*Latest code activity \(automatic\):\*\*.*$",
        f"{LATEST} {activity}", block, count=1, flags=re.MULTILINE,
    )
    block = re.sub(
        r"^\*\*State:\*\* (?:Open|To do)\.?$",
        "**State:** Working — code changed; acceptance proof pending.",
        block, count=1, flags=re.MULTILINE,
    )
    return content[:start] + block + content[end:]


def render_plan(content: str, head: str, paths: list[str], config: dict) -> str:
    validate_sha(head)
    markers = SYNC_RE.findall(content)
    if len(markers) != 1 or content.count(START) != 1 or content.count(END) != 1:
        raise ValueError("Virtual PM plan has missing or duplicate sync markers")
    base = markers[0]
    if base == head:
        return content
    relevant = code_paths(paths)
    if not relevant:
        return content
    url = f"https://github.com/{config['repository']}/compare/{base}...{head}"
    mapped = task_matches(relevant, config["tasks"])
    for title, matching in mapped.items():
        content = update_task(
            content, title,
            f"[Shared-branch change]({url}) touched {len(matching)} matching file(s). "
            "Acceptance proof is still required.",
        )
    unmatched = len(set(relevant) - {path for matches in mapped.values() for path in matches})
    areas = ", ".join(mapped) or "Unmapped code activity"
    extra = f"; {unmatched} file(s) need task mapping" if unmatched else ""
    entry = (
        f"- [Shared-branch code change]({url}) — {len(relevant)} code file(s); "
        f"{areas}{extra}. This records activity, not product completion."
    )
    start = content.index(START) + len(START)
    end = content.index(END, start)
    previous = [line for line in content[start:end].splitlines() if line.startswith("- ")]
    content = content[:start] + "\n" + "\n".join([entry, *previous[:14]]) + "\n" + content[end:]
    return SYNC_RE.sub(f"<!-- virtual-pm-synced: {head} -->", content, count=1)


def sync_branch(config: dict, attempts: int = 4) -> bool:
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get(
        "GITHUB_REPOSITORY"
    ) != config["repository"]:
        raise RuntimeError(
            "Virtual PM sync only runs in GitHub Actions for this repository"
        )
    branch = config["branch"]
    plan = Path(config["plan"])
    for attempt in range(attempts):
        git("fetch", "--no-tags", "--filter=blob:none", "origin", branch)
        git("reset", "--hard", "FETCH_HEAD")
        head = validate_sha(git("rev-parse", "HEAD").stdout.strip())
        original = plan.read_text()
        markers = SYNC_RE.findall(original)
        if len(markers) != 1:
            raise ValueError("Virtual PM sync marker is missing or duplicated")
        updated = render_plan(
            original, head, changed_paths(markers[0], head), config
        )
        if updated == original:
            return False
        plan.write_text(updated)
        git("add", "--", str(plan))
        git("config", "user.name", "github-actions[bot]")
        git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
        git("commit", "-m", "Sync Virtual PM code activity")
        pushed = git("push", "origin", f"HEAD:refs/heads/{branch}", check=False)
        if pushed.returncode == 0:
            return True
        if attempt == attempts - 1:
            raise RuntimeError("Virtual PM could not push; check branch write permissions")
        time.sleep(2 ** attempt)
    return False


if __name__ == "__main__":
    sync_branch(load_config())
