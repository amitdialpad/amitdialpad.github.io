# Add Virtual QA to your project

Virtual QA is the checkable half of Workloop. It reads task headings, owners,
states, and next proof from your Virtual Project Manager (PM) plan. It runs only the commands you
explicitly map to scenarios, then writes a report with pass, fail, and not-run
results. It does not invent a test from a feature description or mark a task
Done because code passed.

## Give this to your coding agent

> Set up Virtual QA beside our Virtual PM plan using https://amitdialpad.github.io/virtual-pm/qa-setup.md. Map each real use case to a plan task, add the code checks we can actually run, leave live user proof explicit, and show me the first report and a GitHub Actions run. Do not call unmapped cases passed.

## Setup path

1. Set up [Virtual PM](agent-setup.md) first. Review its plan and map real
   tasks to code paths. Work from a named GitHub branch.
2. Review the [QA installer](install_qa.py), [runner source](virtual_qa_runner.mjs),
   and [starter manifest](qa-scenarios-starter.json). Download the one-file
   installer and run `python3 install_qa.py init --dry-run`, then
   `python3 install_qa.py init`. It adds `VIRTUAL_QA_SCENARIOS.json`,
   `.github/scripts/virtual_qa_runner.mjs`, and a branch-scoped, read-only
   `.github/workflows/virtual-qa.yml`. It makes local files only; it does not
   commit or push. It stops if an existing file differs.
3. Replace the starter scenario with your project’s real use cases. Each
   `handoffHeading` must match a `###` task in `VIRTUAL_PM.md`. Each check has
   an argument array (`argv`), repository-relative `cwd`, prerequisite file
   list (`requires`), and optional timeout. The runner does not invoke a
   shell. Include a `liveProof` sentence for what still needs a person or a
   real environment. Leave `checks: []` when there is no honest automated
   check; the report will say **NOT RUN**.
4. Run `python3 install_qa.py verify`, then:

   ```sh
   node .github/scripts/virtual_qa_runner.mjs --repo . --manifest VIRTUAL_QA_SCENARIOS.json --handoff VIRTUAL_PM.md --out virtual-qa-output
   ```

   Read `virtual-qa-output/report.md`, `report.json`, and the command logs.
   Put `virtual-qa-output/` in `.gitignore` if you keep local runs in the repo.
   Zero mapped passing checks is an incomplete setup and exits nonzero.
5. Review the generated Actions workflow. Add dependency setup needed by
   *your* checks before the runner step. Commit and push on the watched branch.
   Inspect the real Actions run and its private evidence artifact. If it
   cannot run, show the blocker instead of promising automated QA.

The Dial Bot hackathon uses a nine-scenario manifest with code checks and
explicit not-run cases. Its results can change as the code changes; inspect
the latest private report for the actual count. That report cannot by itself
prove a quiet live meeting, a participant grant, or customer readiness. Every
project needs its own mapping and a real push-triggered run. Manual QA still
belongs in customer release.
