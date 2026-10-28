# Skill 与提示词管理台账

状态：accepted（当前资产盘点）；升级流程为维护建议，未核实的来源、差异和兼容性均明确标注，不代表已修复或已获升级授权。

盘点日期：2026-10-26（Asia/Shanghai）。维护人：项目维护者。

范围：本仓库内置 Skill、附带规则/模板/脚本、按钮默认提示词、附加接收指令、系统注入及提醒。**不包含宿主 DSH 的完整默认提示词、其他插件/用户目录的 Skill、用户已保存的按钮配置正文。**

## 1. 如何使用这份文档

- **找内容在哪改**：看第 2 节分层入口、第 5 节按钮清单。
- **查引用谁、升级哪个版本**：看第 3～4 节来源台账。
- **自己修改后留记录**：按第 8 节追加变更记录；不要只改提示词、不记修改原因。
- **上游有新版**：按第 7 节先保留旧上游基线、本地版本和新上游版本，再三方比较，不能整目录覆盖。
- **检查是否又改过**：使用[首次文件指纹基线](<baselines/skills-prompts-2026-10-26.json>)。基线收录 188 个文件的原始字节 SHA-256，包括全部 Skill 资产和选定的提示词源码/发布入口。

本文件只保存目录、来源、差异说明和维护记录；提示词全文以链接指向的源码/资源为准，不再复制一份易过时的全文合集。[Pocket 知识维护政策](<knowledge-policy.md>)仍是文档权威规则。

### 1.1 本次基线究竟代表什么

以下是 **2026-10-26 10:43:33 +08:00 采集时**的记录，不是永远随 HEAD 更新的状态。10:48 复核时仓库已出现外部提交 `4356e02caf676281cdc9a51c681ad40379da0317`，健康验收已纳入版本控制；本次文档整理未执行该提交。基线后的变化见第 8 节。

| 项目 | 采集时记录 |
| --- | --- |
| 插件版本 | [包配置](<../../../package.json>)记录 `0.2.1`，不是每个 Skill 的上游版本 |
| 仓库 HEAD | `01fe92bc8ab5def973cb108b6256171ab68db2f1` |
| 工作树 | **非干净状态**；已有按钮、健康验收等未提交/未跟踪改动，已纳入文件指纹，不等同于 HEAD 的内容 |
| 内置 Skill | 31 个；HEAD 已跟踪 30 个，健康验收目录尚未跟踪 |
| 默认按钮 | 30 个：24 个 Skill 类型、6 个纯提示词类型；10 个固定在快捷栏 |
| 上游核验 | 未联网，未与上游内容逐文件比较；Matt 固定 revision 是既有元数据记录，不是本次验真的结论 |
| 用户实际生效设置 | 未导出宿主 `actionsJson`，不能据默认按钮表断言每个用户当前看到或使用的提示词 |

指纹基线**不是上游原版、不是备份、不是内容快照**，不能靠 SHA 恢复旧提示词。换行符变化也会改变指纹。需要回滚时，必须能取得对应 Git 提交或另存的原始包。健康验收资产在采集时尚未提交、复核时已由外部提交纳入版本控制；首次基线保持原样，本次未代为提交。

## 2. 提示词分层与权威入口

不能把“默认提示词”看作一个文件：一次请求可能同时涉及按钮文本、附加指令、Skill 方法和宿主系统规则。下面是来源分层，**不是消息优先级排序**。

