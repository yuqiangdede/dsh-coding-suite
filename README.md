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
   - Pocket maintenance & shared toolchain: `pocket-setup`, `pocket-reorganize`, `evidence_registry`, document QA scripts.

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
   - Pocket 知识库运维与共享工具链：`pocket-setup`、`pocket-reorganize`、证据登记表 (`evidence_registry.py`)、文档检索脚本等。

2. **前端 UI 快速发射器**
   - 实时呈现当前会话阶段指示器与状态徽标。
   - 交互式控制：批准 (Approve)、暂停 (Pause)、恢复 (Resume)、取消 (Cancel)。
   - 自定义技能动作发射器（支持导入/导出 JSON 配置表单）。

4. **待办任务同步守卫 (Todo Progress Guard)**
   - 智能监控活跃的待办任务，当执行进展超时未同步至上下文时自动发起柔性提醒。

### 五组工作入口

输入框上方按场景分为「常用」「需求」「开发」「文档」「其他」：

- **常用**默认显示，可编辑成员，也可隐藏后恢复。
- **需求**以产品研发流水线为主干：需求全流程 → 澄清 → 分析 → 风险扫描 → 业务方案 → 模块边界 → 数据/状态 → 异常流程 → PRD/评审/页面规格 → 页面一致性 → 生图提示词。按行宽尽量展示，确实放不下时用「更多（剩余）」查看后续阶段。
- **需求全流程**从最初想法一路推进到最终 UI 生图提示词，各 Gate 失败时回退，不自动实际生图或启动生产编码。明确只要文档或原型时遵循指定终点；其余阶段入口只完成对应一步。详见[需求分析约定](docs/pocket/requirements/requirements-analysis-group.md)。
- **开发**默认显示；新用户也默认显示需求，文档/其他默认隐藏。旧保存布局的需求组默认隐藏，在「显示分组」打开；已有按钮配置先在设置点击「补齐缺失预设（待保存）」并保存。
- 「补充文档」默认把本会话已确认结论补进现有产品文档；发送前可把草稿中的“来源”改为指定时间段或指定版本号/标签/提交之后，改按该范围的已提交代码改动记录补充。详见 [补充文档来源约定](docs/pocket/requirements/doc-supplement-sources.md)。
- 「按钮设置」允许管理每组显隐、常用按钮成员及原有 Skill/提示词；保存和导入导出 JSON 同时包含布局。
- 同一按钮可在不同分组出现，但始终引用同一个 action ID；隐藏分类不会禁用 Skill。
- 升级时保留原有已保存提示词及启用状态，旧自定义常用列表优先保留，旧默认快捷列表映射到当前常用预设；新阶段不自动加入常用。

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


```sh
node scripts/verify-client-bundle.mjs
```


### 目录结构

```text
dsh-coding-suite/
├── assets/
│   └── skills/           # 28 个工程技能及共享工具、Pocket 规范
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

