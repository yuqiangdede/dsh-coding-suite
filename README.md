# DeepSeek Harness Coding Suite (`dsh-coding-suite`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: DSH](https://img.shields.io/badge/Platform-DeepSeek_Harness-blueviolet.svg)](https://github.com/yuqiangdede/dsh-coding-suite)

[English](#english) | [中文说明](#中文说明)

---

## English

### Overview

`dsh-coding-suite` is an all-in-one engineering enhancement suite for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). It combines an authoritative Host-enforced staged workflow, 28 bundled engineering skills and Pocket specifications, an interactive Web/Desktop UI Launcher and panel, and an automated session progress guard.

### Key Capabilities

1. **Host-Authoritative Staged Workflow (S0 - S9)**
   - **S0 (Init)**: Initialize work item and capture repository baseline snapshot.
   - **S1 (Requirements)**: Formalize requirements and boundaries; supports explicit skipping for pure bugfixes.
   - **S2 (Design)**: Architecture and approach design; supports explicit skipping for rapid fixes.
   - **S3 (Test Spec)**: Specify test cases and verification checks prior to code changes.
   - **S4 (Implement)**: Implement changes strictly constrained within declared boundary files.
   - **S5 (Review)**: Perform peer-grade code reviews and capture structured findings.
   - **S6 (Repair)**: Remediate any blocking review findings.
   - **S7 (Verify)**: Execute planned test checks inside the sandbox.
   - **S8 (Commit)**: Perform a single, verified Git commit staging only covered files.
   - **S9 (Report)**: Record the delivery report with the commit, review findings, verification results and remaining risks.
   - While a work item is active, tool guards reject recognized direct Git mutations in `bash`/`pwsh` and out-of-plan `write`/`edit` calls. This is not a general-purpose sandbox for arbitrary shell or script writes.

2. **28 Bundled Engineering Skills**
   - High-leverage skills from Matt Pocock: `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `prototype`, `tdd`, `to-spec`, `to-tickets`, `writing-for-agents`, etc.
   - Enterprise documentation & reverse engineering: `requirements-spec`, `api-integration-docs`, `database-design-doc`, `component-doc-merge`, `markdown-to-docx`.
   - Pocket maintenance & shared toolchain: `pocket-setup`, `pocket-reorganize`, `evidence_registry`, document QA scripts.

3. **Client UI Launcher & Workflow Panel**
   - Live visual workflow panel tracking the active session's work item stage chip.
   - Workflow commands for an existing work item: Approve, Pause, Resume and Cancel.
   - Customizable quick actions launcher with full export/import settings form.
   - Supplement Docs defaults to the current session and can instead use committed code changes in a specified time range or after a specified version/tag/commit.

4. **Todo Progress Guard**
   - Non-intrusive reminder system that alerts the model when active tasks have uncommitted progress or stale plans.

### When the Host workflow is used

“Host-authoritative” means the Host persists the work item and validates stage transitions against evidence and the actual repository; the model's completion claims alone do not advance it.

- **Default buttons are single-stage actions**, not an automatic pipeline. For example, Coding invokes `implement`; Review, Build and Commit have their own scopes. Clicking them does not automatically create a Host work item.
- The **Manual / Automatic** controls sit beside Visible groups and default to Manual when there is no active Host task. Selecting Automatic does not execute anything: click **Prepare automatic task** at the start of the draft to insert `/coding-workflow`, preserve your goal text, then explicitly send. An existing task uses its Host mode; switching it to Automatic pauses it and requires an explicit continuation rather than starting a second task.
- The agent chooses the route using the objective, context and code evidence: **Bug** means reproduce → root cause → regression test/minimal fix; **Feature or behavior-contract change** means requirements → specification/design → plan → implement. Ambiguity requires clarification. Only a proven unchanged-contract bug may explicitly skip S1/S2 with reasons; both routes require review, real test/build verification, local commit and delivery report.
- With the `coding_workflow` tool available, the agent starts a work item using `action=start` and advances it through evidence gates. Missing Host tools stop the automatic request rather than silently substituting another authority. Manual takeover first pauses the matching Goal, then changes the Host task to Manual/paused; explicitly resume the Host task to continue within its guards. See the [Skill instructions](assets/skills/coding-workflow/SKILL.md) and [interaction contract](docs/pocket/requirements/automatic-mode.md).
- The plugin mounts the [Host service](src/workflow/index.ts) from its [entry point](src/index.ts). The [tool](src/workflow/tool.ts) drives transitions, and the [guard](src/workflow/guard.ts) applies to the calling session's active work item. Without an active work item, these task-specific guard rules do not apply.
- The launcher shows a workflow panel only when it can read a work item through `remote.codingWorkflow`. Linked standalone installs without that Remote still show ordinary action buttons, but not the workflow panel; a hidden panel alone does not prove the Host tool is unavailable.

### Installation

Add `dsh-coding-suite` to your DSH `cordis.yml` profile:

```yaml
plugins:
  - name: 'dsh-coding-suite'
    config:
      verificationTimeoutMs: 1800000
      todoStaleMs: 90000
