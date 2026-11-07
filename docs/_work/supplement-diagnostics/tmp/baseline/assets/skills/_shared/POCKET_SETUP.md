# Pocket initialization conventions (Fork extension)

Copy and adapt only the relevant sections; paths below are **inside the target project repository**, not the mattpocock-DSH installation. This companion file is read by `/setup-matt-pocock-skills`; do not create another setup Skill. **First apply [single-authority document routing](DOCUMENT_AUTHORITY.md)** and use `writing-for-agents` to keep the always-loaded pointer small. The following templates are for projects that actually need a new Pocket index; do not copy them over an existing documentation index.

## Unified document and intermediate-artifact layout

Before authoring any project file, apply [shared artifact routing](ARTIFACT_LAYOUT.md). Initialization MUST propose a real `docs/agents/document-layout.md`, enumerate existing authoritative paths by topic, and register a task-work root plus cache root. Adapt the [layout template](../setup-matt-pocock-skills/document-layout.md) to the *actual* project; it is a routing table, not a second index. For an approved new work directory use `docs/_work/` by default, or reuse an existing designated directory.

For uniquely verified non-destructive setup changes, adopt the default automatically under [safe setup decisions](SETUP_AUTO_DECISIONS.md), then write the layout file and a [work-root README](../setup-matt-pocock-skills/work-readme.md) at the registered directory (creating that one directory). If it exists, preserve and integrate its contents. Root Agent instructions must link to the layout. Do not create every unused category directory or relocate existing formal docs. Task subdirectories `<task-id>/` are created only when producing files; plain discussions need no files.

## Root Agent instruction: one source

The project knowledge pointer is the `### Project knowledge (Pocket)` sub-block of the `## Agent skills` block that `setup-matt-pocock-skills` writes in its step 4, **when the project uses a Pocket index**. If the existing canonical index is elsewhere, put that true path in the same single pointer. Do not add a separate `## Project knowledge (Pocket)` section or competing knowledge roots.

Preserve `AGENTS.md` or `CLAUDE.md` according to the imported Matt setup's selection rules. Do not create two root instruction files or two Pocket headings. In an existing repo, integrate with its instructions rather than replacing them.

## `docs/pocket/README.md`

```md
# Pocket — project knowledge map

Pocket is the Markdown knowledge map for this project. Existing authoritative requirements, decisions, design, architecture and operations documents remain in their original locations; Pocket supplies only the index and missing topics. The Git repository records their history; no RAG index is required.

## Always read
- [Knowledge policy](meta/knowledge-policy.md) — document authority, updates and maintenance
- Global coding/operational constraints: [add link **only when file exists**]

## Select documents by task
| Task/trigger | Actual authoritative path (existing first) | Required next read |
| --- | --- | --- |
| Clarify or freeze requirements | [existing requirement path or lazily added Pocket file] | Current applicable requirement and acceptance |
| Implement or review a feature | [existing requirement/design paths] | Current spec and related decision |
| Change irreversible architecture | [existing ADR/design paths] | Accepted decision and system topology |
| Investigate a bug or migration | [existing incident/pitfall paths] | Incident and verified successor |
| Deploy, operate or hand off | [existing runbook/deployment paths] | Validated deployment and recovery notes |

Replace bracketed placeholders with **real files**, or omit that row until its authority is found. Only link to files that exist. An existing location is not automatically “legacy” and requires no migration merely because it is outside Pocket. Record migrations as pending only when an actual relocation has been approved for consideration.

## Knowledge status
- Current/accepted: load for applicable tasks.
- Pending/draft: read only when resolving an open question; never treat as approval.
- Superseded/deprecated: load only for historical investigation; identify the replacing document.

## Maintenance
Review affected entries after requirement/design changes and significant PRs. Run `/pocket-maintenance` monthly or when duplication, contradictory instructions, or stale pointers appear.
```

## `docs/pocket/meta/knowledge-policy.md`

```md
# Knowledge ownership and maintenance

- Canonical knowledge is defined **per topic** by this project's current index and Agent instructions. Existing approved documents outside Pocket keep their original authority; Pocket is an index and fallback for missing topics, not a universal migration target. Generated indexes and external issues are pointers, not second authoritative copies.
- Code, executable tests, tool configuration, and dependency lockfiles remain authoritative for actual implementation and installed versions. If they contradict a requirement or ADR, flag and resolve; do not change accepted requirements to match code without approval.
- New docs should state status (pending/accepted/superseded/deprecated), scope/owner where useful, and links to related requirements, tasks, and ADRs. Keep one authoritative location per fact. The Pocket index (`docs/pocket/README.md`) and this policy are status-exempt meta files.
- Use progressive disclosure: load this policy and relevant active documents, then referenced detail as needed. Do not load the whole knowledge directory by default.
- Keep secrets, credentials, user data, and raw session transcripts out of committed knowledge.
- Prefer links over copying content. Do not duplicate large configuration/code inventories easily discovered from the repository.
- After requirements, architectural changes, or substantial PRs, inspect affected knowledge and correct the active index (whether inside Pocket or not). Monthly, run `/pocket-maintenance` to propose duplicates, conflicts, stale docs, and archival candidates.
- Maintain history through Git and explicit successor links. Never automatically delete an ADR, erase an unresolved decision, or silently rewrite an approved requirement.
```

## `docs/agents/domain.md` — Pocket-aware domain consumer rules

When an existing project index is selected (Pocket or otherwise), replace the upstream root-glossary path examples in the generated domain consumer config with a pointer like this, adapted to current contents:

```md
# Domain Docs

The active project knowledge map is `[actual index path]`. Follow its task pointers and active ownership policy before changing an ADR or the glossary. First reuse this project's existing authoritative glossary and ADR paths; only if no suitable location exists should new terms and decisions go to `docs/pocket/meta/glossary.md` and `docs/pocket/adr/` (create lazily). Replace this placeholder with the discovered path before writing.

If legacy `GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`, or context-local ADRs remain authoritative, list their precise paths and migration status below. Continue reading/writing those existing authorities until migration is expressly approved; do not create a competing second version.

## Legacy authorities, pending migration
- None in a fresh project.
```

The imported `domain-modeling` Skill explicitly mentions root `GLOSSARY.md` and `docs/adr/`, and `to-spec` publishes specs to the configured issue tracker. Root Agent instructions and this configuration provide a project preference, but **do not guarantee those imported Skills have been fully rewired**. Flag possible output conflicts, and propose a separately reviewed adapter if the entire coding flow must automatically write Pocket.

## Category conventions (lazily created)

- `meta/`: coding rules, operational limits, deliberate dependency choices.
- `requirements/`: `pending.md` for unsettled questions; feature-specific approved requirements and acceptance, ideally one document per independently evolving feature.
- `specs/`: detailed behavior and interface specifications.
- `design/`: system/module design and diagrams (Mermaid embedded in Markdown).
- `adr/`: `0001-short-title.md` with context, options, decision, trade-offs, status, and successors.
- `topology/`: system/module/data-flow diagrams.
- `tasks/`: local task notes when the issue tracker is insufficient; issues stay in the configured tracker with links to canonical specs.
- `pitfalls/`: incidents and migration/third-party pitfalls, with applicability and evidence.
- `assets/`: supporting images referenced by relative path.

Historical records may remain at their original path with a `status: superseded` / `status: deprecated` marker and successor link, or be archived with a validated redirect. These Pocket category paths are **fallbacks only** when no applicable authoritative document or category folder exists. Avoid creating empty folders, duplicating source docs, or bulk-moving documents without an approved migration.
