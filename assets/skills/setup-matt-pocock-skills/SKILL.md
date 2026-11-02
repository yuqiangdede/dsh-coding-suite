---
name: setup-matt-pocock-skills
description: "Configure this repo for engineering skills: issue tracker, triage labels, and progressive-disclosure Pocket project documentation. Run once before first use."
disable-model-invocation: true
---

# Setup Matt Pocock's Skills

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker**: where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels**: the strings used for the five canonical triage roles
- **Document and intermediate-artifact routing**: one project-wide `docs/agents/document-layout.md` and a real initialized task-work directory (with README). All output-producing skills share the same routes.
- **Project knowledge**: an existing-documents-first authoritative map (reusing existing indexes if available; Pocket only as index/fallback), plus domain documentation rules and safe coexistence with existing glossaries and ADRs

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

**Fork-specific Pocket extension:** Apply [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md) before [Pocket setup conventions](../_shared/POCKET_SETUP.md) while performing the existing steps below. There is no separate Pocket initializer. Pocket is a lightweight Markdown index and missing-topic fallback, **not** an RAG index or a mandatory parallel document tree.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists; don't assume:

- `git remote -v` and `.git/config`: is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root: does either exist? Is there already an `## Agent skills` section in either?
- `GLOSSARY.md` and `GLOSSARY-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/`: does this skill's prior output already exist?
- Existing path contract: check `docs/agents/document-layout.md`, the registered intermediate work-root README, and historical default output folders from bundled Skills. Inspect existing files without migrating them.
- Existing project documentation: check `docs/README.md`, `docs/pocket/`, `docs/Requirements/`, `docs/Design/`, `docs/adr/`, `knowledge/`, and project-specific requirement, interface, deployment and operations locations. Inspect real content/status and any knowledge policy; identify authoritative files **per topic**, not just by directory name.
- Optional Graphify code navigation: check whether the `graphify` executable and `graphify-out/graph.json` exist. Report availability and offer the `graphify-navigation` skill for explicit setup; do not install, build, start a watcher, or modify hooks as part of this diagnostic.
- `.scratch/`: a sign that a local-markdown issue tracker convention is already in use
- Is the `triage` skill installed? (a `triage` skill folder alongside this one, or `triage` in your available skills.) This decides whether Section B runs at all.
- Monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. These are present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.

### 2. Present findings and ask

Summarise what's present and what's missing. Then take the sections in order. One section, one answer, then the next.

Lead each section with the recommended answer so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches; skip the section entirely when exploration already settled it (Section B when `triage` isn't installed, Section C when there's no monorepo).

**Section A: Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it. They need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. Otherwise (or if the user prefers), offer:

- **GitHub**: issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab**: issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown**: issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.): ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off**. Leave it off and don't raise it: a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B: Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you), since an uninstalled skill needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as-is. Only if the user says no, usually because their tracker already uses other names (e.g. `bug:triage` for `needs-triage`), collect the overrides so `triage` applies existing labels instead of creating duplicates.

**Section C: Domain docs and Pocket.** First apply [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md). Map each theme (requirements, design, ADR, glossary, interface, operations) to its **existing authoritative file**. If an index already exists, update it rather than create a duplicate. If no index exists, propose a minimal Pocket index and policy on approval; even then existing documents stay where they are. For a genuinely large monorepo, use module links within the same active index, not a separate knowledge root.

For a new project without document conventions, `docs/pocket/` may supply missing topic documents lazily. If existing documents such as `GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`, `docs/Requirements/` or `docs/Design/` are authoritative, **do not silently relocate, duplicate or reclassify them as legacy**. Report paths and status in the selected index and write `docs/agents/domain.md` with the actual paths. A migration requires a separate approved decision. Some imported Skills may still contain legacy path/output assumptions; inspect the bundled version before claiming full integration. `to-spec` output follows the issue tracker.

**Section D: Unified document and intermediate outputs.** Always complete after sections A–C. Inventory requirements/PRD, designs/ADRs, API/database, acceptance/handover/operations, external issue tracker, Gate/review records, intermediate extraction and conversion caches. Draft `docs/agents/document-layout.md` mapping each category to existing authoritative files or a fallback; choose a single task-specific intermediate work root. Recommend `docs/_work/` unless an established project work directory is preferable. Flag Skills whose historical output defaults disagree. Do not migrate old documents or create new folders until the user confirms the proposed file list and changes.

