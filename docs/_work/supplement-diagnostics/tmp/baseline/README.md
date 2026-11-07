# DeepSeek Harness Coding Suite (`dsh-coding-suite`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: DSH](https://img.shields.io/badge/Platform-DeepSeek_Harness-blueviolet.svg)](https://github.com/yuqiangdede/dsh-coding-suite)

[English](#english) | [中文说明](#中文说明)

---

## English

### Overview

`dsh-coding-suite` is an all-in-one engineering enhancement suite for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). It combines an engineering and product requirements skills and Pocket specifications, an interactive Web/Desktop UI Launcher , and an automated session progress guard.

### Key Capabilities

1. **Bundled Engineering and Product Skills**
   - High-leverage skills from Matt Pocock: `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `prototype`, `tdd`, `to-spec`, `to-tickets`, `writing-for-agents`, etc.
   - Enterprise documentation & reverse engineering: `requirements-spec`, `api-integration-docs`, `database-design-doc`, `component-doc-merge`, `markdown-to-docx`.
   - Project-wide document/artifact layout: initialization establishes `docs/agents/document-layout.md` plus the selected intermediate work directory README; all bundled Skills follow the same formal-document authority and task-scoped scratch paths. Existing approved project documents remain in place.
   - Pocket navigation & maintenance: reuse existing authoritative project documents first; initialize a lightweight index when needed, fill only missing topics and audit staleness with `pocket-maintenance`.

2. **Client UI Launcher**
   - Customizable quick actions launcher with full export/import settings form.
   - Supplement Docs defaults to the current session and can instead use committed code changes in a specified time range or after a specified version/tag/commit.

4. **Todo Progress Guard**
   - Non-intrusive reminder system that alerts the model when active tasks have uncommitted progress or stale plans.

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


```sh
node scripts/verify-client-bundle.mjs
```


---

## 中文说明

### 概述


### 核心功能

1. **内置工程、产品需求技能与规范**
   - Matt Pocock 经典工程技能：`code-review`、`codebase-design`、`diagnosing-bugs`、`domain-modeling`、`grilling`、`prototype`、`tdd`、`to-spec`、`to-tickets`、`writing-for-agents` 等。
   - 文档与逆向工程体系：`requirements-spec`（逆向需求生成）、`api-integration-docs`、`database-design-doc`、`markdown-to-docx` 等。
   - Pocket 知识库索引与维护：由 `setup-matt-pocock-skills` 初始化、`pocket-maintenance` 按需检查；已有项目文档原位复用，无需另建 `knowledge/` 或复制到 Pocket。公共证据与文档校验脚本按需使用。

2. **前端 UI 快速发射器**
   - 按场景分组展示快捷入口，并支持查看当前对话中识别出的按钮使用顺序。
   - 自定义技能动作发射器（支持导入/导出 JSON 配置表单）。

4. **待办任务同步守卫 (Todo Progress Guard)**
   - 智能监控活跃的待办任务，当执行进展超时未同步至上下文时自动发起柔性提醒。

### 五组工作入口

输入框上方按场景分组；「初始化」和「确认」固定在显示分组控制栏（依次相邻）：
- **快捷确认**：点击「确认」将当前会话中上一条已完成的模型回复所推荐的默认方案作为用户确认立即发送，无需再次按 Enter；仅要求上一条存在完整助手回复，不依赖项目初始化。模型回复进行中、失败或当前存在未发送草稿/附件时按钮禁用，避免误发或覆盖。遇到多个互斥选项而没有明确推荐时继续询问，不擅自决策；重要数据删除/覆盖、生产环境变更、凭据等高风险行为不能仅凭此快捷确认授权，需另外说明风险并取得明确批准。普通 Skill/提示词按钮继续仅插入草稿。

- **项目初始化门禁**：根据 Session 根目录使用只读 Workspace Files 接口核对 AGENTS.md/CLAUDE.md、工程 Skills 指针、Issue Tracker、领域文档和知识索引。未完成则初始化高亮，其他操作要求先初始化；已有合规项目直接通过。重新打开、初始化完成后和执行操作前重新核验。点击「初始化」仅插入 Skill 指令；发送后按安全自动决策规程执行：可验证、非破坏性的项目初始化推荐项自动修复并报告，确实需要人工决定的例外才询问；不自动安装软件、不修改业务代码或远端系统。

- **常用**默认显示，可编辑成员，也可隐藏后恢复。
- **需求**以产品研发流水线为主干：需求全流程 → 澄清 → 分析 → 风险扫描 → 业务方案 → 模块边界 → 数据/状态 → 异常流程 → PRD/评审/页面规格 → 页面一致性 → 生图提示词。按行宽尽量展示，确实放不下时用「更多（剩余）」查看后续阶段。
- **需求全流程**从最初想法一路推进到最终 UI 生图提示词，各 Gate 失败时回退，不自动实际生图或启动生产编码。明确只要文档或原型时遵循指定终点；其余阶段入口只完成对应一步。详见[需求分析约定](docs/pocket/requirements/requirements-analysis-group.md)。
- **开发**默认显示；新用户也默认显示需求，文档/其他默认隐藏。旧保存布局的需求组默认隐藏，在「显示分组」打开；已有按钮配置先在设置点击「补齐缺失预设（待保存）」并保存。
- 「补充文档」默认把本会话已确认结论补进现有产品文档；发送前可把草稿中的“来源”改为指定时间段或指定版本号/标签/提交之后，改按该范围的已提交代码改动记录补充。详见 [补充文档来源约定](docs/pocket/requirements/doc-supplement-sources.md)。
- 「按钮设置」允许管理每组显隐、常用按钮成员及原有 Skill/提示词；保存和导入导出 JSON 同时包含布局。
- 同一按钮可在不同分组出现，但始终引用同一个 action ID；隐藏分类不会禁用 Skill。
- 升级时保留原有已保存提示词及启用状态，旧自定义常用列表优先保留，旧默认快捷列表映射到当前常用预设；新阶段不自动加入常用。

插件使用 `layoutJson` 保存版本化分类布局，不修改既有 `actionsJson` Schema v3 和 Host 编码阶段规则。安装时仍需携带仓库内的预编译 `lib/`，在 Windows CI 中校验运行时 bundle。

### Pocket：复用现有文档，不做第二套知识库

Pocket 是项目知识的**索引与兜底位置**，不是独立的业务文档副本。执行初始化、知识提炼、需求/设计/接口文档、验收或交接时：

1. 优先读取项目现有的 `AGENTS.md`/`CLAUDE.md`、文档索引、需求、设计、ADR 与部署运维资料，识别各主题已确认的权威文件。
2. 有现行文件则原位置增量维护；有对应现有目录则优先使用。**只有缺少合适位置时才按需使用 `docs/pocket/`**，不默认创建 `knowledge/`。
3. Pocket 或项目现有知识索引只记录文件路径、任务入口、状态与后继链接，不复制正文。重要变更先展示差异，确认后写入；不因运行 Skill 自动推送代码。
4. 日常按需读取有关文档，每月可手工执行 `pocket-maintenance` 检查重复、冲突、断链和过期资料，归档/删除需要明确批准，不建立定时清理任务。

参见 [初始化安全默认决策规程](assets/skills/_shared/SETUP_AUTO_DECISIONS.md)、[离线路径大小写修复脚本](assets/skills/setup-matt-pocock-skills/scripts/auto_reconcile.py)、[文档单一权威位置协议](assets/skills/_shared/DOCUMENT_AUTHORITY.md)、[初始化规范](assets/skills/_shared/POCKET_SETUP.md) 和 [本仓库 Pocket 索引](docs/pocket/README.md)。本仓库已有的 Pocket 需求及问题文档保留原位置。

### 项目交接文档（交接分组）

新增独立的「交接文档」（Project Handover）分组，默认隐藏，可在「显示分组」中启用；原「文档」只更名为「验收文档」（Acceptance Docs），保留原 ID 和七个按钮。交接分组包含「交接总览」「功能规则」「关键流程」「日志排查」「交接维护」「需求汇总」六个独立 Skill。支持全项目/指定模块整理；优先复用目标项目的权威资料目录，否则推荐 Pocket。共享证据、冲突和写入规则位于 `assets/skills/_shared/project-handover/`。

点击按钮只插入可编辑草稿；实际整理会先核对仓库基线与事实依据，**创建和更新任何交接文档前必须显示具体差异并再次获得用户确认**。不会自动修改业务代码、远程环境或提交代码。已有 `actionsJson` 的用户需要在按钮设置点击「补齐缺失预设（待保存）」再保存，旧设置不会被覆盖。原 `handoff`「上下文交接」仍用于短期会话交接。

「需求汇总」独立读取用户提供的 SVN 日志或经确认范围的只读 SVN 历史，按模块和业务能力对新增、变更、修复及非功能提交分类并去重，保留每项对应的 r 修订号。仅提交记录时标为推断，不等同于现行代码已核实或功能已经上线。默认只在会话展示；若要落盘，沿用初始化的文档布局，必须先预览再明确批准。参见 [SVN 需求汇总约定](docs/pocket/requirements/svn-requirement-summary.md)。

参见 [正式需求](docs/pocket/requirements/project-handover.md)、[技术方案](docs/pocket/requirements/project-handover-implementation.md) 与 [30 项验收标准](docs/pocket/requirements/project-handover-acceptance.md)。

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


```sh
node scripts/verify-client-bundle.mjs
```


### 目录结构

```text
dsh-coding-suite/
├── assets/
│   └── skills/           # 内置工程及产品技能、共享工具与 Pocket 规范
├── src/
│   ├── index.ts          # 插件 Host 主入口
│   ├── skill-provider.ts # 技能注册服务
│   ├── todo-progress-guard.ts # 待办守护插件
│   └── config.ts         # 配置定义
├── package.json
└── README.md
```

### 开源协议

本项目采用 [MIT 许可证](LICENSE)。

### 内置 Skill 来源与版本

| 来源 | 版本与许可 | 内置及本地适配 |
| --- | --- | --- |
| [Matt Pocock Skills](https://github.com/mattpocock/skills) | `1.3.2`，提交 [`4ae2317`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d)，MIT | 39 个 Skill 全部内置；既有 Skill 保留 DSH 本地适配，上游原件另存于 `_upstream/matt`。 |
| [My-Prompts 产品研发](https://github.com/yuqiangdede/My-Prompts) | 提交 [`bfc391e`](https://github.com/yuqiangdede/My-Prompts/tree/bfc391e4b48d40ca3b7dfd337b374432c61559d4)，Apache-2.0 | 产品研发总控和 9 个专项 Skill，含 DSH 路径及阶段适配；另有本地单阶段 Skill。 |
| 其他本地、用户提供或参考资产 | 本项目 MIT 或原来源许可；未知项尚待核实 | 详见 [Skill 与提示词管理台账](docs/pocket/meta/skills-prompts.md)，不将借鉴或外部工具依赖称为已内置。 |

Matt 上游 Skill 清单（路径相对于其仓库）：

| Skill | 上游路径 |
| --- | --- |
| `ask-matt` | [`skills/engineering/ask-matt`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/ask-matt) |
| `code-review` | [`skills/engineering/code-review`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review) |
| `codebase-design` | [`skills/engineering/codebase-design`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/codebase-design) |
| `diagnosing-bugs` | [`skills/engineering/diagnosing-bugs`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/diagnosing-bugs) |
| `domain-modeling` | [`skills/engineering/domain-modeling`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/domain-modeling) |
| `grill-with-docs` | [`skills/engineering/grill-with-docs`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/grill-with-docs) |
| `implement` | [`skills/engineering/implement`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/implement) |
| `implement-spec` | [`skills/engineering/implement-spec`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/implement-spec) |
| `improve-codebase-architecture` | [`skills/engineering/improve-codebase-architecture`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/improve-codebase-architecture) |
| `pr` | [`skills/engineering/pr`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/pr) |
| `prototype` | [`skills/engineering/prototype`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/prototype) |
| `research` | [`skills/engineering/research`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/research) |
| `retro` | [`skills/engineering/retro`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/retro) |
| `setup-matt-pocock-skills` | [`skills/engineering/setup-matt-pocock-skills`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/setup-matt-pocock-skills) |
| `tdd` | [`skills/engineering/tdd`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/tdd) |
| `to-spec` | [`skills/engineering/to-spec`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/to-spec) |
| `to-tickets` | [`skills/engineering/to-tickets`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/to-tickets) |
| `triage` | [`skills/engineering/triage`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/triage) |
| `wayfinder` | [`skills/engineering/wayfinder`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/wayfinder) |
| `wizard` | [`skills/engineering/wizard`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/wizard) |
| `chief-of-staff` | [`skills/in-progress/chief-of-staff`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/chief-of-staff) |
| `claude-handoff` | [`skills/in-progress/claude-handoff`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/claude-handoff) |
| `loop-me` | [`skills/in-progress/loop-me`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/loop-me) |
| `setup-ts-deep-modules` | [`skills/in-progress/setup-ts-deep-modules`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/setup-ts-deep-modules) |
| `software-factory` | [`skills/in-progress/software-factory`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/software-factory) |
| `writing-beats` | [`skills/in-progress/writing-beats`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/writing-beats) |
| `writing-fragments` | [`skills/in-progress/writing-fragments`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/writing-fragments) |
| `writing-shape` | [`skills/in-progress/writing-shape`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/in-progress/writing-shape) |
| `git-guardrails-claude-code` | [`skills/misc/git-guardrails-claude-code`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/misc/git-guardrails-claude-code) |
| `migrate-to-shoehorn` | [`skills/misc/migrate-to-shoehorn`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/misc/migrate-to-shoehorn) |
| `scaffold-exercises` | [`skills/misc/scaffold-exercises`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/misc/scaffold-exercises) |
| `setup-pre-commit` | [`skills/misc/setup-pre-commit`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/misc/setup-pre-commit) |
| `grill-me` | [`skills/productivity/grill-me`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/grill-me) |
| `grilling` | [`skills/productivity/grilling`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/grilling) |
| `handoff` | [`skills/productivity/handoff`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/handoff) |
| `teach` | [`skills/productivity/teach`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/teach) |
| `to-questionnaire` | [`skills/productivity/to-questionnaire`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/to-questionnaire) |
| `wait-what` | [`skills/productivity/wait-what`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/wait-what) |
| `writing-for-agents` | [`skills/productivity/writing-for-agents`](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/writing-for-agents) |

逐文件来源、上游和本地 SHA-256 见 [Matt 来源清单](assets/skills/matt-source.json)；产品研发来源见 [清单](assets/skills/product-development-source.json)，历史和其他来源见 [管理台账](docs/pocket/meta/skills-prompts.md)。
