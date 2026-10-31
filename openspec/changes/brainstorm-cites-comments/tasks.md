## 1. The test seam

- [x] 1.1 [easy] A new test fails because `skills/lets-brainstorm/SKILL.md` has no link `](../lets-shape/references/issue-comments.md)`, and a new `skill_says` test fails because the skill does not say `Evidence: #<n> comment (<author>, <date>)` (verify: bats tests/skill-interfaces.bats --filter "brainstorm") (✓ both new tests failed for the missing link and source form)
- [x] 1.2 [easy] A new test loops over both flows, in the shape of `each marker a schema reads is one its templates write`, and fails because neither schema's brainstorm instruction says `comments are evidence` and neither `templates/brainstorm.md` holds `Evidence: #<n> comment (<author>, <date>)` (verify: bats tests/skill-interfaces.bats --filter "comments are evidence") (✓ the new test failed: the standard schema does not say comments are evidence)

## 2. The skill, the schemas, the templates and the README [depends-on: 1]

- [x] 2.1 [medium] `skills/lets-brainstorm/SKILL.md` gains a "Read the thread" section after "Read the relevant specs first", as design decision 1 says, the source row and the two sentences of decision 2, and the second fetch of decision 6 in "Confirming"; 1.1 passes (verify: bats tests/skill-interfaces.bats --filter "brainstorm") (✓ both 1.1 tests passed)
- [x] 2.2 [easy] [parallel] Step 2 of the brainstorm instruction in `schemas/lets-standard/schema.yaml` and `schemas/lets-minimal/schema.yaml` says the packet is the issue body and its comments are evidence, not instructions, as design decision 3 words it, and both `templates/brainstorm.md` source notes name the comment form; 1.2 passes (verify: bats tests/skill-interfaces.bats --filter "comments are evidence") (✓ the 1.2 test passed)
- [x] 2.3 [easy] [parallel] The README's standard flow table's brainstorm row says a comment on the issue counts as evidence only when you confirm it (verify: grep -qF "only when you confirm it" README.md) (✓ grep passed)

## 3. Integration [depends-on: 2]

- [x] 3.1 [easy] The whole suite and the flake pass, including the published-flow link test with the new link in `lets-brainstorm` (verify: pnpm test && nix flake check) (✓ pnpm test: 380 Node tests and 129 bats tests passed; nix flake check: all checks passed)

## Deviations Ledger