```

Optionally mount the progress guard as a standalone subpath:

```yaml
plugins:
  - name: 'dsh-coding-suite/todo-progress-guard'
```

#### Linked local checkout

When a profile links this repository directly (the plugin manager's local-path install), imports resolve from this checkout's own `node_modules`. Install the runtime dependencies once after cloning or changing them, then restart DSH or toggle the plugin off and on:

```sh
pnpm install --prod
```

The shared DSH packages are declared as peer dependencies, so the running Host supplies its own copies. Without the dependency install, the Host reports that `lib/index.js` cannot import `@deepseek-ai/schemastery`.

#### Client UI buttons are missing

DSH keys each browser plugin by its package name, so the built `lib/client.js` must register `dsh-coding-suite` and not the retired scoped name. A linked install also never receives the application-owned `remote.codingWorkflow` namespace, so the client must mount without it. Check the shipped bundle, then reload:

```sh
node scripts/verify-client-bundle.mjs
```

After rebuilding or editing `lib/`, quit and reopen DSH, or toggle the plugin off and on in the Plugins page; refreshing the page alone does not re-read the bundle. The launcher renders above the composer once a session is open. Without the Host Remote, the action buttons still appear and only the workflow panel stays hidden.

---

## 中文说明

### 概述

`dsh-coding-suite` 是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 打造的一体化工程增强套件插件。它将 Host 端权威阶段化工作流、28 项精选工程技能与 Pocket 规范、Web/桌面端交互式发射器与工作流面板，以及待办进度守卫深度融为一体。

### 核心功能

1. **Host 权威阶段化开发工作流 (S0 ~ S9)**
   - **S0 (初始化)**: 初始化任务条目并记录初始 Git 仓库快照。
   - **S1 (需求分析)**: 明确需求范围与改动边界；对于快速修复场景支持显式跳过 (Skip)。
   - **S2 (方案设计)**: 制定技术方案并进行设计评审；对于简单 Bug 可显式跳过。
   - **S3 (测试规约)**: 在编码前确立验证命令与测试用例。
   - **S4 (代码实现)**: 在严格限定的文件边界内执行代码实现。
   - **S5 (代码审查)**: 对比实现产物，记录结构化审查发现 (Findings)。
   - **S6 (修复改进)**: 针对审查不合规项执行闭环修复。
   - **S7 (沙箱验证)**: 在隔离沙箱中执行预定的验证检查。
   - **S8 (验证提交)**: 仅暂存并提交受验证保护的文件，生成原子 Git 提交。
   - **S9 (交付报告)**: 记录提交标识、审查发现、实际验证结果及剩余风险。
   - 活跃工作项下，工具守卫拦截 `bash`/`pwsh` 中可识别的直接 Git 变更操作，以及 `write`/`edit` 超出计划文件范围的调用；不等同于对任意 Shell 或脚本写入的通用沙箱隔离。

2. **28 个内置工程技能与规范**
   - Matt Pocock 经典工程技能：`code-review`、`codebase-design`、`diagnosing-bugs`、`domain-modeling`、`grilling`、`prototype`、`tdd`、`to-spec`、`to-tickets`、`writing-for-agents` 等。
   - 文档与逆向工程体系：`requirements-spec`（逆向需求生成）、`api-integration-docs`、`database-design-doc`、`markdown-to-docx` 等。
   - Pocket 知识库运维与共享工具链：`pocket-setup`、`pocket-reorganize`、证据登记表 (`evidence_registry.py`)、文档检索脚本等。

3. **前端 UI 任务面板与快速发射器**
   - 实时呈现当前会话阶段指示器与状态徽标。
   - 交互式控制：批准 (Approve)、暂停 (Pause)、恢复 (Resume)、取消 (Cancel)。
   - 自定义技能动作发射器（支持导入/导出 JSON 配置表单）。

4. **待办任务同步守卫 (Todo Progress Guard)**
   - 智能监控活跃的待办任务，当执行进展超时未同步至上下文时自动发起柔性提醒。

### Host 工作流何时生效

“Host 权威”是指工作项由宿主持久化，并根据证据与真实仓库状态校验阶段推进；不能仅凭模型声称“已完成”就通过。

- **默认按钮是单阶段动作，不是自动流水线**。例如「编码」调用 `implement`，「代码审查」「编译」「提交代码」各有职责；点击这些按钮不会自动创建 Host 工作项。
- **「手动 / 全自动」位于「显示分组」同一排**，没有活跃 Host 任务时默认手动。选择全自动不会执行任务；把光标移到草稿开头，点击「准备全自动任务」插入 `/coding-workflow` 并保留目标文字，检查后手动发送才开始。已有任务以 Host 模式为准，切到全自动会暂停原任务，需显式继续，不另建任务。
- Agent 根据目标、上下文和代码证据判断链路：**Bug 修复**先复现 → 定位根因 → 回归测试与最小修复；**需求开发或行为约定变化**先澄清需求 → 规格与设计 → 实施计划 → 实现。分类不清先询问。仅恢复既有约定的 Bug 可分别带理由显式跳过 S1/S2；两条链路都必须审查、执行真实 test/build 验证，再本地提交并交付报告。
- `coding_workflow` 工具可用时，Agent 通过 `action=start` 创建工作项，并通过工具逐阶段登记证据。缺少 Host 工具时停止说明，不静默替换权威。转手动先暂停关联 Goal，再把 Host 工作项设为 manual/paused；须显式恢复 Host 工作项后在原任务守卫内继续。详见 [Skill 操作规程](assets/skills/coding-workflow/SKILL.md)与[交互约定](docs/pocket/requirements/automatic-mode.md)。
- 插件[入口](src/index.ts)挂载 [Host 服务](src/workflow/index.ts)，由[模型工具](src/workflow/tool.ts)推进阶段，[工具守卫](src/workflow/guard.ts)约束调用会话的活跃工作项；没有活跃工作项时，不施加这套任务专属守卫规则。
- 前端只有通过 `remote.codingWorkflow` 读取到工作项时才显示工作流面板。本地 link 安装缺少该 Remote 时，普通动作按钮仍可显示，但不显示工作流面板；不能仅凭面板隐藏就认定 Host 工具不可用。

### 四组编码按钮

输入框上方的按钮按场景分为「常用」「需求开发」「文档编写」「其他」：

- **常用**固定显示，默认包含 Bug排查、需求讨论、编码、代码审查、修复、编译、提交代码、继续。
- **需求开发**默认显示；其他两组默认隐藏，可在工具栏直接点击分组按钮切换显示状态。
- 「补充文档」默认把本会话已确认结论补进现有产品文档；发送前可把草稿中的“来源”改为指定时间段或指定版本号/标签/提交之后，改按该范围的已提交代码改动记录补充。详见 [补充文档来源约定](docs/pocket/requirements/doc-supplement-sources.md)。
- 「按钮设置」允许管理每组显隐、常用按钮成员及原有 Skill/提示词；保存和导入导出 JSON 同时包含布局。
- 同一按钮可在不同分组出现，但始终引用同一个 action ID；隐藏分类不会禁用 Skill。
- 升级时保留原有已保存提示词及启用状态，旧自定义常用列表优先保留，旧默认快捷列表自动映射为新的八个常用按钮。

插件使用 `layoutJson` 保存版本化分类布局，不修改既有 `actionsJson` Schema v3 和 Host 编码阶段规则。安装时仍需携带仓库内的预编译 `lib/`，在 Windows CI 中校验运行时 bundle。

### 健康验收

新增「健康验收」Skill 按钮，绑定内置 `project-runtime-acceptance`，默认进行全量静态只读验收，覆盖数据库、任务、缓存、API 等12领域，输出资产覆盖率、源码证据及整改建议，不改业务代码、不操作生产环境。

技能、规则、报告模板与候选扫描器已随插件固化，无需解压或另行安装。已有自定义按钮配置请在按钮设置中点击「补齐缺失预设（待保存）」并保存；默认新配置直接显示快捷按钮。报告写入位置需先确认。详见 [技能说明](assets/skills/project-runtime-acceptance/README.md) 与 [验收约定](docs/pocket/requirements/health-acceptance.md)。

按钮表与接收指令重建：`node --experimental-transform-types scripts/build-action-bundle.mjs`。加载更新后的插件后使用；不会自动向会话发送请求。

### 安装与配置

在 DSH 的配置文件（如 `cordis.yml`）中添加插件：

```yaml
plugins:
  - name: 'dsh-coding-suite'
    config:
      verificationTimeoutMs: 1800000 # 验证超时时间 (毫秒)
      todoStaleMs: 90000             # 待办超时预警时间 (毫秒)
