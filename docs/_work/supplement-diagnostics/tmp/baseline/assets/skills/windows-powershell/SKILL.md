---
name: windows-powershell
description: Use on Windows for PowerShell quoting or parser failures, lost process state, native exit-code confusion, encoding problems, ConstrainedLanguage errors, or child-process pipe EPERM. Classify sandbox denials before choosing a remedy.
---

# Windows PowerShell diagnosis

## Procedure

1. Record the failed command, workdir, stderr, exit code, and current file/approval policy. Use the reported runtime context; inspect `$PSVersionTable.PSVersion` and `$ExecutionContext.SessionState.LanguageMode` only when relevant.
2. Classify the failure using the branches below. Distinguish a policy denial, cancellation, and a genuine program failure before changing anything.
3. Apply the smallest correction supported by the evidence. Retry only ordinary command errors when the original operation remains authorized and its partial side effects are understood. For policy denials use the host approval flow only when available; otherwise report the boundary.
4. Verify the intended result, not just the absence of stderr. Report unresolved constraints. Never automatically elevate, change execution policy, disable sandboxing, or repeatedly retry.

## Parser, quoting, and paths

Use PowerShell syntax with native Windows paths. Prefer single-quoted literal strings; use `&` to invoke an executable path, and separate arguments rather than constructing command text:

```powershell
$exe = 'C:\Program Files\Example\tool.exe'
$arguments = @('--input', 'D:\work folder\input.json')
& $exe @arguments
$code = $LASTEXITCODE
if ($code -ne 0) { exit $code }
```

For PowerShell filesystem cmdlets, use `-LiteralPath` for names containing brackets or wildcard characters. Use the dedicated file tools for reading, searching, and editing when available. Verify the resolved absolute target before deleting or moving it.

For multiline or quote-heavy logic, create an authorized script with the file tools, then invoke its interpreter directly. Use `.ps1` for orchestration, Python/Node for data transformations; avoid nested command interpreters and `Invoke-Expression`. A script does not remove sandbox restrictions. Avoid assigning automatic variables such as `$HOME` and `$PID`; names are case-insensitive.

## Process state and exits

Each `pwsh` call starts a fresh process. Pass `workdir` and establish needed environment variables in the same call; read them as `$env:NAME`. Avoid relying on previous `cd`, imports, or variables.

Capture `$LASTEXITCODE` immediately after the relevant native program; PowerShell cmdlet errors instead use `-ErrorAction Stop` and `try/catch`. For sequential native commands, stop or explicitly handle each failed exit before running the next. An interrupted Windows process may surface as bare exit 1: correlate cancellation before diagnosing it as an application failure.

## Sandbox and restricted language

- Explicit sandbox denial: preserve the exact operation for an available approval flow. Do not switch tools, interpreters, encodings, or paths to bypass it. With approvals disabled, stop and explain the constraint.
- `ConstrainedLanguage` / “only core types”: prefer cmdlets and supported core types for allowed operations. Static .NET APIs, COM, reflection, and `Add-Type` can be unavailable. Do not treat a language restriction as a broken installation.
- Child-process `EPERM` with captured stdio under Windows confinement: named-pipe capture may be the boundary. If output is genuinely unnecessary, design the invocation with `stdio: 'inherit'` or `'ignore'`; otherwise request approval for the exact blocked operation when allowed. Do not transparently retry a policy-denied command by another route.
- Unexpected workspace/readable-path access denial: load `diagnose-windows-sandbox-acl` for evidence-based ACL diagnosis. Expected confinement denials require no ACL repair; do not broaden ACLs as a generic fix.

## Encoding and execution policy

Identify which producer/consumer or file has the wrong encoding before changing it. Specify encoding locally at that boundary; preserve existing file encoding where required. For binary output, avoid text-pipeline conversion and use a supported binary-safe interface. Keep global console settings and machine execution policy unchanged. For a blocked script, inspect its provenance and the actual policy, then report or use the permitted approval mechanism rather than adding bypass flags.
