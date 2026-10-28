---
name: product-risk-gate
description: 当用户需要单独执行产品研发流水线的「需求风险扫描」阶段时使用。复用总控的步骤契约，读取有效上游产物，仅完成本阶段，不启动整条流程或生产编码。
---

# 需求风险扫描

这是 DSH 的本地单阶段入口，方法与检查清单以 [流水线阶段契约](../product-development-pipeline/steps/03%20需求风险扫描.md) 为准，不维护第二套方法。

1. 读取 [产品需求技能接入规则](../_shared/PRODUCT_DEVELOPMENT.md) 和上述阶段契约，核对目标项目规则、输入版本、适用 Gate 与现有材料。
2. 用户已明确的材料和决定直接复用。输入缺失时指出具体缺项与影响，不假造前序 PASS，不机械重跑全部上游阶段。
3. 仅执行本阶段：PASS 后进入业务方案；FAIL 回退 requirement-clarification 或 requirement-analysis。
4. 输出检查位置、证据、风险/关闭项及回退位置，不写业务代码、不提交。Gate 单独一行标记 `阶段 Gate：PASS`、`阶段 Gate：CONDITIONAL PASS` 或 `阶段 Gate：FAIL`；需回退时另列 `回退阶段：<skill-id>`。有条件通过不能冒充条件已关闭。
5. PRD 与页面规格阶段成功时另列 `阶段结论：READY_FOR_CONSISTENCY`；生图提示词完成时另列 `阶段结论：UI_PROMPT_READY`，并提供使用的 PageId、版本及提示词文件位置。
