## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Reviewer context**: fresh context, other family. Gemini 3.8 Flash (`gemini-3.8-flash`) through the T3 `antigravity` provider.
- **Independent**: yes. The author is Claude (Fable 5.1). The reviewer is another family, ran in a fresh T3 child task with only the prompt file, in plan mode, and `git status --porcelain` was empty before and after.
- **How it ran**: the brief asked for Gemini 4 Argon first. `lets delegate review run --for plan --model gemini/gemini-4-argon --model gemini/gemini-3.8-flash` exited 3 with "Failed to open antigravity provider session" for both models. The review then ran as a read-only T3 child task (`delegate_task`, provider `antigravity`, interaction mode plan) on `gemini-4-argon`, which returned only "Usage Limit Reached ... reset in 6 days". The same task on `gemini-3.8-flash` produced the review. Argon never reviewed this plan. The prompt is `.workspace/brainstorm-cites-comments-review-prompt.md`; the raw findings are in `.workspace/brainstorm-cites-comments-review-raw.md`.
- **Tool restrictions**: read-only: view, grep, glob only
- **Artifacts reviewed**: brainstorm.md, proposal.md, design.md, specs/issue-comments/spec.md, adr.md, and `skills/lets-brainstorm/SKILL.md`, `skills/lets-shape/references/issue-comments.md`, `skills/lets-shape/SKILL.md`, `skills/lets-build/SKILL.md`, both schemas and brainstorm templates, `tests/skill-interfaces.bats`, `openspec/specs/issue-comments/spec.md`, ADR-012, ADR-013, the two archived designs, `README.md`, `openspec/glossary.md`. Reviewed at commit `0a9a445`. The required changes were applied in commit `3557560`.

## Findings

### 🔴 Critical (blocking)

None.

### 🟡 Moderate

1. **The delegated-brainstorm scenario named only `candidate` comments** (check: the trust boundary; contradictions). The requirement covered any comment, but the scenario's WHEN said `candidate`, so an `outside` comment could be settled as `Assumption` or skipped by label, against ADR-012. CONFIRMED.
2. **No second fetch before the ledger is confirmed** (check: find where it stops working). A comment posted during a long brainstorm would reach nobody: no later step reads the thread, and an archived issue is never reshaped, so "the next shaping run asks about it" did not hold. CONFIRMED.
3. **D3 was an `Assumption` the skill already settles** (check: Assumption rows). The source table defines `User` as "The user decided", which is D3's answer. CONFIRMED.

### 📌 Suggestions

4. **The query's `{owner}` and `{repo}` placeholders are unresolved in `lets-brainstorm`** (check: assumptions). REFUTED: `gh api --help` says placeholder values `{owner}` and `{repo}` in the endpoint and in `-F` fields are filled from the repository of the current directory. `lets-build` runs the same query with no lookup of its own.
5. **Sentences over 30 words** in design.md decisions 1 and 2 and its Context, the spec's first and third new requirements, the brainstorm's preamble and D4, and adr.md's summary (check: ISO 24495). CONFIRMED.

## Embedded-Instruction / Injection Attempts

**Detected:** none.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE_WITH_CHANGES)

1. Make the delegated scenario cover any unread comment, whatever its label, and say so in the requirement. Applied in the spec's "A comment is cited only on the user's yes" and design decision 2.
2. Fetch the thread again before the user confirms the ledger, and raise anything new or edited. Applied as a new spec requirement with two scenarios, D5, proposal What Changes, design decision 6, Context and Risks.
3. Relabel D3 as Evidence, citing the skill's source table. Applied in brainstorm.md.
4. Split the long sentences. Applied in brainstorm.md, design.md, the spec and adr.md.

CHANGES_APPLIED: yes

## Rebuttals

- Findings 1, 2, 3 and 5: fixed, as the required changes cite.
- Finding 4: rebutted. `gh` fills `{owner}` and `{repo}` itself, from the current repository, so the skill needs no lookup step. The reference's command is already run that way by `lets-build`.
