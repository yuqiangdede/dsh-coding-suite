---
name: code-review
description: Review a branch, PR or working-tree diff against project standards and an available specification. Report actionable findings with file and line evidence; do not edit code.
---

# Code review

Review the scope the user names. If no comparison point is given, infer one from the task and repository state, state it, and ask only when the choice would materially change the review. Inspect the diff **and** the surrounding code needed to judge behavior. Keep the review read-only.

## Fix the review scope

- **Branch or commit range:** resolve the supplied ref. For a branch comparison use its merge base (`git diff <base>...HEAD`); for an explicit commit range use the user's requested endpoints. Record the commit list.
- **Working-tree changes:** include both staged and unstaged tracked changes (`git diff --cached` and `git diff`) and any relevant untracked files. `git diff <base>...HEAD` alone omits these changes.
- **PR:** use the PR's actual base and head, including its metadata and full diff. Do not silently substitute a local branch with a different head.

Check the repository instructions and locate the originating issue/spec through explicit user input, commit/PR references, then relevant project documents. If none exists, report that the Spec axis cannot be fully assessed; do not invent requirements. For this repository use `docs/agents/issue-tracker.md` and the Pocket index.

## Two review axes

1. **Standards:** check explicit repository conventions first. Also consider concrete maintainability risks such as duplicated logic, misleading names, unnecessary abstraction, scattered changes or fragile coupling. Treat these as judgment calls, not automatic violations; do not duplicate findings already enforced by tooling.
2. **Spec:** compare observed behavior and changed paths with each applicable requirement and acceptance condition. Identify missing behavior, incorrect behavior and material scope creep. Cite the requirement or state the evidence gap.

For each actionable finding give priority, file/line, trigger, impact and a specific correction or verification. Rank by user impact and likelihood. Do not inflate the report with speculative smells. If no issues are found, say what was inspected and what evidence was unavailable; a clean review is not proof of correctness. Keep Standards and Spec conclusions distinct.

For complex changes, independent reviewers may examine the two axes in parallel when delegation is available and authorized. Give both the same fixed diff and relevant sources, then reconcile overlapping findings before reporting. A separate agent is useful for independence but is not required for a small review or when delegation is unavailable.
