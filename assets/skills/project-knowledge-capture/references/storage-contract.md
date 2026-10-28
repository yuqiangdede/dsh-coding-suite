# 项目知识默认存储协议

当项目没有既有知识库规范时使用本协议；已有项目规范优先。

```text
knowledge/
├── overview.md
├── glossary.md
├── business/
│   └── <business-object>.md
├── decisions/
│   └── ADR-0001-<topic>.md
├── changes/
│   └── CHANGELOG.md
├── data-insights/
│   └── <topic>.md
└── lessons/
    └── lessons-learned.md
```

## overview.md

记录项目背景、目标、范围、核心角色、核心对象、关键系统关系，以及当前有效知识入口。

## glossary.md

只记录有业务含义、容易混淆或项目特有的术语。每条至少包含术语、定义、适用范围；不确定项标记 pending。

## business/

围绕业务对象组织当前有效规则，不按原始文件类型组织。每个主题优先保留：规则、适用范围、状态、来源和相关变更。

## decisions/

重要决策使用 ADR 风格：背景、决策问题、候选方案、最终选择、选择原因、放弃原因、影响、状态、来源。

## changes/CHANGELOG.md

按时间记录重要规则变化：`旧规则 → 新规则 → 原因 → 影响范围 → 来源`。

## data-insights/

保存长期仍有价值的数据结论和口径，不复制整份报表。说明指标、时间范围、观察、可能原因、结论和限制。

## lessons/

保存项目经验及可执行改进动作。区分偶发问题与系统性问题，并记录是否已固化为 Checklist/SOP/规则/Skill。

## 状态约定

- `current`：当前有效。
- `historical`：历史版本，仅用于追溯。
- `deprecated`：明确废弃。
- `pending`：尚待确认。

同一范围内不得存在两个互相冲突且都标记为 `current` 的规则。
