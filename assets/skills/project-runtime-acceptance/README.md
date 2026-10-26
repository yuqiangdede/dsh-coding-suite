# project-runtime-acceptance · 项目全局运行健康验收 Skill

**用途**：检查数据库表数据生命周期、定时任务冲突、缓存复用与更新、循环/重复 API 请求，并覆盖文件对象、异步任务、并发、性能、资源、部署、恢复、安全观测，共 12 个领域。

这是 **Agent Skill，不是直接修改项目的程序，也不是自动执行生产数据库检查的监控服务**。首次使用应先做“全量 + 静态 + 只读”验收。脚本提供辅助候选清单，关键结论由 Agent 基于源码和证据复核。

## 使用（bundled DSH）

本 skill 由本项目的 bundled skill provider 提供，**无需手工安装**，不必复制到被审项目的 `.agents/skills` 或 `.dsh/skills`。在会话中调用 `project-runtime-acceptance` 即可；未发现技能时检查当前构建及 provider 配置。技能提供本身不等于自动生成按钮。

> 使用 project-runtime-acceptance 对当前仓库进行全量静态只读验收，输出完整资产清单、P0/P1/P2 问题与证据，不修改代码；先确认报告输出目录。

`references/`、`assets/`、`scripts/` 均相对加载 skill 时返回的 **skill base directory**，不是被审仓库的同名目录。模板保存在 skill 内，生成的报告写入用户确认的独立目录，不修改模板。未确认落盘路径时仅在对话中交付。

原压缩包的 `install.ps1` 保留为兼容入口，但此 bundled 版本已停用手工安装；调用它只会说明 provider 用法，不复制或删除文件。

## 直接辅助扫描（可选）

无需 Python 第三方依赖，Python 3.9+。在 DSH 中先调用 `load_workspace_dependencies` 获取 bundled Python，替换以下两个占位符；`--out` 必须先获用户确认，优先使用新的独立目录：

```powershell
& "<bundled Python absolute path>" "<skill base>\scripts\inventory.py" --project "D:\work\my-project" --out "D:\reports\confirmed-new-output"
```

已有报告默认拒绝覆盖；仅在用户明确同意后添加 `--overwrite`。脚本拒绝输出路径及文件中的符号链接/junction，以及有多个硬链接的报告文件，但不是抵御并发恶意文件系统变更的安全沙箱，应使用当前用户独占的输出目录。扫描器只对 DB/JOB/CACHE/API/STORE/ASYNC/RES 提供启发式规则，其余领域须按参考规则人工取证；12领域验收不能以扫描结果代替。

运行标准库单元测试（只创建隔离临时数据，不运行被审项目）：

```powershell
& "<bundled Python absolute path>" -B "<skill base>\scripts\test_inventory.py"
```

输出：`inventory.json` 和 `inventory.md`。扫描**只读取项目文件**，仅在 `--out` 指定目录生成结果，不执行项目、SQL、网络请求或删除操作。脚本使用正则启发式定位候选资产，**不能代表全部资产、调用链真相或最终问题判断**。本地没有 Python 时，可由 Agent 使用源码检索工具替代。

退出码：`0` 表示按当前排除范围完成候选扫描（不代表验收通过）；`2` 表示参数或输出错误；`3` 表示文件/匹配数量上限、文件读取跳过或目录遍历失败导致扫描不完整。JSON 的 `statistics.incomplete`、`directory_errors` 和 Markdown 的未覆盖目录清单记录限制与路径，必须纳入覆盖率说明。

### 对话示例

- `用 project-runtime-acceptance 全量检查这个仓库，生成验收报告，不要改代码。`
- `只检查数据库表有没有长期堆积风险，并核对文件对象清理闭环。`
- `复检上一次全局验收的 P0/P1 问题，标记仍存在还是已修复。`
- `只看本次 PR 的增量风险，但要追踪受影响的定时任务、缓存和调用链。`

## 内容结构

```text
project-runtime-acceptance/
├── SKILL.md                        # 核心流程、边界、评级标准
├── README.md                       # bundled provider 使用说明
├── install.ps1                     # 无写入的兼容提示入口
├── references/                     # 12 个检查领域的详细规则
├── scripts/inventory.py            # 标准库实现的只读候选资产扫描器
├── assets/acceptance-report.md     # 验收报告模板
├── assets/remediation-plan.md      # 整改复检模板
└── assets/project-policy.example.md# 项目保留/性能/运行策略样例
```

## 验收范围说明

- 静态扫描无法充分判断多实例行为、真实缓存命中率、生产数据增长、执行耗时、线上调用循环、真实资源泄漏等。需运行时指标或运维证据。
- 表是否需要删除必须依据保留法规与业务要求，**不能把“无定时清理”直接当缺陷**。
- 不会默认连接生产环境或执行清理；敏感配置无需复制到报告。

## 规则来源

格式遵循 Agent Skills 的 SKILL.md 约定，目录扫描兼容 DSH 官方 Skill Filesystem 文档：
- https://agentskills.io/specification
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.zh.md

版本：1.0.0（2026-10-26）
