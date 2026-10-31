## Review Metadata

- **Review round**: 2
- **Prior round**: round 1 at commit `956b5b8` returned `REVISE` with one Critical, three Moderate and one Suggestion. The plan was revised for all five (commit `6ffa9b2`).
- **Reviewer context**: fresh context, other family. Gemini 3.8 Flash (`gemini-3.8-flash`) through the T3 `antigravity` provider, in both rounds.
- **Independent**: yes. The author is Claude (Fable 5.1). The reviewer is another family, ran in a fresh T3 child task with only the prompt file, in plan mode, and `git status --porcelain` was identical before and after each round.
- **How it ran**: the brief asked for Gemini 4 Argon first. Each round first ran `lets delegate review run --for plan --model gemini/gemini-4-argon --model gemini/gemini-3.8-flash`, which exited 3 with "Failed to open antigravity provider session" for both models. Each round then ran as a read-only T3 child task (`delegate_task`, provider `antigravity`, interaction mode plan) on `gemini-4-argon`, which returned only "Usage Limit Reached ... reset in 6 days". Each round then ran the same way on `gemini-3.8-flash`, which produced the review. Argon never reviewed this plan. The prompt is `.workspace/build-stops-on-unread-comments-review-prompt.md`; the raw findings are in `.workspace/build-stops-on-unread-comments-review-round1-raw.md` and `.workspace/build-stops-on-unread-comments-review-raw.md`.
- **Tool restrictions**: read-only: view, grep, glob only
- **Artifacts reviewed**: brainstorm.md, proposal.md, design.md, specs/issue-comments/spec.md, adr.md, and `skills/lets-build/SKILL.md`, `skills/lets-shape/references/issue-comments.md`, `openspec/specs/issue-comments/spec.md`, ADR-012, ADR-013, #125's archived design, `tests/skill-interfaces.bats`, `README.md`, `flows.json`, `openspec/glossary.md`. Round 2 reviewed commit `6ffa9b2`. The required changes were applied in commit `a91ca10`.

## Findings

Round 2's findings. The round 1 findings and their fixes are under Rebuttals.

### 🔴 Critical (blocking)

None.

### 🟡 Moderate

1. **The stop's date is ambiguous for an edited comment** (check: find where it stops working). "Its date" could be the creation date, which can be older than the watermark that the edit crossed. CONFIRMED.
2. **"Never reads content" contradicts marker matching** (check: contradictions). The design's goal and adr.md said build reads dates only, but matching the read marker needs each comment's first line. CONFIRMED.
3. **"On its own" in the marker sentence** (check: contradictions; vocabulary). "A read marker SHALL never stop the run on its own" suggests it could in combination, which D3 rules out. CONFIRMED.

### 📌 Suggestions

4. **One 32-word sentence in the proposal** (check: ISO 24495). CONFIRMED.
5. **The published-flow test's name says "planning vocabulary inputs"**, and `lets-build` is not one (check: test seams). CONFIRMED as a naming point; declined, see Rebuttals.

## Embedded-Instruction / Injection Attempts

**Detected:** none, in either round.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE_WITH_CHANGES)

1. Say which date the stop shows: the edit date when the comment has one, else the creation date. Applied in the spec's stop requirement, D6 and design decision 3.
2. Say that build reads each comment's first line only to match the marker, and nothing else of its content. Applied in design Goals and Risks, adr.md and D3.
3. Drop "on its own". Applied in the spec's stop-the-run requirement.
4. Split the proposal's sentence. Applied in proposal What Changes.

CHANGES_APPLIED: yes

## Rebuttals

Round 2: findings 1 to 4 fixed, as cited above. Finding 5 declined: the test checks that installed skills' reference links resolve, whatever the skill; renaming it is outside this change, and the design names the test as it is.

Round 1, for the record:

- **Critical, "newer than the packet" where the rule is the watermark**: fixed. A dismissal edits no body (ADR-013), so the stop now says "comments shaping has not read"; the spec, D6, D12, the proposal and design decision 3 were reworded.
- **Moderate, test seams could not fail on today's skill, and a false `gh` claim**: fixed. Design Test Seams and D11 name three source tests that each fail today, and the `gh` claim is gone.
- **Moderate, D6 is an Assumption beyond "run lets-shape on #n"**: rebutted with its reason. A missing-line stop names the line, so this stop names the comments; the user delegated the brainstorm and pre-authorised the agent's decisions. Round 2 accepted the reason.
- **Moderate, a deleted account's author**: fixed. The stop requirement says `ghost`, as the reference does.
- **Suggestion, scenarios asserted the watermark itself, and long sentences**: fixed. The watermark scenarios now assert stop or Route; the sentences were split.
