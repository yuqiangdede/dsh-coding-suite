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

- [需求分组与产品研发流水线](requirements/requirements-analysis-group.md) — accepted；分组显示名为「需求」，以产品研发流水线为主干，11 个入口从需求澄清到最终 UI 生图提示词，保留阶段 Gate、回退、旧布局和自定义动作兼容。

- [开发分组改名与更多按钮](requirements/launcher-overflow.md) — accepted；每组默认展示前 8 个，更多/收起独立展开，常用分组可控制显示并在页面内编辑成员。

- [增加日志按钮与临时诊断生命周期](requirements/temporary-logging.md) — accepted；针对具体问题最小加日志，临时标识、清理清单与本会话移除提醒，不承诺跨会话自动提醒。

- [自动编码入口与双链路](requirements/automatic-mode.md) — accepted；显示分组同排切换、默认手动、显式发送启动，Agent 根据证据选择 Bug / 需求链路，共用审查与验证门禁。

- [修复完成后仍推荐修复](pitfalls/repair-recommendation.md) — accepted；修复请求归位及遗留问题栏目误判的修正规则。

- [健康验收按钮与内置技能](requirements/health-acceptance.md) — accepted；默认静态只读、资源固化与旧按钮配置兼容。

- [补充文档按钮的增补来源](requirements/doc-supplement-sources.md) — accepted；默认本会话，可改为指定时间段或版本号之后的已提交代码改动。

- [Windows PowerShell execution guidance](requirements/windows-powershell-guidance.md) — accepted; Windows-only prompt rules and on-demand diagnosis, with no execution-policy changes.

- [固化需求按钮可直接使用](requirements/spec-action-free.md) — accepted；取消讨论结论门槛与置灰，仅保留通用禁用规则。

Create category documents and `meta/glossary.md` lazily when a confirmed fact needs a home; do not scaffold empty folders.

## Maintenance

Review affected entries after requirement/design changes and significant PRs. Run `/pocket-maintenance` monthly or when duplication, contradictory instructions, or stale pointers appear.
