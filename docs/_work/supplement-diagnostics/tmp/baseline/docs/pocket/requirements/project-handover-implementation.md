# 项目交接文档分组——技术实施方案（设计稿）

> 2026-11-05 变更：分组合并及旧布局迁移以 [正式需求](project-handover.md) 顶部的已确认决定为准；本文原有独立分组设计保留为历史方案。

状态：proposed implementation（2026-11-02）。这是已确认 [正式需求](project-handover.md) 的**推荐实现方式**，不是已经实现的系统行为；需要以当前实现分支的最新源码复核后落地。
规范边界：用户确认的是五按钮、全项目+模块、已有目录优先、默认隐藏、差异预览确认后写入、部署与运行归入总览/运维。其他技术细节可在不违反需求的前提下调整。
设计核对代码基线：`master@a8b5d9d7f301cfe862162ae6dc93c00c28353d40`；验收见 [验收标准](project-handover-acceptance.md)。

## 1. 当前可复用基础与实现风险

| 当前实现 | 位置 | 复用/改造要点 |
| --- | --- | --- |
| 分组和布局 | `src/client/launcher-layout.ts` | `LAUNCHER_GROUPS`、`parseLauncherLayout`、`defaultLauncherLayout`、`actionsForGroup`；保留 `documents` ID，新增组和迁移字段 |
| 按钮配置 | `src/client/actions.ts` | `DEFAULT_ACTIONS`、`missingDefaultActions`、`parseActions`、`encodeActions`；`actionsJson` 为 v3，最多 100 条 |
| 中文/英文展示 | `src/client/locales.ts` | `groupDocuments` 改展示值，新增组标签及新动作英文文案；勿改已有 ID |
| Launcher 与设置 | `src/client/Launcher.tsx`、`Settings.tsx` | 分组显隐、按可用宽度的更多/收起、常用编辑、草稿插入、保存/导出 |
| 推荐与意图 | `src/client/contextual-actions.ts` | 现有 `handoff` 正则可能把“交接文档”误判为当前任务交接 |
| Skill 注册 | `src/skill-provider.ts` | provider 按 `assets/skills/<folder>/SKILL.md` 发现；`_shared` 被排除 |
| 共享证据 | `assets/skills/_shared/scripts/evidence_registry.py` | 已有证据位置、片段、文件 SHA256、`candidate/static/documentation/runtime` 记录和失效检查，不证明语义/环境 |
| Pocket 知识 | `docs/pocket/README.md`、`meta/knowledge-policy.md` | 资料权威、渐进阅读、非重复、保留历史 |
| 任务交接 | `assets/skills/handoff/SKILL.md` | 仅会话交接，临时目录，保留原功能 |
| 现有交接附近能力 | `project-knowledge-capture`、`doc-supplement` | 方法参考、规范复用，不改变原输出目标 |

特别注意：当前 `actionIntent` 对 `skill` 使用 `/skillId` 前缀归因，**五个动作直接共用一个 `skillId` 无法可靠区分各个按钮**。因此推荐五个**独立可识别的薄 Skill 入口**，共享工作协议、模板和工具；逻辑只有一份，入口五份。若以后改造意图识别为模式参数识别，可再收敛成单 Skill，首版不强推。

## 2. 组件组织与任务模式

推荐资源结构：

```text
assets/skills/
├── project-handover-overview/SKILL.md
├── project-handover-features/SKILL.md
├── project-handover-flows/SKILL.md
├── project-handover-troubleshooting/SKILL.md
├── project-handover-maintain/SKILL.md
└── _shared/project-handover/
    ├── protocol.md                # 共同目标、只读边界、版本/范围判定
    ├── evidence-and-conflicts.md  # 证据模型、反幻觉、冲突、脱敏
    ├── discovery.md               # 资产盘点与模块范围控制
    ├── authoring.md               # 目录选择、章节模板、读者路径
    ├── changes.md                 # 变化影响、预览确认、增量写入
    ├── templates/                 # 首页、功能、流程、日志、待确认模板
    └── tooling.md                 # 可选证据脚本/无 Python 回退
```

