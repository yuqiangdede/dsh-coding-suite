"""Offline Windows-safe tests for bounded setup repairs."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("auto_reconcile.py")


def command(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=True)


class SetupReconcileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        command("git", "init", "-q", str(self.root))
        command("git", "config", "user.email", "test@example.invalid", cwd=self.root)
        command("git", "config", "user.name", "Test", cwd=self.root)

    def seed(self):
        folder = self.root / "docs" / "Integration"
        folder.mkdir(parents=True)
        readme = folder / "README.md"
        readme.write_text(
            "# Integration\n输出目录 docs/integration/，参见 docs/integration/API.md。\n"
            "其他目录 docs/Requirements/ 保持不变。\n",
            encoding="utf-8",
        )
        command("git", "add", ".", cwd=self.root)
        command("git", "commit", "-qm", "initial docs", cwd=self.root)
        return readme

    def run_tool(self, *flags):
        result = command(sys.executable, str(SCRIPT), str(self.root), *flags)
        return json.loads(result.stdout)

    def test_preview_is_read_only(self):
        readme = self.seed()
        result = self.run_tool()
        self.assertEqual(result["applied"], [])
        self.assertEqual(len(result["proposed"]), 1)
        self.assertIn("docs/integration/", readme.read_text(encoding="utf-8"))

    def test_safe_apply_uses_real_case_and_is_idempotent(self):
        readme = self.seed()
        result = self.run_tool("--apply-safe")
        self.assertEqual(len(result["applied"]), 1)
        content = readme.read_text(encoding="utf-8")
        self.assertIn("docs/Integration/", content)
        self.assertNotIn("docs/integration/", content)
        self.assertIn("docs/Requirements/", content)
        self.assertFalse((self.root / "docs" / "integration").exists() and
                         (self.root / "docs" / "integration") != (self.root / "docs" / "Integration"))
        again = self.run_tool("--apply-safe")
        self.assertFalse(again["applied"])

    def test_dirty_file_not_overwritten(self):
        readme = self.seed()
        readme.write_text(readme.read_text(encoding="utf-8") + "local changes\n", encoding="utf-8")
        result = self.run_tool("--apply-safe")
        self.assertEqual(result["applied"], [])
        self.assertEqual(result["skipped"][0]["reason"], "uncommitted-file")
        self.assertIn("docs/integration/", readme.read_text(encoding="utf-8"))
        self.assertIn("local changes", readme.read_text(encoding="utf-8"))

    def test_no_git_baseline_is_not_auto_written(self):
        folder = self.root / "docs" / "Integration"
        folder.mkdir(parents=True)
        (folder / "README.md").write_text("docs/integration/\n", encoding="utf-8")
        # File is untracked: never treat user-owned uncommitted content as safe to edit.
        result = self.run_tool("--apply-safe")
        self.assertEqual(result["applied"], [])
        self.assertEqual(result["skipped"][0]["reason"], "uncommitted-file")

    def test_no_matching_path_does_not_edit(self):
        readme = self.seed()
        readme.write_text("docs/different/ docs/Integration/\n", encoding="utf-8")
        command("git", "add", ".", cwd=self.root)
        command("git", "commit", "-qm", "docs update", cwd=self.root)
        result = self.run_tool("--apply-safe")
        self.assertEqual(result["applied"], [])
        self.assertEqual(result["skipped"], [])


if __name__ == "__main__":
    unittest.main()
