# Mission Control for Codex

Mission Control is a private, local dashboard for the specialist agents in your Codex chats. It shows each agent's task name, state, update time, and a short explanation when that agent has registered one. Switch sessions from the header to inspect earlier work.

## Install

On a Mac with Codex, Python 3.10 or newer, and Node.js 22.20 or newer, install the skill with:

```sh
npx skills@latest add amitdialpad/amitdialpad.github.io --skill mission-control -g -a codex
```

Then ask Codex for `$mission-control`. The skill starts the local dashboard when needed and opens its current address. The address uses a free loopback port, so you do not need to bookmark a port number. The first launch may ask for permission to create a background service for the current Mac login. After a restart, invoke the skill again to start the service.

This first release reads Codex's local `state_5.sqlite` and `thread_history_1.sqlite` indexes. It does not control agents or support arbitrary chat LLMs. A Codex update that changes those indexes may require a matching skill update. The dashboard reads indexed task and status metadata, not conversation text or tool output. Agent descriptions come from a separate, explicit local registration step; old encrypted briefs are not reconstructed. The dashboard is bound to `127.0.0.1` and is intended only for this Mac. Do not expose its port or publish its live data.

The files in this skill directory are licensed under the included [MIT License](LICENSE). That license applies to this skill package, not the rest of the website repository.
