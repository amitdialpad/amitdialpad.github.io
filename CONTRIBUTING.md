# Contributing to Workloop

Workloop grew out of product teams building together. Improvements to the shared plan, QA checks, setup, and site are welcome through reviewable pull requests. The repository is public for visibility and review, but [no open-source license has been selected](README.md); please do not assume permission for use or redistribution outside this repository.

## Where changes belong

| Area | Source in this repository | Review focus |
| --- | --- | --- |
| Site and product story | `virtual-pm/index.html`, `styles.css`, `site.js`, and adjacent assets | Clear claims, accessibility, mobile layout, and links |
| Plan setup and updates | `virtual-pm/install.py`, `virtual_pm_sync.py`, `agent-setup.md`, and `test_install_drift.py` | Fresh install, rerun, existing-plan preservation, and safe push behavior |
| QA setup and reports | `virtual-pm/install_qa.py`, `virtual_qa_runner.mjs`, `qa-setup.md`, and `test_qa_setup.py` | Honest pass/fail/not-run reporting, no invented checks, and compatible installs |

The Dial Bot and Workloop project dashboards use their own project handoffs. They are **not** the source of the reusable installer in this repository. Keep project-specific data and credentials out of site and tool changes.

## Propose a change

1. Open an issue to describe a bug or a larger idea. For a small correction, a focused pull request is enough. Explain who it helps and what you expect to change.
2. Fork this repository or create a branch if you already have write access. Branch from the current `main`; keep each pull request focused.
3. Make the change in the appropriate source file. Preserve existing install paths, filenames, configuration keys, and report meanings unless a migration is included. `install.py` bundles the plan updater and `install_qa.py` bundles the QA runner, so keep those embedded payloads in sync with the reviewable source. The drift tests check both.
4. Run the checks below. For site changes, also review the rendered desktop and narrow layouts, keyboard use, and reduced-motion behavior where applicable. For installer or runner changes, try a fresh disposable repository and an existing installation; describe any migration or behavior change.
5. Open a pull request against `main`. Use the template to include the problem, the change, test output, screenshots when the UI changed, and any remaining limits. Do not include private meeting content, customer data, tokens, or screenshots of private project handoffs.
6. A maintainer reviews the change and its checks before merging. A green check alone is not acceptance of a product claim or user experience. Owners of affected projects verify their own installed version before adopting a new release; publishing this site does not silently update their repositories.

### Local checks

Use Python 3.11 or newer, Node.js 22, and Git:

```sh
python3 -m unittest discover -s virtual-pm -p 'test_*.py' -v
python3 -m py_compile virtual-pm/install.py virtual-pm/install_qa.py virtual-pm/virtual_pm_sync.py
node --check virtual-pm/virtual_qa_runner.mjs
node --check virtual-pm/site.js
node --check virtual-pm/projects.js
```

The same checks run on pull requests with a read-only GitHub Actions token. They test installer drift, preservation of existing plans, QA report outcomes, and JavaScript syntax. They do not prove a live customer journey or deployment. Include that evidence separately when a change needs it.

## Review and release

Maintainers should check that the source, bundled payload, setup guide, tests, and site claims agree. In particular, reject a change that silently overwrites project plans, turns a code push into Done, reports an unmapped scenario as passed, or runs arbitrary pull request code with a write token. The PR checks use `contents: read`; the installers' generated workflows for adopter repositories are separate and must be reviewed in that repository.

This starts as a contributor-friendly public repository, with review by the current repository owner. It is not yet community governed. To avoid making one person the permanent merge bottleneck, the owner should invite at least two trusted maintainers, confirm their GitHub handles and access, and then add a `CODEOWNERS` entry for that maintainer group. Yacine, Jimut, and Vishal are candidates for that invitation; do not assign their GitHub accounts by guessing a handle. A `main` branch ruleset should then require a maintainer approval and the `Contributor checks / core` check before merge, including for administrators where repository policy allows. Confirm the rule with a test pull request. Until that is enabled and verified, use the pull request process but do not describe review or checks as an enforced merge gate.
