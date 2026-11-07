# 上游 Skill 更新文档差异预览

状态：草稿，尚未写入正式文档。

## README.md 拟新增：Skill 来源与版本

- Matt Pocock： https://github.com/mattpocock/skills ，包版本 1.3.2，提交 4ae2317ddb22b046e26455e4f9c9b3aaaf62212d，MIT；下表为本次核实的完整 Skill 清单。
- 产品研发 Skill： https://github.com/yuqiangdede/My-Prompts ，提交 bfc391e4b48d40ca3b7dfd337b374432c61559d4，Apache-2.0；已是上游 HEAD。
- 其他本地资产及来源未知或参考而非复制的内容，沿用台账逐项标注，未知不推断。

| Skill | 上游路径 |
| --- | --- |
| ask-matt | `skills/engineering/ask-matt/SKILL.md` |
| code-review | `skills/engineering/code-review/SKILL.md` |
| codebase-design | `skills/engineering/codebase-design/SKILL.md` |
| diagnosing-bugs | `skills/engineering/diagnosing-bugs/SKILL.md` |
| domain-modeling | `skills/engineering/domain-modeling/SKILL.md` |
| grill-with-docs | `skills/engineering/grill-with-docs/SKILL.md` |
| implement-spec | `skills/engineering/implement-spec/SKILL.md` |
| implement | `skills/engineering/implement/SKILL.md` |
| improve-codebase-architecture | `skills/engineering/improve-codebase-architecture/SKILL.md` |
| pr | `skills/engineering/pr/SKILL.md` |
| prototype | `skills/engineering/prototype/SKILL.md` |
| research | `skills/engineering/research/SKILL.md` |
| retro | `skills/engineering/retro/SKILL.md` |
| setup-matt-pocock-skills | `skills/engineering/setup-matt-pocock-skills/SKILL.md` |
| tdd | `skills/engineering/tdd/SKILL.md` |
| to-spec | `skills/engineering/to-spec/SKILL.md` |
| to-tickets | `skills/engineering/to-tickets/SKILL.md` |
| triage | `skills/engineering/triage/SKILL.md` |
| wayfinder | `skills/engineering/wayfinder/SKILL.md` |
| wizard | `skills/engineering/wizard/SKILL.md` |
| chief-of-staff | `skills/in-progress/chief-of-staff/SKILL.md` |
| claude-handoff | `skills/in-progress/claude-handoff/SKILL.md` |
| loop-me | `skills/in-progress/loop-me/SKILL.md` |
| setup-ts-deep-modules | `skills/in-progress/setup-ts-deep-modules/SKILL.md` |
| software-factory | `skills/in-progress/software-factory/SKILL.md` |
| writing-beats | `skills/in-progress/writing-beats/SKILL.md` |
| writing-fragments | `skills/in-progress/writing-fragments/SKILL.md` |
| writing-shape | `skills/in-progress/writing-shape/SKILL.md` |
| git-guardrails-claude-code | `skills/misc/git-guardrails-claude-code/SKILL.md` |
| migrate-to-shoehorn | `skills/misc/migrate-to-shoehorn/SKILL.md` |
| scaffold-exercises | `skills/misc/scaffold-exercises/SKILL.md` |
| setup-pre-commit | `skills/misc/setup-pre-commit/SKILL.md` |
| grill-me | `skills/productivity/grill-me/SKILL.md` |
| grilling | `skills/productivity/grilling/SKILL.md` |
| handoff | `skills/productivity/handoff/SKILL.md` |
| teach | `skills/productivity/teach/SKILL.md` |
| to-questionnaire | `skills/productivity/to-questionnaire/SKILL.md` |
| wait-what | `skills/productivity/wait-what/SKILL.md` |
| writing-for-agents | `skills/productivity/writing-for-agents/SKILL.md` |

## docs/pocket/meta/skills-prompts.md 拟新增

- 保留原有历史记录；新增本次旧版本、新版本、日期、MIT 许可与本地适配记录。
- 每个本地资源映射上游路径与版本；机器可读清单登记本次新导入资产。
- 对本地冲突逐项记录处理结果，原始基线通过 Git 固定提交追溯。

## 尚待解决

- 九个本地适配文件与上游出现文本合并冲突；尚未完成行为审查。
- 新增 Skill 的兼容性、相对路径及最终打包检查尚未完成。
