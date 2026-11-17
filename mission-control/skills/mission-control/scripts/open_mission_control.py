#!/usr/bin/env python3
"""Start this Mac's private Codex agent dashboard and print its current URL."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import plistlib
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app" / "server.py"
LABEL = "dev.missioncontrol.codex-local"
RUNTIME = Path("/private/tmp") / f"codex-mission-control-{os.getuid()}"
PLIST = RUNTIME / "service.plist"
STAMP = RUNTIME / "service.sha256"
CODEX_HOME = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()
PID_RE = re.compile(r"^\s*pid = (\d+)\s*$", re.MULTILINE)
PORT_RE = re.compile(r"TCP 127\.0\.0\.1:(\d+) \(LISTEN\)")


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


def service_target() -> str:
    return f"gui/{os.getuid()}/{LABEL}"


def service_pid() -> int | None:
    result = run("launchctl", "print", service_target())
    match = PID_RE.search(result.stdout) if result.returncode == 0 else None
    return int(match.group(1)) if match else None


def listener_port(pid: int) -> int | None:
    result = run("lsof", "-nP", "-a", "-p", str(pid), "-iTCP", "-sTCP:LISTEN")
    match = PORT_RE.search(result.stdout) if result.returncode == 0 else None
    return int(match.group(1)) if match else None


def write_plist() -> None:
    old_umask = os.umask(0o077)
    try:
        RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
        config = {
            "Label": LABEL,
            "ProgramArguments": [sys.executable, "-u", str(APP)],
            "WorkingDirectory": str(APP.parent),
            "EnvironmentVariables": {
                "CODEX_HOME": str(CODEX_HOME),
                "MISSION_CONTROL_DATA_DIR": str(RUNTIME),
                "MISSION_CONTROL_PORT": "0",
            },
            "RunAtLoad": True,
            "KeepAlive": True,
            "StandardOutPath": str(RUNTIME / "service.out.log"),
            "StandardErrorPath": str(RUNTIME / "service.err.log"),
        }
        with PLIST.open("wb") as target:
            plistlib.dump(config, target)
        PLIST.chmod(0o600)
    finally:
        os.umask(old_umask)


def package_stamp() -> str:
    """Identify the exact installed app and Codex index used by this service."""
    digest = hashlib.sha256()
    try:
        for path in (APP, ROOT / "app" / "app.js", ROOT / "app" / "index.html", ROOT / "app" / "styles.css"):
            digest.update(str(path.resolve()).encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
    except OSError as exc:
        raise RuntimeError("The dashboard app is incomplete in this skill package.") from exc
    digest.update(str(CODEX_HOME.resolve()).encode())
    return digest.hexdigest()


def ensure_service() -> None:
    stamp = package_stamp()
    loaded = run("launchctl", "print", service_target()).returncode == 0
    try:
        previous_stamp = STAMP.read_text().strip()
    except OSError:
        previous_stamp = None
    if loaded and previous_stamp == stamp:
        return
    if loaded:
        result = run("launchctl", "bootout", service_target())
        if result.returncode and run("launchctl", "print", service_target()).returncode == 0:
            raise RuntimeError("Codex could not restart the installed Mission Control service. The launchctl action may need approval.")
    write_plist()
    result = run("launchctl", "bootstrap", f"gui/{os.getuid()}", str(PLIST))
    if result.returncode and run("launchctl", "print", service_target()).returncode:
        raise RuntimeError("Codex could not start the local Mac login service. The launchctl action may need approval.")
    descriptor = os.open(STAMP, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as target:
        target.write(stamp)


def probe(port: int) -> tuple[bool, str]:
    try:
        with urlopen(f"http://127.0.0.1:{port}/api/state", timeout=1.5) as response:
            if response.status != 200:
                return False, f"HTTP {response.status}"
            payload = json.load(response)
            if not isinstance(payload, dict) or not isinstance(payload.get("agents"), list):
                return False, "Unexpected response"
            return True, "ready"
    except PermissionError:
        return False, "loopback blocked by shell sandbox"
    except URLError as exc:
        if isinstance(exc.reason, PermissionError):
            return False, "loopback blocked by shell sandbox"
        return False, f"unavailable: {type(exc.reason).__name__}"
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return False, f"unavailable: {type(exc).__name__}"


def discover() -> dict[str, object]:
    if sys.platform != "darwin":
        raise RuntimeError("This first release supports Codex on macOS only.")
    if not APP.is_file():
        raise RuntimeError("The dashboard app is missing from this skill package.")
    if not (CODEX_HOME / "state_5.sqlite").is_file() or not (CODEX_HOME / "thread_history_1.sqlite").is_file():
        raise RuntimeError("No compatible local Codex session index was found on this Mac.")
    ensure_service()
    restarted = False
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        pid = service_pid()
        port = listener_port(pid) if pid else None
        if port:
            ready, reason = probe(port)
            if ready or reason == "loopback blocked by shell sandbox":
                return {"url": f"http://127.0.0.1:{port}/", "probe": reason}
        if not restarted and time.monotonic() > deadline - 7:
            run("launchctl", "kickstart", "-k", service_target())
            restarted = True
        time.sleep(0.5)
    raise RuntimeError("The local dashboard did not become ready. Check its local service log.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--open", action="store_true", help="Also ask macOS to open the page")
    args = parser.parse_args()
    try:
        result = discover()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if args.open:
        opened = run("open", str(result["url"]))
        if opened.returncode:
            print("The service is ready, but this shell could not open the browser. Open the returned URL with browser control.", file=sys.stderr)
    print(json.dumps(result, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
