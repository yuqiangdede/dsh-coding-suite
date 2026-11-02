# Human-oriented templates (create only what is needed)

Prefer existing project documentation map. Without one, recommend:
§§§text
docs/pocket/handover/
  README.md                        # 5-minute overview / 30-minute business / symptom entry
  system-map.md                    # modules and dependencies
  features/<domain>.md             # current functions, permissions, rules and exceptions
  flows/<flow>.md                  # trigger, conditions, state, failure and source pointers
  operations/logs.md              # confirmed vs candidate logger locations and correlation IDs
  operations/deployment.md        # static deployment leads vs observed actual environment
  operations/troubleshooting/<symptom>.md
  open-questions.md               # stable pending/conflicted IDs
  _meta/manifest.json              # optional pointers and coverage, never a second truth source
§§§

Every handover chapter: document status; VCS revision and branch; analysis date/timezone; module/environment scope; evidence references; runtime validation status; missing/contradictory sources. Main text must be understandable without first reading Java/Python classes.

README: project purpose and limits; known architecture; exact inventory vs deep-analysis coverage; links to features/flows/operations; three reading journeys; pending items and next batches.
Feature: role, precondition, access control, observable current rule, boundary/exception, data state and source references.
Flow: triggering entry, main steps, branches, state transitions, asynchronous tasks, persistence, failure/retry, code evidence; optional Mermaid only for confirmed edges.
Troubleshooting: symptom and applicable versions, static vs verified runtime log path, correlation fields, safe read-only steps, code origin, redacted/synthetic examples and steps requiring separate authorization.
Question: stable ID, conflicting/missing evidence, impact and next verification action; owner only when confirmed.
