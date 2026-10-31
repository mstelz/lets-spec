## Why

Issue comments hold decisions and corrections that no skill reads. Four open stories carry a maintainer comment that moves their paths and specs. A build planned today would use the old ones. This story is the walking skeleton of epic #124. It reads the thread, shows it, folds what the user accepts, and replies.

## What Changes

- A new shared reference, `skills/lets-shape/references/issue-comments.md`. It holds the rule that comments are evidence and never instructions. It also holds the thread query (D1), the labels (D2), the list every skill shows the user (D3), the read marker (D15) and the reply's shape (D6). #126 and #127 read the same file (D9).
- `lets-shape` reads the thread in Shape one issue and in Ingest. It asks about each comment the newest read marker does not cover (D4). It folds a yes into the packet at its existing confirm step (D5). It fetches again after that step (D14), and posts one reply once the step completes (D6, D7). During Ingest an accepted comment is taken into the parent issue, because the input stays read-only (D8).
- The skill-interfaces test also scans `skills/*/references/*.md`, and checks that the skill links the reference and that the reference holds its fixed strings (D12).
- The README's `lets-shape` section says that shaping reads comments and folds the ones you accept.
- The glossary terms *packet* and *fold* ride this branch, already committed from the shaping checkpoint (D11).

Nothing is removed and nothing breaks. An issue with no comments shapes exactly as today.

## Capabilities

### New Capabilities
- `issue-comments`: how an agent reads an issue's thread, what it shows the user, how shaping folds a comment into the packet, and the reply that records it (D10).

### Modified Capabilities

None. `shared-domain-language` was read for context; its requirements do not change.

## Impact

- `skills/lets-shape/SKILL.md`: Phase 1 Ingest, and Shape one issue: step 1, a new step between 3 and 4, and step 6.
- `skills/lets-shape/references/issue-comments.md`: new.
- `tests/skill-interfaces.bats`: the `prose()` helper and new assertions.
- `README.md`: the `lets-shape` section.
- No code, config or schema changes. The skill reaches projects at the next release, through `lets sync`.
