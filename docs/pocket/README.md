# Pocket — project knowledge map

Pocket is the canonical Markdown home for this project's requirements, decisions, design, architecture, task knowledge, and pitfalls. The Git repository is the version history; no RAG index is required.

## Always read

- [Knowledge policy](meta/knowledge-policy.md) — document authority, updates and maintenance

## Select documents by task

| Task/trigger | Canonical location | Required next read |
| --- | --- | --- |
| Clarify or freeze requirements | `requirements/` | Relevant feature requirements, then acceptance criteria |
| Implement or review a feature | `requirements/`, `specs/`, `design/` | Current spec and acceptance, then related ADR |
| Change irreversible architecture | `adr/`, `topology/` | Relevant accepted ADRs and system topology |
| Resolve a domain term or naming conflict | `meta/glossary.md` | Term entry and related ADR |
| Investigate a bug or migration | `pitfalls/` | Relevant incident or migration record |
| Track current work | GitHub issues ([tracker](../agents/issue-tracker.md)); local notes in `tasks/` | Relevant issue or task note |
| Manage skills, prompt sources, local changes or upstream upgrades | [Skill 与提示词管理台账](meta/skills-prompts.md) | Source/version inventory, change records and upgrade procedure |

Only link to files that actually exist. No legacy paths are pending migration.

## Knowledge status

- Current/accepted: load for applicable tasks.
- Pending/draft: read only when resolving an open question; never treat as approval.
- Superseded/deprecated: load only for historical investigation; identify the replacing document.

## Current state

- [健康验收按钮与内置技能](requirements/health-acceptance.md) — accepted；默认静态只读、资源固化与旧按钮配置兼容。

- [Windows PowerShell execution guidance](requirements/windows-powershell-guidance.md) — accepted; Windows-only prompt rules and on-demand diagnosis, with no execution-policy changes.

- [固化需求按钮的前置条件](requirements/spec-action-gate.md) — accepted；讨论结论解锁、会话隔离与失败处理。

Create category documents and `meta/glossary.md` lazily when a confirmed fact needs a home; do not scaffold empty folders.

## Maintenance

Review affected entries after requirement/design changes and significant PRs. Run `/pocket-maintenance` monthly or when duplication, contradictory instructions, or stale pointers appear.
