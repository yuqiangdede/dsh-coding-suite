# 项目知识存储位置映射（现有文档优先）

本文件是 `project-knowledge-capture` 的缺省路由表，**不意味着要新建以下所有文件**。优先执行 [文档单一权威位置协议](../../_shared/DOCUMENT_AUTHORITY.md)，目标项目已确认的文档路径和索引优先于本表。

| 知识类型 | 优先复用的现有文档（按项目实际情况） | 无适用位置时的 Pocket 补位 |
| --- | --- | --- |
| 项目概览 | 现有 `README.md`、项目概览文档 | `docs/pocket/overview.md` |
| 业务术语 | 项目术语表、领域说明 | `docs/pocket/meta/glossary.md` |
| 当前业务规则 | 已有需求、业务说明或模块文档 | `docs/pocket/requirements/<主题>.md` |
| 技术/产品决策 | 已有 ADR、设计决策、评审结论 | `docs/pocket/adr/<序号>-<主题>.md` |
| 重要变更 | 现有 `CHANGELOG.md`、需求变更记录 | `docs/pocket/changes/CHANGELOG.md` |
| 数据结论 | 已有数据口径、指标分析文档 | `docs/pocket/data-insights/<主题>.md` |
| 经验教训 | 现有故障复盘、已知问题说明 | `docs/pocket/pitfalls/<主题>.md` |
| 运维部署 | 已有部署、运行手册或运维章节 | `docs/pocket/operations/<主题>.md` |

**注意：**

1. 表中的 Pocket 路径是候选，不是无条件创建指令。已有 `knowledge/`、`docs/Requirements/`、`docs/Design/` 等目录也可能是正式权威，必须识别并复用；不得按路径名字判定其过时。
2. 现有文件覆盖主题时，应原位置修改并维护链接，不在 Pocket 复制内容。索引如 `docs/pocket/README.md`、`docs/README.md` 只存指针与状态。
3. 新增正式文件、修改已批准规则、合并或归档前展示差异并取得确认。临时提炼稿与正式文档分开标记。
4. 每条知识应说明适用范围、状态、来源及变更关系；没有证据的事实标为 `pending`。同一范围不得存在两套互相冲突且都标记 `current` 的规则。

## 内容约定

- 概览：背景、目标、范围、核心角色、关键系统关系和现行知识入口。
- 术语：定义、适用范围和状态，不灌入代码细节。
- 业务规则：按对象组织可执行规则、状态、来源及相关变更。
- 决策：背景、候选、选择及理由、放弃方案、影响、状态和来源。
- 变更：旧规则 → 新规则 → 原因 → 影响范围 → 来源。
- 数据结论：指标口径、时间范围、观察、限制及长期价值。
- 经验：问题证据、根因、改进动作及是否沉淀到 Checklist/SOP。
