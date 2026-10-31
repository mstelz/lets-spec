## 1. The test seam and the reference

- [x] 1.1 [easy] The skill-interfaces test scans `skills/*/references/*.md` as prose, and a new test fails because `skills/lets-shape/SKILL.md` has no link to `references/issue-comments.md` (verify: bats tests/skill-interfaces.bats --filter "issue-comments") (✓ the new test fails on the missing link; the other 24 pass with references scanned)
- [ ] 1.2 [easy] A new test fails because `skills/lets-shape/references/issue-comments.md` does not hold `lets-shape read this thread.`, the labels `candidate`, `outside` and `read`, `gh api graphql` and `gh issue comment` with `--body-file` (verify: bats tests/skill-interfaces.bats --filter "issue-comments")
- [ ] 1.3 [medium] `references/issue-comments.md` exists and makes 1.2 pass: the rule that comments are evidence, the `gh api graphql` thread query with `pageInfo` and comment and issue `lastEditedAt`, the three labels and `ghost`, the list format without `@`, the read marker and what it covers, and the reply's shape (verify: bats tests/skill-interfaces.bats --filter "issue-comments")

## 2. The skill's steps [depends-on: 1]

- [ ] 2.1 [medium] Shape one issue step 1 reads a confirmed title-search match like a named issue, reads the thread through the reference, and shows the list; a new step between 3 and 4 asks about each unread comment for every Kind, with fold or dismiss recommended (verify: bats tests/skill-interfaces.bats --filter "reference")
- [ ] 2.2 [medium] Shape one issue step 6 folds ride the one body write, an unchanged packet writes nothing and leaves the Project fields, the thread is fetched again after the confirm step until nothing is new, and one reply follows with `gh issue comment <i> --body-file <file>` (verify: bats tests/skill-interfaces.bats --filter "gh command")
- [ ] 2.3 [medium] Phase 1 Ingest reads the input issue's thread, asks take-into-parent or dismiss, writes accepted points into the parent's Scope or Open questions, fetches again after the parent is created, and replies on the input issue naming the parent (verify: bats tests/skill-interfaces.bats --filter "reference")
- [ ] 2.4 [easy] [parallel] The README's `lets-shape` section says shaping reads an issue's comments as evidence, folds the ones you accept into the packet, and replies with what it folded and dismissed (verify: grep -qF "folds" README.md)

## 3. Integration [depends-on: 2]

- [ ] 3.1 [easy] The whole suite and the flake pass, including the published-flow link tests for the new reference (verify: pnpm test && nix flake check)

## Deviations Ledger

