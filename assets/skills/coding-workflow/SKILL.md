---
name: coding-workflow
description: Use for a user-authorized end-to-end change — requirements analysis, implementation, or documentation — with guarded checkpoints, review/repair, real verification, and a local-only Git commit.
---

# Coding workflow — staged delivery with human checkpoints

This Skill is **a bounded orchestration entry**, not a substitute for the single-stage Skills. Keep all normal DSH permissions, sandbox and tool approvals. A user sending this Skill invocation authorizes routine local engineering steps, **not** destructive or remote changes.

## Mandatory policy

- Single-stage launcher buttons remain the default for one-step work; this Skill orchestrates one task across every stage.
- Use existing `grill-with-docs`, `to-spec`, `to-tickets` as needed, `implement`, `code-review`, `diagnosing-bugs` as methods. Follow their stage boundaries when executing each stage.
- Never push, fetch credentials, open/merge PRs, deploy, release, or modify a remote repository. Never run SVN commit. Only local Git commit is eligible.
- Pause and request **scoped user approval** for material ambiguity, destructive DB/data changes, security policy/permission changes, unrelated files, unknown pre-existing modifications, or any attempt to bypass tests/protection.
- Do not create or modify the project's product documents (requirements, system design, high-level design, database design, interface documents) during S1–S8. Keep the S2 specification and S9 delivery report outside the product-document tree, for example under `DSH_HOME/coding-work-items` or an OS temporary directory. README and JSDoc updates still accompany code changes.
- At S9, after the local commit, list the affected existing product documents and ask once whether to supplement them (all / selected / none). Call `coding_workflow` with `action=approval` for this choice and wait for the user's answer. The model-facing tool has no `approve` action: the user records the decision through the Host workflow panel/Remote. After `action=status` reflects that decision, call `action=resume`. Update only on confirmation. Keep those document changes in the working tree and never create a second local commit. Record the choice and changed documents in the delivery report.
- If an essential Skill, execution tool, build dependency or evidence is unavailable, **block with the actual reason**; do not quietly substitute a generic prompt and call it successful.
- Existing DSH tool permission checks and user approvals are authoritative. This Skill cannot override a denied tool call.
- Never mark a step as passed by interpreting the model's own prose. Artifacts must exist, review must be structured, and tests/builds must actually run.
- Retry at most 3 substantive repair iterations and stop after 2 iterations without reduction of unresolved findings. On budget/time exhaustion stop with a checkpoint; do not loop indefinitely.
- The user may stop the task at any time. After restart do **not** resume automatically; ask the user to explicitly continue.

## The Host work item

The authoritative record lives in the Host: `coding_workflow` is the only way to advance it. The Host stores the task in its storage domain (not in the Git worktree), validates every transition against the actual repository, and reports the current stage back to the launcher, which renders the stage progress and the pending decision. There is no task id to track in prose: `action=status` always returns the Session's current task.

Pass evidence as **file paths inside the workspace or in a temporary directory**; only their digests enter the record, and files outside the repository can never enter the commit.

```text
coding_workflow action=start title="Short task objective"
coding_workflow action=status
coding_workflow action=resume
coding_workflow action=stage stage=S1 evidencePath=<requirements-file>
coding_workflow action=stage stage=S2 evidencePath=<spec-file>
coding_workflow action=stage stage=S3 evidencePath=<plan-file>
coding_workflow action=checks evidencePath=<checks-file> checks=[{"kind":"test","command":["pnpm","test"]},{"kind":"build","command":["pnpm","build"]}] allowedPaths=["src/feature.ts"]
coding_workflow action=stage stage=S4 evidencePath=<implementation-evidence>
coding_workflow action=review evidencePath=<review-file> findings=[{"id":"F-1","severity":"P1","status":"open","file":"src/feature.ts","evidence":"unhandled case"}]
coding_workflow action=repair evidencePath=<repair-evidence>
coding_workflow action=verify kind=test command=["pnpm","test"]
coding_workflow action=verify kind=build command=["pnpm","build"]
coding_workflow action=commit files=["src/feature.ts"]
coding_workflow action=stage stage=S9 evidencePath=<delivery-report>
```

`allowedPaths` must enumerate **exact authorized relative paths**, and the plan must contain at least one real `test` and one real `build` command. Every planned check must run successfully against the **same** reviewed diff. Renaming a no-op command as a test/build violates this Skill even if the Host cannot infer semantics from an arbitrary executable.

Findings are structured arguments now: `{"id":"F-1","severity":"P1","status":"open","file":"…","evidence":"…"}`. Use an empty array only after actually inspecting source/diff and requirements. The review file itself stays as the stage's evidence artifact.