| 层/资产 ID | 权威入口 | 内容及生效方式 | 升级要点 |
| --- | --- | --- | --- |
| SKILL:* | 各 Skill 的入口，见第 3～4 节 | YAML `description` 供发现；正文在调用时由 provider 读取、移除 frontmatter 后返回 | 同时检查正文、参考材料、模板、脚本，不只换入口文本 |
| RESOURCE:* | 各 Skill 相邻 `references/`、`scripts/`、模板、HTML、许可及 `agents/openai.yaml` | 细化方法、输出格式、示例及工具；不代表全部会自动载入模型 | 整个资源目录作为升级单元；保留归属及许可 |
| SHARED | [共享说明](<../../../assets/skills/_shared/README.md>)、[工具策略](<../../../assets/skills/_shared/TOOLING_POLICY.md>)、[证据规范](<../../../assets/skills/_shared/EVIDENCE.md>)、[Pocket 初始化规范](<../../../assets/skills/_shared/POCKET_SETUP.md>) | 多个文档 Skill 共享的规则及 Python 辅助工具；不是独立 Skill | 修改会影响多个技能，需检查所有引用方 |
| ACTION:* | [默认按钮表](<../../../src/client/actions.ts#L18-L49>) | 按钮自带的范围限制、操作要求；Skill 按钮会拼接 `/skill-id` | 已保存配置与新默认值分离，见第 6 节 |
| RECEIVING:* | [接收指令与文档政策](<../../../src/client/locales.ts#L219-L248>)、[附加逻辑](<../../../src/client/contextual-actions.ts#L281-L295>) | 按 action ID 加接收指令；7 个文档动作共用文档接收指令；4 个编码动作另加产品文档政策 | 改按钮 prompt 不等于改了完整请求；中英文附加指令均须核对 |
| SYSTEM:windows | [Windows 系统注入](<../../../src/windows-powershell.ts>)、[Host 注册](<../../../src/index.ts#L67-L68>) | 仅 Windows 注入 8 条预防规则，section 为 `coding-suite:windows-powershell`、order=1050、禁止插值 | 是行为指导，不是命令拦截或安全权限变更；需重载 Host 插件 |
| NOTICE:todo | [进度提醒](<../../../src/todo-progress-guard.ts#L100-L105>) | 独立守卫加载后，成功 `todo_write` 后累计至少 5 次工具调用、90 秒未同步且符合 90 秒冷却才注入 notice | 不自动更新 todo；本仓库主入口/默认 patch 未自动挂载此独立导出，运行环境是否启用须另查 |
| TOOL:workflow | [工作流工具说明/参数](<../../../src/workflow/tool.ts>) | `coding_workflow` 的 description、参数描述和 `nextStep` 也影响模型行为 | 与 Skill 正文、Host 实际支持的动作同步核对 |
| PROJECT:instructions | [项目指令](<../../../AGENTS.md>)、[领域指针](<../../agents/domain.md>)、[跟踪器指针](<../../agents/issue-tracker.md>)及 Pocket | 目标仓库特有约束与事实，并非通用 Skill 的上游内容 | 跟随项目管理，不能被更新通用 Skill 时覆盖 |
| HOST:external | 本仓库之外，由宿主 DSH、工具、其他插件及用户配置提供 | 宿主默认系统提示、工具定义、动态技能目录、运行上下文等 | 本次未扫描宿主安装目录，不把会话中可见的所有提示词归本插件所有 |

补充说明：

- [Skill provider](<../../../src/skill-provider.ts#L43-L96>)从包内 `assets/skills` 的一级可见目录动态发现，跳过 `_` 和 `.` 开头目录；可用绝对路径 `assetRoot` 替换整个来源根，不是追加合并。
- Skill 名称取目录名。注册摘要读取 description，调用时重新读正文。当前实现统一设置 `modelInvocable=true`、`userInvocable=true`，未据 `disable-model-invocation` 或 `agents/openai.yaml` 限制隐式调用；不能仅看 YAML 就认为限制已执行。
- [Launcher 插入逻辑](<../../../src/client/Launcher.tsx#L66-L89>)只插入并保存草稿，不自动发送。Skill 类型先核对会话技能可用性，且必须位于消息开头；纯提示词直接插入文本，无额外业务参数表单。
- `withEvidence` 当前仅附加接收指令，不复制历史报告正文。推荐下一步是基于可见会话的提示，不是自动执行状态机。
- [英文展示表](<../../../src/client/actions.ts#L63-L97>)只翻译名称、说明和示例，默认核心 prompt 仍为中文；接收指令单独提供中英文。
- [工作流面板](<../../../src/client/WorkflowPanel.tsx>)只显示阶段、阻塞与暂停/继续，不提供自动执行模式；用户显式发送后才推进，Agent 依据证据选择 Bug / 需求链路，见 [Skill 正文](<../../../assets/skills/coding-workflow/SKILL.md>)。
- [工作流持久化 schema](<../../../src/workflow/spec.ts>)是数据结构，不是提示词；不要与按钮配置的 `schemaVersion` 混淆。

## 3. 明确登记上游的 Skill：Matt Pocock，19 项

共同来源：[mattpocock/skills](<https://github.com/mattpocock/skills>)。登记 revision：`5beb35b040e3de97e54fa9e386d7e42d15c295c2`。证据为[上游来源元数据](<../../../assets/skills/matt-source.json>)及 [Matt MIT 许可](<../../../assets/skills/MATT-LICENSE>)，各目录还保留许可文件。

**当前不能认定这 19 项均“原样引用”**：本地未取得可供对照的上游对象，本次没有网络比对。初始导入到本项目不等于未改过；下表的“待核验”是本地相对该上游 SHA 的差异未核验。

| Skill / 入口 | 作用 | 本地适配/升级备注 |
| --- | --- | --- |
| [ask-matt](<../../../assets/skills/ask-matt/SKILL.md>) | 技能/流程路由 | 差异待核验；存在指向未内置技能的路由，见第 9 节 |
| [implement](<../../../assets/skills/implement/SKILL.md>) | 按规格/工单实现 | 差异待核验；按钮另加单阶段边界 |
| [prototype](<../../../assets/skills/prototype/SKILL.md>) | 一次性原型 | 差异待核验 |
| [improve-codebase-architecture](<../../../assets/skills/improve-codebase-architecture/SKILL.md>) | 架构候选与可视化报告 | 差异待核验；[报告规范](<../../../assets/skills/improve-codebase-architecture/HTML-REPORT.md>)使用在线 CDN，离线可用性须另验 |
| [research](<../../../assets/skills/research/SKILL.md>) | 一手资料研究 | 差异待核验 |
| [retro](<../../../assets/skills/retro/SKILL.md>) | 复盘 | 差异待核验 |
| [domain-modeling](<../../../assets/skills/domain-modeling/SKILL.md>) | 领域术语和决策 | 差异待核验；仍含根术语表/旧 ADR 路径假设，不等于已全面适配 Pocket |
| [codebase-design](<../../../assets/skills/codebase-design/SKILL.md>) | 深模块设计方法 | 差异待核验 |
| [writing-for-agents](<../../../assets/skills/writing-for-agents/SKILL.md>) | Agent 文档写法 | 差异待核验 |
| [pr](<../../../assets/skills/pr/SKILL.md>) | PR 文案 | 差异待核验；[二级来源说明](<../../../assets/skills/pr/CREDITS.md>)另记 Humanlayer/show-me 内容，版本及许可链待补 |
| [grilling](<../../../assets/skills/grilling/SKILL.md>) | 深入澄清 | 差异待核验 |
| [grill-with-docs](<../../../assets/skills/grill-with-docs/SKILL.md>) | 澄清并沉淀文档 | 差异待核验；核对目标项目 Pocket 权威路径 |
| [to-spec](<../../../assets/skills/to-spec/SKILL.md>) | 固化规格 | 差异待核验；跟踪器及输出约定需核对 |
| [to-tickets](<../../../assets/skills/to-tickets/SKILL.md>) | 拆分可验收工单 | 差异待核验 |
| [tdd](<../../../assets/skills/tdd/SKILL.md>) | 测试驱动开发 | 差异待核验 |
| [code-review](<../../../assets/skills/code-review/SKILL.md>) | 标准与规格双轴审查 | 差异待核验 |
| [diagnosing-bugs](<../../../assets/skills/diagnosing-bugs/SKILL.md>) | 复现、根因和修复 | 差异待核验 |
| [setup-matt-pocock-skills](<../../../assets/skills/setup-matt-pocock-skills/SKILL.md>) | 配置工程技能依赖 | 正文明确自称 `Fork-specific Pocket extension`；保留共享 Pocket 规范。是文本声明证据，尚非已核验上游 diff |
| [handoff](<../../../assets/skills/handoff/SKILL.md>) | 上下文交接 | 差异待核验 |

升级以固定 SHA 为基准，不使用浮动 `main` 代替旧基线；如果分批升级，应逐 Skill 记录新版本，不能只修改一个全局 revision 让其余技能看似一起升级。

## 4. 其他 Skill：本地集成、借鉴、附件及来源待确认，12 项

“本地资产”表示当前由本仓库维护，**不等于确认原创版权**。没有来源记录不能自动归为“自己的原创 Skill”。

| Skill / 入口 | 当前分类与来源证据 | 固定版本/本地适配 | 需补记录或依赖 |
| --- | --- | --- | --- |
| [coding-workflow](<../../../assets/skills/coding-workflow/SKILL.md>) | 本仓库集成；伴随辅助脚本自称 Fork-owned | 初始提交 `c9781f5` 已存在；Host 权威工作流与原生 Goal 协作、仅本地提交、异常审批 | 无独立上游版本；不据此证明全部正文原创；工具动作冲突见第 9 节 |
| [pocket-maintenance](<../../../assets/skills/pocket-maintenance/SKILL.md>) | 本地 Pocket 管理资产，外部内容来源待确认 | 初始提交已存在；离线审计及人工确认修改 | 补作者/来源及演变记录 |
| [windows-powershell](<../../../assets/skills/windows-powershell/SKILL.md>) | 有本项目新增功能的 Git/需求证据，外部来源未登记 | 提交 `01fe92b` 新增；[需求说明](<../requirements/windows-powershell-guidance.md>)与系统注入配套 | 关联 `diagnose-windows-sandbox-acl` 由宿主另供，本仓库未内置 |
| [api-integration-docs](<../../../assets/skills/api-integration-docs/SKILL.md>) | 本地文档技能，来源待确认 | 初始提交已存在；引用共享工具/证据规范 | 补来源作者、原始输入和版本 |
| [database-design-doc](<../../../assets/skills/database-design-doc/SKILL.md>) | 本地文档技能，来源待确认 | 初始提交已存在；SQL/源码证据与共享工具 | 同上 |
| [component-doc-merge](<../../../assets/skills/component-doc-merge/SKILL.md>) | 本地文档技能，来源待确认 | 初始提交已存在；产品级融合及 Word 交接 | 同上；与 Word 转换技能一同核对 |
| [requirements-spec](<../../../assets/skills/requirements-spec/SKILL.md>) | 本地适配；含用户提供的源码反推提示词与第三方方法 | [内容校审参考](<../../../assets/skills/requirements-spec/references/content-review.md>)声明适配 Anthropic doc-coauthoring 三阶段方法；[源码反推原提示词](<../../../assets/skills/requirements-spec/references/reverse-requirements.md>)已随包保留 | 原材料作者、授权、固定版本未登记；借鉴方法不等于全文复制 |
| [overall-design](<../../../assets/skills/overall-design/SKILL.md>) | 本地设计技能，正文来源待确认 | 初始提交已存在；[制图规范](<../../../assets/skills/overall-design/references/diagrams.md>)要求外部 diagram-design | `cathrynlavery/diagram-design` 未固定版本、未内置；这是依赖，不是本技能的已证内容上游 |
| [outline-design](<../../../assets/skills/outline-design/SKILL.md>) | 本地设计技能，正文来源待确认 | 初始提交已存在；[制图规范](<../../../assets/skills/outline-design/references/diagrams.md>)要求外部 diagram-design | 同上 |
| [markdown-to-docx](<../../../assets/skills/markdown-to-docx/SKILL.md>) | 本地实现，明确公开借鉴 | 正文“实现参考”链接 github/awesome-copilot 的 md-to-docx、desmondc9/agent-skills 的 markdown-to-docx | 两者均为浮动路径，未固定 SHA；补参考版本/许可确认，不当作整份已复制 |
| [grill-with-ui](<../../../assets/skills/grill-with-ui/SKILL.md>) | 明确第三方版权，非 Matt 来源清单中的项 | [目录 MIT 许可](<../../../assets/skills/grill-with-ui/LICENSE>)为 `Copyright (c) 2026 Jason Ku` | 上游仓库、固定 SHA、本地差异未登记；页面和服务脚本要一起管理 |
| [project-runtime-acceptance](<../../../assets/skills/project-runtime-acceptance/SKILL.md>) | 用户附件导入并本地适配 | [需求](<../requirements/health-acceptance.md>)记载附件 v1.0.0；[技能说明](<../../../assets/skills/project-runtime-acceptance/README.md>)记载 1.0.0（2026-10-26）；provider 固化、原安装入口改为兼容提示 | 采集时未跟踪，10:48 复核已在外部提交 `4356e02` 中；附件作者/原包指纹/授权/上游仓库未登记，本次无原附件可做精确差异比较 |

### 4.1 资源需要成套管理

- 共享目录包含 4 份规则文档及 9 个 Python 文件（工具与测试）。单独复制某个文档 Skill 时不能假定共享目录仍可访问。
- 健康验收包含 12 领域规则、3 份模板、候选扫描器与测试，共 20 个文件；规则或模板更新也算提示词/技能升级，不只修改版本号。
- Word 转换除 Python、Pandoc、python-docx 外，图形类型可能要求 Mermaid CLI/浏览器、Pillow、CairoSVG、matplotlib 或 vl-convert 等。是否安装及实际兼容性应按环境探测，本次未运行转换，不能声明全部可用。
- 本会话还可见 office、沙箱诊断等宿主技能，但不属于此 31 项清单；“当前会话有”与“插件发布包内置有”要分开记。

## 5. 默认按钮及其携带的提示词

以下每个名称均链接到[默认按钮表](<../../../src/client/actions.ts#L18-L49>)的对应行，**点开即可查看完整默认 prompt、说明和示例**。表中只记录用途和边界，避免与源码形成第二份全文权威。`★` 表示默认固定在快捷栏；所有默认项均启用。

| Action ID / 名称 | 类型 / Skill ID | 排序 | 提示词职责摘要 |
| --- | --- | --- | --- |
| [initialize / 初始化](<../../../src/client/actions.ts#L19>) | skill / setup-matt-pocock-skills | 5 | 核对配置缺失及影响；改配置/安装前确认 |
| [ask / 咨询](<../../../src/client/actions.ts#L20>) | skill / ask-matt | 8 | 比较下一步，只建议不代执行 |
| [discussion / 需求讨论 ★](<../../../src/client/actions.ts#L21>) | skill / grill-with-docs | 10 | 只澄清范围、约束、验收，不实现 |
| [visual / 可视化讨论](<../../../src/client/actions.ts#L28>) | skill / grill-with-ui | 15 | 只问答收敛界面决策并回写 |
| [spec / 固化需求 ★](<../../../src/client/actions.ts#L22>) | skill / to-spec | 20 | 只写可验收规格，不拆单/实现 |
| [plan / 拆分工单](<../../../src/client/actions.ts#L23>) | skill / to-tickets | 30 | 依赖、阻塞和独立验证，不编码 |
| [execute / 编码 ★](<../../../src/client/actions.ts#L37>) | skill / implement | 40 | 先确认排查能力；按规格实现并跑相关测试，不完整编译/审查/提交 |
| [bug / Bug 排查 ★](<../../../src/client/actions.ts#L25>) | skill / diagnosing-bugs | 50 | 复现、根因证据、最小修复及验证 |
| [add-logs / 增加日志 ★](<../../../src/client/actions.ts>) | prompt | 55 | 针对具体问题临时加日志，脱敏/可控启停、TEMP-DIAG 标记、清理清单与本会话移除提醒；见[生命周期约定](<../requirements/temporary-logging.md>) |
| [review / 代码审查 ★](<../../../src/client/actions.ts#L26>) | skill / code-review | 60 | 只输出带编号、优先级、位置、影响和验证的问题 |
| [health-acceptance / 健康验收 ★](<../../../src/client/actions.ts#L27>) | skill / project-runtime-acceptance | 65 | 12 领域静态只读；先确认报告路径，修复另授权 |
| [review-fix / 修复审核问题 ★](<../../../src/client/actions.ts#L42>) | prompt | 70 | 仅修明确审查问题/失败证据并回归 |
| [compile / 编译 ★](<../../../src/client/actions.ts#L43>) | prompt | 80 | 只做构建检查，失败不擅自修复 |
| [commit / 提交代码 ★](<../../../src/client/actions.ts#L41>) | prompt | 90 | 核对范围后提交，不构建/测试/推送；汇总增删行和文件数 |
| [tdd / 测试驱动开发](<../../../src/client/actions.ts#L29>) | skill / tdd | 120 | 失败测试→最小实现→相关验证 |
| [prototype / 制作原型](<../../../src/client/actions.ts#L30>) | skill / prototype | 125 | 验证未决问题，原型不并产品 |
| [architecture / 架构优化](<../../../src/client/actions.ts#L31>) | skill / improve-codebase-architecture | 126 | 给候选及取舍，先供选择 |
| [api-docs / 接口文档](<../../../src/client/actions.ts#L32>) | skill / api-integration-docs | 130 | 字段、示例、源码依据，不改实现 |
| [requirements / 需求文档](<../../../src/client/actions.ts#L33>) | skill / requirements-spec | 140 | 区分确认结论和待确认项 |
| [overview / 总体设计](<../../../src/client/actions.ts#L34>) | skill / overall-design | 150 | 系统结构、模块及依据，不实现 |
| [outline / 概要设计](<../../../src/client/actions.ts#L35>) | skill / outline-design | 160 | 模块接口、流程与必要图形 |
| [database / 数据库设计](<../../../src/client/actions.ts#L36>) | skill / database-design-doc | 170 | 表字段、关系和约束，不迁移 |
| [doc-merge / 文档融合](<../../../src/client/actions.ts#L37>) | skill / component-doc-merge | 180 | 既有事实去重归并、保留来源 |
| [docx / MD 转 Word](<../../../src/client/actions.ts#L38>) | skill / markdown-to-docx | 190 | 按模板转换，核对完整性与一致性 |
| [doc-supplement / 补充文档 ★](<../../../src/client/actions.ts#L52>) | prompt | 195 | 默认补本会话；可按指定时间段或版本号之后的已提交改动补，缺失先询问，SQL/接口对照源码 |
| [continue / 继续](<../../../src/client/actions.ts#L44>) | prompt | 240 | 核磁盘和检查点，不重复成功操作 |
| [domain / 领域建模](<../../../src/client/actions.ts#L45>) | skill / domain-modeling | 250 | 术语关系和决策，不实现 |
| [research / 资料研究](<../../../src/client/actions.ts#L46>) | skill / research | 260 | 查证一手资料并记录缺口 |
| [retro / 复盘](<../../../src/client/actions.ts#L47>) | skill / retro | 270 | 事实、原因假设与改进建议分开 |
| [handoff / 上下文交接](<../../../src/client/actions.ts#L48>) | skill / handoff | 280 | 引用产物，未完项/阻塞/下一步，脱敏 |
| [image / 交互提示词](<../../../src/client/actions.ts#L40>) | prompt | 300 | 仅生成 UI 生图用提示词，不实际生图或改代码 |

没有默认按钮的 7 个内置 Skill：codebase-design、coding-workflow、grilling、pocket-maintenance、pr、writing-for-agents、windows-powershell（入口见第 3～4 节）。无按钮不代表不可调用。

`spec` 按钮按[可直接使用规则](<../requirements/spec-action-free.md>)处理：不再要求讨论结论或置灰，只受通用禁用规则约束，也不禁止用户手输 `/to-spec`；更新 prompt 时仍需验证推荐意图匹配。

## 6. 用户自己的提示词：默认值、已保存配置、导出备份要分开

实现入口：[设置界面](<../../../src/client/Settings.tsx>)、[配置解析与迁移](<../../../src/client/actions.ts#L99-L180>)、[Host 表单接线](<../../../src/client/index.ts>)。

| 对象/操作 | 当前真实行为 | 升级管理要求 |
| --- | --- | --- |
| 未配置/空配置文本 | 复制当前默认按钮；显示语言按默认展示表处理 | 默认值变更会影响这些用户 |
| 已保存配置 | Host 设置 `actionsJson`，表单名 `coding-suite`；不是仓库文件，也不是本插件自行写 localStorage | 先从界面导出，不能只备份 Git |
| 当前格式 | `schemaVersion=3`，兼容读取 1/2/3；最多 100 项，ID 唯一，prompt 最长 16000 字符 | 配置 schema 版本不代表提示词内容版本；旧 v2 客户端保存会丢 `pinned` |
| v2/v3 加载 | 按保存内容读取，不自动替换现有 prompt 或补新按钮 | 新版安全边界不会自动传播到已保存提示词 |
| v1 迁移 | 仅与旧预设匹配的字段逐项升级，保留改过字段；特定旧项删除/新增有专门逻辑 | [旧预设表](<../../../src/client/legacy-actions.ts>)是迁移基线，不是当前默认提示词，不能随意改写 |
| 补齐缺失预设 | 只按 ID 加缺失项，不更新已有同 ID 提示词；还需保存 | 不能把“已补齐”当作旧提示词已升级 |
| 导入 JSON | 校验后整表替换界面草稿，不是合并，需保存才生效 | 先导出旧配置，审查后再导入；保留自定义 ID 和字段 |
| 导出 JSON | 导出当前界面草稿，可能含尚未保存改动 | 同时记“已保存生效”还是“仅草稿”；不能凭导出文件就认为已生效 |
| 恢复默认 | 整表回默认草稿，仍需保存 | 会丢自定义内容，不能作为无损升级方式 |
| 保存 | 需可写、ready 且 revision 未冲突，显式保存 | 保存后核对重载后的内容；失败不当作成功 |

维护者可用固定 Action ID 给自定义改动留记录，例如 `ACTION:execute`，并记录改过的字段（prompt/skillId/enabled/pinned/order 等）。备份文件名建议带日期及配置状态；备份可能含内部项目资料，先脱敏，再决定是否入库。本次未自动导出、读取或改写用户 Host 配置。

## 7. 升级和本地修改流程

### 7.1 引用 Skill 有新版时

1. **确定资产和来源**：确认升级哪些 Skill、资源、二级借鉴内容；补齐作者/仓库/固定 SHA 或原包版本及 SHA-256，先解决授权不明的问题。
2. **保护现场**：记录干净/非干净树，区分用户已有修改；备份已保存按钮配置。保留当前完整文件内容，不仅保存指纹；不代为提交或丢弃已有改动。
3. **取得三个版本**：`B=旧上游原版`、`L=当前本地版`、`N=新上游原版`。在隔离目录比较 `B→L`（本地改动）和 `B→N`（上游改动）。没有 B 时标记“首次建立上游基线”，先人工评估，不能声称已做可靠三方合并。
4. **逐项决策**：每个本地修改记录“保留/被上游替代/重做/放弃”及原因；重叠修改人工裁决。保留 LICENSE、CREDITS、引用资料及共享目录；不覆盖目标项目指令和 Pocket 事实。
5. **联动检查**：Skill ID/description、目录与资源相对路径、工具动作、按钮 prompt、接收指令、共享策略和运行依赖一起检查。来源版本不同的技能分别登记，不能用一个假定的整包新版本概括。
6. **分层验证**：资源能发现/载入；按钮仍绑定正确技能、只插草稿；范围约束未扩大；需要的脚本实际跑过再记通过；无运行环境则标未执行，不只做文字审查就宣布全部兼容。
7. **发布与用户配置迁移**：按第 7.3 节同步发布产物；用户已保存按钮按 ID 做受控字段合并，不能重置整表覆盖。记录真正加载的插件版本和配置状态。
8. **留证据**：追加第 8 节变更条目，关联 diff/验证/批准/回滚锚点；新增一个带日期或版本的基线，保留旧基线，不覆盖首次指纹。完成核验后才更新上游元数据。

### 7.2 先自己修改，再遇到上游更新

- 修改当时就记录资产 ID、目的、相对哪一版、具体文件/字段、原因和不希望回退的行为；不要等上游升级时靠记忆找差异。
- 推荐本地标识 `local-YYYYMMDD-序号`，与 `upstreamRevision` 分开记录；它只是维护标签，不伪装成上游 release。
- 如果只是改按钮，不必把它记成 Skill 正文升级；如果改共享策略，则列出所有受影响技能。
- 即使上游已提供类似功能，也先确认行为、权限和验证是否等价，再决定删除本地补丁。
- 记录回滚目标，但回滚时仍需检查后来改动，不能用旧目录直接覆盖当前现场。

### 7.3 源码、编译产物与实际加载必须分清

[包导出配置](<../../../package.json#L18-L38>)的主要运行入口是 [Host 产物](<../../../lib/index.js>)、[浏览器 bundle](<../../../lib/client.js>)、[守卫产物](<../../../lib/todo-progress-guard.js>)及[工作流产物](<../../../lib/workflow/index.js>)。仅修改源码不代表已运行新版。发布白名单含资产、编译产物、脚本和 patch，未包含源码树。

- [按钮表重建脚本](<../../../scripts/build-action-bundle.mjs>)只把 `DEFAULT_ACTIONS`、英文展示表和 `receivingInstructions` 接收指令表写入现成浏览器 bundle，**不更新其他逻辑、CSS、Host 或类型产物**。
- 可在确认只需同步按钮/接收指令表且环境支持时执行下列命令；`--check` 只校验不写入。首次盘点未执行重建，doc-supplement 来源扩展已按同一脚本同步 bundle 并记录在第 8.1 节：

```powershell
node --experimental-transform-types scripts/build-action-bundle.mjs --check
node --experimental-transform-types scripts/build-action-bundle.mjs
node scripts/verify-client-bundle.mjs
```

- [bundle 检查脚本](<../../../scripts/verify-client-bundle.mjs>)主要校验注册与挂载，不能证明所有提示词、规则和源码完全一致。
- 当前[包脚本](<../../../package.json#L13-L17>)没有完整通用 build 命令。修改非表格部分时应明确实际构建链和输出，不编造 `pnpm build` 已足够。
- 本地 link 场景按[加载说明](<../../../README.md#L74-L80>)重载插件或重启；仅刷新浏览器不保证 Host 重读 bundle。宿主客户端热更新还依赖同一实现 checkout 的构建 watcher，本次未验证 watcher，未承诺热更新。

## 8. 变更记录与复用模板

### 2026-10-28：需求分析主干与产品研发技能接入

状态：implemented；用户批准实施并补充要求以产品研发流水线为整个分组主干，从澄清推进到 UI 生图提示词。权威行为见[需求分析分组](../requirements/requirements-analysis-group.md)，变更 ID：`local-20261028-03`。

- 上游：`yuqiangdede/My-Prompts` 固定提交 `bfc391e4b48d40ca3b7dfd337b374432c61559d4`；通过固定提交 GitHub 文件接口读取总控、9 个专项 Skill、10 个步骤及配套材料。Apache-2.0 根许可和归属随包保留，未发现独立 NOTICE。
- [来源清单](../../../assets/skills/product-development-source.json)记录原始路径和 Git blob ID；[许可](../../../assets/skills/PRODUCT-DEVELOPMENT-LICENSE)、[归属与改动说明](../../../assets/skills/PRODUCT-DEVELOPMENT-NOTICE)保持与 Matt 来源分离。未升级或覆盖 Matt 资产，首次 SHA 基线保持原样。
- 本地改动：平铺 10 项上游技能、修复路径；新加 7 项单阶段适配，只引用总控 steps；共享规则明确项目知识权威、阶段范围、版本、评审与结果标记；历史参考材料标为按需引用，小任务不强凑流程。按用户要求将 DSH 默认终点改为生图提示词，实际生图仍需明确请求；该默认值与上游有意不同。
- 当前目录实际可发现 48 个 Skill，默认动作 46 个；这是本次检查结果，不改变第 1 节首次盘点的历史数量。新增 13 个默认动作，需求分析组按主干提供 11 个入口，PRD 写作/独立需求评审作为辅助动作放其他组；旧动作 ID、Skill 和用户内容不换绑。
- 接收指令、英文展示、阶段 Gate/结果建议、配置兼容和设置补齐同步；旧布局缺新字段补为隐藏，已有动作显式补齐，超过 100 时提示并保留原配置。Host 编码工作流 schema 和工程门禁未改。
- 发布构建增加上下文推荐模块同步，并为 portable actions/layout/locales/contextual-actions 输出 JS、声明和映射，避免只改按钮表而丢失布局/推荐。真实运行入口仍为 `lib/client.js`。
- 本次验证：全部 57 项 Node 回归通过，包含发布 bundle 的分组/草稿/设置交互、旧布局与导入导出、显式补齐/英文/100 上限、Gate 顺序及否定/冲突结果、发布 Host provider 的新技能发现/正文/资源基目录、全部新资源的本地 Markdown 链接；portable TypeScript strict 检查、按钮表一致性、插件注册、分组渲染和 Pocket 链接检查通过。`npm pack --dry-run --json` 核对 346 个打包条目，包含总控步骤、新阶段、来源/许可及布局声明；未生成发布包或发布到 registry。
- 限制：未执行真实 DSH GUI 重载、窄屏/辅助技术实测、模型端到端的小需求/复杂状态权限/NO-GO 业务案例；本次未运行依赖外部 Host 测试环境的 Vitest 套件，不能将 Node 回归表述为全量宿主验证。未提交或推送。
- 回滚范围：本地原 HEAD `ba42e901b90799c6ad6c82c418dc40e865b455f1` 的运行源码/产物可作对照；按本条列出的新增资产、默认动作和布局/推荐变更回退，不重置用户保存配置，不删除其他工作区改动。

### 8.1 已核实历史/本次登记

| 日期 | 资产 | 事件及证据级别 | 版本锚点 | 状态 |
| --- | --- | --- | --- | --- |
| 2026-10-25 | 初始技能及提示词资产 | Git 初始导入；不能据此认定原创或与上游一致 | `c9781f54e53b77283ff4189bd002933f174d3cfc` | 已提交；更早来源待补 |
| 2026-10-26 | Windows skill + 系统指导 | Git 新增及[已接受需求](<../requirements/windows-powershell-guidance.md>) | `01fe92bc8ab5def973cb108b6256171ab68db2f1` | 已提交；本次未重新运行功能测试 |
| 2026-10-26 | 健康验收 skill + 按钮 | [需求](<../requirements/health-acceptance.md>)记录用户 v1.0.0 附件适配；10:43 采集时未提交，10:48 复核已提交 | 附件 1.0.0；外部提交 `4356e02caf676281cdc9a51c681ad40379da0317` | 本次未执行此提交；原附件及精确适配 diff 待补 |
| 2026-10-26 10:48 | 首次基线后的外部变化 | 188 个文件重新校验，187 个一致，仅[健康验收说明](<../../../assets/skills/project-runtime-acceptance/README.md>)指纹变化；已重新读取该文件 | 保留 10:43 首次基线不变 | 已知历史差异，不把原基线冒充为最新内容快照 |
| 2026-10-26 | 开发按钮等现有改动 | [开发 prompt](<../../../src/client/actions.ts#L24>)现含开发前确认排查能力要求；基线捕获当前工作树 | HEAD + 未提交内容 | 不推断所有既有修改的作者/发生时间；需维护者补原因 |
| 2026-10-26 | 本台账与[首次基线](<baselines/skills-prompts-2026-10-26.json>) | 静态盘点，31 Skill / 30 按钮 / 188 个文件指纹 | `inventory-20261026-01` | 未更新上游版本、未修改运行提示词或用户设置、未提交 |
| 2026-10-26 | ACTION:doc-supplement + RECEIVING:doc-supplement | 来源扩展为“本会话（默认）或指定时间段/版本号之后的已提交代码改动”；同步默认提示词、接收指令、英文展示和发布 bundle；见[需求](<../requirements/doc-supplement-sources.md>) | 当前工作树（未提交），`local-20261026-02` | 已修改；静态断言、Node 回归测试、`node --check`、bundle 注册与分组渲染校验通过；未提交 |
| 2026-10-27 | ACTION:execute 名称 | 按用户要求把默认按钮名称由「开发」改为「编码」；只改显示名称，prompt、绑定 Skill、排序和阶段边界未变，英文默认展示仍为 `Develop`；同步[默认按钮表](<../../../src/client/actions.ts#L37>)与发布 [bundle](<../../../lib/client.js>)；已保存配置不自动改名 | 当前工作树（未提交），`local-20261027-01` | 已修改；`build-action-bundle.mjs --check`、`verify-client-bundle.mjs`、`verify-launcher-render.mjs` 通过；未提交 |
| 2026-10-28 | SKILL:coding-workflow + 自动模式入口/文案 + TOOL:workflow | 用户当时授权在显示分组同排提供默认手动的切换；显式发送启动，按证据选择 Bug / 需求链路；Bug 只在既有约定不变时可显式跳过 S1/S2，共用审查/验证门禁；无 Host 工具停止而非静默降级。该交互约定文档已按同日后续决定删除。 | 基于 `7f347ed0b32d2a316f18a6df33e549380cf1a985` 的本地改动，`local-20261028-01`；无上游升级 | 已撤回（见下一条）；发布 bundle 与相关声明当时已同步，未修改用户已保存按钮配置 |
| 2026-10-28 | 撤销手动/全自动模式 | 用户确认插件也用于需求分析、实现与文档编写，全自动缺乏实际意义且多数情况仍需人工操作；移除「编码模式」展示、「准备全自动任务」、Goal 暂停/恢复接管、Host `mode` 字段及 `setMode`/`mode` 动词，并删除对应交互约定文档；工作流固定为人工推进，暂停后须显式继续。旧存储记录的多余 `mode` 字段读取时由 schema 丢弃，无需迁移 | 当前工作树（未提交），`local-20261028-07` | 源码、Skill 正文、发布 bundle、声明与回归测试同步；`automatic-mode.node.test.mjs` 由 `launcher-no-mode-switch.node.test.mjs` 取代 |

| 2026-10-28 | ACTION:add-logs | 按用户要求新增“增加日志”纯提示词按钮，默认常用组紧邻 Bug排查、开发组可见；临时诊断日志要求脱敏、标记、清理清单及本会话移除提醒，不承诺后台/跨会话提醒；见[约定](<../requirements/temporary-logging.md>) | 本地新增，无上游升级，`local-20261028-02` | 用户已保存动作/布局不覆盖；源码、发布 bundle 与回归测试同步 |

本次修改使首次基线中的 `src/client/actions.ts`、`src/client/locales.ts`、`lib/client.js` 等指纹变化；首次基线保持原样，不作为最新内容快照。已保存的用户按钮配置不会被自动替换。

### 8.2 每次修改/升级追加一条

```yaml
changeId: local-YYYYMMDD-01
status: proposed | merged | verified | reverted
assetIds: [SKILL:example, ACTION:example, RECEIVING:example]
owner: 维护者
reason: 为什么要变，原行为有什么问题
origin:
  type: upstream-import | local-edit | reference-adaptation | user-attachment
  repositoryOrAuthor: 来源仓库或作者
  oldUpstreamRevision: 旧上游完整SHA或原始包版本；未知则明确未知
  newUpstreamRevision: 新上游完整SHA或包版本；本地修改填不适用
  originalArchiveSha256: 有原包时记录
  licenseEvidence: 许可文件或授权记录位置
localBase: 本地修改前的Git提交及对应内容备份
changedFilesAndFields: 文件、章节、字段清单
localDecisions: 本地差异逐项保留/替代/重做/放弃及原因
impact: 受影响的按钮、共享规则、依赖、用户配置
verification:
  static: 实际检查内容及结果
  runtime: 实际执行命令和结果；未执行必须写明
  bundle: 发布产物同步范围及结果
  userConfig: 未涉及或已导出/合并/保存/重载核对
rollback: 可取得的旧内容锚点和回滚范围，不仅是hash
approval: 授权范围或待确认
links: diff、工单、证据和新指纹基线
```

这只是记录格式，不会自动执行升级、审批或回滚。涉密内容不要直接写入记录。

### 8.3 如何检查首次基线后哪些文件变了

从仓库根目录运行以下只读 PowerShell 示例；它检查基线内已登记文件的修改/删除。**不会发现新增文件**，还需用 `git status --short` 和本台账范围复查新增/未跟踪资源。它也不会读取用户 Host 设置。

```powershell
$baseline = Get-Content -LiteralPath 'docs/pocket/meta/baselines/skills-prompts-2026-10-26.json' -Raw -Encoding utf8 | ConvertFrom-Json
foreach ($entry in $baseline.files) {
  if (-not (Test-Path -LiteralPath $entry.path -PathType Leaf)) {
    'DELETED ' + $entry.path
    continue
  }
  $current = (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($current -ne $entry.sha256) { 'CHANGED ' + $entry.path }
}
git status --short
```

## 9. 已发现的升级风险/待办（本次只登记，未修复）

| ID | 发现与证据 | 后续维护动作 |
| --- | --- | --- |
| U-01 | 首次盘点发现数量文案为 28、实际 31；2026-10-28 需求主干接入后，[包描述](<../../../package.json#L3>)、[README](<../../../README.md>)与 [provider 源注释](<../../../src/skill-provider.ts#L1-L3>)改为不固定数量的工程/产品技能表述，当前目录 48 | 源文案已修正；旧 Host 编译文件的历史注释仍可能含旧数量，不代表实际注册数 |
| U-02 | 19 个 Matt 引用只有全局固定 SHA，本次无可比上游内容；其他来源及二级引用元数据不完整 | 补原始内容、固定版本、作者/授权及逐技能本地 diff；缺证据继续标未知 |
| U-03 | [工作流 Skill](<../../../assets/skills/coding-workflow/SKILL.md#L17>)要求调用 `action=approve decision=…`，但[模型工具动作表](<../../../src/workflow/tool.ts#L17-L20>)不包含 approve；批准实际经 Host Remote/UI | 对齐调用契约与人类审批入口，不能让模型虚构可用动作；先确认设计后修改 |
| U-04 | [共享定位示例](<../../../assets/skills/_shared/README.md#L5-L11>)按用户安装目录寻址，[共享测试示例](<../../../assets/skills/_shared/README.md#L64>)还含旧源码路径；provider 实际资源根为包内目录 | 从调用返回的资源基目录解析相邻共享目录，清理不适配当前包的示例并验证 |
| U-05 | 总体/概要设计强制依赖未内置 diagram-design；[ask-matt 路由](<../../../assets/skills/ask-matt/SKILL.md>)提及 grill-me、implement-spec、triage、wayfinder、to-questionnaire、wizard、wait-what、teach 等未内置项 | 区分硬依赖/可选路由，确认当前会话实际可用性；不能声称整个流程离线自足 |
| U-06 | [domain-modeling](<../../../assets/skills/domain-modeling/SKILL.md>)保留旧术语表/ADR 路径；[setup](<../../../assets/skills/setup-matt-pocock-skills/SKILL.md#L64>)也明确承认兼容限制 | 升级保留 Pocket 权威指针，避免重新生成第二套知识权威 |
| U-07 | 已保存 v2/v3 配置不自动同步默认提示词，补缺只按 ID | 为用户配置逐字段对比并显式保存，不用整表重置掩盖迁移 |
| U-08 | 首次盘点发现中间按钮产物陈旧；2026-10-28 已随需求主干重新生成 [portable actions](<../../../lib/types/client/actions.js>)、布局、字典和推荐 JS/声明/映射，与源码同步 | 本项已修正；后续使用更新后的 rebuild-launcher-bundle 同步 portable 产物，实际运行入口仍为 lib/client.js |
| U-09 | [工作流 Skill](<../../../assets/skills/coding-workflow/SKILL.md#L18>)要求缺关键工具时阻塞，后文又允许 helper 回退；[README 阶段说明](<../../../README.md#L18-L27>)仍为 S0～S8，工具已列 S9 | 单独澄清缺依赖时边界及工作流阶段语义，不能本次静默改需求 |
| U-10 | [Word Skill](<../../../assets/skills/markdown-to-docx/SKILL.md#L62>)警示脚本固定 `-w`，而[当前转换实现](<../../../assets/skills/markdown-to-docx/scripts/convert.py>)已探测可用宽度参数；环境依赖也未由插件包锁定 | 将文档与实际 CLI 探测行为对齐，按使用特性验证，不把 `--check` 当全图形链路成功 |

### 9.1 2026-10-28 本地提示词优化复核（local-20261028-06）

本次针对可证实的执行冲突作本地适配，未导入或宣称升级上游版本。变更文件：`ask-matt`、`implement`、`code-review`、`coding-workflow`、`domain-modeling`、`diagnosing-bugs`、`tdd`、`pr`、`improve-codebase-architecture`、`setup-matt-pocock-skills`、`markdown-to-docx` 的 `SKILL.md`，以及 `_shared/README.md`、`docs/agents/domain.md`。版本锚点是修改前的 Git HEAD 与本次工作树差异；首次指纹基线仍为历史基线，不改写。

| 台账项 | 本次处理 | 仍需核对 |
| --- | --- | --- |
| U-03 | `coding-workflow` 改为由 Host 面板/Remote 记录人类决定，模型仅用 `status` 核对后 `resume`；不再指示虚构的 `action=approve` | 宿主 UI 实际交互 |
| U-04 | `_shared` 示例改为从本次调用的资源基目录定位，测试路径使用同一根目录 | 自定义 `assetRoot` 的真实安装环境 |
| U-05 | `ask-matt` 只推荐当前包可用且经核对的路线；缺席 Skill 先查会话可用性。`diagram-design` 仍是设计技能要求的外部依赖，未擅自改 Gate | 外部依赖安装/授权及实际制图能力 |
| U-06 | `domain-modeling` 等常用工程 Skill 改为先按目标项目知识索引选路径；本仓库明确使用 Pocket 术语表和 ADR | 其余上游资源中的旧路径假设仍需按实际调用逐项处理 |
| U-10 | Word Skill 的 Mermaid 说明与 `convert.py` 宽度参数探测行为对齐 | 需在有 Mermaid 的转换任务中做实际 CLI 探针 |

另修复两处未单列的边界：`implement` 不再自动触发审查/提交，符合单阶段“编码”按钮；`code-review` 明确纳入 staged、unstaged 和相关未跟踪文件，且找不到规格时如实报告证据缺口。两者均保留直接调用时用户明确范围的优先级。`ask-matt` 从旧上游长路由改为本包本地路由，属于有意的本地差异；上游许可与来源记录不变。没有修改用户已保存按钮配置。本文第 3～5 节及旧 U 行为原始盘点记录，以上表为本次处理状态；第 10 节仍描述首次台账交付，不代表本次改动范围。

验证：`git diff --check` 对上述资产和本文通过；Node 静态检查确认修改的 `SKILL.md` 有名称、描述、闭合 frontmatter，且相对链接目标存在。未做宿主中的实际调用验证。仓库的 Vitest 测试因未安装 `vitest` 无法启动；skill-creator 的 `quick_validate.py` 因当前 Python 缺少 `yaml` 模块无法启动。未为此安装环境依赖。

## 10. 本次交付与验证边界

- 新增本台账、首次文件指纹基线，并在[Pocket 索引](<../README.md>)增加入口。
- 所有既有业务/提示词/技能/编译产物保持不变；没有从网络下载新技能、修改来源 SHA、导出用户设置、运行升级、提交或推送。
- 本次验证覆盖清单数量、文档本地链接、基线文件的 SHA-256 和文档差异格式；不包含 Skill 实际调用、Word 转换、宿主 UI 重载或全量运行测试。
- 后续增删 Skill、改提示词或共享规则时更新受影响行，追加变更记录；文件内容历史仍交给 Git，不用本台账替代版本控制。

- 2026-10-28：新增 `analyze-logs` 与 `remote-debug` 纯提示词动作，输入及配置兼容约定见 [日志分析与远程调试入口](../requirements/diagnostic-shortcuts.md)；默认提示词以源码为准。

- 2026-10-28（local-20261028-04）：按用户要求，分组显示名由「需求分析 / Requirements Analysis」改为「需求 / Requirements」；保留 requirements-analysis ID、组内阶段名称与既有配置。同步字典、发布产物及使用文档。

- 2026-10-28（local-20261028-05）：按用户要求将需求组按钮缩写为全流程、澄清、分析、风险扫描、业务方案、边界审计、数据状态、异常检查、PRD/页面、一致性校验、生图提示词；旧中文预设标签定向兼容，自定义标签、Skill 绑定、提示词和顺序不变。同步发布 bundle 与 portable 产物。
