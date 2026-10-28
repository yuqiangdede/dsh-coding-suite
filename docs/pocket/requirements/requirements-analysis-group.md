# 需求分组与产品研发流水线

状态：accepted（2026-10-28）。用户批准实施，并要求整个分组以 product-development-pipeline 为主干，从最初的需求澄清一直推进到最终 UI 生图提示词。

范围：Skill Launcher、技能资产、阶段交接、配置兼容。本文是本功能的权威约定；源码与资源反映实际实现。

## 分组与阶段

分组 ID 为 `requirements-analysis`，中文「需求」，英文 `Requirements`。顺序：常用 → 需求 → 开发 → 文档 → 其他。2026-10-28 按用户要求将分组显示名由「需求分析」改为「需求」；保留 ID、成员、提示词和布局兼容规则，组内「需求分析」阶段名称不变。

新用户默认显示常用、需求、开发；文档/其他隐藏。旧保存布局缺新字段时补为隐藏，不改变原选择。新动作不自动加入常用。

| 顺序 | 入口 | action / Skill ID | 主干 |
| --- | --- | --- | --- |
| 1 | 全流程 | product-development-pipeline | 从澄清到生图提示词的总控 |
| 2 | 澄清 | requirement-clarification | Step 01：问题边界 |
| 3 | 分析 | requirement-analysis | Step 02：价值、根因、范围、规则及验证 |
| 4 | 风险扫描 | product-risk-gate | Step 03：Gate ① |
| 5 | 业务方案 | solution-design | Step 04：模块、对象、流程、状态和权限 |
| 6 | 边界审计 | product-module-gate | Step 05：Gate ②-A |
| 7 | 数据状态 | product-state-gate | Step 06：Gate ②-B1 |
| 8 | 异常检查 | product-exception-gate | Step 07：Gate ②-B2 |
| 9 | PRD/页面 | product-prd-pages | Step 08：PRD → 独立评审 → 页面规格 |
| 10 | 一致性校验 | product-consistency-gate | Step 09：页面/流程/状态/权限 Gate ③ |
| 11 | 生图提示词 | product-image-prompt | Step 10：路由 B |

沿用每组默认 8 个：「更多（3）」展开末尾阶段，各组独立展开/收起，不重排推荐项。`prd-writing`、`requirement-review` 作为辅助入口放其他组；主干 Step 08 复用它们，不维护第二套写作/评审方法。原有固化需求与可视化讨论保留开发组绑定。

## 执行、终点与 Gate

- 点击只插入并保存草稿，用户发送后执行。单阶段只完成对应步骤；总控授权后按阶段持续推进，不逐阶段重复请求授权。复用明确材料/决定，仅就影响方向的缺口询问，不机械重做上游。
- 默认完整流程从澄清贯通到 UI 生图提示词，产出提示词后停止。实际生图须明确请求。用户明确只要文档、原型或某一阶段时遵循指定终点。
- 提示词只消费已评审、通过一致性检查的页面规格，保留 PageId、版本、角色/任务、布局、字段/示例数据、流程、操作前置/结果状态、可见/可操作权限、正常/空/加载/错误/禁用状态和视觉/语言约束，不新增业务规则。
- 一次处理一个目标页面；已授权批量时逐页处理并保留映射，不将多页混成一张图。目标页面未知或关键材料缺失时澄清或回退。
- Gate 使用 PASS / CONDITIONAL PASS / FAIL；评审使用 GO / CONDITIONAL GO / NO-GO，分别记录。失败指定问题、证据、影响和回退位置，不能靠假设放行。
- 条件通过说明允许推进范围、关闭项及截止阶段；最终提示词前须关闭相关条件并复核一致性。先稳定对象/状态，再枚举异常；异常必须有归宿、处理权限和后续入口。
- Step 08 只消费确认设计：写 PRD、另做评审、通过后投影页面。关键设计缺失回退上游，不在写作中偷偷决定。
- 独立评审是单独步骤、审计视角与记录，不把切换 Skill 描述成另一人员或 Agent 独立验证。作者自检不算正式放行；改稿后复审。

阶段产物记录输入路径与版本/提交/指纹、已确认事实、结论、假设、阻断、关闭项及下一步。对象、范围、状态、权限、验收变更后，受影响下游 Gate/评审待复核；旧 PASS 不自动适用于新稿。首版依赖文档规程，不宣传前端自动检测失效。

## 推荐与工程交接

下一步建议保留完整主干：分析 → 风险 Gate → 业务方案 → 模块 Gate → 状态 Gate → 异常 Gate → PRD/评审/页面 → 一致性 Gate → 生图提示词。

前端仅接受明确结束标记，不从“无 S0”“不是 NO-GO”猜测放行；代码示例、引用、未知或相互冲突的结果不作为成功。有条件结果不自动向前推进；显式回退只允许需求阶段。总控自行维护内部阶段，不因中间 PASS 推荐全流程结束。推荐是辅助，不是强制状态机。

