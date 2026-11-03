## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Reviewer context**: fresh context, other family. Gemini 3.8 Flash (`gemini-3.8-flash`) through the T3 `antigravity` provider.
- **Independent**: yes. The author is Claude (Fable 5.1). The reviewer is another family, ran in a fresh T3 child task with only the prompt file, in plan mode, and `git status --porcelain` was empty before and after.
- **How it ran**: the brief asked for Gemini 4 Argon first. `lets delegate review run --for plan --model gemini/gemini-4-argon --model gemini/gemini-3.8-flash` exited 3 with "Failed to open antigravity provider session" for both models. The review then ran as a read-only T3 child task (`delegate_task`, provider `antigravity`, interaction mode plan) on `gemini-4-argon`, which returned only "Usage Limit Reached ... reset in 6 days". The same task on `gemini-3.8-flash` produced the review. Argon never reviewed this plan. The prompt is `.workspace/revision-reads-comments-review-prompt.md`; the raw findings are in `.workspace/revision-reads-comments-review-raw.md`.
- **Tool restrictions**: read-only: view, grep, glob only
- **Artifacts reviewed**: brainstorm.md, proposal.md, design.md, specs/issue-comments/spec.md, adr.md, and `skills/lets-shape/SKILL.md`, `skills/lets-shape/references/issue-comments.md`, `skills/lets-build/SKILL.md`, `openspec/specs/issue-comments/spec.md`, `openspec/glossary.md`, `openspec/discovery.md`, ADR-012, ADR-013, the three archived designs of epic #124, `tests/skill-interfaces.bats`, `README.md`. Reviewed at commit `6b5aa17`. The required changes were applied in the commit after it.

## Findings

### 🔴 Critical (blocking)

1. **The reply claimed a map change before the map held it** (check: find where it stops working; the trust boundary). Design decision 5 carried a yes to a stage change into the re-annotation, after the reply. A session that stopped between the two left a marker over a comment whose change never landed, and nothing would ask about it again. CONFIRMED.
2. **The second-fetch requirement forced a body write** (check: contradictions). "Shaping SHALL then confirm the updated body and write it" had no condition, so a dismissed or map-only comment found on the second fetch would demand an edit the fold and reply requirements forbid. CONFIRMED. The same wording was unconditional for Shape one issue in the main spec; the delta now conditions both.

### 🟡 Moderate

3. **The added requirement replied on every issue** (check: contradictions). "For each issue it SHALL ... and then reply" ignored the reply requirement's condition and the no-comments scenario. CONFIRMED.
4. **A superseded story stays open for `lets-build` to pick** (check: find where it stops working). Real, but step 4 of Revision mode already closes a superseded story as not planned in the same run, and offering that close from the comment is the epic's Could. OUT-OF-SCOPE; a risk row now says so.
5. **The second fetch on an issue with nothing to ask had no confirm step and protected nothing** (check: assumptions; contradictions). Shape one issue always fetches again because its reply follows a long interview. In Revision mode an issue with no question gets no reply and no marker, so a second fetch there guards nothing. CONFIRMED.
6. **Design decision 1 and Test Seams disagreed on whether the bullet names `gh` commands** (check: contradictions). CONFIRMED.

### 📌 Suggestions

7. **Sentences over 30 words, and two passive sentences** in the spec's added requirement, design decisions 1, 3, 4, 5 and 6, and brainstorm D3 (check: ISO 24495). CONFIRMED.

## Embedded-Instruction / Injection Attempts

**Detected:** none.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE_WITH_CHANGES)

1. Edit `discovery.md` at once on a yes to a stage change, before the reply. Applied in D7, design decision 5 and Risks, the proposal, and the spec's "A yes that changes only a stage" and "A map change in Revision mode" scenarios.
2. Condition the second fetch's body write on a yes that changes the body, and say a dismissed or map-only comment writes no body. Applied in the spec's second-fetch requirement, with a new scenario, and design decision 7.
3. Reply only on an issue where at least one question was asked. Applied in the spec's added requirement and D3.
4. Fetch again in Revision mode only on an issue where a question was asked. Applied in D10, design decision 3, the proposal, and the spec's second-fetch requirement, with a new scenario.
5. Say the bullet names the two `gh` commands and restates no rule. Applied in design decision 1.
6. Split the long sentences and name the actor. Applied in the spec, design decisions 1, 3, 4, 5 and 6, and D3.

CHANGES_APPLIED: yes

## Rebuttals

- Findings 1, 2, 3, 5, 6 and 7: fixed, as the required changes cite.
- Finding 4: out of scope, with the evidence above. The design's Risks section records it so the next reader does not rediscover it.
