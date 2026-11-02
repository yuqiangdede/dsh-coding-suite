---
name: project-handover-overview
description: 盘点现有项目或指定模块，生成事实可追溯的交接概览、模块导航和运维入口，分批整理。
argument-hint: "全项目或模块/路径、基线和接手人员关注点"
disable-model-invocation: true
---

# 项目交接 / overview

这是长期的**项目事实交接**，不是现有的 `handoff` 会话交接。

开始前必须读取以下共享资源并严格遵守：
- [操作规程](../_shared/project-handover/protocol.md)
- [证据与冲突](../_shared/project-handover/evidence.md)
- [目录及模板](../_shared/project-handover/templates.md)
- [差异预览与写入保护](../_shared/project-handover/updates.md)

## 输入
全项目或模块/路径、基线和接手人员关注点。先确认目标项目版本、范围、知识权威和可用证据。重要缺失项应明确为待确认。

## 本模式任务
先盘点所有可见模块与有效权威文档；建立项目地图、业务功能、流程、日志及部署导航。大型项目按业务域分批，区分已盘点与深度已核实。

## 输出及写入门禁
生成接手人员能使用的阅读索引/专题说明、事实依据、覆盖范围、待确认与冲突清单。提供逐文件内容与差异预览，**未得到用户对本次变更的明确确认，只输出草稿，不创建或修改目标文档**。即使确认，也必须写入前复核目标文件是否被他人编辑。禁止改业务代码、环境或执行提交推送。
