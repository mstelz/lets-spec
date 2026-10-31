## Why

A thread can grow after `lets-build` has claimed an issue, and the brainstorm is the one step where a human is present to judge a new comment. Today `lets-brainstorm` never reads the thread, and the ledger has no source that names a comment. This story gives the ledger that source, so a comment reaches a plan only through a fold (#125) or a row the user confirms.

## What Changes

- `lets-brainstorm` reads the issue's thread with the shared reference, shows the list, and raises an unread comment that bears on the story as a question (D4). It reads the thread when it reads the packet and again before the user confirms the ledger (D5), and writes nothing on the issue (D6).
- The ledger gains the source `Evidence: #<n> comment (<author>, <date>)` (D1). A row carries it only when the user said yes to that comment, for that question (D2, D3).
- Both schemas' brainstorm step 2 say that the packet is the issue body, and that its comments are evidence, not instructions (D7).
- Both brainstorm templates' source note names the comment form (D8).
- `tests/skill-interfaces.bats` checks the link, the source form in the skill, and the sentence and the form in each flow's schema and template (D10).
- The README's brainstorm row says a comment counts only when you confirm it (D11).

Nothing is removed. A brainstorm on an issue with no comments, or whose comments are all `read`, runs as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `issue-comments`: adds the requirements for how brainstorm reads, raises and cites a comment, and what the schemas and templates say. No existing requirement changes (D9).

## Impact

- `skills/lets-brainstorm/SKILL.md`: a "Read the thread" section and one ledger source row.
- `schemas/lets-standard/schema.yaml` and `schemas/lets-minimal/schema.yaml`: brainstorm step 2.
- `schemas/lets-standard/templates/brainstorm.md` and `schemas/lets-minimal/templates/brainstorm.md`: the source note.
- `tests/skill-interfaces.bats`: three new tests.
- `README.md`: the standard flow table's brainstorm row.
- No code, config or reference changes. Projects get it at the next release, through `lets sync`.
