<!-- dsh-document-layout:v1 -->
# 项目统一文档布局

根据项目已有文档和知识索引调整本模板，保留唯一有效权威，不复制原文档。路径均相对仓库根。

- 知识索引: `docs/pocket/README.md`
- 中间产物根目录: `docs/_work/`
- 临时缓存根目录: `docs/_work/`

## 按类别选择路径

| 类别 | 优先位置 | 缺失时回退目录 | 说明 |
| --- | --- | --- | --- |
| 正式需求 | 索引中的真实需求/PRD 文档 | `docs/pocket/requirements/` | 正式写入前确认 |
| 设计与架构 | 索引中的设计、ADR | `docs/pocket/design/` | 正式写入前确认 |
| 接口与数据库 | 索引中的 API/数据库文档 | `docs/pocket/specs/` | 正式写入前确认 |
| 验收与交接 | 索引中的验收、交接、运维资料 | `docs/pocket/operations/` | 正式写入前确认 |
| 中间阶段成果 | 任务工作稿 | `docs/_work/<task-id>/` | 记录来源、阶段、状态 |
| 临时缓存 | 不作为权威 | `docs/_work/<task-id>/tmp/` | 任务独立，清理需确认 |
| 外部工单 | `docs/agents/issue-tracker.md` 指定的服务 | 按服务约定 | 保存引用 |

## 维护约束

所有 Skills 和按钮先查此表及知识索引，已有正式资料保留原路径；未使用的分类不预建空目录。中间产物按任务独立存放，需区分 draft、pending 和 verified。变更布局、迁移已有产物或修改已批准资料先预览差异并确认，禁止静默复制或重命名。
