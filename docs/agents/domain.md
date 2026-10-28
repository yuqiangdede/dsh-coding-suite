# Domain docs

The active project knowledge map is `docs/pocket/README.md`. Follow its task pointers and `docs/pocket/meta/knowledge-policy.md` before changing an ADR or the glossary. New canonical domain terms and major accepted decisions belong in `docs/pocket/meta/glossary.md` and `docs/pocket/adr/` (create lazily) unless a retained legacy authority below still owns them; in that case keep writing that authority. Read the relevant files before domain modeling.

## Legacy authorities, pending migration

None. This repository has no root `GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`, or context-local ADRs. Pocket is canonical from the start.

## Imported skill behavior

The bundled `domain-modeling` Skill now reads the target project's knowledge index before choosing paths. In this repository, write new terms and ADRs to the Pocket paths above rather than creating a second root glossary or ADR set. `to-spec` publishes specs to the GitHub issue tracker described in `docs/agents/issue-tracker.md`.