现有「固化需求可直接使用」继续有效：无需 PRD 或评审历史即可点击，不增加置灰前置门槛。产品主干与 Host `coding-workflow` 分开；用户可将有效 PRD、方案、评审与验收交给规格/工单/编码。Host S1/S2 仍须核验和登记证据，产品 Gate 不代替代码审查、真实 test/build 或审批，不修改 Host schema。

现有能力保留职责：discussion 仍做工程访谈与领域沉淀；requirements-spec 仍做源码反推、多来源融合与正式需求文档；prototype 仍做单一问题的一次性原型；retro 仍复盘编码会话/Agent 环境；doc-supplement 仍只增量补充既有文档。不静默换绑既有 Skill。

## 来源、资源与本地适配

上游：[My-Prompts / 产品研发固定版本](https://github.com/yuqiangdede/My-Prompts/tree/bfc391e4b48d40ca3b7dfd337b374432c61559d4/技能/skills/产品研发)，提交 `bfc391e4b48d40ca3b7dfd337b374432c61559d4`，Apache-2.0，未发现独立 NOTICE。

导入总控与 9 个专项 Skill，共 10 项，保留 10 步及配套历史参考材料、知识存储协议。本地新增 7 个单阶段适配 Skill，引用总控对应步骤契约，不复制方法正文。全部平铺到 assets/skills/ 一级目录，修正相对路径，沿用现有 provider。

[来源清单](../../../assets/skills/product-development-source.json)记录固定版本、原路径、Git blob ID、许可与本地差异；[许可](../../../assets/skills/PRODUCT-DEVELOPMENT-LICENSE)和[归属记录](../../../assets/skills/PRODUCT-DEVELOPMENT-NOTICE)随包保留。

[共享规则](../../../assets/skills/_shared/PRODUCT_DEVELOPMENT.md)明确项目知识权威、范围、版本、结束标记与评审边界。目标项目已有 Pocket/知识库时遵循其索引，不另建第二套 knowledge/、根术语表或 ADR。历史 references 仅按需参考，不能覆盖当前 Gate、授权与事实边界；小任务不强凑流程或候选数量。

DSH 默认终点按用户要求改为生图提示词，与上游默认可仅交付文档存在差异，已登记为本地适配；明确文档/原型终点仍优先。两类高保真原型与版本复盘、知识沉淀保留可调用，不放进需求主干。

## 配置兼容

布局仍为 schemaVersion=1；只有新增组字段允许缺省并补 false，旧三组必填校验不放宽，显式错误类型仍拒绝。新用户默认 true，保存/导入/导出保留完整字段。旧客户端往返可能丢弃新字段，回新版按缺省隐藏。

动作仍为 schema v3。已保存标签、提示词、Skill、启用状态、顺序及自定义内容不自动覆盖。设置页「补齐缺失预设（待保存）」按缺失 ID 添加新动作，检查后保存；重复补齐不重复，英文界面翻译新增展示字段。补齐超过 100 个时提示且保留原编辑，不截断用户动作。

缺技能沿用通用反馈；总控/阶段启动再核对依赖，缺失时指出并停止，不伪造调用。只读、版本冲突与执行锁沿用既有规则。

## 实现与验证入口

- [分组与布局](../../../src/client/launcher-layout.ts)、[动作](../../../src/client/actions.ts)、[设置](../../../src/client/Settings.tsx)、[字典与接收指令](../../../src/client/locales.ts)、[推荐](../../../src/client/contextual-actions.ts)。
- [总控](../../../assets/skills/product-development-pipeline/SKILL.md)、steps/ 与 7 项本地阶段入口。
- [发布重建](../../../scripts/rebuild-launcher-bundle.mjs)：同步推荐/布局/组件、portable JS/类型与 [bundle](../../../lib/client.js)，仅同步按钮表不足以覆盖本功能。
- [主干回归](../../../tests/requirements-analysis.node.test.mjs)：布局迁移、显式补齐、英文展示、100 上限、版本化保存、推荐/回退、资源链接与 Host 发布 provider 发现/加载。
- [分组交互](../../../tests/launcher-overflow.node.test.mjs)：发布 bundle 的 11 项顺序、8/11 折叠、逐项插入、旧布局隐藏；固化需求回归继续适用。

实际检查结果记录在[技能台账](../meta/skills-prompts.md)。真实宿主 GUI、窄屏/辅助技术，以及小需求/复杂权限状态/NO-GO 模型任务仍需试用；静态与 stub-render 检查不代替这些验证。

相关约定：[分组与更多](launcher-overflow.md)、[固化需求自由使用](spec-action-free.md)。


2026-10-28：按用户要求缩短需求组按钮名称。旧中文预设名仅在 action ID 与 Skill 绑定仍匹配时按上表显示短名；自定义标签和其他字段保持原样，读取不自动写入 Host 配置。英文展示保持不变。
