"""Fresh-project and conflict checks for the public Virtual QA setup."""

from __future__ import annotations

import base64
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

import install_qa


SITE = Path(__file__).parent


def run(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True)


class VirtualQaSetupTest(unittest.TestCase):
    def setUp(self) -> None:
        self.folder = tempfile.TemporaryDirectory(prefix="virtual-qa-fresh-")
        self.root = Path(self.folder.name)
        for command in (
            ("git", "init", "-b", "proof"),
            ("git", "config", "user.email", "qa@example.test"),
            ("git", "config", "user.name", "QA fixture"),
            ("git", "remote", "add", "origin", "https://github.com/example/project.git"),
        ):
            self.assertEqual(run(*command, cwd=self.root).returncode, 0)
        (self.root / "README.md").write_text("# Example project\n")
        self.assertEqual(run("git", "add", "README.md", cwd=self.root).returncode, 0)
        self.assertEqual(run("git", "commit", "-m", "Start", cwd=self.root).returncode, 0)

    def tearDown(self) -> None:
        self.folder.cleanup()

    def setup_pm(self) -> None:
        result = run("python3", str(SITE / "install.py"), "init", cwd=self.root)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fresh_project_runs_real_check_and_reports_unverified_proof(self) -> None:
        self.setup_pm()
        install_qa.install(self.root, dry_run=True)
        self.assertFalse((self.root / install_qa.MANIFEST).exists())
        install_qa.install(self.root, dry_run=False)
        install_qa.verify(self.root)
        manifest_path = self.root / install_qa.MANIFEST
        manifest = json.loads(manifest_path.read_text())
        manifest["scenarios"][0]["checks"] = [{
            "cwd": ".",
            "argv": ["node", "--test", "test/first-proof.test.mjs"],
            "requires": ["test/first-proof.test.mjs"],
        }]
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        (self.root / "test").mkdir()
        (self.root / "test/first-proof.test.mjs").write_text(
            "import test from 'node:test'; test('real proof', () => {});\n"
        )
        self.assertEqual(run("git", "add", ".", cwd=self.root).returncode, 0)
        self.assertEqual(run("git", "commit", "-m", "Map first proof", cwd=self.root).returncode, 0)
        result = run(
            "node", str(self.root / install_qa.RUNNER), "--repo", str(self.root),
            "--manifest", str(manifest_path), "--handoff", str(self.root / install_qa.PLAN),
            "--out", str(self.root / "qa-report"), cwd=self.root,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((self.root / "qa-report/report.json").read_text())
        self.assertEqual(report["summary"], {"passed": 1, "failed": 0, "notRun": 0})
        self.assertFalse(report["dirty"], "QA's own output must not make a clean checkout look dirty")
        self.assertIn("real user observation", report["scenarios"][0]["liveProof"])
        self.assertIn("not mark product work Done", (self.root / "qa-report/report.md").read_text())
        (self.root / "test/first-proof.test.mjs").write_text(
            "import test from 'node:test'; test('regression', () => { throw new Error('broken'); });\n"
        )
        failing = run(
            "node", str(self.root / install_qa.RUNNER), "--repo", str(self.root),
            "--manifest", str(manifest_path), "--handoff", str(self.root / install_qa.PLAN),
            "--out", str(self.root / "qa-report"), cwd=self.root,
        )
        self.assertEqual(failing.returncode, 1)
        failed_report = json.loads((self.root / "qa-report/report.json").read_text())
        self.assertEqual(failed_report["summary"], {"passed": 0, "failed": 1, "notRun": 0})

    def test_starter_without_checks_is_not_a_green_run(self) -> None:
        self.setup_pm()
        install_qa.install(self.root, dry_run=False)
        result = run(
            "node", str(self.root / install_qa.RUNNER), "--repo", str(self.root),
            "--manifest", str(self.root / install_qa.MANIFEST),
            "--handoff", str(self.root / install_qa.PLAN),
            "--out", str(self.root / "qa-report"), cwd=self.root,
        )
        self.assertEqual(result.returncode, 3)
        report = json.loads((self.root / "qa-report/report.json").read_text())
        self.assertEqual(report["summary"], {"passed": 0, "failed": 0, "notRun": 1})

    def test_existing_manifest_is_not_overwritten(self) -> None:
        self.setup_pm()
        (self.root / install_qa.MANIFEST).write_text("project-specific cases\n")
        with self.assertRaisesRegex(ValueError, "integrate deliberately"):
            install_qa.install(self.root, dry_run=False)
        self.assertFalse((self.root / install_qa.RUNNER).exists())

    def test_embedded_runner_matches_reviewable_source(self) -> None:
        self.assertEqual(
            base64.b64decode(install_qa.RUNNER_PAYLOAD),
            (SITE / "virtual_qa_runner.mjs").read_bytes(),
        )

    def test_only_tasks_section_contributes_task_metadata(self) -> None:
        plan = """## Tasks
### First proof
**Owner:** Alice
**State:** Working
**Next check:** Try the build

## Decisions
### First proof
This is a decision, not a replacement task.
"""
        code = (
            f"import {{ readTaskBlocks }} from {json.dumps((SITE / 'virtual_qa_runner.mjs').as_uri())};"
            f"const tasks = readTaskBlocks({json.dumps(plan)});"
            "process.stdout.write(JSON.stringify([...tasks]));"
        )
        result = run("node", "--input-type=module", "-e", code, cwd=self.root)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [["First proof", {
            "state": "Working", "owner": "Alice", "nextProof": "Try the build"
        }]])


if __name__ == "__main__":
    unittest.main()
