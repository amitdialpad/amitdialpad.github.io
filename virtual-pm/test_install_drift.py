"""Safety checks for the self-contained Workloop Project Manager installer."""

from __future__ import annotations

import json
import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


HERE = Path(__file__).resolve().parent
PM_INSTALLER = HERE / "install.py"
QA_INSTALLER = HERE / "install_qa.py"
PLAN = Path("VIRTUAL_PM.md")
CONFIG = Path(".virtual-pm.json")
WORKFLOW = Path(".github/workflows/virtual-pm.yml")
SYNC = Path(".github/scripts/virtual_pm_sync.py")
PM_FILES = (PLAN, CONFIG, WORKFLOW, SYNC)


def run(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=False)


class WorkloopInstallDriftTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp.name)
        self.assert_success(run(self.repo, "git", "init", "-b", "hackathon/test"))
        self.assert_success(run(self.repo, "git", "config", "user.name", "Test Builder"))
        self.assert_success(run(self.repo, "git", "config", "user.email", "builder@example.com"))
        self.assert_success(run(self.repo, "git", "remote", "add", "origin", "https://github.com/example/project.git"))
        (self.repo / "README.md").write_text("Disposable project\n")
        self.assert_success(run(self.repo, "git", "add", "README.md"))
        self.assert_success(run(self.repo, "git", "commit", "-m", "Initial project"))

    def tearDown(self) -> None:
        self.temp.cleanup()

    def assert_success(self, result: subprocess.CompletedProcess[str]) -> None:
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def pm(self, command: str, *flags: str) -> subprocess.CompletedProcess[str]:
        return run(self.repo, sys.executable, str(PM_INSTALLER), command, *flags)

    def qa(self, command: str) -> subprocess.CompletedProcess[str]:
        return run(self.repo, sys.executable, str(QA_INSTALLER), command)

    def snapshot(self) -> dict[Path, bytes]:
        return {path: (self.repo / path).read_bytes() for path in PM_FILES if (self.repo / path).exists()}

    def test_bundled_updater_matches_reviewable_source(self) -> None:
        spec = importlib.util.spec_from_file_location("workloop_pm_installer", PM_INSTALLER)
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(module.sync_template(), (HERE / "virtual_pm_sync.py").read_text())

    def test_fresh_project_dry_run_install_and_idempotent_rerun(self) -> None:
        dry_run = self.pm("init", "--dry-run")
        self.assert_success(dry_run)
        self.assertIn("Dry run only", dry_run.stdout)
        self.assertEqual(self.snapshot(), {})

        self.assert_success(self.pm("init"))
        self.assertEqual(set(self.snapshot()), set(PM_FILES))
        self.assert_success(self.pm("verify"))
        original = self.snapshot()
        rerun = self.pm("init")
        self.assert_success(rerun)
        self.assertIn("already installed", rerun.stdout)
        self.assertEqual(self.snapshot(), original)

    def test_custom_plan_and_task_mapping_survive_verify_and_rerun(self) -> None:
        self.assert_success(self.pm("init"))
        plan = self.repo / PLAN
        plan.write_text(plan.read_text().replace("**Owner:** To decide.", "**Owner:** Yacine.") + "\nA project decision stays here.\n")
        config = self.repo / CONFIG
        mapping = json.loads(config.read_text())
        mapping["tasks"]["First proof"] = ["src/**"]
        config.write_text(json.dumps(mapping, indent=2) + "\n")
        customized = self.snapshot()

        self.assert_success(self.pm("verify"))
        self.assert_success(self.pm("init"))
        self.assertEqual(self.snapshot(), customized)

    def test_modified_managed_script_or_workflow_blocks_init_and_verify(self) -> None:
        self.assert_success(self.pm("init"))
        for path in (SYNC, WORKFLOW):
            with self.subTest(path=path):
                original = (self.repo / path).read_bytes()
                (self.repo / path).write_bytes(original + b"\n# local change\n")
                changed = self.snapshot()
                for command in ("verify", "init"):
                    result = self.pm(command)
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertIn(str(path), result.stderr)
                    self.assertIn("no files changed", result.stderr)
                    self.assertNotIn("installed and consistent", result.stdout)
                    self.assertEqual(self.snapshot(), changed)
                (self.repo / path).write_bytes(original)
                self.assert_success(self.pm("verify"))

    def test_partial_install_restores_missing_managed_file_without_overwriting_others(self) -> None:
        self.assert_success(self.pm("init"))
        (self.repo / SYNC).unlink()
        partial = self.snapshot()
        missing = self.pm("verify")
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn(str(SYNC), missing.stderr)

        self.assert_success(self.pm("init"))
        self.assert_success(self.pm("verify"))
        for path, content in partial.items():
            self.assertEqual((self.repo / path).read_bytes(), content)

    def test_partial_install_with_custom_plan_stops_without_replacing_it(self) -> None:
        self.assert_success(self.pm("init"))
        plan = self.repo / PLAN
        plan.write_text(plan.read_text() + "\nA team decision.\n")
        (self.repo / WORKFLOW).unlink()
        partial = self.snapshot()

        result = self.pm("init")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Existing files differ", result.stderr)
        self.assertIn(str(PLAN), result.stderr)
        self.assertEqual(self.snapshot(), partial)
        self.assertFalse((self.repo / WORKFLOW).exists())

    @unittest.skipUnless(shutil.which("node"), "Virtual QA verification needs Node")
    def test_virtual_qa_companion_remains_compatible(self) -> None:
        self.assert_success(self.pm("init"))
        self.assert_success(self.qa("init"))
        self.assert_success(self.pm("verify"))
        self.assert_success(self.qa("verify"))
        qa_files = (
            Path("VIRTUAL_QA_SCENARIOS.json"),
            Path(".github/scripts/virtual_qa_runner.mjs"),
            Path(".github/workflows/virtual-qa.yml"),
        )
        before = {path: (self.repo / path).read_bytes() for path in qa_files}

        self.assert_success(self.pm("init"))
        self.assert_success(self.qa("verify"))
        self.assertEqual({path: (self.repo / path).read_bytes() for path in qa_files}, before)


if __name__ == "__main__":
    unittest.main()
