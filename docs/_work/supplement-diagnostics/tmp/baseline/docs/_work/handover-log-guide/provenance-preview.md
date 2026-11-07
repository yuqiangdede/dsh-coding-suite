# 来源台账拟议差异（待确认）

目标：`docs/pocket/meta/skills-prompts.md`，在末尾追加：

```diff
+### 2026-11-03：交接日志排查入口
+
+- `ACTION:handover-log-guide`（`src/client/actions.ts`）：本地编写；来源为用户本次需求和仓库既有交接规程；无外部上游路径或版本。按钮正文、展示文案与接收指令均为本次新增，基线为新增前的 Git HEAD，历史由 Git 保存。
+- `SKILL:project-handover-log-guide`（`assets/skills/project-handover-log-guide/SKILL.md`）：本地编写；参考本仓库 `_shared/project-handover/` 的规程、证据、模板和更新门禁，以及本次用户需求；未复制外部 Skill 正文，无外部上游版本。作者为本次项目贡献者；具体个人身份未知。仓库许可见根目录 LICENSE，独立的上游许可不适用。
+- 引入日期：2026-11-03；本地适配为现有 Launcher 分组、离线技能发现和显式预览确认；新增资产无先前本地版本，Git 记录本次工作树内容。
```
