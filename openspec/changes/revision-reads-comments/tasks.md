## 1. The test seam

- [x] 1.1 [easy] A new `skill_says` test fails because `skills/lets-shape/SKILL.md` does not say `Read the thread of each open issue the map links`, and the reference's fixed-strings test fails once `Map updated:` joins its list (verify: bats tests/skill-interfaces.bats --filter "map links|fixed strings") (✓ both tests failed for the right reason: the skill and the reference do not say the strings yet)

## 2. The reference, the skill and the README [depends-on: 1]

- [ ] 2.1 [easy] `skills/lets-shape/references/issue-comments.md` gains the `Map updated:` item in its Reply section, as design decision 8 words it, with the rule that `Folded:` covers a comment that changed both; the fixed-strings test passes (verify: bats tests/skill-interfaces.bats --filter "fixed strings")
- [ ] 2.2 [medium] Revision mode step 1 of `skills/lets-shape/SKILL.md` gains the bullet of design decision 1, between the stale-link check and the re-annotation, with the per-issue order of decisions 3 to 7: fetch and list, ask, write the fold body-only with `gh issue edit`, edit the map, fetch again when it asked, reply with `gh issue comment`; the new `skill_says` test passes (verify: bats tests/skill-interfaces.bats --filter "map links")
- [ ] 2.3 [easy] [parallel] The README's `lets-shape` section says a revision run reads the comments on the open stories the map links the same way, as design decision 9 says (verify: grep -qF "open stories the map links" README.md)

## 3. Integration [depends-on: 2]

- [ ] 3.1 [easy] The whole suite and the flake pass, including the `gh` command test on the new bullet and the published-flow link test (verify: pnpm test && nix flake check)

## Deviations Ledger
