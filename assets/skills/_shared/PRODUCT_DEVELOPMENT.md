# 产品需求技能接入规则

本规则适用于随 DSH Coding Suite 集成的产品研发总控与专项 Skill。上游版本、原始文件和本地改动见 [来源清单](../product-development-source.json)，许可与归属见 [NOTICE](../PRODUCT-DEVELOPMENT-NOTICE)。

## 项目范围与知识权威

- 先读目标项目 AGENTS.md、现有需求和知识索引；沿用已确认的输入、决定和输出位置，不重复访谈。目标项目有 Pocket 时按其索引定位需求、设计和决策，不另建 knowledge/、根术语表或第二套 ADR。
- 用户只要求单阶段时完成该阶段即交付；明确授权完整流程时按阶段持续推进，不要求逐阶段重复授权。只在确有影响方向的业务缺口时提出少量问题；沉默不代替业务确认。
- 区分事实、判断、假设和待决策。简单任务按实际范围裁剪，不为模板凑模块、流程或候选方案。
- 用用户语言编写正文；保留稳定的英文 Skill ID、产物 ID 和结果枚举。

## 范围与交接

- 澄清、分析、方案、PRD 和评审不写业务代码、不提交或推送。评审只提出问题，不悄悄改业务规则。文档编制不授权实现。
- DSH 总控默认贯通澄清到 UI 生图提示词，产出提示词后停止；用户明确只要文档或原型时遵循其指定路由。产出提示词不授权实际生图。原型可写所需代码并运行验证，不改生产后端；已有工程先扫描并复用框架、组件、路由和设计变量。
- 版本复盘不因一次问题自动新建 Skill；知识沉淀遵循目标项目已有目录及状态规范。
- PRD、方案和分析是研发输入；后续可固化规格、拆工单或显式启动 coding-workflow。产品 Gate 不代替 Host 的 S1/S2 证据、代码审查、真实 test/build 或批准，不修改 Host 工作流 schema。

## 版本与评审

- 每阶段记录输入路径及版本/提交/内容指纹、已确认事实、结论、待确认项、阻断项、Gate 和下一步；按实际规模合并文档，不建空文件。沿用稳定需求 ID。
- 范围、对象、状态、权限或验收变更后，标记受影响下游评审与 Gate 待复核；旧 PASS 不自动适用于新稿。恢复时核对磁盘文件，复用仍有效的检查点。
- 评审是单独的审计步骤与记录；不得把同一 Agent 切换 Skill 描述成由另一位人员独立验证。作者自检不算正式放行；修改后的稿件须重新评审。
- CONDITIONAL PASS / CONDITIONAL GO 列出允许推进范围、必须关闭项及关闭阶段。FAIL / NO-GO 标明回退位置，不能用假设强行通过。

## 结束标记

单阶段结束时用独立一行输出适用的精确标记，不能在同一产物中列出多个互相冲突的结果。正文保留必要证据和解释；标记只供建议下一步，不是前端强制门禁。

| Skill | 结束时的标记 |
| --- | --- |
| requirement-clarification | `阶段结论：READY_FOR_ANALYSIS` 或 `阶段结论：NEED_MORE_CLARIFICATION` |
| requirement-analysis | `阶段结论：READY_FOR_SOLUTION` 或 `阶段结论：BACK_TO_CLARIFICATION` |
| solution-design | `阶段结论：READY_FOR_PRD`；尚有关键决策时 `阶段结论：NEEDS_DECISION` |
| prd-writing | `阶段结论：READY_FOR_REVIEW`；核心方案缺失时 `阶段结论：BACK_TO_SOLUTION` |
| requirement-review | `需求评审结论：GO` / `需求评审结论：CONDITIONAL GO` / `需求评审结论：NO-GO` |

评审需回退时另列 `回退阶段：requirement-clarification`、`requirement-analysis`、`solution-design` 或 `prd-writing`，按问题指定其一。有条件通过不推荐直接固化；关闭条件并复审为 GO 后再交接。保留 S0–S3 问题及稿件版本，不将“无 S0”一类叙述当作 GO。

分组以完整流水线为主干：澄清 → 分析 → 风险 Gate → 业务方案 → 模块边界 Gate → 数据/状态 Gate → 异常 Gate → PRD/评审/页面规格 → 一致性 Gate → 生图提示词。单阶段澄清/分析/方案成功后的建议下一步须保留风险或结构 Gate，不能直接跳过进入 PRD。

完整流水线沿用 steps/ 的阶段标记与 Gate；不因中间阶段通过就声称全流程结束。启动前核对实际可用 Skill；缺依赖时说明具体缺项并停在当前阶段，不伪造调用或静默替换。辅助的 prd-writing 和 requirement-review 仍可单独调用，但不代替主干的 PRD→独立评审→页面规格步骤。
