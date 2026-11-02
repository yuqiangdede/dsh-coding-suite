---
name: project-handover-maintain
description: 按模块、版本或时间范围检查过时资料、证据和冲突，生成最小增量更新预览。
argument-hint: "模块、Git Commit/Tag 或明确时区的时间范围"
disable-model-invocation: true
---

# 项目交接 / maintain

这是长期的**项目事实交接**，不是现有的 `handoff` 会话交接。

开始前必须读取以下共享资源并严格遵守：
- [操作规程](../_shared/project-handover/protocol.md)
- [证据与冲突](../_shared/project-handover/evidence.md)
- [目录及模板](../_shared/project-handover/templates.md)
- [差异预览与写入保护](../_shared/project-handover/updates.md)

## 输入
模块、Git Commit/Tag 或明确时区的时间范围。先确认目标项目版本、范围、知识权威和可用证据。重要缺失项应明确为待确认。

## 本模式任务
比对变更并核实实际代码/配置及依赖，只建议受影响的章节差异；检查人工修改，未获针对性批准不得写入。

## 输出及写入门禁
生成接手人员能使用的阅读索引/专题说明、事实依据、覆盖范围、待确认与冲突清单。提供逐文件内容与差异预览，**未得到用户对本次变更的明确确认，只输出草稿，不创建或修改目标文档**。即使确认，也必须写入前复核目标文件是否被他人编辑。禁止改业务代码、环境或执行提交推送。
