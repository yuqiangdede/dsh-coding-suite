---
name: graphify-navigation
description: "Optionally build, refresh, or query a local Graphify code graph to navigate a repository. Use when the user requests a code graph, Graphify setup, refresh, or graph-based code exploration."
---

# Graphify code navigation

Graphify is an optional external Python CLI, not bundled with this suite. Work in the target repository root, respecting its instructions and its authoritative knowledge index. The graph is a generated navigation aid, never a source of requirements or proof of runtime behavior. Verify important relationships, particularly inferred edges, against source and tests.

## Choose an operation

When invoked through the suite's「代码图谱」or「更新图谱」button, check whether `graphify` is available and automatically install it if missing, as authorized by either button. The former requests a build; the latter requests a refresh and authorizes a first build if no graph exists. Execute the requested operation after checking the scan scope. Other invocations do not by themselves authorize installation. Never modify repository instructions, install Git hooks, or start a watcher merely because this skill was invoked.

Check `graphify --version` and Python availability. For button invocation, or another explicit installation request, install the official `graphifyy` package using `uv tool install graphifyy` if uv is available, otherwise `pipx install graphifyy` if pipx is available. Do not install uv, pipx, or Python automatically; if prerequisites are missing or installation fails, report the issue and fall back to ordinary search. Report the installed version; do not silently install. For other invocations, explain the missing dependency and ask before installing. Check the installed CLI's help for version compatibility. On explicit build, run `graphify extract . --code-only` from the target root. This writes generated files under `graphify-out/`; report the path and result. Do not invoke `graphify install`, which can change assistant instructions, unless separately requested.

For explicit refresh, run `graphify extract . --code-only` against the same root and output, using the installed version's incremental behavior; report any failure or incomplete result. If no graph exists, explain that a first build is needed and proceed when the requested operation includes building it, including the suite’s「更新图谱」button. Never imply the graph is current without checking; branch changes, pulls and uncommitted edits can make it stale. If freshness is uncertain, state that and offer a refresh rather than silently rebuilding for a query.

For an explicit question, check that the CLI and graph exist, then use scoped `graphify query "..."`, `graphify path "..." "..."`, or `graphify explain "..."` as appropriate. Inspect the underlying files before drawing substantive conclusions. If the CLI, graph, or query fails, report the limitation and continue using normal file search. Do not block ordinary work on Graphify.

## Boundaries

- Default to code-only local extraction. Do not include documents, PDFs, media, remote services, or configured model backends without the user's explicit choice after explaining potential data transfer and cost. Graphify may log query text locally; consult its current documentation if that matters.
- Respect `.gitignore` and project exclusions; review scan scope before building, especially secrets and generated files. Do not change ignore files or commit generated graphs without an explicit request. The graph may contain sensitive source-derived information.
- No automatic startup job, file watcher, Git hook, or background update. A user may separately request such automation after its scope and behavior are understood.
- Avoid relying on a preexisting graph without identifying its root and possible staleness. A graph is supplemental: project documentation, source code, and executable tests retain their existing authority.
