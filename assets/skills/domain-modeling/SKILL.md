---
name: domain-modeling
description: Resolve ambiguous domain terms and record consequential design decisions in the target project's authoritative glossary or decision log.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design: challenge terms, test edge-case scenarios, and record resolved vocabulary and decisions in the project's authoritative knowledge location. Merely reading the glossary for vocabulary does not require this Skill.

## Knowledge location

Read the target project's `AGENTS.md`/`CLAUDE.md`, existing glossary/ADR files and knowledge index before choosing paths; follow [single-authority document routing](../_shared/DOCUMENT_AUTHORITY.md). Use existing approved glossary and ADR locations in-place. **Only if a theme has no suitable authoritative home** create a missing file under the project's existing document category or, as last fallback, `docs/pocket/meta/glossary.md` / `docs/pocket/adr/`, and update the active index. Never create a second root glossary, another ADR collection or duplicate content. Show the proposed change diff and obtain confirmation before writing accepted knowledge.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the authoritative glossary, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?" Do not silently rewrite an accepted requirement to match code.

### Update the authoritative glossary inline

When a term is resolved, update the project's authoritative glossary there. Don't batch these up: capture them as they happen. Use the format in [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md) if the project has no conflicting format rule.

The glossary should be devoid of implementation details. Do not treat it as a spec, scratch pad or repository for implementation decisions.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md) unless the project defines another format. Record only a decision that has actually been made; unresolved options remain pending.
