**Why:** T3 Code now lists Gemini models without an effort in the id, so every Gemini review or handoff through the `t3` resolver asks for a model T3 no longer has, and fails before it starts.

## Story

#120 t3-gemini-model-ids — a Gemini review or handoff inside T3 Code opens its session.
https://github.com/sidereal-io/lets-spec/issues/120

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | Which Gemini ids does T3 accept now? | `gemini-4-argon` and `gemini-3.8-flash`, with no effort option. The on-disk `model-manifest.json` still lists suffixed ids, so it is stale for Gemini. | Evidence: T3's live catalog (`orchestrator_capabilities`, 31 Oct) and `~/.t3/userdata/model-manifest.json` |
| D2 | What id does the resolver send for a named Gemini model? | The id as given, with no effort added. | Evidence: #120 Scope |
| D3 | What does a review's `--effort` do for a Gemini model in T3? | Nothing: the resolver drops it and sends no effort option. | User |
| D4 | What does a bare `gemini` run, in a review or a handoff? | The manifest's default chat model without its effort suffix, such as `gemini-3.8-flash`. | User |
| D5 | Does the resolver read T3's live catalog to choose the model? | No. That is #87, which owns the model list. | Evidence: #120 Scope |
| D6 | Do the cli resolver and `agy` change? | No. They still name the effort in the id, so `withEffort` stays for them. | Evidence: #120 Scope, `lets/src/resolvers/cli/cli.ts` |
| D7 | How is the fix accepted? | Unit tests, plus a live run of the issue's repro inside T3 Code with `gemini/gemini-4-argon` and with a bare `gemini`. | User |

## Changes from the story

None.

Confirmed by user: yes