```

也可以按需仅加载子路径功能（例如待办守卫）：

```yaml
plugins:
  - name: 'dsh-coding-suite/todo-progress-guard'
```

#### 本地 link 安装

如果 profile 直接 link 本仓库（即插件管理器的本地路径安装方式），模块会从本仓库自己的 `node_modules` 解析。首次克隆或依赖变更后，请安装一次运行时依赖，然后重启 DSH 或将插件关闭再开启：

```sh
pnpm install --prod
```

DSH 共享包已声明为 peerDependencies，运行时会使用 Host 自带的副本。若未安装依赖，Host 会报错称 `lib/index.js` 无法导入 `@deepseek-ai/schemastery`。

#### 看不到输入框上方的按钮

DSH 按包名索引浏览器插件，因此构建出的 `lib/client.js` 必须注册为 `dsh-coding-suite`，不能沿用旧的 scope 名称。link 安装也不会得到应用内置的 `remote.codingWorkflow` 命名空间，客户端必须在它缺席时仍能挂载。先检查产物，再重新加载：

```sh
node scripts/verify-client-bundle.mjs
```

改完 `lib/` 后，请完全退出并重启 DSH，或在「插件」页把插件关闭再开启；仅刷新页面不会重新读取 bundle。打开一个会话后，按钮显示在输入框上方。缺少 Host Remote 时，动作按钮仍会显示，只有工作流面板保持隐藏。

### 目录结构

```text
dsh-coding-suite/
├── assets/
│   └── skills/           # 28 个工程技能及共享工具、Pocket 规范
├── lib/                  # 预编译产物 (Host/Client/Workflow/Guard)
├── src/
│   ├── client/           # 前端 Web/桌面端发射器与工作流面板
│   ├── workflow/         # 阶段化工作流引擎核心与沙箱验证
│   ├── index.ts          # 插件 Host 主入口
│   ├── skill-provider.ts # 技能注册服务
│   ├── todo-progress-guard.ts # 待办守护插件
│   └── config.ts         # 配置定义
├── package.json
└── README.md
```

### 开源协议

本项目采用 [MIT 许可证](LICENSE)。

