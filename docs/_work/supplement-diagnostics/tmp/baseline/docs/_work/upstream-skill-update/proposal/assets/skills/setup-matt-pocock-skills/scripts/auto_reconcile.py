#!/usr/bin/env python3
"""Conservative, offline normalization of self-described docs directory case.

Only files matching docs/<existing-directory>/README.md are considered.
A README's own "docs/<case-variant>/" references may be corrected to the
one existing directory's real spelling. Never create/move directories, rewrite
other docs, modify dirty Git files, or commit changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

SELF_DIR = re.compile(r"(?<![A-Za-z0-9_/])docs/([A-Za-z0-9_.-]+)/")


def dirty(root: Path, path: Path) -> str | None:
    """Without a clean Git baseline, do not edit existing user-owned files."""
    try:
        relative = path.relative_to(root).as_posix()
        result = subprocess.run(
            ["git", "-C", str(root), "status", "--porcelain", "--untracked-files=all", "--", relative],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=10, check=False,
        )
        if result.returncode != 0:
            return "git-status-unavailable"
        return "uncommitted-file" if result.stdout.strip() else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return "git-status-unavailable"


def reconcile(root: Path, apply: bool) -> dict:
    if not root.is_dir() or not (root / "docs").is_dir():
        return {"project": str(root), "applied": [], "proposed": [], "skipped": [{"reason": "no-docs-directory"}]}
    docs = root / "docs"
    if docs.is_symlink():
        return {"project": str(root), "applied": [], "proposed": [], "skipped": [{"reason": "symlink-docs-directory"}]}
    try:
        dirs = [p for p in docs.iterdir() if p.is_dir() and not p.is_symlink()]
    except OSError as exc:
        return {"project": str(root), "applied": [], "proposed": [], "skipped": [{"reason": str(exc)}]}
    names: dict[str, list[str]] = {}
    for entry in dirs:
        names.setdefault(entry.name.casefold(), []).append(entry.name)

    applied, proposed, skipped = [], [], []
    for folder in sorted(dirs, key=lambda x: x.name):
        readme = folder / "README.md"
        if not readme.is_file() or readme.is_symlink():
            continue
        # A canonical spelling is unique only when the file system has one such directory.
        if len(names[folder.name.casefold()]) != 1:
            skipped.append({"file": readme.relative_to(root).as_posix(), "reason": "case-ambiguous"})
            continue
        try:
            original = readme.read_bytes()
            text = original.decode("utf-8")
        except (OSError, UnicodeError):
            skipped.append({"file": readme.relative_to(root).as_posix(), "reason": "not-utf8-or-unreadable"})
            continue
        wrong = sorted({m.group(1) for m in SELF_DIR.finditer(text)
                        if m.group(1).casefold() == folder.name.casefold() and m.group(1) != folder.name})
        if not wrong:
            continue
        relative = readme.relative_to(root).as_posix()
        reason = dirty(root, readme)
        if reason:
            skipped.append({"file": relative, "reason": reason, "expected": f"docs/{folder.name}/"})
            continue
        # Bound the rewrite to this file's own folder name, never to other references.
        rewritten = SELF_DIR.sub(
            lambda m: f"docs/{folder.name}/" if m.group(1).casefold() == folder.name.casefold() else m.group(0),
            text,
        )
        if rewritten == text:
            continue
        change = {"file": relative, "from": [f"docs/{x}/" for x in wrong],
                  "to": f"docs/{folder.name}/",
                  "before_sha256": hashlib.sha256(original).hexdigest()}
        if not apply:
            proposed.append(change)
            continue
        try:
            # Recheck immediately before mutation. Do not overwrite concurrent changes.
            if readme.read_bytes() != original or dirty(root, readme):
                skipped.append({"file": relative, "reason": "changed-during-check"})
                continue
            fd, tmp = tempfile.mkstemp(prefix=".dsh-setup-", dir=str(folder))
            try:
                with os.fdopen(fd, "wb") as output:
                    output.write(rewritten.encode("utf-8"))
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(tmp, readme)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
        except OSError as exc:
            skipped.append({"file": relative, "reason": f"write-failed: {exc}"})
            continue
        change["after_sha256"] = hashlib.sha256(rewritten.encode("utf-8")).hexdigest()
        applied.append(change)
    return {"project": str(root), "applied": applied, "proposed": proposed, "skipped": skipped}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project_root", type=Path)
    parser.add_argument("--apply-safe", action="store_true", help="apply uniquely verifiable changes")
    args = parser.parse_args()
    result = reconcile(args.project_root.resolve(), args.apply_safe)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not any(x.get("reason", "").startswith("write-failed") for x in result["skipped"]) else 2


if __name__ == "__main__":
    sys.exit(main())
