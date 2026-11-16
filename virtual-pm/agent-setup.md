# Set up Virtual PM in your project

Virtual PM is a project-specific living plan plus a small GitHub workflow. A
coding agent can install it in a repository, tailor the tasks to that project,
and prove that code pushes update the plan automatically.

## Copy this into your coding agent

> Set up Virtual PM for this repo using https://amitdialpad.github.io/virtual-pm/agent-setup.md. Map our real tasks to code, auto-update the living plan on branch pushes, and prove it with a GitHub Actions run. Never mark Done from a commit alone.

Your coding agent needs access to the repository. The setup does not need an
OpenAI, Claude, or personal GitHub API key pasted into chat. Existing repository
permissions still govern whether GitHub Actions can write back to the branch.

## What the agent should create

1. Inspect the repository, its existing project documents, instructions, current
   working branch, and available GitHub Actions. Reuse an existing plan when it
   is the team's source of truth. Do not create another board or project.
2. Create or improve a single Markdown plan that states the product goal,
   decisions, owners, tasks, blockers, next checks, and inspectable proof.
   Distinguish a built feature from a passing test and a successful live review.
3. Add a push-triggered workflow for the team's working branch. It should
   record each code push in the plan and map changed files to the relevant task
   blocks. The update must be idempotent and should not run again on its own bot
   commit. Keep the workflow scoped to the named branch and give it only the
   repository permission it requires. Pin its checkout action to a reviewed
   version. Use a branch whose contributors are trusted, review changes to the
   workflow and updater before they run with write access, and do not execute
   unrelated product code with that token.
4. Keep product judgments separate. A changed file may move an Open task to
   Working, but it cannot prove user acceptance, change a product decision, or
   mark a task Done. Unmapped code changes should be visible in an activity
   section so nothing silently disappears.
5. Test with a local fixture: a sample code commit, a repeat run, an unrelated
   document change, and a simulated concurrent push. Then push the workflow to
   the working branch and verify an actual GitHub Actions run and a bot-authored
   plan update. If repository policy blocks workflow writes, report that exact
   blocker; do not claim the automation works.
6. Hand back the plan link, workflow link, last successful run, what updates
   automatically, and any remaining proof or permission gap.

## Optional starter file

The [starter plan](starter-plan.md) helps a team write its first plan. The
agent should replace its sample tasks with real ones and map them to code paths
before saying the setup is complete.

## What “automatic” means

After a working-branch code push, the GitHub workflow records a compare link
and code activity in the plan. It updates mapped task activity and can show
that work has started. People still decide whether the feature meets its
acceptance test. Decisions, approvals, and Done status require evidence rather
than inference from a commit.
