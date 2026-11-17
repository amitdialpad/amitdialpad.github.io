---
name: mission-control
description: Open a private live dashboard of Codex specialist agents on this Mac. Use when someone invokes $mission-control or asks to see their Codex agent work.
---

# Mission Control

This release works with the local Codex session index on macOS. It does not read other LLMs or remote agent platforms. Never present another person's agents as part of this user's view.

Run `python3 scripts/open_mission_control.py` from this skill directory. It starts the local service if needed and returns its current loopback URL as JSON. Open that URL using the available browser tool and confirm the Mission Control heading and agent table. Do not assume a fixed port. A shell sandbox may block the HTTP probe even when the browser can load the page; verify in the browser before reporting failure. The first service start may require permission for `launchctl`.

Keep the dashboard private to this device. Do not publish, tunnel, upload, or paste its live roster or assignment summaries to a public site without a separate request. After a Mac restart, invoke this skill again to restart the local service.

The Assignment column comes from Codex's agent task name. The explanation column shows only short summaries registered explicitly by child agents. When delegating a new child agent while using this skill, ask that child to run `python3 <this-skill-directory>/app/register_assignment.py "<one plain, non-sensitive sentence about the assignment>"` in its own session. Its thread ID is read automatically. Do not put raw briefs, links, paths, contact details, or secrets in the sentence. If registration cannot write from the child's sandbox, leave the cell blank rather than guessing. Earlier encrypted briefs cannot be reconstructed.