五个 Skill 只包含各自的输入接收契约、模式名、调用共享协议的相对引用和结束报告要求。`skill-provider.ts` 默认可发现，不需要新增 Host 服务；资源按 Skill 资源基目录解析，Windows 离线可用。不新增远程下载安装前置。

推荐动作 ID 与 Skill 一一对应：
- `handover-overview` → `project-handover-overview`
- `handover-features` → `project-handover-features`
- `handover-flows` → `project-handover-flows`
- `handover-troubleshooting` → `project-handover-troubleshooting`
- `handover-maintain` → `project-handover-maintain`

每个 `CodingAction` 沿用 `kind='skill'`、`enabled=true`、`pinned=false`、各自提示词、说明和示例；ID 唯一且不会占用现有 `handoff`。动作成员只注册在新交接组（用户仍可手动加常用）；不复制到原「验收文档」组。

## 3. 任务状态与交互

### 3.1 Launcher 交互与写入门禁

- 按钮点击 → 检查 Skill 可用 → 插入**可编辑草稿**，包含“来源仓库/基线/范围/目标目录/运行验证条件”等可修改项；仅用户发送后 Agent 执行，按钮本身不启动文件扫描、写入、网络请求或生产操作。
- 分析阶段默认只读；生成文件清单与**真实拟新增内容/差异**后，停止在等待确认的关口。用户明确确认了具体文件/范围/差异后才可执行写入；首次生成和已有文件更新同样适用。
- 无法获得“确认后再次执行”的持久状态时，草稿/差异保存在本次会话或用户指定的安全临时位置，并说明需要用户重新提交；不得伪装系统已原子提交。
- “本轮仅讨论需求”这类会话授权不会被 Skill 误用为对将来写入的预授权。

### 3.2 推荐状态流（任务级，不改 Host coding-workflow）

```text
CREATED
  -> BASELINED              # 分支、提交、工作区和资料权威
  -> INVENTORIED            # 范围/资产清单
  -> ANALYZED               # 分批核验证据
  -> DRAFT_READY            # 已整理草稿和差异
  -> AWAITING_APPROVAL       # 等待明确确认
  -> APPLIED                # 仅已批准的文档范围落盘
  -> REPORTED               # 更新索引/差异/未决项
任意分析阶段 -> BLOCKED/PAUSED（记录检查点）
AWAITING_APPROVAL -> CANCELLED（不修改正式资料）
APPLIED -> PARTIALLY_APPLIED（仅在部分成功时报告并可安全恢复）
```

状态机仅是任务执行规程，不新增自动/手动模式按钮，也不恢复 S0–S9 工程工作流。

## 4. 分组与配置迁移详细设计

### 4.1 稳定 ID 和字典

- `LAUNCHER_GROUPS` 中原 `{ id:'documents', label:'groupDocuments' }` 不改 ID 和 `actionIds`；字典 `groupDocuments`：中文「验收文档」、英文推荐「Acceptance Docs」。
- 增加 `{ id:'handover-docs', label:'groupHandoverDocs', actionIds:[五个新 ID] }`，推荐在 `documents` 之后、`others` 之前。
- `defaultVisibility` 增加 `'handover-docs':false`；老布局缺字段时自动补 `false`，原有 `common` / `requirements-analysis` 的兼容逻辑保持。
- 不凭空改动目前 `documents` 的成员：现有七项是 `api-docs, requirements, overview, outline, database, doc-merge, docx`；`doc-supplement` 在开发/其他分组。
- “显示分组”、设置页面、导入导出、常用成员编辑、Launcher “更多”应从同一组定义取值，不用一套额外配置。

### 4.2 保存布局规则

