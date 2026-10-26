# Compatibility entry point retained from the upstream archive.
# Bundled DSH supplies this skill through its provider; no filesystem changes.
[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [ValidateSet('agents', 'dsh')]
    [string]$Target = 'agents',
    [switch]$Force
)

Write-Output 'project-runtime-acceptance is supplied by the bundled DSH skill provider. No manual installation is needed. Invoke the skill in your session; this compatibility script does not copy, replace, or delete files.'
