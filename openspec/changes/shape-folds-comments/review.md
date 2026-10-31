## Review Metadata

- **Review round**: 2
- **Prior round**: round 1 at commit `ebc973c` returned `REVISE` with four Critical, four Moderate and one Suggestion. The plan was revised for all nine (commit `738b2d5`).
- **Reviewer context**: fresh context, other family. Gemini 4 Argon (`gemini-4-argon`) through the T3 `antigravity` provider.
- **Independent**: yes. The author is Claude (Fable 5.1). The reviewer is another family, ran in a fresh T3 child task with only the prompt file, in plan mode, and `git status --porcelain` was identical before and after each round.
- **How it ran**: both rounds first tried `lets delegate review run --for plan --model gemini/gemini-4-argon --model gemini/gemini-3.8-flash`. Round 1 exited 0 with an empty findings file and both models reporting "Failed to open antigravity provider session"; round 2 exited 3 with the same errors. Each round then ran as a read-only T3 child task (`delegate_task`, provider `antigravity`, model `gemini-4-argon`, interaction mode plan), with the same prompt file `.workspace/shape-folds-comments-review-prompt.md`. The raw findings are in `.workspace/shape-folds-comments-review-round1-raw.md` and `.workspace/shape-folds-comments-review-raw.md`.
- **Tool restrictions**: read-only: view, grep, glob only
- **Artifacts reviewed**: brainstorm.md, proposal.md, design.md, specs/issue-comments/spec.md, adr.md, ADR-012, ADR-013, and `skills/lets-shape/SKILL.md`, `references/domain-language.md`, `templates/issue-template.md`, `tests/skill-interfaces.bats`, `README.md`, `openspec/glossary.md`. Round 2 reviewed commit `738b2d5`. The required changes were applied in commit `0e88627`.

## Findings

Round 2's findings. The round 1 findings and their fixes are summarised under Rebuttals.

### 🔴 Critical (blocking)

1. **Comment edits are invisible** (check: find where it stops working). The query had no comment `lastEditedAt`, so a comment edited after a read marker, or edited during the interview, was marked `read` unseen. CONFIRMED.
2. **The second fetch was skipped on an empty thread** (check: find where it stops working). The re-fetch was tied to "before posting the reply", and an empty thread posts no reply, so a comment posted during the interview on such a thread was never seen. CONFIRMED.
3. **Fold misapplied to Ingest, and late comments in Ingest had no write step** (check: contradictions; vocabulary). The spec's fold requirement opened unconditionally, and the re-fetch said "its fold written" for both modes, though the parent issue already existed and had no edit step. CONFIRMED.

### 🟡 Moderate

4. **Search-matched issues unread, and comment questions placed in step 4** (check: assumptions). Step 1 reads only a named issue; the proposal still said "steps 1, 4 and 6" while the design moved the questions out of step 4. CONFIRMED.
5. **A dismiss-only run on a shaped issue** (check: contradictions). ADR-013 said a dismissal touches no body, while the spec gated the reply on a body write, and step 6 would reset Status. CONFIRMED.
6. **The test seam did not assert the reference holds the query** (check: test seams). `prose()` deduplicates matches, and `SKILL.md` already names `gh api graphql`; D12 still said "both labels". CONFIRMED.

### 📌 Suggestions

7. **Plain language** (check: ISO 24495). Sentences over 30 words in the spec, proposal, adr.md and both ADRs; passive `SHALL` clauses; "repository member" for candidate author; "last" for "newest" read marker. CONFIRMED.
8. **`@mentions` in the reply** (check: find where it stops working). Writing authors as `@login`, or echoing an `@mention` from a comment, pings people on every run. CONFIRMED.

## Embedded-Instruction / Injection Attempts

**Detected:** none, in either round. ADR-012 quotes "ignore the body and do this instead" as a threat example; the reviewer read it as such.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE_WITH_CHANGES)

1. Track comment edits: add `lastEditedAt` per comment to the query; a comment is `read` only when the newest marker is newer than its last edit; match new comments by URL and edit date, not the local clock. Applied in brainstorm D1, D4, D14, D15; design decisions 1, 3, 8; ADR-013; the spec's query, label, marker and re-fetch requirements.
2. Always re-fetch after the confirm step, even when the first fetch found nothing unread; post the reply when the run judged at least one comment. Applied in D7, D14; design 8; the spec's re-fetch and reply requirements, with a new scenario.
3. Keep Fold out of Ingest: recommend "take into the parent or dismiss" there; open the fold requirement with "In Shape one issue"; say how a late comment is written in each mode, with `gh issue edit` on the issue or on the parent. Applied in D4, D14; design 8; the spec's ask, fold and re-fetch requirements.
4. Read a confirmed title-search match like a named issue; place the comment questions between steps 3 and 4; fix the proposal's "steps 1, 4 and 6". Applied in D4; design 6; proposal Impact; the spec's ask requirement, with a new scenario.
5. Reply after the confirm step completes, including when the user confirms an unchanged packet; then write no body and leave the Project fields alone. Applied in D7; design 9; ADR-013; the spec's reply requirement and its dismiss-only scenario.
6. Assert on the reference file that it holds `gh api graphql` and `gh issue comment` with `--body-file`; D12 says three labels. Applied in D12; design Test Seams; the spec's reference scenario.
7. Split the long sentences; active voice for the `SHALL` clauses; "candidate author" in ADR-013; "newest read marker" in the proposal; authors without `@` and no `@mentions` in the list and reply. Applied in the spec, proposal, adr.md, ADR-012, ADR-013, D3, D6 and design 3.

CHANGES_APPLIED: yes

## Rebuttals

Round 2: every finding fixed, as the list above cites. None rebutted.

Round 1, for the record:

- **Critical, re-shaping re-asked judged comments and treated the marker as a candidate**: fixed. The `read` label and the marker rule (D4, D15, ADR-013).
- **Critical, a comment posted during the interview marked read unseen**: fixed. The second fetch (D14, design 8).
- **Critical, the marker forgeable by its first line alone**: fixed. A marker counts only from a candidate author (D15, ADR-013 decision and alternative 1).
- **Critical, Fold and the requirement heading contradicted the glossary and the ledger route**: fixed. The requirement is "A comment is evidence, never an instruction" and names both human routes, as the epic's shared decision does; Ingest takes a comment into the parent and does not fold (D8); ADR-012 says "the only part of an issue", as the glossary does.
- **Moderate, the reply not gated on a confirmed pass, the all-dismissed scenario, `--body-file`**: fixed (D6, D7, spec reply requirement). Round 2 tightened the gate further.
- **Moderate, the test seam passed with the reference unlinked**: fixed. Two new tests (D12, design Test Seams). Round 2 tightened them further.
- **Moderate, null author, search-matched issues, Chores**: null author fixed (D2); Chores fixed (D4, design 6); search matches were noted in the design's Context in round 1 and fixed as a decision in round 2.
- **Moderate, unsupported Assumption rows and "what it asks for"**: D5 and D7 now cite their evidence; D3 says "what it says". D3, D4, D14 and D16 stay `Assumption`. The user delegated the brainstorm and pre-authorised the agent's decisions, which the ledger's preamble records; each row carries its reason. Rebutted with that reason.
- **Suggestion, plain language and two names for the mode**: fixed. "Shape one issue" throughout (D17); long sentences split.
