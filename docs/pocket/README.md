# Pocket — project knowledge map

本仓库已有的 Pocket 文档继续作为相应主题的权威来源。**Pocket 主要承担知识导航与缺失主题补位，不要求将现有需求、设计、接口和运维文件复制或迁移进来。** 其他目标项目优先复用它们已确认的文档目录与知识索引；Git 保存版本历史，小型项目不需要 RAG。参见 [文档单一权威位置协议](../../assets/skills/_shared/DOCUMENT_AUTHORITY.md)。

## Unified artifact routing

- [统一文档与中间产物路径](../agents/document-layout.md) — 初始化时登记全部功能的正式资料、工作稿、临时缓存和外部工单路径。工作区入口：[docs/_work/README.md](../_work/README.md)；任务子目录按需建立。

## Always read

- [Knowledge policy](meta/knowledge-policy.md) — document authority, updates and maintenance

## Select documents by task

| Task/trigger | Existing authority / fallback location | Required next read |
| --- | --- | --- |
| Clarify or freeze requirements | `requirements/` | Relevant feature requirements, then acceptance criteria |
| Implement or review a feature | `requirements/`, `specs/`, `design/` | Current spec and acceptance, then related ADR |
| Change irreversible architecture | `adr/`, `topology/` | Relevant accepted ADRs and system topology |
| Resolve a domain term or naming conflict | `meta/glossary.md` | Term entry and related ADR |
| Investigate a bug or migration | `pitfalls/` | Relevant incident or migration record |
| Track current work | GitHub issues ([tracker](../agents/issue-tracker.md)); local notes in `tasks/` | Relevant issue or task note |
| Deployment, operations or project handoff | Existing runbook/deployment docs first; `operations/` only if missing | Current version, run instructions and recovery notes |
| Manage skills, prompt sources, local changes or upstream upgrades | [Skill 与提示词管理台账](meta/skills-prompts.md) | Source/version inventory, change records and upgrade procedure |

Only link to files that actually exist. The table's directory names without links are fallback categories, not a command to create empty folders. **本仓库目前没有待迁移的既有权威文档；未来如发现非 Pocket 文档成为某主题的权威，应在这里列出真实路径，继续原位置维护。**

## Knowledge status

- Current/accepted: load for applicable tasks.
- Pending/draft: read only when resolving an open question; never treat as approval.
- Superseded/deprecated: load only for historical investigation; identify the replacing document.

## Current state

- [升级 Spring7 按钮](requirements/spring7-upgrade.md) — accepted；开发组入口，先展示改动位置与方案，人工确认后分阶段升级。

- [可选代码图谱导航](requirements/graphify-navigation.md) — accepted；初始化只诊断，按钮发送后建图或刷新，默认本地代码提取，无后台监听。

- [对话中的按钮使用顺序](requirements/conversation-action-history.md) — accepted；输入区按当前对话已发送消息展示识别出的按钮和自由对话，保留顺序并说明识别限制；可点击定位到对应消息（折叠组先展开，无法定位时提示）。

- [需求分组与产品研发流水线](requirements/requirements-analysis-group.md) — accepted；分组显示名为「需求」，以产品研发流水线为主干，11 个入口从需求澄清到最终 UI 生图提示词，保留阶段 Gate、回退、旧布局和自定义动作兼容。

- [开发分组改名与更多按钮](requirements/launcher-overflow.md) — accepted；每组按可用宽度尽量展示，确实放不下才出现更多/收起（无测量环境回退前 8 个），常用分组可控制显示并在页面内编辑成员。

- [增加日志按钮与临时诊断生命周期](requirements/temporary-logging.md) — accepted；针对具体问题最小加日志，临时标识、清理清单与本会话移除提醒，不承诺跨会话自动提醒。

- [修复完成后仍推荐修复](pitfalls/repair-recommendation.md) — accepted；修复请求归位及遗留问题栏目误判的修正规则。

- [健康验收按钮与内置技能](requirements/health-acceptance.md) — accepted；默认静态只读、资源固化与旧按钮配置兼容。

- [项目交接文档分组](requirements/project-handover.md) — accepted；2026-11-05 确认将「验收文档」和「交接文档」合并为「文档」，历史五按钮方案与当前实现存在差异。支持全项目/指定模块、事实核验、差异预览确认后写入。配套：[技术实施方案（历史建议）](requirements/project-handover-implementation.md)、[验收标准](requirements/project-handover-acceptance.md)。

- [补充文档按钮的增补来源](requirements/doc-supplement-sources.md) — accepted；默认本会话，可改为指定时间段或版本号之后的已提交代码改动。

- [Windows PowerShell execution guidance](requirements/windows-powershell-guidance.md) — accepted; Windows-only prompt rules and on-demand diagnosis, with no execution-policy changes.

- [固化需求按钮可直接使用](requirements/spec-action-free.md) — accepted；取消讨论结论门槛与置灰，仅保留通用禁用规则。

Create category documents and `meta/glossary.md` lazily when a confirmed fact needs a home; do not scaffold empty folders.

## Maintenance

Review affected entries after requirement/design changes and significant PRs. Run `/pocket-maintenance` monthly or when duplication, contradictory instructions, or stale pointers appear. Maintenance audits the active index **and linked authoritative files outside Pocket**; no automatic cleanup is installed.
