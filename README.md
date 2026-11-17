# Workloop

Workloop is a set of product maker tools for a shared project plan and mapped QA checks. The [Workloop site](https://amitdialpad.github.io/virtual-pm/) explains the product; this repository contains that site and the reviewable installer and runner source under [`virtual-pm/`](virtual-pm/).

The plan installer records push activity against mapped tasks. The QA runner reports pass, fail, and not run for checks a team explicitly configures. A push or a passing check does not mark work Done or replace human acceptance. See the [project setup guide](virtual-pm/agent-setup.md) and [QA setup guide](virtual-pm/qa-setup.md) before installing them in another repository.

## Contribute

We welcome proposals and pull requests from the Dialpad builder community. [CONTRIBUTING.md](CONTRIBUTING.md) explains how to propose changes to the site, installers, updater, runner, and setup guides; how to run the checks; and what maintainers review before merging.

This repository is publicly visible, but it does **not** currently include an open-source license. Visibility and accepting a pull request do not grant permission to copy, redistribute, or use the code outside the repository. Maintainers must settle licensing and any company approvals before describing Workloop as open source or inviting unrestricted external reuse.
