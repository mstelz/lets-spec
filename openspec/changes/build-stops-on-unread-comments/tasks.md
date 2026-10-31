## 1. The test seam

- [x] 1.1 [easy] Two new tests fail because `skills/lets-build/SKILL.md` has no link `](../lets-shape/references/issue-comments.md)`: one greps for that exact link, one runs `assert_reference_links` on the skill (verify: bats tests/skill-interfaces.bats --filter "build links") (✓ both new tests fail: the grep finds no link, and assert_reference_links reports "no reference input")
- [ ] 1.2 [easy] A new `skill_says` test fails because `lets-build` does not say "The watermark is the later of the body's last edit and the newest read marker", and `lets-build` joins the skill loop in `planning vocabulary inputs resolve inside each published flow`, which then fails (verify: bats tests/skill-interfaces.bats --filter "watermark")

## 2. The skill and the README [depends-on: 1]

- [ ] 2.1 [medium] Confirm the packet gains one paragraph after the required-lines check, as design decision 1 says: fetch the thread as the linked reference says, the watermark sentence, a comment created or edited after it stops the run, and the stop's shape from the spec's last requirement; 1.1 and 1.2 pass (verify: bats tests/skill-interfaces.bats)
- [ ] 2.2 [easy] [parallel] The README's packet sentence and the `lets-build` table's first row say that `lets-build` stops on comments shaping has not read, and sends them to `lets-shape` (verify: grep -qF "has not read" README.md)

## 3. Integration [depends-on: 2]

- [ ] 3.1 [easy] The whole suite and the flake pass, including the published-flow link test with `lets-build` (verify: pnpm test && nix flake check)

## Deviations Ledger

