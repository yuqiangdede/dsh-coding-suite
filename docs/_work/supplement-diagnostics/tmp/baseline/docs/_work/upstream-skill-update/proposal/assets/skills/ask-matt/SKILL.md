---
name: ask-matt
description: Choose the next available engineering or product Skill in this package from the user's goal and current evidence. Give a recommendation without running the stage.
disable-model-invocation: true
---

# Ask Matt — local routing

Recommend a next step; do not execute it. First check the session's available Skills and read the `SKILL.md` of any Skill you recommend. A route is conditional on the user's requested outcome and existing evidence. Do not require a full pipeline for a small, clear task.

| Situation | Likely route |
| --- | --- |
| Goal, scope or acceptance is unclear | `grill-with-docs` in a repository; `grilling` for a conversation without project documents |
| A specific fact needs primary-source research | `research` |
| A runnable answer is needed before choosing a design | `prototype`, then capture the finding |
| Requirements are settled and need a durable spec | `to-spec`; use `to-tickets` if work needs independently verifiable tickets |
| A spec or ticket needs code | `implement`; use `coding-workflow` only for an explicitly requested Host-managed automatic task |
| Established behavior is broken | `diagnosing-bugs`; a changed behavior contract also needs requirements/specification work |
| A diff needs assessment | `code-review`; identify the comparison target and spec source |
| A PR description is needed | `pr` |
| Product requirements need several design stages and gates | `product-development-pipeline`; for one stage use its matching specialist Skill |
| Domain terminology or an irreversible decision is disputed | `domain-modeling`, using the target project's authoritative knowledge paths |

Check the target project's `AGENTS.md` and knowledge index before suggesting document paths. In this repository Pocket is authoritative: `docs/pocket/README.md` points to the right location. `setup-matt-pocock-skills` is for an unconfigured repository or a requested configuration audit, not a prerequisite to every task.

If a route depends on a Skill absent from the current session, identify the missing Skill and suggest an available path without presenting the missing route as executable. Mention a prerequisite only when it actually blocks the recommended action. Give the reason, the next action and any material condition in a short answer.
