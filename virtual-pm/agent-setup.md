# Set up Virtual PM in your project

Virtual PM is a project-specific living plan plus a small GitHub workflow. The
setup line below is an instruction for your coding agent, not a terminal
command. It gives the agent an inspectable installer, asks it to map your real
tasks, and requires a successful push-triggered update before it says ready.

## Copy this into your coding agent

> Set up Virtual PM for this repo using https://amitdialpad.github.io/virtual-pm/agent-setup.md. Map our real tasks to code, auto-update the living plan on branch pushes, and prove it with a GitHub Actions run. Never mark Done from a commit alone.

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
   for credentials. If any target file already differs, it stops without
   changing files; integrate with the existing plan deliberately instead.
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

## Optional starter file

The [starter plan](starter-plan.md) helps a team write its first plan. The
agent should replace its sample tasks with real ones and map them to code paths
before saying the setup is complete.

## What “automatic” means

After a watched-branch push, the GitHub workflow records a compare link and
project-file activity in the plan. It updates mapped task activity and can show
that work has started. It does not listen to conversations or infer acceptance
from code. Decisions, approvals, and Done status still need explicit evidence.
