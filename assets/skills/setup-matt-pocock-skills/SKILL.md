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

This is a prompt-driven Skill supported by a safe reconciliation script. Read [automatic initialization decisions](../_shared/SETUP_AUTO_DECISIONS.md) before any setup work: **verify the project, auto-apply unambiguous non-destructive recommended fixes, and ask only for real exceptions**. This does not authorize editing approved business documents, deleting data, installing software or changing external systems.

**Fork-specific Pocket extension:** Apply [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md) before [Pocket setup conventions](../_shared/POCKET_SETUP.md) while performing the existing steps below. There is no separate Pocket initializer. Pocket is a lightweight Markdown index and missing-topic fallback, **not** an RAG index or a mandatory parallel document tree.

The Section E `docs/` root cleanup is a narrowly scoped relocation request: plan it explicitly and follow the target project's approval rules. General prohibitions on silent or unapproved migration still apply; they do not prevent an expressly authorized root cleanup.

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

### 2. Present findings, auto-apply safe defaults and ask only for exceptions

Summarise verified present/missing facts, classify each required change as AUTO or NEEDS_DECISION under SETUP_AUTO_DECISIONS.md, and automatically carry out safe recommended choices. Gather only genuinely ambiguous or high-impact decisions in one concise question; do not ask the user to approve an obvious default every time.

Execute routine choices as a single AUTO batch. Skip irrelevant branches (`triage` absent; monorepo-only guidance absent). Do not stop for a yes/no on a recommendation. Only unresolved NEEDS_DECISION items require a user response; prefer one consolidated question with a default when there are multiple real exceptions.

**Section A: Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to it. They need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Auto-select the only clearly indicated Issue Tracker (GitHub/GitLab from an unambiguous remote, otherwise local Markdown in a new remote-less project). Ask only if existing project conventions conflict; writing remote labels or issues still requires separate permission. Default posture: these skills were designed for GitHub. If a `git remote` points at GitHub, use GitHub for the local tracker config. If it points at GitLab (`gitlab.com` or a self-hosted host), use GitLab. Otherwise use the local Markdown default unless a pre-existing tracker configuration proves otherwise. Alternative integrations for explicit user requirements are:

- **GitHub**: issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab**: issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown**: issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other** (Jira, Linear, etc.): ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off**. Leave it off and don't raise it: a user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B: Triage label vocabulary.** Skip this section entirely if the `triage` skill isn't installed (exploration told you), since an uninstalled skill needs no labels.

If installed and no conflicting label vocabulary already exists, use canonical defaults automatically and skip the approval question. Only if there is a real conflict, ask one focused question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Write the defaults when no existing contradictory mapping is present. If the existing tracker uses different real labels (e.g. `bug:triage` for `needs-triage`), prefer preserving its current mapping; never duplicate remote labels automatically.

**Section C: Domain docs and Pocket.** First apply [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md). Map each theme (requirements, design, ADR, glossary, interface, operations) to its **existing authoritative file**. If an index already exists, update it rather than create a duplicate. If no index exists and no existing authoritative index can be found, automatically create a minimal Pocket index/policy as safe setup metadata; even then existing documents stay where they are. For a genuinely large monorepo, use module links within the same active index, not a separate knowledge root.

For a new project without document conventions, `docs/pocket/` may supply missing topic documents lazily. Do not ask just to approve the documented fallback location. If existing documents such as `GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`, `docs/Requirements/` or `docs/Design/` are authoritative, **do not silently relocate, duplicate or reclassify them as legacy**. Report paths and status in the selected index and write `docs/agents/domain.md` with the actual paths. A migration requires a separate approved decision. Some imported Skills may still contain legacy path/output assumptions; inspect the bundled version before claiming full integration. `to-spec` output follows the issue tracker.

**Section D: Unified document and intermediate outputs.** Always complete after sections A–C. Inventory requirements/PRD, designs/ADRs, API/database, acceptance/handover/operations, external issue tracker, Gate/review records, intermediate extraction and conversion caches. Draft `docs/agents/document-layout.md` mapping each category to existing authoritative files or a fallback; choose a single task-specific intermediate work root. Recommend `docs/_work/` unless an established project work directory is preferable. Automatically resolve historical Skill default-path disagreements in favor of the project's already verified document layout, without creating a competing folder or migrating documents. Create missing setup-only layout and work-root README automatically when the safe criteria are satisfied; migration, collision, or editing approved documents still needs explicit approval.

**Section E: docs 根目录整理与中文目录指导。** 完成其他初始化写入后，检查目标项目 `docs/` 根目录：允许保留 `docs/文档目录说明.md` 和已有项目文档索引文件（例如作为索引使用的 `docs/README.md`），不强制搬迁索引；其他文件应整理至下一级目录。根据文件内容、现有索引和项目约定，为需整理的文件选择合适的下一级分类目录；保持内容和主题权威关系，更新项目内受影响的相对链接、索引、配置及 Agent 指针，核对文件和引用。不得仅凭文件名判断是否为索引、覆盖同名文件或臆测分类；索引用途或目的地不明、目的地冲突、权限不足、脏文件或引用无法安全处理时，报告原因并暂停该项。搬迁正式资料前遵循目标项目规则展示源路径、目标路径及引用变更差异并取得必要确认；用户已明确授权具体搬迁时不重复询问。其余初始化独立继续，未解决的文件须报告，不能声称整理完成。不跟随指向项目外的符号链接。