If `coding_workflow` is not registered, stop the staged workflow and report the missing tool; never silently substitute another authority. Only after the user explicitly approves a separate standalone-helper workflow may you use the bundled `scripts/workflow-state.mjs` with the same verbs; it requires Node >=22, Git, and local files under `DSH_HOME/coding-work-items`. Explain that this is a separate local authority, not a Host work item or Host-enforced execution. Never mix or migrate the two authorities within one task.

## Route selection: bug or feature

The **agent** chooses the route from the user's goal, conversation, existing contract and repository evidence. Treat button labels and words such as “bug” as context, not a client-side keyword classification or permission to skip stages. If expected behavior or the contract boundary is ambiguous, ask a focused question and wait before implementation. Record the chosen route and its evidence in the S3 plan.

- **Bug — restore an established contract.** Use `diagnosing-bugs` to reproduce the failure, establish expected versus actual behavior, and identify the root cause with evidence. Plan a regression test that fails on the original bug and passes after the fix. Only when this restores existing behavior **without a contract change**, explicitly call `action=skip stage=S1 reason=<established contract and evidence>` and `action=skip stage=S2 reason=<why no requirements/design change is needed>`. Each skip needs its own concrete reason; retain reproduction, root-cause and regression evidence in S3/S4. If reproduction or root cause is unproven, continue diagnosis or report the blocker rather than claiming a fix.
- **Feature — introduce or change a contract.** Complete S1 requirements (scope, constraints, acceptance criteria) and S2 reviewed specification/design (approach, interfaces and relevant risks) with evidence; then complete S3. A request described as a bug still follows this full route when it changes behavior, interfaces, data semantics, permissions or another agreed contract. Keep these task artifacts outside the product-document tree as required above.

Both routes converge at S3 and retain the **same** scope, structured review, repair, actual test/build, local commit and delivery gates. A bug skip shortens requirements/design recording only; it never substitutes for S3 planning, regression tests, review or verification.

## Execution order

1. Check the user goal, current workspace and tooling; select the route above and resolve ambiguity. Begin with `action=start`; a dirty tree blocks task ownership. On clean `main/master` the Host creates a dedicated `coding/<id>` branch.
2. Explicitly resume the task. Complete or explicitly skip S1/S2 according to the selected route. S3: record the route, supporting evidence, implementation strategy, exact expected modified-file allowlist and actual verification commands; include the bug's reproduction, root cause and regression plan, or the feature's acceptance coverage. Save artifacts, mark each stage, then register the required test/build commands with `action=checks` **before** implementing.
3. S4: implement minimal scoped change and run focused tests. Save code diff summary and task evidence; call `action=stage stage=S4` only when tracked code has actually changed.
4. S5: inspect real diff and requirement coverage with the `code-review` method. Pass structured findings to `action=review`; the Host calculates the current diff fingerprint and routes to repair or verification. Do not invent clean reports.
5. S6 (conditional): fix findings one by one with specific tests, write repair report, call `action=repair`, then perform **fresh** `action=review`. Stop when repair/no-progress limits hit.
6. S7: run **every** test/build/lint command registered with `action=checks`, using `action=verify kind=<kind> command=<exact registered executable and arguments>`. All required commands must pass against the same reviewed diff; never treat one passing command as proof for another. If any required check failed or did not run, block and do not commit.
7. S8: compare full current changes to the task, explicitly enumerate every owned path and call `action=commit files=[…]`. Never broad-add the whole repository; if any path is uncertain, block. Hooks must run. Never push.
8. S9: when the change affects existing product documents, ask the document-supplement question after the local commit and before writing the report: list the affected documents and offer all / selected / none, recording `action=approval` and waiting for the answer; update only on confirmation and keep the changes uncommitted. List missing document types separately and point to the existing document-generation buttons instead of creating them. Then write an accurate delivery report with the actual commit SHA, changed files, review findings, executed tests, document choice and changes, limitations, and remaining risks. Mark S9 completed only once the report file exists.

If a user requests takeover, run `action=pause`; continue with the single-stage buttons. Never infer stage completion just because an old conversation contains "done".

## Error handling and continuation

- `action=approval reason=<concrete risk and decision>` records a waiting-approval state; **stop before the risky operation**. The user decides through the Host panel/Remote `approve` operation. Check `action=status` to confirm the decision was recorded, then use `action=resume`; never invent a model-facing `approve` verb.
- `action=block reason=<reason and recovery>` for no build, missing Skill, branch mismatch, diff drift, no progress or exhausted limits.
- `action=status` after interruption. Confirm the working tree/branch against its stage rows and blocker, then `action=resume` only after explicit human instruction.
- Report missing tests and Windows/Electron end-to-end testing as **not executed** until there is real evidence.