### 3. Confirm and edit

Call the model-invocable **`writing-for-agents` Skill** before drafting. Apply its pointer-writing, progressive disclosure, single-owner, and pruning guidance to the Agent instruction block, the Pocket index, and the domain-document pointers. When that Skill cannot be loaded, state the limitation instead of claiming it ran.

Show the user a draft of:

- The `## Agent skills` block to add or update in each loaded root instruction file (`CLAUDE.md` and/or `AGENTS.md`; see step 4 for selection rules)
- The full proposed contents of `docs/agents/document-layout.md` and its chosen work-root `README.md` (including actual location, any pre-existing files and conflicts), plus `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md` (the last only when `triage` is installed)
- The existing index update **or**, if no index exists, the proposed small `docs/pocket/README.md` and policy, plus the root Agent instruction pointer to the actual index. Include authoritative existing paths and any approved migration decisions.

Let them edit before writing.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create; don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa); always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

When both `AGENTS.md` and `CLAUDE.md` already exist, DSH loads both (identical content is deduplicated). Update the `## Agent skills` block in each loaded file, or reconcile the other file's stale domain and Pocket pointers, so the repository does not carry two different knowledge destinations.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of active domain docs and legacy exceptions]. See `docs/agents/domain.md`.

### Document and intermediate artifact layout

Before creating, reading, or relying on any document, report, Gate result or intermediate file, read `docs/agents/document-layout.md` and its knowledge index. Reuse existing authorized formal destinations. Save intermediate files only under the mapped work-root's task subdirectory. Never override this layout with a hardcoded Skill default.

### Project knowledge (Pocket)

Before working on project requirements, design, or code, read `[actual project knowledge index]` and its task-specific pointers. Follow the documented authoritative locations for each topic; reuse existing requirements, designs, ADRs and operations files before considering `docs/pocket/` for missing topics. Write confirmed decisions to their authoritative files, not solely in chat. If source, existing docs, or task instructions conflict, report the discrepancy rather than silently rewriting requirements. Replace the bracketed placeholder with the actual index path.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it isn't, both are omitted.

When Section B ran on GitHub or GitLab, create each configured label the tracker lacks (`gh label create` / `glab label create`).

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](./triage-labels.md): label mapping (only if `triage` is installed)
- [domain.md](./domain.md): upstream domain doc consumer rules + layout; **adapt it using the Pocket domain template** in [Pocket setup conventions](../_shared/POCKET_SETUP.md) rather than copying its root-glossary defaults when initializing Pocket

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

After the user approves the preview, adapt the bundled [layout template](./document-layout.md) and [work directory README](./work-readme.md). Create `docs/agents/document-layout.md` and the selected work-root `README.md`, making that directory if absent; keep the existing root instructions' pointers accurate. Never claim setup complete until both actual files are present and the layout refers to the project's correct knowledge index. Do not create unrelated business code or install missing Skills without separate permission.

Using [Pocket setup conventions](../_shared/POCKET_SETUP.md), **reuse the existing knowledge index first**. Create `docs/pocket/README.md` and a minimal policy only when no suitable index exists and that proposal is approved; an existing Pocket index may be updated without creating another. Do not create empty category documents or second copies of requirements/designs/operations. Merge existing content without overwriting user decisions. Avoid dangling links and duplicate Agent instruction headings; handle `CLAUDE.md` symlinks without replacing them. Show target file diffs and confirm before writes; validate index links and changed files (`git diff --check` when available). Do not automatically install RAG, relocate existing docs, or commit changes.

### 5. Done

Report the verified layout path, existing formal authorities, actual intermediate work directory/README, optional temporary-cache root and outstanding Skill output-path conflicts. If the layout or work root has not been created/verified, report setup as incomplete. Tell the user the setup is complete and which engineering skills will now read from these files. Summarize the chosen knowledge index, the real per-topic authoritative paths (including existing non-Pocket files), any Pocket fallback, and imported-Skill compatibility limitations. Mention they can edit `docs/agents/*.md` and Pocket Markdown directly later; rerun setup only to revise the layout or tracker. Recommend `/pocket-maintenance` for later evidence-based cleanup.
