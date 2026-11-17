#!/usr/bin/env python3
"""Local, read-only Codex agent status viewer.

Only indexed thread metadata crosses the HTTP boundary. Conversation content,
tool arguments/results, and the user's original prompt are never queried.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
CODEX_HOME = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
STATE_DB = CODEX_HOME / "state_5.sqlite"
HISTORY_DB = CODEX_HOME / "thread_history_1.sqlite"
DATA_DIR = Path(os.environ.get("MISSION_CONTROL_DATA_DIR", Path("/private/tmp") / f"codex-mission-control-{os.getuid()}"))
SUMMARY_DB = DATA_DIR / "assignments.sqlite"
HOST = "127.0.0.1"
PORT = int(os.environ.get("MISSION_CONTROL_PORT", "0"))
REFRESH_SECONDS = 5
ACTIVE_WINDOW_SECONDS = 180
SESSION_LIMIT = 100
_SAFE_LABEL = re.compile(r"[^A-Za-z0-9 _/-]")
_SAFE_NAME = re.compile(r"[^A-Za-z0-9 .'_-]")


def db(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise FileNotFoundError(f"Codex index unavailable: {path.name}")
    connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=2)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only=ON")
    return connection


def iso(ms: int | None) -> str | None:
    if ms is None:
        return None
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).isoformat().replace("+00:00", "Z")


def role_label(agent_path: str | None) -> str:
    if not agent_path:
        return "Agent"
    part = (agent_path.split("/")[-1] or "agent").replace("_", " ").replace("-", " ")
    part = _SAFE_LABEL.sub("", part).strip()
    words = part[:64].split()
    acronyms = {"qa": "QA", "ui": "UI", "pr": "PR", "pm": "PM", "api": "API"}
    return " ".join(acronyms.get(word.lower(), word.capitalize()) for word in words) or "Agent"


def who_label(nickname: str | None, thread_id: str) -> str:
    if nickname:
        safe = _SAFE_NAME.sub("", nickname).strip()
        if safe:
            return safe[:48]
    return f"Agent {thread_id[:8]}"


def latest_turns(history: sqlite3.Connection, ids: list[str]) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for offset in range(0, len(ids), 400):
        batch = ids[offset : offset + 400]
        marks = ",".join("?" for _ in batch)
        query = f"""
            SELECT thread_id, status, started_at, completed_at,
                   final_agent_item_id, rollout_ordinal
            FROM (
                SELECT thread_id, status, started_at, completed_at,
                       final_agent_item_id, rollout_ordinal,
                       ROW_NUMBER() OVER (
                           PARTITION BY thread_id ORDER BY rollout_ordinal DESC
                       ) AS rank
                FROM thread_turns WHERE thread_id IN ({marks})
            ) WHERE rank = 1
        """
        for row in history.execute(query, batch):
            result[row["thread_id"]] = dict(row)
    return result


def assignment_summaries(ids: list[str]) -> dict[str, str]:
    """Read only agent-authored, short assignment descriptions from a local sidecar."""
    if not SUMMARY_DB.is_file() or not ids:
        return {}
    summaries: dict[str, str] = {}
    try:
        sidecar = db(SUMMARY_DB)
        try:
            for offset in range(0, len(ids), 400):
                batch = ids[offset : offset + 400]
                marks = ",".join("?" for _ in batch)
                for row in sidecar.execute(
                    f"SELECT thread_id, summary FROM assignment_summaries WHERE thread_id IN ({marks})",
                    batch,
                ):
                    summaries[row["thread_id"]] = row["summary"]
        finally:
            sidecar.close()
    except (sqlite3.Error, OSError):
        # A missing or busy sidecar must not take the live status view offline.
        return {}
    return summaries


def agent_state(turn: dict | None, updated_ms: int | None, now_ms: int) -> tuple[str, str]:
    if not turn:
        return "waiting", "No turn recorded yet"
    raw = turn["status"]
    if raw == "completed":
        if turn["final_agent_item_id"]:
            return "finished", "Final response recorded"
        return "waiting", "Turn ended; no final handoff recorded"
    if raw == "interrupted":
        return "interrupted", "Turn interrupted"
    if raw == "failed":
        return "failed", "Turn failed"
    if raw == "blocked":
        return "blocked", "Turn explicitly blocked"
    if raw == "inProgress":
        if updated_ms and now_ms - updated_ms <= ACTIVE_WINDOW_SECONDS * 1000:
            return "working", "Activity recorded recently"
        return "unconfirmed", "Active turn has no recent recorded activity"
    return "unconfirmed", "Turn state could not be confirmed"


def load_data() -> dict:
    now_ms = int(time.time() * 1000)
    state = db(STATE_DB)
    history = db(HISTORY_DB)
    try:
        edges = [dict(row) for row in state.execute(
            "SELECT parent_thread_id, child_thread_id FROM thread_spawn_edges"
        )]
        child_ids = {edge["child_thread_id"] for edge in edges}
        parents = {edge["parent_thread_id"] for edge in edges}
        roots = parents - child_ids
        if not roots:
            return {"generatedAt": iso(now_ms), "sessions": [], "agents": [], "source": "Codex local indexes"}

        marks = ",".join("?" for _ in roots)
        root_rows = state.execute(
            f"SELECT id, created_at_ms, updated_at_ms FROM threads WHERE id IN ({marks})",
            list(roots),
        ).fetchall()
        root_ids = [row["id"] for row in root_rows]
        included = set(root_ids) | child_ids
        marks = ",".join("?" for _ in included)
        thread_rows = state.execute(
            f"SELECT id, created_at_ms, updated_at_ms, agent_path, agent_nickname FROM threads WHERE id IN ({marks})",
            list(included),
        ).fetchall()
        by_id = {row["id"]: dict(row) for row in thread_rows}
        turns = latest_turns(history, list(included))
        summaries = assignment_summaries(list(child_ids))
        parent_map = {edge["child_thread_id"]: edge["parent_thread_id"] for edge in edges if edge["child_thread_id"] in included}

        def root_of(thread_id: str) -> str | None:
            seen: set[str] = set()
            current = thread_id
            while current in parent_map and current not in seen:
                seen.add(current)
                current = parent_map[current]
            return current if current in root_ids else None

        agents = []
        activity_ms = {row["id"]: row["updated_at_ms"] or 0 for row in root_rows}
        for thread_id, row in by_id.items():
            if thread_id in root_ids:
                continue
            root_id = root_of(thread_id)
            if not root_id:
                continue
            turn = turns.get(thread_id)
            status, update = agent_state(turn, row["updated_at_ms"], now_ms)
            parent_id = parent_map.get(thread_id)
            activity_ms[root_id] = max(activity_ms[root_id], row["updated_at_ms"] or 0)
            agents.append({
                "id": thread_id,
                "sessionId": root_id,
                "parentId": parent_id,
                "who": who_label(row["agent_nickname"], thread_id),
                "label": role_label(row["agent_path"]),
                "description": summaries.get(thread_id),
                "status": status,
                "update": update,
                "startedAt": iso(row["created_at_ms"]),
                "updatedAt": iso(row["updated_at_ms"]),
                "finishedAt": iso(turn["completed_at"] * 1000) if turn and turn["completed_at"] else None,
                "handoffRecorded": bool(turn and turn["final_agent_item_id"]),
            })
        agents.sort(key=lambda x: (x["updatedAt"] or ""), reverse=True)
        counts = {rid: {} for rid in root_ids}
        for agent in agents:
            bucket = counts[agent["sessionId"]]
            bucket[agent["status"]] = bucket.get(agent["status"], 0) + 1
        sessions = [{
            "id": row["id"],
            "label": "Session started " + dt.datetime.fromtimestamp(
                row["created_at_ms"] / 1000, dt.timezone.utc
            ).strftime("%d %b %Y"),
            "startedAt": iso(row["created_at_ms"]),
            "updatedAt": iso(activity_ms[row["id"]]),
            "agentCount": sum(counts[row["id"]].values()),
            "counts": counts[row["id"]],
        } for row in sorted(root_rows, key=lambda row: activity_ms[row["id"]], reverse=True)[:SESSION_LIMIT]]
        selected_roots = {session["id"] for session in sessions}
        agents = [agent for agent in agents if agent["sessionId"] in selected_roots]
        return {
            "generatedAt": iso(now_ms),
            "refreshSeconds": REFRESH_SECONDS,
            "source": "Codex local indexes",
            "sessions": sessions,
            "agents": agents,
            "needsYou": [],
            "attentionAvailable": False,
            "note": "Assignments come from agent task names. Short descriptions are explicitly registered by agents; unregistered briefs and responses stay in Codex.",
        }
    finally:
        state.close()
        history.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "MissionControl/1.0"

    def _valid_host(self) -> bool:
        return self.headers.get("Host", "").split(":")[0].lower() in {"127.0.0.1", "localhost"}

    def _send(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if not self._valid_host():
            return self._send(403, "text/plain", b"Forbidden")
        path = urlsplit(self.path).path
        if path == "/api/state":
            try:
                body = json.dumps(load_data(), separators=(",", ":")).encode()
                return self._send(200, "application/json; charset=utf-8", body)
            except (sqlite3.Error, OSError, ValueError) as exc:
                # Never include paths or internal SQLite details in a browser response.
                error = {"error": "Codex local index unavailable", "generatedAt": iso(int(time.time() * 1000))}
                print(f"Index read failed: {type(exc).__name__}: {exc}", flush=True)
                return self._send(503, "application/json; charset=utf-8", json.dumps(error).encode())
        files = {"/": ("index.html", "text/html; charset=utf-8"), "/app.js": ("app.js", "text/javascript; charset=utf-8"), "/styles.css": ("styles.css", "text/css; charset=utf-8"), "/favicon.svg": ("favicon.svg", "image/svg+xml")}
        if path not in files:
            return self._send(404, "text/plain", b"Not found")
        name, content_type = files[path]
        return self._send(200, content_type, (ROOT / name).read_bytes())

    def log_message(self, format: str, *args: object) -> None:
        # A query string could contain private text. Never log requests.
        pass


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Mission Control: http://{HOST}:{server.server_address[1]}/", flush=True)
    server.serve_forever()