在 `docs/文档目录说明.md` 生成中文指导，只列实际存在的文件夹相对路径及用途（包括工作区文件夹），不逐个介绍或列举文件，也不将本说明文件列为目录条目。根据已有索引和目录约定核实用途，无法判断时写“用途待确认”；说明生成时间、快照性质及重新初始化后可能需要更新。该说明仅作导航，不替代知识索引或主题权威资料；列出无法读取或因权限、安全原因跳过的目录及原因，不复制正文或敏感信息，不创建空分类目录。

若 `docs/文档目录说明.md` 不存在且路径无冲突，作为初始化说明安全创建；若已存在，先读取并保留用户内容，展示拟议差异，未经明确确认不得覆盖或修改。若已有同用途说明或索引，优先复用其已有导航和权威关系；如无法避免形成相互竞争的说明，报告并暂停该项。已有根目录索引不因创建目录指导而被强制搬迁。最后核对根目录、目录清单与引用，报告已保留索引、已移动、跳过、无法读取和待确认项；整理或指导未完成时，不得声称对应工作已完成。

### 3. Apply safe recommendations, confirm only exceptions

Call the model-invocable **`writing-for-agents` Skill** before drafting. Apply its pointer-writing, progressive disclosure, single-owner, and pruning guidance to the Agent instruction block, the Pocket index, and the domain-document pointers. When that Skill cannot be loaded, state the limitation instead of claiming it ran.

For AUTO items, prepare the following content and execute the non-conflicting changes without an extra confirmation turn; show what actually changed afterward. For NEEDS_DECISION items, preview the relevant proposed changes and wait on those items only:

- The `## Agent skills` block to add or update in each loaded root instruction file (`CLAUDE.md` and/or `AGENTS.md`; see step 4 for selection rules)
- The full proposed contents of `docs/agents/document-layout.md` and its chosen work-root `README.md` (including actual location, any pre-existing files and conflicts), plus `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md` (the last only when `triage` is installed)
- The existing index update **or**, if no index exists, the proposed small `docs/pocket/README.md` and policy, plus the root Agent instruction pointer to the actual index. Include authoritative existing paths and any approved migration decisions.

For AUTO cases, minimally edit setup metadata and report completed paths/diffs without a redundant approval request. For NEEDS_DECISION cases, show proposed content and await specific approval before writing that item.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it, respecting existing content.
- Else if `AGENTS.md` exists, edit it, respecting existing content.
- If neither exists, create AGENTS.md as the default safe root instruction file unless a project rule explicitly requires a different filename.

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

When Section B ran on GitHub or GitLab AND the user separately authorized remote label modifications, create each configured label the tracker lacks (`gh label create` / `glab label create`).

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](./triage-labels.md): label mapping (only if `triage` is installed)
- [domain.md](./domain.md): upstream domain doc consumer rules + layout; **adapt it using the Pocket domain template** in [Pocket setup conventions](../_shared/POCKET_SETUP.md) rather than copying its root-glossary defaults when initializing Pocket

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

For AUTO scaffolding, proceed after confirming that the files do not collide with valid existing content; for exceptions await explicit approval. Adapt the bundled [layout template](./document-layout.md) and [work directory README](./work-readme.md). Create `docs/agents/document-layout.md` and the selected work-root `README.md`, making that directory if absent; keep the existing root instructions' pointers accurate. Never claim setup complete until both actual files are present and the layout refers to the project's correct knowledge index. Do not create unrelated business code or install missing Skills without separate permission.

Using [Pocket setup conventions](../_shared/POCKET_SETUP.md), **reuse the existing knowledge index first**. Create `docs/pocket/README.md` and a minimal policy only when no suitable index exists and no competing authoritative index exists; an existing Pocket index may be updated without creating another. Do not create empty category documents or second copies of requirements/designs/operations. Merge existing content without overwriting user decisions. Avoid dangling links and duplicate Agent instruction headings; handle `CLAUDE.md` symlinks without replacing them. Show a summary/diff after AUTO technical changes, confirm only exceptions before writing; validate index links and changed files (`git diff --check` when available). Do not automatically install RAG, relocate existing docs, or commit changes.

**Safe README path correction:** inspect the selected repository's real directory names, then run the bundled `scripts/auto_reconcile.py <project-root> --apply-safe` to fix only uniquely verifiable case-only self-path typos in `docs/<directory>/README.md`. The script skips dirty files and ambiguous paths. Report its `applied`/`skipped` outcome; never claim it handled content that it did not change. Legacy defaults such as `docs/Requirements/` and `docs/pocket/handover/` are only fallback hints and must not override the project layout.

### 5. Done

Report the verified layout path, existing formal authorities, actual intermediate work directory/README, optional temporary-cache root and outstanding Skill output-path conflicts. If the layout or work root has not been created/verified, report setup as incomplete. Tell the user the setup is complete and which engineering skills will now read from these files. Summarize the chosen knowledge index, the real per-topic authoritative paths (including existing non-Pocket files), any Pocket fallback, and imported-Skill compatibility limitations. Mention they can edit `docs/agents/*.md` and Pocket Markdown directly later; rerun setup only to revise the layout or tracker. Recommend `/pocket-maintenance` for later evidence-based cleanup.
