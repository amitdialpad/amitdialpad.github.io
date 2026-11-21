# Workloop: what to test

This folder contains the submitted public Workloop site and its existing
[repository plan and QA setup](agent-setup.md). That setup installs a branch
workflow into a chosen repository: mapped code changes can move Open work to
Working, and mapped checks produce a QA report. It does not create a private
hosted project or mark work Done.

The separate [private Workloop app](https://workloop-hackathon-amit.netlify.app/)
is deployed as an invite-only hackathon pilot. Its
[deployed source](https://github.com/amitdialpad/workloop-adoption-proof-20261117/tree/deploy/workloop-netlify/workloop-app)
is on a separate branch. One owner account has tested the hosted app, and a
real [code-observation Action](https://github.com/amitdialpad/workloop-adoption-proof-20261117/actions/runs/44824702387)
and [plan Action](https://github.com/amitdialpad/workloop-adoption-proof-20261117/actions/runs/44824702373)
have run. **The complete journey with two distinct hosted accounts has not
yet been verified.** The steps below are the remaining acceptance check.

## Hosted pilot prerequisites

- Two invited `@dialpad.com` test accounts for the hosted Workloop app. The
  app has its own database and uses invite-only sign-in.
- A sanitized Markdown plan with a `Tasks` or `Next steps` list. Use no customer
  data, credentials, or sensitive meeting notes for this trial.
- A test GitHub repository with a named branch, a real Actions QA command,
  and permission to set one Actions secret and one Actions variable.
- The deployed Workloop source and its skill helper. The public GitHub Pages
  URL is a project showcase, not the private service origin.

## Repeatable two-person check

1. **Sign in and import.** The owner opens the [private Workloop app](https://workloop-hackathon-amit.netlify.app/),
   selects **Continue with Dialpad**, and signs in with the first invited
   account. From the deployed source's `workloop-app/` directory, run
   `export WORKLOOP_API_URL=https://workloop-hackathon-amit.netlify.app` followed
   by `node .agents/skills/workloop/scripts/workloop.mjs import /absolute/path/to/PLAN.md`.
   Complete the browser device sign-in. The helper must return a private
   project link. Repeating the same import must return the same project.
2. **Inspect the source.** Open the project. Revision 1 must contain the exact
   chosen Markdown. Clear action items must appear as sourced Open work.
   A checked box in the plan must not appear as verified Done. Ambiguous owner
   matches must remain unclaimed.
3. **Invite and revise.** In People, invite the second test account. That person
   signs in, opens the same project, chooses a pod role, and proposes a plan
   replacement with a source reference. The owner accepts it. Both accounts
   must see revision 2 and the attributed Activity event after refresh. A
   proposal against the old revision must be rejected without replacing the
   current plan. An uninvited account must see no project content.
4. **Connect code and checks.** The owner opens **QA → Connect repository**,
   enters `owner/repo`, its branch, and at least one task-to-code-path mapping.
   Use an exact file or a folder prefix ending in `/`. The form returns a
   one-time observer token and observation endpoint. Store the token only in
   the repository's Actions secret `WORKLOOP_OBSERVER_TOKEN`, and the endpoint
   in its Actions variable `WORKLOOP_OBSERVATION_URL`. Save them before leaving
   the page; the token is shown only once. Add the source branch's
   `examples/github-actions/workloop-observe.yml` workflow to that repository,
   and make its QA step run a real project check. Review the workflow before
   enabling it. Reconnecting rotates the token and clears the previous QA
   result until a new run arrives.
5. **Prove a push.** Push a change on the bound branch that touches one mapped
   path. Verify the actual Actions run and then refresh Workloop. The matching
   task must move from Open to In progress with a commit link; Activity must
   show the observation; QA must show PASS, FAIL, or NOT RUN with the source
   run link. Replaying the same observation must not duplicate it. No code
   push or passing check may mark a task Done or claim live product acceptance.

The existing public project pages remain read-only snapshots, not this private
hosted flow. The linked source and Action runs may require GitHub access.
