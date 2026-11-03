## Story

#87 t3-live-models — the T3 resolver lists the models T3 Code can run now
https://github.com/sidereal-io/lets-spec/issues/87

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | Where does the code and the requirement live now? | `lets/src/resolvers/t3/t3.ts`, `tests/lets/resolvers/t3/`, and the `delegate-resolvers` spec's requirement "The T3 resolver lists the models in its manifest". The issue's `contrib/` paths are stale. | Evidence: `git ls-files`, `openspec/specs/delegate-resolvers/spec.md` |
| D2 | Which T3 request returns the composer's live catalogue? | `server.getConfig` over the existing WebSocket RPC. Its `providers[]` has `instanceId`, `enabled`, `status` and `models[]` (`slug`, `isDefault`, `isLegacy`, `isCustom`), and `settings.providerModelPreferences.<instance>.hiddenModels` lists hidden models. On 2026-10-31 it listed exactly the models the issue says T3 can run. | Evidence: t3code 0.1.0 `binCli-*.mjs` (`loadServerConfig`), and a live call on this machine |
| D3 | Does the bare-family default (`--model claude`) move off the manifest too? | Yes. Options and the default both come from `server.getConfig`, using the model marked `isDefault`. The resolver stops reading `model-manifest.json`. | User |
| D4 | Which models does the probe list? | Providers that are enabled and whose `status` is `ready`, in `providers[]` order, with the default model first. Leave out the models the user hid. Keep legacy and custom models, because the composer offers them. | User |
| D5 | What does the probe do when T3 cannot answer? | Exit 0 with `options: []`, and say why on stderr, as the missing-manifest case does today. Use a short timeout of a few seconds, not run's 120 s. Round 1 of the review set it at 10 s, counting the token, the ticket and the reply. | User |
| D6 | Are gemini model ids, which no longer carry an effort suffix, part of this story? | No. #120 (`t3-gemini-model-ids`) owns them, and merged on 2026-10-31. This story keeps listing each gemini model once, without an effort suffix. | User |
| D7 | Can the probe issue a T3 token when none is stored? | Yes. It takes a token the way run does, so the first probe may run `t3 auth session issue`. | User (confirmed with the ledger) |
| D8 | How is it accepted? | Unit tests feed `server.getConfig` replies through the fake WebSocket and check the filter, the order, the default and each failure. A manual check inside T3 Code compares `lets delegate handoff instructions --for apply` with the composer's model picker, and runs one bare-family handoff. | User (confirmed with the ledger) |
| D9 | Does a provider in T3's `warning` state count as ready (D4)? | Yes. `warning` means T3 has not verified the provider yet, so the probe lists providers in `ready` or `warning`, and leaves out `error` and `disabled`. | User |
| D10 | T3 rejects a launch with no model. What does a bare family run when the catalogue marks no default? | The visible model marked `isDefault`, or else the first visible model, which is T3's own fallback. When the provider lists no visible model, or the catalogue cannot be read, `t3` refuses with exit 3 and the reason. | User, after review round 1 |
| D11 | How does this change sit beside #120? | #121 merged into `main` on 2026-10-31, so this branch is rebased onto `main`. The delta modifies #121's "The T3 resolver opens a session in a T3 thread", whose bare-gemini scenarios still name the manifest. | User (stack on #121), then Evidence: PR #121 merged |
| D12 | Does hiding apply to custom models, and to the default? | Match the composer: hiding never removes a custom model, and a bare family picks its default from the visible models only. | User, after review round 1 |

## Changes from the story

- Added: the bare-family default model moves to the live catalogue too (D3), so the resolver has one source of models.
- Changed: the paths in **Relevant code** are now under `lets/` and `tests/lets/`, and the spec is `delegate-resolvers` (D1).
- Left out: gemini model ids in run and start, which #120 owns (D6).
- Added after review round 1: a bare family with no default runs the first visible model, and refuses when there is none (D10).

Confirmed by user: yes
