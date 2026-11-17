# Set up Workloop in your project

Workloop is a set of tools for product makers: a project-specific living plan
and QA checks. The setup line below is an instruction for your coding agent,
not a terminal command. It gives the agent inspectable installers, asks it to
map your real tasks and checks, and requires successful push-triggered runs
before it says ready.

## Copy this into your coding agent

> Set up Workloop in this repo using https://amitdialpad.github.io/virtual-pm/agent-setup.md. Install its shared plan and QA checks, map our real tasks and scenarios, then prove a branch-push plan update and a QA report. Never mark Done from a commit or test alone.

Your coding agent needs access to a GitHub repository and a named working
branch. The setup does not need an OpenAI, Claude, or personal GitHub API key
pasted into chat. Repository policy still controls whether Actions can write
back to that branch.

## What the agent should do

1. Inspect the repository, its instructions, current branch, existing project
   plan, and Actions policy. Reuse an existing living plan when there is one.
   Do not overwrite it or create a second task board.
2. Review the [one-file installer](install.py) and its [updater source](virtual_pm_sync.py).
   In a clean repository, download the installer, run `python3 install.py init
   --dry-run`, then `python3 install.py init`. It creates `VIRTUAL_PM.md`,
   `.virtual-pm.json`, and a branch-scoped GitHub workflow and updater. The
   installer makes local file changes only; it does not commit, push, or ask
   for credentials. A first or partial install stops if an existing target
   differs; integrate with the existing plan deliberately instead. Once all
   files exist, a repeated `init` preserves the plan and task map while
   checking the managed workflow and updater for drift.
3. Replace the sample goal, owner, task, next check, and proof with this
   project's real work. In `.virtual-pm.json`, map every task heading to the
   code paths that belong to it. An empty task map will log general activity
   but cannot update task state. Run `python3 install.py verify` after mapping.
4. Review the generated workflow before pushing. It has `contents: write` on
   one named branch and pins the checkout action. Use a branch whose
   contributors are trusted. It never executes unrelated product code with
   the write token. A changed file may move an Open task to Working, but it
   cannot mark Done or decide a product policy.
5. Commit and push the setup to the working branch, then make one harmless
   mapped code change on that branch. Verify an actual GitHub Actions run and
   a bot-authored plan update. Repeat or inspect the next push to confirm it
   does not loop. If Actions cannot write to the branch, report that blocker;
   do not claim the automation is active.
6. Give the team the living plan link, workflow link, last successful run,
   and the exact branch it watches. Explain what is automatic and what still
   needs human acceptance evidence.

## Add QA checks

After the plan exists, follow the [QA checks setup](qa-setup.md). It installs
a scenario manifest, runner, and read-only GitHub workflow alongside the plan.
Map checks to real task headings, run them locally, and inspect the report
before pushing. The starter manifest has no checks and deliberately exits
nonzero until mapped. Add your project’s dependency setup to the workflow.
Then prove an actual Actions run. Give the team both the plan and the QA report.
An automated pass does not replace a real user walkthrough or customer-release QA.

## Optional starter file

The [starter plan](starter-plan.md) helps a team write its first plan. The
agent should replace its sample tasks with real ones and map them to code paths
before saying the setup is complete.

## What “automatic” means

After a watched-branch push, the GitHub workflow records a compare link and
project-file activity in the plan. It updates mapped task activity and can show
that work has started. It does not listen to conversations or infer acceptance
from code. Decisions, approvals, and Done status still need explicit evidence.
Publishing a new Workloop site version does not silently change files already
installed in your repository. Re-run the setup review when you want to adopt
an updated runner or workflow. The plan installer checks its managed workflow
and updater against this release or the exact previous generated version; any
other change stops `verify` and `init` with the file path. The plan and task
map remain project-owned and are never reset by a repeated `init`.

## Existing installs and Workloop labels

Old file names, configuration keys, activity markers, and this site URL remain
valid. To change only the generated workflow and updater labels, review
`python3 install.py migrate-labels --dry-run`, then run
`python3 install.py migrate-labels`. For QA, use the same two commands with
`install_qa.py`. These commands accept only known generated files and never
rewrite your plan, task map, or scenario manifest. If a team customized a
runner or workflow, the migration stops and names it for manual integration.
Existing plan headings and earlier reports keep their historical wording until
the team edits them; new reports use Workloop labels. Review and push the
resulting managed-file changes, then confirm the next Actions runs.
