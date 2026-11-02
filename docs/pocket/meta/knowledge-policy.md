# Knowledge ownership and maintenance

## 项目文件产物统一约束

读取、生成、依赖文档或文件型中间产物前，优先读取 [布局契约](../../agents/document-layout.md) 和知识索引。正式文件继续按主题维护，临时与阶段中间成果集中 `docs/_work/<task-id>/`；初始化建立工作区 README，不创建无内容的空分类目录。变更正式资料依旧必须预览和确认。

## Scope and authority

- 本仓库 `dsh-coding-suite` 已有 `docs/pocket/README.md` 索引，现行 `docs/pocket/requirements/`、`docs/pocket/pitfalls/` 和 `docs/pocket/meta/` 中已确认文件继续在原位置维护。**这不意味着其他目标项目也必须使用同一套目录。**
- 文档 Skill 在目标项目执行时，先遵循 [文档单一权威位置协议](../../../assets/skills/_shared/DOCUMENT_AUTHORITY.md)：用户认可的现有文档路径和知识索引优先；已有需求、设计、ADR、接口和运维文档仍是各自主题的权威；只有缺少合适位置时才按需使用 `docs/pocket/`。
- 知识索引用于路由，不复制正文，不与非 Pocket 已批准文档争夺权威。不主动创建独立 `knowledge/` 目录；如果目标项目已有且认可该目录，应复用而非搬迁。
- Code, executable tests, tool configuration, database migrations and dependency lockfiles remain authoritative for *implemented behavior and installed versions*. Approved requirements and ADRs remain authoritative for *intended behavior*. If these conflict, flag and reconcile; never rewrite approved requirements solely to match code.

## Status and progressive disclosure

- New knowledge should identify status (pending/accepted/superseded/deprecated), scope, source and applicable successors. The project index and this policy are status-exempt meta files.
- Always-loaded instructions should point to the active index. Read task-relevant accepted docs first, then linked evidence/old history as needed; never load every Markdown document automatically.
- Only link to files that exist; update pointers and status when canonical material changes. Avoid duplicated fact sheets, raw conversation transcripts, secrets, user data and large code/config inventories.

## Changes and maintenance

- Before adding or changing an authoritative document, identify the existing location, show the diff and affected references, and obtain confirmation. Preserve dirty working changes and do not silently migrate, rename or overwrite another authority.
- After requirement/architecture changes or substantial PRs, check affected docs and the active index. Suggest a manual `/pocket-maintenance` review monthly to detect duplicates, conflicts, broken links, stale status and archival candidates; no background scheduler is installed.
- Preserve ADR rationale, Git history, statuses and successor links. Never auto-delete a record, auto-resolve a domain conflict, silently accept a draft, or rewrite approved acceptance criteria.
