# Windows PowerShell execution guidance

Status: accepted (user approved 2026-10-26).

## Scope and acceptance

The Coding Suite supplies eight brief preventive rules automatically to model prompts on Windows hosts, plus a model/user-invocable `windows-powershell` diagnostic skill. Non-Windows hosts receive no preventive section. The skill remains discoverable across platforms for explicit Windows-related work.

Rules cover dedicated file tools, PowerShell syntax, fresh-process state, paths and arguments, scripts for complex quoting, automatic variables, exit interpretation, and policy-aware failure classification. Detailed remedies are disclosed through the skill rather than permanently included in the prompt.

No command rewriting, execution interception, automatic retry, privilege escalation, global encoding changes, or security-policy changes are introduced. Current host tool/sandbox instructions remain authoritative. Guidance reduces avoidable mistakes; it cannot guarantee model compliance.

## Integration and verification

The Host entry injects the `systemPrompt` service and registers a namespaced section on Windows (`process.platform === 'win32'`), with literal interpolation disabled. It contributes to existing sections rather than replacing them. Cordis owns removal on plugin unload. If the service is unavailable, injection waits rather than fabricating an alternate prompt channel.

The bundled skill uses the existing skills provider. Tests cover Windows/non-Windows prompt contribution, repeated assembly, preserving host sections, unload cleanup, and skill discovery/loading/removal. This is behavioral guidance, not an enforcement layer.

Implementation: [Host entry](../../../src/index.ts), [guidance](../../../src/windows-powershell.ts), [diagnostic skill](../../../assets/skills/windows-powershell/SKILL.md), [tests](../../../tests/windows-powershell.host.spec.ts).

Deployment requires reloading the Host plugin (toggle off/on or restart DSH); refreshing the browser alone does not reload Host code. This change has no Web UI artifacts.
