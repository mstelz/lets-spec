## Why

Inside T3 Code, the `t3` resolver lists its `options` from T3's downloaded model manifest. That file is not what the composer offers. On 2026-10-23 it listed four models this T3 Code cannot run, and left out eight that it can, so `lets-build` handed #73 to `gpt-6-astra`. A caller that trusts `options` needs the models T3 Code can run now.

## What Changes

- `t3` lists its `options` from T3's live catalogue, the one the composer uses, which it asks the running T3 server for (D2).
- It lists only the provider instances that are enabled, not marked `unavailable`, and whose status is `ready` or `warning`. It leaves out the models the user hid, as the composer does. Each provider's default model comes first, in the catalogue's order (D4, D9, D12).
- A bare family, such as `--model claude`, runs the visible default model from the catalogue, or else its first visible model (D3, D10, D12).
- A bare family refuses with exit 3 when `t3` would not list its instance, when the instance has no visible model, or when the catalogue cannot be read. Today it sends no model, which T3 rejects (D10).
- `t3` stops reading `model-manifest.json`.
- When T3 gives no catalogue within 10 seconds, `t3` lists no `options`, and says why on stderr. The 10 seconds count the token, the ticket and the reply. The command still exits 0 (D5).
- To read the catalogue, the probe may need a T3 token, and issues one when none is stored, as a run does (D7).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delegate-resolvers`:
  - "The T3 resolver lists the models in its manifest" is replaced by a requirement to list the models T3 Code can run now.
  - "The T3 resolver opens a session in a T3 thread" takes a bare family's default from the catalogue.
  - The scenarios of "T3 Code has its own resolver" stop naming the manifest.
  - New requirements say what happens when T3 gives no catalogue, and when it lists no model for a bare family.

## Impact

- **Code:** `lets/src/resolvers/t3/t3.ts`: `optionsFromT3Manifest`, `defaultModel`, `readManifest`, the adapter's `options`, and the default model in `launchThread`. The WebSocket `request` and the token issuing gain a deadline. Its tests are in `tests/lets/resolvers/t3/`.
- **T3 protocol:** the resolver depends on one more private T3 request, `server.getConfig`. A T3 update can change it, as it can change `orchestration.launchThread`. The smoke test in `docs/resolvers.md` ("After a t3 update") should cover the model list.
- **Docs:** `docs/resolvers.md` ("Which model runs") describes the catalogue.
- **#120 (PR #121), merged:** its bare-gemini scenarios name the manifest. This change rewrites them to name the catalogue. It keeps #121's rules for sending gemini ids (D6, D11).
