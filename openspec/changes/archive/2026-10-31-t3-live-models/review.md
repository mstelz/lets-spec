## Review Metadata

- **Review round**: 2
- **Prior round**: Round 1 (`antigravity/gemini-4-argon`, at `3c4b651`): REVISE. It found two Critical issues: a bare family sent `model: null`, and the 10 s timeout missed the token and the ticket. It also found five Moderate issues and one Suggestion. The author fixed them in `79d6c15`, with user decisions D10, D11 and D12.
- **Reviewer context**: subagent, other family. `lets delegate review run` exited 3 in round 1, with every model refused. Nothing that caused those refusals had changed: the installed `lets` still has the gemini id bug #120 fixed on `main`, and `gpt-6-luna` is at its usage limit until 2026-11-17. So round 2 ran as a fresh T3 child task on `antigravity/gemini-4-argon`, in plan mode.
- **Independent**: yes. T3's task status names `antigravity` / `gemini-4-argon`, and the author is `claude`. `git status` was the same before and after.
- **Tool restrictions**: read-only by instruction, in plan mode, in the shared checkout
- **Artifacts reviewed**: brainstorm.md, proposal.md, design.md, specs/, adr.md, round 1's review.md, relevant source files and the t3code 0.1.0 bundle, at commit 79d6c15

## Findings

The reviewer confirmed that round 1's fixes for findings 3, 5, 6, 7 and 8 are in the plan. It found the fixes for 1, 2 and 4 incomplete, as findings 1 and 2 below say.

### 🔴 Critical (blocking)

1. **Catalogue errors keep their own class and message, and two steps escape the deadline.** A reply timeout is a `SpawnError`, which `withModels` (`lets/src/delegate/lookup.ts`:54) does not try past. So a bare family would exit 4, not 3, and the stderr would not say "T3 gave no model catalogue". `readToken` issues a first token before `request()`, outside the deadline. `refusal()` fetches with no signal, and `ws.close()` on a connecting socket starts it after the deadline. The design's mock timers do not move `Date`. Check: contradictions, where it stops working, test seams. **CONFIRMED.**

### 🟡 Moderate

2. **A bare family ignores the instance's status.** `claudeAgent` keeps its bundled models in status `error`, and a disabled `grok` still lists `grok-build` (live `getConfig`, 2026-10-31). A bare `claude` would then start a thread that cannot run, and a handoff would exit 0 without trying the next `--model`. Check: where it stops working. **CONFIRMED.**
3. **Empty or spaced model ids poison every `--model`.** An id such as `my model` would be listed. `parseModel` then rejects it, and `checkModels` exits 2 before trying any model. Check: trust boundary. **CONFIRMED.**
4. **`availability: "unavailable"` is not filtered, and the plan claims to match the composer exactly.** T3 has `isProviderAvailable` (`binCli-*.mjs`:43543). The composer also waits for `ready`, and sorts by `modelOrder`. Check: assumptions, contradictions. **CONFIRMED.** Listing instances in `warning` stays as the user decided (D9). The design now names the differences.

### 📌 Suggestions

5. **The spec does not say "visible" for the default that comes first in `options`.** No scenario hides the default. Check: scenario testability. **CONFIRMED.**
6. **Plain language.** Four sentences in design.md and adr.md ran past 30 words. Three clauses hid the actor. The spec said "providers" once where it means provider instances. Check: plain language. **CONFIRMED.**

## Embedded-Instruction / Injection Attempts

**Detected:** none

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE_WITH_CHANGES)

1. design.md: `readCatalogue` puts `readToken`, `request()`, `refusal` and `catalogueOf` under one deadline. `request()` marks itself settled before `ws.close()`. Every error is rethrown as `Refused('T3 gave no model catalogue: <reason>')`. The timeout tests mock `Date` too, and the fake `fetch` honours its `signal`.
2. spec and design: a bare family chooses only from an instance that `t3` lists, and refuses otherwise. The spec gains a scenario: a failing `claudeAgent` falls through to `gpt`.
3. spec and design: skip a model whose id is empty or holds white space, after any suffix is removed. The spec gains a scenario.
4. spec, design and proposal: leave out an instance that T3 marks `unavailable`, with a scenario. The design names how `t3` differs from the composer: `warning`, model order, and no picker.
5. spec: "with any visible default model first". The *Hidden models* scenario hides the default.
6. design.md, adr.md, spec: split the long sentences, name `t3` as the actor, and say "provider instances".

CHANGES_APPLIED: yes

## Rebuttals

1. Fixed in `31040c4`: design.md, "One deadline covers the whole catalogue request", "The probe turns every failure into a warning", "A bare family fetches the catalogue, then reads the token again", and Test Seams.
2. Fixed in `31040c4`: the spec's "opens a session" and "refuses a bare family" requirements, with scenario *A failing instance*. In design.md, `listable` and `defaultModel`.
3. Fixed in `31040c4`: the spec's "lists the models" requirement, with scenario *Model ids that cannot run*. In design.md, `catalogueOf`.
4. Fixed in `31040c4`: the spec's `unavailable` bullet, with scenario *An unavailable instance*. design.md Context names the three differences from the composer. Listing instances in `warning` is kept (D9, User).
5. Fixed in `31040c4`: the spec's wording, and the *Hidden models* scenario.
6. Fixed in `31040c4`: design.md and adr.md sentences, and the spec's "disabled provider instances".
