## Agent skills

### Issue tracker

GitHub issues in `yuqiangdede/dsh-coding-suite`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

For this repository the existing Pocket documents remain canonical for their topics. Reuse any future accepted documents outside Pocket via the index; do not make duplicate copies. See `docs/agents/domain.md`.

### Document artifacts

所有功能读取或写入项目文档、阶段产物或工作稿前，先读取 `docs/agents/document-layout.md` 与它登记的索引。正式资料保持各主题已有权威路径；分析稿、评审结果、Gate、转换中间文件统一写入 `docs/_work/<task-id>/`，不得套用 Skill 自带的冲突输出目录。调整布局、创建/更改正式资料前先展示差异并确认。

### Project knowledge (Pocket)

Before working on project requirements, design, or code, read `docs/pocket/README.md`, its task-specific pointers, and `docs/pocket/meta/knowledge-policy.md`. Follow [single-authority document routing](assets/skills/_shared/DOCUMENT_AUTHORITY.md): reuse the existing approved file for each topic, even outside Pocket; Pocket is an index and fallback, not a duplicate content tree. Confirm a diff before changing authoritative documents and keep decisions in the correct files, not solely in chat. If source, docs or task instructions conflict, report the discrepancy rather than silently rewriting requirements.

When introducing or adapting any prompt, Skill, or its bundled prompt resources, record the provenance for each asset in `docs/pocket/meta/skills-prompts.md` or its linked source manifest, following its provenance rules. Keep unknown information explicitly unknown and update the record when upgrading the source.
