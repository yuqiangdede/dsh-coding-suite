# 需求阶段中文名称调整预览

状态为 accepted，用户于 2026-11-09 确认，已同步现有需求文档和提示词台账。

拟追加规则为需求组面向用户的阶段名称、下一步建议和待确认说明统一使用中文按钮名称，省略英文技能标识，专业术语用易懂的中文解释。

来源登记为 2026-11-09 用户明确要求，本地改写，依据仓库已有需求按钮与本次用户指令，未引入外部提示词。外部上游路径及版本不适用，许可沿用项目 MIT，具体个人作者身份未知。修改前基线为本轮编辑前工作树，原有未提交内容保留，差异由 Git 保存。

逐项资产为 src/client/actions.ts 中 requirements-next-step 的默认提示词，以及 src/client/locales.ts 中 requirements-next-step、requirement-clarification、requirement-analysis、product-risk-gate、solution-design、product-module-gate、product-state-gate、product-exception-gate、product-prd-pages、product-consistency-gate、product-image-prompt 的中文接收指令。发布包及对应 portable 产物同步重建。

3 项针对性回归通过。尚未执行真实宿主中的多轮模型输出验证。
