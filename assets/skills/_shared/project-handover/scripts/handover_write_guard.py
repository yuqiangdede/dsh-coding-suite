#!/usr/bin/env python3
"""Dry-run and compare-and-swap writes for canonical project handover Markdown.

This checks files, not human consent. The agent MUST obtain approval for the
exact preview before invoking apply. No network or third-party dependencies.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path, PurePosixPath

ABSENT = "absent"
SENSITIVE = re.compile(
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"
    r"(?i:authorization\s*:\s*bearer\s+\S{8,})|"
    r"(?i:(?:password|secret|token|api_key)\s*[:=]\s*['\"]?\S{10,})"
)


class GuardError(ValueError):
    """Unsafe preview or out-of-date proposed change."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_targets(workspace: Path, docs_root: str, target: str) -> tuple[Path, Path]:
    workspace = workspace.resolve(strict=True)
    if not workspace.is_dir():
        raise GuardError("workspace is not a directory")
    for label, value in (("docs_root", docs_root), ("target", target)):
        path = PurePosixPath(value.replace("\\", "/"))
        if not value or path.is_absolute() or any(p in ("..", ".", "") for p in path.parts):
            raise GuardError(f"{label} must be a safe relative path")
        if label == "target" and (path.suffix.lower() != ".md" and path.suffix.lower() != ".json"):
            raise GuardError("target must be a Markdown or JSON document")
    doc_parts = PurePosixPath(docs_root.replace("\\", "/")).parts
    target_parts = PurePosixPath(target.replace("\\", "/")).parts
    if any(p == ".git" for p in (*doc_parts, *target_parts)):
        raise GuardError("never write git metadata")
    current = workspace
    for piece in (*doc_parts, *target_parts):
        current = current / piece
        if current.is_symlink():
            raise GuardError("symlink target is prohibited")
    docs = workspace.joinpath(*doc_parts)
    destination = docs.joinpath(*target_parts)
    if not destination.is_relative_to(docs):
        raise GuardError("target escapes canonical documents")
    return docs, destination


def inspect(workspace: Path, docs_root: str, target: str, proposed: Path) -> dict:
    docs, destination = safe_targets(workspace, docs_root, target)
    if not proposed.is_file() or proposed.is_symlink():
        raise GuardError("proposal must be a regular existing file")
    original = destination.read_bytes() if destination.exists() else None
    if destination.exists() and not destination.is_file():
        raise GuardError("destination is not a regular file")
    candidate = proposed.read_bytes()
    if SENSITIVE.search(candidate.decode("utf-8")):
        raise GuardError("candidate appears to contain credentials; redact first")
    new_text = candidate.decode("utf-8")  # fail on invalid UTF-8
    old_text = (original or b"").decode("utf-8")
    old_hash = digest(original) if original is not None else ABSENT
    new_hash = digest(candidate)
    fingerprint = digest(
        json.dumps([str(workspace.resolve()), docs_root, target, old_hash, new_hash],
                   separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    diff = "".join(difflib.unified_diff(
        old_text.splitlines(keepends=True), new_text.splitlines(keepends=True),
        fromfile=f"a/{docs_root}/{target}" if original is not None else "/dev/null",
        tofile=f"b/{docs_root}/{target}"))
    return {
        "operation": "update" if original is not None else "create",
        "target": str(destination),
        "originalSha256": old_hash,
        "proposedSha256": new_hash,
        "approvalDigest": fingerprint,
        "changed": original != candidate,
        "diff": diff,
    }


def apply(workspace: Path, docs_root: str, target: str, proposed: Path,
          expected_sha256: str, approval_digest: str) -> dict:
    preview = inspect(workspace, docs_root, target, proposed)
    if preview["originalSha256"] != expected_sha256:
        raise GuardError("target changed since preview; regenerate diff and seek reapproval")
    if preview["approvalDigest"] != approval_digest:
        raise GuardError("approval digest mismatch; regenerate preview")
    if not preview["changed"]:
        return {"changed": False, "target": preview["target"]}
    _, destination = safe_targets(workspace, docs_root, target)
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Recheck after creating directories, before atomic replacement.
    refreshed = inspect(workspace, docs_root, target, proposed)
    if refreshed["approvalDigest"] != approval_digest:
        raise GuardError("target changed immediately before write")
    fd, temp = tempfile.mkstemp(prefix=".handover-", dir=destination.parent)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(proposed.read_bytes())
            out.flush()
            os.fsync(out.fileno())
        # Single-file atomic replace; multi-file transactions are not guaranteed.
        if inspect(workspace, docs_root, target, proposed)["approvalDigest"] != approval_digest:
            raise GuardError("target changed during write; re-preview")
        os.replace(temp, destination)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    return {"changed": True, "target": str(destination),
            "writtenSha256": digest(destination.read_bytes())}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("preview", "apply"))
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--docs-root", required=True,
                        help="Canonical document root relative to workspace")
    parser.add_argument("--target", required=True,
                        help="Document path relative to docs-root")
    parser.add_argument("--proposed", type=Path, required=True,
                        help="UTF-8 candidate saved outside the canonical document")
    parser.add_argument("--expected-sha256")
    parser.add_argument("--approval-digest")
    args = parser.parse_args()
    try:
        if args.command == "preview":
            result = inspect(args.workspace, args.docs_root, args.target, args.proposed)
        else:
            if not args.expected_sha256 or not args.approval_digest:
                parser.error("apply requires --expected-sha256 and --approval-digest from approved preview")
            result = apply(args.workspace, args.docs_root, args.target, args.proposed,
                           args.expected_sha256, args.approval_digest)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (OSError, UnicodeError, GuardError) as exc:
        parser.exit(2, f"handover guard: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
