# 产品研发流水线（`product-development-pipeline`）

面向复杂 B 端 / 行业系统的**总控编排 Skill**。DSH「需求」分组按本流水线顺序组织；「需求全流程」默认从澄清推进到 UI 生图提示词，产出提示词后停止。用户明确指定仅文档或原型时遵循指定终点。

## 定位

它不重复实现所有需求、PRD、原型方法，而是调度同级 同级的 9 项专项 Skill 中的独立能力，并在关键节点执行 Gate。

简单任务不要启动整条流水线：

- 只澄清需求 → `requirement-clarification`
- 只做需求分析 → `requirement-analysis`
- 只做方案 → `solution-design`
- 只写 PRD → `prd-writing`
- 只评审 → `requirement-review`
- 只做原型 → `prototype-greenfield` 或 `prototype-existing-project`

## 流程

```text
01 需求澄清
   ↓
02 需求分析
   ↓
03 风险 Gate ①
   ↓
04 方案设计
   ↓
05 模块边界 Gate ②-A
   ↓
06 数据/状态 Gate ②-B
   ↓
07 异常流程补全
   ↓
08 PRD → 独立评审 → 页面规格
   ↓
09 页面/流程/权限 Gate ③
   ↓
10 输出路由
   ├─ 仅文档
   ├─ UI Prompt
   ├─ 从零可运行原型
   └─ 已有项目原型
```

## Gate

- `PASS`：继续。
- `CONDITIONAL PASS`：记录待办和关闭条件后继续。
- `FAIL`：必须回退，不允许用假设硬顶。

## 与能力库的关系

同级专项 Skill 是**能力库**；`product-development-pipeline` 是**编排器**。

能力库解决“某一件事怎么做”，流水线解决“复杂项目下一步该做什么、什么时候必须停下来检查”。

## References

历史专项资料按需读取：

```text
references/
├── requirement-analysis/
├── interaction-rendering/
├── feature-implementation/
├── data-dashboard/
├── performance-optimization/
└── monolithic-version/
```

这些资料不改变主流程和 Gate 顺序。

## 边界

- `solution-design` 明确承担需求分析到 PRD 之间的方案设计职责。
- PRD 写作与独立需求评审彻底分离。
- Step 08 不重新执行需求澄清、分析、模块设计和流程设计。
- DSH 入口默认到 UI 生图 Prompt；显式文档或原型目标仍可路由，不自动实际生图。
- 保留模块边界、数据/状态、异常、页面/流程/权限等工程级 Gate。

## 使用方式

正式执行规范见 [`SKILL.md`](SKILL.md)。

## 返回上级

[来源与本地适配](../product-development-source.json)