`layoutJson.schemaVersion=1` 仍可使用，只追加可选布尔字段 `visibleGroups['handover-docs']`；保留已保存的原字段和 `commonActionIds`。`parseLauncherLayout` 对缺字段走默认值，对出现但类型错误的字段报错；未知字段按当前策略兼容/忽略，不能因此丢其他已知字段。旧布局保存为新版后包含完整布尔集合。

`actionsJson.schemaVersion=3` 不变；用户原动作 ID、`skillId`、`label`、`prompt`、`enabled`、`pinned`、`order`、`description`、`example` 必须保留。旧存档默认不自动注入新预设；在设置中“补齐缺失预设（待保存）”仅追加缺 ID 的动作并让用户保存。重复补齐应幂等；达到 100 动作上限时清楚提示，不截断、不删旧按钮。无动作情况下新交接组可能暂时没有可显示按钮，要提供可见的补齐入口说明，不能冒充组已配置完成。

`commonActionIds` 由用户维护，新增动作不默认固定到常用；用户添加后保持原顺序及禁用语义。旧版客户端往返可能剥离未知新组字段，回到新客户端后按缺省隐藏；应在兼容说明/测试中记录，不能声称旧版保留其不认识的字段。

### 4.3 推荐与入口识别

当前 `contextual-actions.ts` 针对 `handoff` 的模式包含宽泛的“交接文档”；优先依据明确动作/Skill ID 识别，缩窄文案匹配或排除新五动作，避免“交接维护已完成”自动高亮“继续当前任务”。新分组的推荐链只在有明确、未冲突的阶段结果时给出建议，缺证据不得推断“全量交接完成”。本期不引入新 Host 状态机；推荐始终辅助而非强制执行。

## 5. 目录路由与单一权威

### 5.1 目标目录探测顺序

1. 读取目标仓库 `AGENTS.md`/`CLAUDE.md` 及文档索引、知识权威规则。
2. 识别已存在的 Pocket、`docs/`、`knowledge/` 或自定义交接目录；确定有效权威、历史待迁移路径及读者索引。来源冲突时先列出而不擅自迁移。
3. 已有正式目录：在**其规定位置**新增交接子区或维护既有对应章节；不能强制搬迁。
4. 无既有规则：推荐 `docs/pocket/handover/`，同时建立必要 Pocket 索引；只创建实际生成的文件。
5. 同一事实若已有正式要求/接口/ADR，则在交接资料中给出摘要和链接；实施观察与规范不同要同时记录，不直接覆盖源规范。

### 5.2 文档与索引结构（推荐）

```text
docs/pocket/handover/
  README.md
  system-map.md
  features/<domain-or-module>.md
  flows/<stable-flow-id>.md
  operations/logs.md
  operations/deployment.md
  operations/troubleshooting/<incident-type>.md
  open-questions.md
  _meta/manifest.json
```

小项目可将 `system-map`/`features` 合并在首页；目录不强制完整创建。首页必须能够沿“5 分钟概览、30 分钟业务、按问题排查”三条路线渐进阅读，并在入口处呈现覆盖率、基线和运行验证限制。

## 6. 事实模型与核验分层

### 6.1 建议的 claim（逻辑结构，而非新 API 承诺）

```json
{
  "claimId": "FLOW-001",
  "statement": "当前源码对某条件执行特定处理",
  "sourceRefs": [
    {
      "path": "src/example/Handler.java",
      "symbol": "handleEvent",
      "lineRange": [40, 55],
      "gitSha": "<commit>",
      "fileSha256": "<hash>"
    }
  ],
  "evidenceType": "static",
  "status": "pending",
  "applicability": {
    "module": "example",
    "environment": "unknown",
    "conditions": ["profile/feature flag 需核查"]
  },
  "verifiedAt": "<ISO timestamp>",
  "runtimeValidated": false,
  "relatedDocument": "handover/flows/example.md"
}
```

示意 JSON，字段和路径是假样例，不能直接作为真实源码证据。具体载体可为机器清单引用 + Markdown 中的短引用表；避免把所有正文重复塞进 JSON。

