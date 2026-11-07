---
name: pocket-maintenance
description: "Audit and prune a repository's Pocket project knowledge: stale/duplicate/conflicting Markdown, broken pointers, and superseded decisions. Propose safe updates for human review."
disable-model-invocation: true
---

# Maintain project knowledge (Pocket-compatible)

Run on the **target project** after significant requirement/architecture/PR changes, and as a recommended **monthly manual audit**. Read [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md) first. This Skill does not install a scheduler or background job. It performs a local, offline audit across the **actual authoritative project documents**, not just Pocket; no embeddings, vector store, or cloud RAG.

## 1. Read and inventory

1. Locate the repository root, inspect Git status and discover its **actual** knowledge index/Agent rules. If `docs/pocket/README.md` exists, read it and the linked policy; otherwise check existing indexes (`docs/README.md`, project-defined paths) and authoritative docs. If **no index exists**, report this and recommend `/setup-matt-pocock-skills` to create/reuse one; you may still perform a read-only inventory, but do not invent an index or move documents.
2. Call the `writing-for-agents` Skill for the pruning, context-pointer, deduplication, and document hierarchy rules before making suggestions.
3. Inventory files under the **active knowledge index** and its referenced authoritative paths, plus project documentation dirs (e.g. requirements, design, operations, ADR, `knowledge/`) where actual competing authorities may live; include `docs/pocket/` when present. Review root `AGENTS.md`/`CLAUDE.md` and their loaded local overlays. Use `git status` to label tracked state so uncommitted work is not skipped. Read indexes/status first; open full documents only for evidence of issues. Inspect candidate duplicates outside Pocket only where scope and filenames suggest an overlap; avoid crawling unrelated dependencies.
4. Examine current requirements, related source/tests/config, ADR successors, task states, and references. A file's age alone does **not** establish it is stale; recent edits do **not** establish correctness.

## 2. Produce an evidence-based audit report

For each finding, provide source path, heading or lines, affected canonical document, evidence, impact, and proposed action:

- **Duplicates:** overlapping authoritative facts that could safely become one home plus links.
- **Conflicts:** mutually incompatible requirements, accepted ADRs, code behavior, or constraints. Distinguish a documented implementation gap from an approved change.
- **Stale material:** outdated instructions or paths supported by source/tests/replacement decisions; note uncertainty explicitly.
- **Unreachable pointers:** nonexistent relative links, missing index entries, or orphan active documents (including non-Pocket locations).
- **Excess context:** always-loaded pointers or overview docs that contain branch-specific detail better moved behind a reference.
- **Lifecycle:** pending decisions that were actually settled, superseded ADRs without successors, completed task notes still listed as active.

Classify each finding as: **safe editorial**, **requires domain decision**, or **insufficient evidence**. Show before/after consolidation targets and dependencies. Do not mark anything obsolete based solely on similarity, age, or a model guess.

## 3. Approval and edits

- Present the proposed diff and request explicit confirmation before **merging, renaming, archiving, deleting, or changing approved requirements, ADR outcomes, acceptance criteria, or operational limits**. Never auto-resolve a substantive conflict.
- With approval, make the smallest consistent change in the **actual per-topic authoritative document**. Replace duplicates with stable relative pointers and update all affected references and the active index, Pocket or otherwise. Preserve decision rationale and required audit evidence.
- Keep historical ADRs in Git with `superseded` or `deprecated` status and a successor reference when applicable. For non-ADR documents, only archive/remove once the user approves the disposition and the links have been checked.
- Respect dirty worktrees, uncommitted user edits, and concurrent changes; never overwrite or reset unrelated edits. Do not commit, push, or modify application source without an explicit request.
- Do not convert `pending` to `accepted`, weaken acceptance criteria, or rewrite a spec to agree with implementation without a domain decision.
- After edits, verify the selected index and relative links across Pocket and reused docs, duplicate authoritative entries, statuses/successors, and `git diff --check` (if Git available). If checks were not run, state that; do not label an inspection as a proof of semantic consistency.

## 4. Finish

Report findings by severity, what changed, what still requires user decision, and checks performed. If no safe edits were approved, return the report without mutating files. Recommend the next monthly review or the next event-driven review; do **not** imply a periodic background job was created.
