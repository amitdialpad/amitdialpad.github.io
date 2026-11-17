#!/usr/bin/env python3
"""Register one safe assignment sentence for the calling Codex child agent.

The current agent's CODEX_THREAD_ID supplies the key. This CLI does not read or
copy its delegation prompt, transcript, tool calls, or response.
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import sys
import time
import uuid

import server


_SENSITIVE = re.compile(
    r"https?://|www\.|\S+@\S+|/Users/|/home/|\.codex|github_pat_|ghp_|sk-[A-Za-z0-9]|gAAAA|[<>`]",
    re.IGNORECASE,
)


def validate_summary(value: str) -> str:
    summary = value.strip()
    if not 12 <= len(summary) <= 180:
        raise ValueError("Use a short plain sentence of 12–180 characters.")
    if any(char in summary for char in "\r\n\t") or any(ord(char) < 32 for char in summary):
        raise ValueError("Use one line of plain text.")
    if _SENSITIVE.search(summary):
        raise ValueError("Remove links, paths, contact details, code, or secrets.")
    return summary


def register(summary: str, thread_id: str | None = None, sidecar_path=None) -> None:
    thread_id = thread_id or os.environ.get("CODEX_THREAD_ID", "")
    try:
        uuid.UUID(thread_id)
    except (ValueError, AttributeError) as exc:
        raise ValueError("CODEX_THREAD_ID is missing or invalid.") from exc
    clean = validate_summary(summary)
    state = server.db(server.STATE_DB)
    try:
        child = state.execute(
            "SELECT 1 FROM thread_spawn_edges WHERE child_thread_id = ? LIMIT 1",
            (thread_id,),
        ).fetchone()
        if not child:
            raise ValueError("This thread is not an indexed child agent.")
    finally:
        state.close()

    destination = sidecar_path or server.SUMMARY_DB
    previous_umask = os.umask(0o077)
    try:
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        sidecar = sqlite3.connect(destination, timeout=2)
        try:
            sidecar.execute("PRAGMA busy_timeout=2000")
            sidecar.execute(
                "CREATE TABLE IF NOT EXISTS assignment_summaries ("
                "thread_id TEXT PRIMARY KEY, summary TEXT NOT NULL, source TEXT NOT NULL, updated_at_ms INTEGER NOT NULL)"
            )
            sidecar.execute(
                "INSERT INTO assignment_summaries(thread_id, summary, source, updated_at_ms) VALUES (?, ?, ?, ?) "
                "ON CONFLICT(thread_id) DO UPDATE SET summary=excluded.summary, "
                "source=excluded.source, updated_at_ms=excluded.updated_at_ms",
                (thread_id, clean, "agent_self_report", int(time.time() * 1000)),
            )
            sidecar.commit()
        finally:
            sidecar.close()
    finally:
        os.umask(previous_umask)
    os.chmod(destination, 0o600)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("summary", help="A safe, plain-language sentence about your assigned work")
    args = parser.parse_args()
    try:
        register(args.summary)
    except (ValueError, sqlite3.Error, OSError) as exc:
        print(f"Assignment not registered: {exc}", file=sys.stderr)
        return 1
    print("Assignment summary registered for this agent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
