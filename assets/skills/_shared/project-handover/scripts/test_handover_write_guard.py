import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("handover_write_guard.py")
spec = importlib.util.spec_from_file_location("handover_guard", SCRIPT)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class HandoverGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.proposal = self.root / "proposal.txt"
        self.proposal.write_text("# New factual chapter\n\nPending until verified.\n", encoding="utf-8")

    def preview(self):
        return guard.inspect(self.root, "docs/pocket/handover", "flows/demo.md", self.proposal)

    def test_preview_does_not_create_document(self):
        p = self.preview()
        self.assertEqual(p["operation"], "create")
        self.assertIn("New factual chapter", p["diff"])
        self.assertFalse((self.root / "docs/pocket/handover/flows/demo.md").exists())

    def test_apply_requires_matching_hash_and_preview(self):
        p = self.preview()
        with self.assertRaises(guard.GuardError):
            guard.apply(self.root, "docs/pocket/handover", "flows/demo.md",
                        self.proposal, "other", p["approvalDigest"])
        result = guard.apply(self.root, "docs/pocket/handover", "flows/demo.md",
                             self.proposal, p["originalSha256"], p["approvalDigest"])
        self.assertTrue(result["changed"])
        self.assertFalse(self.preview()["changed"])
        with self.assertRaises(guard.GuardError):
            guard.apply(self.root, "docs/pocket/handover", "flows/demo.md",
                        self.proposal, p["originalSha256"], p["approvalDigest"])

    def test_human_edit_invalidates_preview(self):
        p = self.preview()
        dest = self.root / "docs/pocket/handover/flows/demo.md"
        dest.parent.mkdir(parents=True)
        dest.write_text("human edit", encoding="utf-8")
        with self.assertRaises(guard.GuardError):
            guard.apply(self.root, "docs/pocket/handover", "flows/demo.md",
                        self.proposal, p["originalSha256"], p["approvalDigest"])
        self.assertEqual(dest.read_text(encoding="utf-8"), "human edit")

    def test_rejects_escaping_and_symlinks(self):
        for path in ("../outside.md", "/absolute.md", ".git/config.json"):
            with self.assertRaises(guard.GuardError):
                self.assertIsNone(guard.inspect(self.root, "docs/pocket/handover", path, self.proposal))
        (self.root / "docs").symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(guard.GuardError):
            self.preview()

    def test_refuses_secret_in_candidate(self):
        self.proposal.write_text("Authorization: Bearer abcdefghijklmnopqrstuvwxyz", encoding="utf-8")
        with self.assertRaises(guard.GuardError):
            self.preview()


if __name__ == "__main__":
    unittest.main()
