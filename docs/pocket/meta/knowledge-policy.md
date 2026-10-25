# Knowledge ownership and maintenance

- Canonical knowledge: `docs/pocket/**/*.md`, except legacy paths that the Pocket index lists as authoritative pending migration; those remain authoritative until an approved migration moves them. Generated indexes and external issues are pointers, not second authoritative copies.
- Code, executable tests, tool configuration, and dependency lockfiles remain authoritative for actual implementation and installed versions. If they contradict a requirement or ADR, flag and resolve; do not change accepted requirements to match code without approval.
- New docs should state status (pending/accepted/superseded/deprecated), scope/owner where useful, and links to related requirements, tasks, and ADRs. Keep one authoritative location per fact. The Pocket index (`docs/pocket/README.md`) and this policy are status-exempt meta files.
- Use progressive disclosure: load this policy and relevant active documents, then referenced detail as needed. Do not load the whole knowledge directory by default.
- Keep secrets, credentials, user data, and raw session transcripts out of committed knowledge.
- Prefer links over copying content. Do not duplicate large configuration/code inventories easily discovered from the repository.
- After requirements, architectural changes, or substantial PRs, inspect affected knowledge and correct its index. Monthly, run `/pocket-maintenance` to propose duplicates, conflicts, stale docs, and archival candidates.
- Maintain history through Git and explicit successor links. Never automatically delete an ADR, erase an unresolved decision, or silently rewrite an approved requirement.