证据层次：
- `candidate`：扫描/搜索，仅候选；
- `documentation`：已有文档约定，需记录版本/状态；
- `static`：读过相关调用、配置、注册和数据/异常出口后的源码分析；
- `test`：有测试条件/环境/结果；
- `runtime`：有目标环境/时间/日志或监控记录；
- `confirmed`：有明确来源的人为确认，保留确认记录。

`status` 另行使用 `verified/pending/conflicted/stale/superseded`；不把证据类别当成可信度绝对排序，测试和运行仅覆盖其适用范围。

### 6.2 来源冲突规程

每条冲突至少有：`conflictId`、主张、来源 A/B、各自版本、适用条件、冲突原因或未能排除的假设、阻塞范围、建议验证步骤、状态和责任人（未知则待确认）。先区分不同环境、历史版本、条件配置，再判断是否实际矛盾。未解决时正文使用并列表述而不是覆盖一方。

典型情况：“定时配置在源码是每小时”，与“旧设计要求每日”冲突，且无法访问生产环境——只能分别声明源码配置与文档要求，并标记线上是否启用为待确认。

### 6.3 证据工具接入

优先复用 `assets/skills/_shared/scripts/evidence_registry.py` 记录文件片段与 SHA256 指纹、复查失效；工具本身不能建立跨文件/运行事实，只负责来源线索。可在不破坏现有格式的条件下扩展引用消费者/文档 ID/影响反查；如需改变原 registry schema，先写迁移和回归方案。Python 不可用时，Agent 可使用只读搜索、Git 和文本引用降级，但不能伪造 `check` 输出。

## 7. 全项目批次、缓存与检查点

### 7.1 分批策略

先做**资产盘点**：项目结构、子项目、有效配置、数据库迁移、主要 HTTP/消息/任务入口、日志和部署线索；然后按“业务域/模块 + 跨域主流程”建立工作单元。每批独立记录 `scope`、`baseSha`、`dependencies`、`sourceInventory`、`claims`、`docs`、`pendingItems`、`status`。

当分析成本超过可用资源、模块依赖未明确或输入缺失时，输出可重入检查点；已有完成批次且基线/依赖不变可复用。禁止采用“只处理前 1000 文件然后宣布全量完成”或按文件数量虚构覆盖率。

覆盖率至少分开报告：
- 资产盘点覆盖：已发现模块中被盘点的数量；
- 深入分析覆盖：目标范围内完成规则/流程/日志分析的数量；
- 证据核验覆盖：关键主张中有适用来源的数量；
- 运行验证覆盖：有目标环境证据的数量；无权限时为“未验证”而不是 0% 通过。

### 7.2 推荐 manifest（仅索引，不复制事实）

```json
{
  "schemaVersion": 1,
  "repository": "<repository-url-or-id>",
  "baseCommit": "<full-sha>",
  "workingTreePolicy": "committed-only",
  "scope": {"kind": "module", "paths": ["src/example"]},
  "batches": [
    {"id": "B-001", "module": "example", "status": "analyzed", "docs": ["handover/features/example.md"], "claims": ["FUNC-001"]}
  ],
  "openQuestions": ["Q-001"],
  "lastReviewedAt": "<timestamp>"
}
```

Manifest 推荐增量写入，并通过文档稳定 ID/路径与证据注册表建立关联；旧清单结构未知时不覆盖，先做兼容探测。时间字段不能冒充真实运行验证的时点。

## 8. 差异预览、人工保护与并发

写入管线（首次生成、局部更新均使用）：
1. 锁定目标项目、基线和写入权限，读取权威文档与索引，记录各目标文件当前内容哈希；
2. 根据当前证据/版本生成**候选变更**，只涉及选定章节/新文档；
3. 检查与现有事实、手工标记和规范的冲突，输出冲突项和待确认内容；
4. 展示逐文件新增/删除/修改内容、依据、影响范围及是否覆盖人工段落；包含初次创建的文件内容预览；
5. 等待用户对**具体变更清单**明确确认；取消时不写；
6. 写入前重读目标文件/基线，哈希或工作树状态变化则重新计算差异，禁止基于旧预览覆盖；
7. 按可恢复方式写文件、更新索引与证据引用，失败时报告已写与未写范围，不能声称全成功；
8. 输出文件清单、各节变更、证据与未覆盖项，不自动 commit/push。

