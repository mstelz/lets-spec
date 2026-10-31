## Why

`lets-build` confirms a packet from the issue body alone. A maintainer's correction in a comment goes unread, and a build with no human present plans against it. Four open stories carry such a comment today. #125 gave shaping a way to read and fold a thread. This story makes build refuse a packet whose thread has moved past it.

## What Changes

- `lets-build`'s Confirm the packet reads the issue's thread with the shared reference's query (D5), works out the watermark (D1), and stops when any comment is newer (D3). The stop says how many comments shaping has not read, and names each author and date (D6). Like a missing template line, it says to run `lets-shape` on the issue (D7).
- `lets-build` links `../lets-shape/references/issue-comments.md`. The reference does not change (D9).
- `tests/skill-interfaces.bats` checks that the skill links the reference, that the link resolves in the source and in each published flow, and that the skill states the watermark (D11).
- The README says that `lets-build` stops on comments shaping has not read (D12).

Nothing is removed. An issue with no comments, or a thread shaping has read, builds as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `issue-comments`: adds the requirements for build's watermark and stop. No existing requirement changes.

## Impact

- `skills/lets-build/SKILL.md`: Confirm the packet.
- `tests/skill-interfaces.bats`: three source tests and one more skill in the published-flow loop.
- `README.md`: the packet sentence and the `lets-build` table.
- No code, config or schema changes. Projects get it at the next release, through `lets sync`.
