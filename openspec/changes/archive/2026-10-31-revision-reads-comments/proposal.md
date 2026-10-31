## Why

Revision mode is the one place that reads the whole backlog at once, and it reads only issue bodies. A comment on an open story that says it is superseded, or that its paths moved, never reaches the map or the packet. Shaping (#125), build (#126) and the brainstorm (#127) now read threads; this story closes the last gap in epic #124.

## What Changes

- Revision mode step 1 reads the thread of each open story the map links, one issue at a time, after the stale-link check and before the stages are re-annotated (D1, D2, D3).
- It shows each thread as the reference's list and asks about every comment not labelled `read`, with the same fold-or-dismiss choice as Shape one issue (D4, D5).
- A yes that changes the packet is a fold. Revision mode confirms the folded body and writes it with `gh issue edit`, body only, and leaves the Project fields alone (D6).
- A yes that changes a stage edits the map at once, before the reply, with the three outcomes the stale-link check already has (D7).
- On an issue where it asked at least one question, revision mode fetches the thread again after the confirm step until nothing is new, then posts one reply (D9, D10).
- The reference gains one reply item, `Map updated:`, for a comment that changed the map and not the body (D8).
- The README's `lets-shape` section says a revision run reads these comments too (D15).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `issue-comments`: one requirement added, for Revision mode's thread read. The ask, fold, second-fetch and reply requirements, which name Shape one issue and Ingest, gain Revision mode. The reply requirement gains the `Map updated:` item (D12).

## Impact

- `skills/lets-shape/SKILL.md`: Revision mode step 1.
- `skills/lets-shape/references/issue-comments.md`: the reply's item forms.
- `tests/skill-interfaces.bats`: one new test, and one more fixed string for the reference (D14).
- `README.md`: one sentence (D15).
- No code, schema or config change. Projects see it at the next release through `lets sync`.
