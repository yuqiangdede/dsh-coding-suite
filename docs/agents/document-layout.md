<!-- dsh-document-layout:v1 -->
# 项目文档与中间产物统一布局

本仓库既有 `docs/pocket/README.md` 为唯一知识索引，正式文件按主题保留当前权威路径。

- 知识索引: `docs/pocket/README.md`
- 中间产物根目录: `docs/_work/`
- 临时缓存根目录: `docs/_work/`

## 按类别选择路径

| 类别 | 优先权威位置 | 仅缺失时回退目录 | 说明 |
| --- | --- | --- | --- |
| 正式需求 | 索引内有效需求、PRD | `docs/pocket/requirements/` | 已批准正文原位维护 |
| 设计与架构 | 索引内有效设计、ADR | `docs/pocket/design/` | 防止第二套架构文档 |
| 接口与数据库 | 既有有效 API、数据库规范 | `docs/pocket/specs/` | 不把源码猜测当承诺 |
| 验收与交接 | 既有验收、部署、运维、交接 | `docs/pocket/operations/` | 先证据核查及差异预览 |
| 中间阶段成果 | 不作为正式权威 | `docs/_work/<task-id>/` | 分析、Gate、评审、来源快照 |
| 临时缓存 | 不作为正式权威 | `docs/_work/<task-id>/tmp/` | 处理部件和检查缓存 |
| 外部工单 | GitHub Issues；`docs/agents/issue-tracker.md` | 依服务约定 | 本地只记录引用 |

## 落盘与更新

每个功能的文件型中间产物必须放已登记的任务子目录；正式文档先查索引中的实际文件，再使用本表回退分类。初始化创建本契约与工作区 README，分类目录仅在有实际内容时按需创建。初始化发现唯一确定的安全工程路径笔误、缺失的配置/目录说明时，可按 SETUP_AUTO_DECISIONS.md 采用推荐并自动修复，完成后展示变动；业务正式资料改写、搬迁、删除或存在两个有效权威时仍需要明确批准。
