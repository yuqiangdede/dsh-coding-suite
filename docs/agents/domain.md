# Domain docs

The active project knowledge map in **this repository** is `docs/pocket/README.md`. Follow its task pointers, `docs/pocket/meta/knowledge-policy.md` and `assets/skills/_shared/DOCUMENT_AUTHORITY.md` before changing an ADR or the glossary. Existing authoritative domain docs (even outside Pocket) stay at their own paths. For genuinely missing topics in this repo, use `docs/pocket/meta/glossary.md` or `docs/pocket/adr/` lazily, updating the index. Other target projects must discover and follow their own authority.

## Legacy authorities, pending migration

None. This repository has no root `GLOSSARY.md`, `GLOSSARY-MAP.md`, `docs/adr/`, or context-local ADRs. Pocket is canonical from the start.

## Imported skill behavior

The bundled `domain-modeling` Skill now reads the target project's knowledge index before choosing paths. In this repository, write new terms and ADRs to the Pocket paths above rather than creating a second root glossary or ADR set. `to-spec` publishes specs to the GitHub issue tracker described in `docs/agents/issue-tracker.md`.
