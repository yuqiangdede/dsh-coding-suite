#!/usr/bin/env python3
"""Self-checks for the optional inventory scanner (stdlib only)."""

import json
import importlib.util
from unittest import mock
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("inventory.py")
SPEC = importlib.util.spec_from_file_location("acceptance_inventory", SCRIPT)
INVENTORY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INVENTORY)


class InventoryTests(unittest.TestCase):
    def run_scan(self, root: Path, out: Path, *extra: str):
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--project", str(root), "--out", str(out), *extra],
            capture_output=True, text=True, check=False,
        )

    def test_finds_entries_and_excludes_test_assets(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            (root / "src").mkdir()
            (root / "src" / "App.java").write_text('''
@Entity
@Table(name="device_events")
class Device {
  @Scheduled(cron="0 0 2 * * ?")
  void prune() {}
  @Cacheable("allDevices")
  Object list() { return null; }
  @GetMapping("/devices")
  Object devices() { return null; }
}
''', encoding="utf-8")
            (root / "schema.sql").write_text('CREATE TABLE IF NOT EXISTS audit_log(id int);', encoding="utf-8")
            (root / "tests").mkdir()
            (root / "tests" / "fixture.sql").write_text('CREATE TABLE bogus_fixture(id int);', encoding="utf-8")
            out = Path(temp) / "output"
            process = self.run_scan(root, out)
            self.assertEqual(process.returncode, 0, process.stderr)
            records = json.loads((out / "inventory.json").read_text(encoding="utf-8"))["candidates"]
            self.assertIn("device_events", [r["symbol"] for r in records])
            self.assertIn("audit_log", [r["symbol"] for r in records])
            self.assertIn("JOB", {r["domain"] for r in records})
            self.assertIn("CACHE", {r["domain"] for r in records})
            self.assertIn("API", {r["domain"] for r in records})
            self.assertNotIn("bogus_fixture", [r["symbol"] for r in records])
            self.assertTrue(all(r["line"] > 0 for r in records))
            self.assertTrue((out / "inventory.md").exists())

    def test_out_inside_project_does_not_scan_previous_report(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            (root / "m.py").write_text('@shared_task\ndef job(): pass', encoding="utf-8")
            out = root / "acceptance-output"
            self.assertEqual(self.run_scan(root, out).returncode, 0)
            second = self.run_scan(root, out, "--overwrite")
            self.assertEqual(second.returncode, 0)
            data = json.loads((out / "inventory.json").read_text(encoding="utf-8"))
            self.assertEqual(data["statistics"]["files_scanned"], 1)

    def test_reject_root_as_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            process = self.run_scan(root, root)
            self.assertNotEqual(process.returncode, 0)
            self.assertFalse((root / "inventory.json").exists())

    def test_file_cap_reports_incomplete(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            (root / "a.java").write_text("@Scheduled(fixedRate=1000)", encoding="utf-8")
            (root / "b.java").write_text("@Scheduled(fixedRate=1000)", encoding="utf-8")
            out = Path(temp) / "output"
            process = self.run_scan(root, out, "--max-files", "1")
            self.assertEqual(process.returncode, 3)
            data = json.loads((out / "inventory.json").read_text(encoding="utf-8"))
            self.assertTrue(data["statistics"]["truncated_by_max_files"])

    def test_existing_report_requires_explicit_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            out = Path(temp) / "output"
            out.mkdir()
            target = out / "inventory.md"
            target.write_text("keep", encoding="utf-8")
            process = self.run_scan(root, out)
            self.assertNotEqual(process.returncode, 0)
            self.assertEqual(target.read_text(encoding="utf-8"), "keep")
            self.assertFalse((out / "inventory.json").exists())
            self.assertEqual(self.run_scan(root, out, "--overwrite").returncode, 0)

    def test_report_symlink_is_rejected_even_with_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            out = Path(temp) / "output"
            out.mkdir()
            target = Path(temp) / "protected.txt"
            target.write_text("keep", encoding="utf-8")
            try:
                (out / "inventory.json").symlink_to(target)
            except OSError as exc:
                self.skipTest(f"Symlinks unavailable: {exc}")
            self.assertNotEqual(self.run_scan(root, out, "--overwrite").returncode, 0)
            self.assertEqual(target.read_text(encoding="utf-8"), "keep")
            self.assertFalse((out / "inventory.md").exists())

    def test_report_hardlink_is_rejected_even_with_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            out = Path(temp) / "output"
            out.mkdir()
            target = Path(temp) / "protected.txt"
            target.write_text("keep", encoding="utf-8")
            try:
                os.link(target, out / "inventory.json")
            except OSError as exc:
                self.skipTest(f"Hard links unavailable: {exc}")
            self.assertNotEqual(self.run_scan(root, out, "--overwrite").returncode, 0)
            self.assertEqual(target.read_text(encoding="utf-8"), "keep")

    def test_output_symlink_ancestor_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            real = Path(temp) / "real"
            real.mkdir()
            link = Path(temp) / "link"
            try:
                link.symlink_to(real, target_is_directory=True)
            except OSError as exc:
                self.skipTest(f"Symlinks unavailable: {exc}")
            self.assertNotEqual(self.run_scan(root, link / "nested").returncode, 0)
            self.assertFalse((real / "nested").exists())

    def test_limits_encoding_and_source_remain_unchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            root.mkdir()
            files = {"large.sql": b"CREATE TABLE secret(id int);" * 10,
                     "legacy.py": bytes([255, 254]), "binary.py": bytes([97, 0, 98]),
                     "ok.sql": b"CREATE TABLE sample(id int);"}
            for name, data in files.items():
                (root / name).write_bytes(data)
            out = Path(temp) / "output"
            self.assertEqual(self.run_scan(root, out, "--max-file-bytes", "100").returncode, 3)
            data = json.loads((out / "inventory.json").read_text(encoding="utf-8"))
            self.assertEqual(data["statistics"]["file_skips"],
                             {"size-limit": 1, "encoding-unsupported": 1, "binary": 1})
            self.assertEqual([c["symbol"] for c in data["candidates"]], ["sample"])
            for name, original in files.items():
                self.assertEqual((root / name).read_bytes(), original)

    def test_include_tests_and_non_repository_working_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "repo"
            (root / "tests").mkdir(parents=True)
            (root / "tests" / "fixture.sql").write_text("CREATE TABLE fixture(id int);", encoding="utf-8")
            out = Path(temp) / "output"
            process = subprocess.run(
                [sys.executable, str(SCRIPT.resolve()), "--project", str(root), "--out", str(out), "--include-tests"],
                cwd=temp, capture_output=True, text=True, check=False,
            )
            self.assertEqual(process.returncode, 0, process.stderr)
            data = json.loads((out / "inventory.json").read_text(encoding="utf-8"))
            self.assertEqual(data["candidates"][0]["symbol"], "fixture")

    def test_walk_error_marks_report_incomplete_without_real_acl(self):
        root = Path("virtual-repo").resolve()
        out = Path("virtual-output").resolve()

        def failed_walk(path, *, topdown, followlinks, onerror):
            self.assertEqual(path, root)
            self.assertTrue(topdown)
            self.assertFalse(followlinks)
            onerror(PermissionError(13, "Access denied", str(root / "private")))
            return iter([(str(root), [], [])])

        with mock.patch.object(INVENTORY.os, "walk", side_effect=failed_walk):
            payload = INVENTORY.scan(root, out, 100, 100, False)
        stats = payload["statistics"]
        self.assertTrue(stats["incomplete"])
        self.assertEqual(stats["files_scanned"], 0)
        self.assertEqual(stats["directory_errors"],
                         [{"path": "private", "error": "PermissionError", "errno": 13}])
        report_open = mock.mock_open()
        with mock.patch.object(INVENTORY, "validate_output"), \
                mock.patch.object(Path, "mkdir"), mock.patch.object(Path, "open", report_open):
            INVENTORY.write_report(payload, out)
        writes = [call.args[0] for call in report_open().write.call_args_list]
        self.assertTrue(json.loads(writes[0])["statistics"]["incomplete"])
        self.assertIn("未覆盖目录（遍历失败，扫描不完整）", writes[1])
        self.assertIn("`private`", writes[1])
        with mock.patch.object(sys, "argv", [str(SCRIPT), "--project", str(root), "--out", str(out)]), \
                mock.patch.object(INVENTORY, "validate_output"), mock.patch.object(Path, "is_dir", return_value=True), \
                mock.patch.object(INVENTORY, "scan", return_value=payload), \
                mock.patch.object(INVENTORY, "write_report"), mock.patch("builtins.print"):
            self.assertEqual(INVENTORY.main(), 3)


if __name__ == "__main__":
    unittest.main()