首版推荐章节级结构标记或稳定标题定位；不要在 Markdown 中大规模“生成区”包裹人工内容。对人工与自动文本共同编辑的章节采用冲突报告和人工合并；没有安全解析能力时**整文件只生成差异草稿、不自动替换**。

“确认”不等于用户第一次点击入口，更不能从用户确认产品需求推断授权将来任意写入项目文件。

## 9. 运行/日志边界与安全

- 从项目内的 logger 配置、启动脚本、配置样板、部署描述识别**可能的日志来源**，必须记录“候选 vs 已确认路径”。容器挂载目录、集中日志平台等只有证据时才能列为实际环境事实。
- 排查顺序以“现象 → 时间/关联 ID → 入口日志 → 异常/状态 → 对应代码 →下一步核查”为导向；示例日志需脱敏或标注模拟，不复制真实业务记录。
- 写出的 PowerShell/SQL/系统命令默认限只读且在执行前可审阅；涉及服务器访问、部署、数据库写入、重启、诊断日志添加等另走授权；工具不可用不得声称已执行。
- 对本地已存在的密钥、用户隐私或生产日志文件优先不读取/不提交；必要时只提供位置类型和非敏感配置键，不保留秘密内容。
- Windows 安装包必须包含五个 Skill 目录与共享资源，不依赖在线下载；用仓库现有发布校验机制测试。

## 10. 实施分期与开发交付清单

| 阶段 | 代码/资源变动（实施阶段才做） | 退出条件 |
| --- | --- | --- |
| I. UI/兼容 | `launcher-layout.ts`、`actions.ts`、`locales.ts`、`contextual-actions.ts`、相关布局与动作测试 | 旧布局/自定义/导入导出稳定，五动作可识别，新组默认隐藏 |
| II. Skill/模板 | 5 个薄 Skill + 共享协议/模板/只读证据调用，打包/注册校验 | 小型真实示例可从总览进入专题，产物有基线和证据，无虚构线上事实 |
| III. 更新保护 | manifest、失效检测、版本/模块更新、差异预览和确认后写入 | 幂等、人工冲突保护、失败恢复，越权/未确认不写 |
| IV. 大型项目演练 | 不引入额外按钮；增加多模块/分批/离线/范围/安全回归 | 报告真实盘点与分析覆盖、任务可中断续做、证据变化可复核 |

实现时拟检查或更新：
- `src/client/launcher-layout.ts`、`src/client/Launcher.tsx`、`src/client/Settings.tsx`；
- `src/client/actions.ts`、`src/client/locales.ts`、`src/client/contextual-actions.ts`；
- `assets/skills/project-handover-*/SKILL.md` 与 `assets/skills/_shared/project-handover/`；
- 相关 `tests/`，`scripts/build-action-bundle.mjs`、`scripts/rebuild-launcher-bundle.mjs` 及发布 `lib`；
- 新资产的来源/本地改造记录纳入 `docs/pocket/meta/skills-prompts.md`。

以上是**未来实施清单**，本轮均不修改。

## 11. 实施前需再次核对但不阻塞需求固化

- 最新主干是否已调整动作归因逻辑、分组结构或按钮数量上限；本设计基于上述固定 SHA。
- 目标用户的项目是否已有不同于 Pocket 的有效交接目录；Skill 必须先识别而非强制覆盖。
- 大规模仓库的实际文件访问边界、可用历史命令、上下文预算和跨模块依赖，运行时据实拆批，不承诺绝对时间上限。
- 本地是否安装 Python/具备运行环境权限；没有也应生成准确的静态交接资料并清楚报告无法验证的部分。
