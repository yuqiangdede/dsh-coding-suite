# DeepSeek Harness Coding Suite (`dsh-coding-suite`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: DSH](https://img.shields.io/badge/Platform-DeepSeek_Harness-blueviolet.svg)](https://github.com/yuqiangdede/dsh-coding-suite)

[English](#english) | [中文说明](#中文说明)

---

## English

### Overview

`dsh-coding-suite` is an all-in-one engineering enhancement suite for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). It combines an authoritative Host-enforced staged workflow, 28 bundled engineering skills and Pocket specifications, an interactive Web/Desktop UI Launcher and panel, and an automated session progress guard.

### Key Capabilities

1. **Host-Authoritative Staged Workflow (S0 - S8)**
   - **S0 (Init)**: Initialize work item and capture repository baseline snapshot.
   - **S1 (Requirements)**: Formalize requirements and boundaries; supports explicit skipping for pure bugfixes.
   - **S2 (Design)**: Architecture and approach design; supports explicit skipping for rapid fixes.
   - **S3 (Test Spec)**: Specify test cases and verification checks prior to code changes.
   - **S4 (Implement)**: Implement changes strictly constrained within declared boundary files.
   - **S5 (Review)**: Perform peer-grade code reviews and capture structured findings.
   - **S6 (Repair)**: Remediate any blocking review findings.
   - **S7 (Verify)**: Execute planned test checks inside the sandbox.
   - **S8 (Commit)**: Perform a single, verified Git commit staging only covered files.
   - Guards against direct unmonitored Git mutations, enforcing checkpoint-by-checkpoint progress.

2. **28 Bundled Engineering Skills**
   - High-leverage skills from Matt Pocock: `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `grilling`, `prototype`, `tdd`, `to-spec`, `to-tickets`, `writing-for-agents`, etc.
   - Enterprise documentation & reverse engineering: `requirements-spec`, `api-integration-docs`, `database-design-doc`, `component-doc-merge`, `markdown-to-docx`.
   - Pocket maintenance & shared toolchain: `pocket-setup`, `pocket-reorganize`, `evidence_registry`, document QA scripts.

3. **Client UI Launcher & Workflow Panel**
   - Live visual workflow panel tracking the active session's work item stage chip.
   - One-click workflow commands: Approve, Pause, Resume, Cancel, Mode switch.
   - Customizable quick actions launcher with full export/import settings form.

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

---

## 中文说明

### 概述

`dsh-coding-suite` 是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 打造的一体化工程增强套件插件。它将 Host 端权威阶段化工作流、28 项精选工程技能与 Pocket 规范、Web/桌面端交互式发射器与工作流面板，以及待办进度守卫深度融为一体。

### 核心功能

1. **Host 权威阶段化开发工作流 (S0 ~ S8)**
   - **S0 (初始化)**: 初始化任务条目并记录初始 Git 仓库快照。
   - **S1 (需求分析)**: 明确需求范围与改动边界；对于快速修复场景支持显式跳过 (Skip)。
   - **S2 (方案设计)**: 制定技术方案并进行设计评审；对于简单 Bug 可显式跳过。
   - **S3 (测试规约)**: 在编码前确立验证命令与测试用例。
   - **S4 (代码实现)**: 在严格限定的文件边界内执行代码实现。
   - **S5 (代码审查)**: 对比实现产物，记录结构化审查发现 (Findings)。
   - **S6 (修复改进)**: 针对审查不合规项执行闭环修复。
   - **S7 (沙箱验证)**: 在隔离沙箱中执行预定的验证检查。
   - **S8 (验证提交)**: 仅暂存并提交受验证保护的文件，生成原子 Git 提交。
   - 彻底防止模型绕过验证直接私自 Git 提交或越权修改无关文件。

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
