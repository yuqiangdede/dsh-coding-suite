# Preview, approval and incremental maintenance

1. Determine canonical owner and existing target document(s); record current target content hashes and repository SHA. Existing manually maintained paragraphs and accepted ADR/requirements are protected.
2. Build concrete per-file diffs and list new file contents, changed headings, evidence and conflicts. Preview all changes to the user and STOP for explicit approval; this is required for initial generation as well as updates.
3. Only after the user approves THIS exact preview, check hashes/working-tree state again; if they changed, redo preview and ask again. Never force overwrite; when safe merge isn't possible leave a conflict draft.
4. Optional helper scripts/handover_write_guard.py can enforce allowed documentation paths and compare-and-swap file hashes. Its digest/token is only a consistency check, NEVER proof that the user approved.
5. Apply only approved docs. Update index/optional manifest only as part of those approved changes. On partial failure report modified and unmodified files and safe recovery; never claim atomic success when not achieved.

Incremental scope: by module, explicit Git commit/tag range or timezone-bounded time period. Changes in git log/diff are candidates, not necessarily changed behavior. Verify current source/SQL/conditions. Reuse existing main flow or rule document; link from other files. Hash changes flag stale candidates, not semantic truth. No background monitoring, no auto-commit/push.
