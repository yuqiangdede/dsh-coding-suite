---
name: project-handover-troubleshooting
description: 根据已有日志配置及源码整理可实际查阅的故障排查手册，不执行生产操作。
argument-hint: "模块、故障现象、时间范围/关联 ID"
disable-model-invocation: true
---

# 项目交接 / troubleshooting

这是长期的**项目事实交接**，不是现有的 `handoff` 会话交接。

开始前必须读取以下共享资源并严格遵守：
- [操作规程](../_shared/project-handover/protocol.md)
- [证据与冲突](../_shared/project-handover/evidence.md)
- [目录及模板](../_shared/project-handover/templates.md)
- [差异预览与写入保护](../_shared/project-handover/updates.md)

## 输入
模块、故障现象、时间范围/关联 ID。先确认目标项目版本、范围、知识权威和可用证据。重要缺失项应明确为待确认。

## 本模式任务
从 logger 配置和源码识别日志事件、关联字段、失败出口；只给安全只读排查顺序，线上位置未核实则标记未验证，日志示例必须脱敏。

## 输出及写入门禁
生成接手人员能使用的阅读索引/专题说明、事实依据、覆盖范围、待确认与冲突清单。提供逐文件内容与差异预览，**未得到用户对本次变更的明确确认，只输出草稿，不创建或修改目标文档**。即使确认，也必须写入前复核目标文件是否被他人编辑。禁止改业务代码、环境或执行提交推送。
