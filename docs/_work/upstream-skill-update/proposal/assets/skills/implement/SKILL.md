---
name: implement
description: Implement a confirmed specification or ticket with focused verification. Use for coding work whose expected behavior and scope are already clear.
disable-model-invocation: true
---

# Implement

Read the user's scope, the target project's instructions and the relevant spec or ticket. If a ticket reference is given, fetch it from the configured tracker and state its title. Resolve an ambiguous reference or behavior requirement before changing code. Preserve unrelated working-tree changes.

Implement the smallest coherent change and run checks that exercise the changed behavior. Use `tdd` when the task calls for test-first work or a meaningful regression test benefits from a red/green loop; do not make every implementation depend on that Skill. Report the changed files, verification actually run, and any remaining limitation.

The launcher **编码** action is a single implementation stage: finish after relevant tests and hand off to the separate review, build/acceptance and commit stages. Do not silently invoke `code-review`, run an unrelated full suite, or commit from that action. When invoked directly for a broader task, follow the user's explicit scope and project rules; a local commit or PR is not implied by this Skill alone. The Host-managed `coding-workflow` owns its own review, verification and commit gates when explicitly started.
