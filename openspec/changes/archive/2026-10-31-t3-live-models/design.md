## Context

- `lets/src/resolvers/t3/t3.ts` reads `~/.t3/userdata/model-manifest.json` in two places. The adapter's `options` turns it into `options` through `optionsFromT3Manifest`. `launchThread` takes a bare family's default from it through `defaultModel(manifest, family)`, which #121 left without its old `keepEffort` argument.
- With no default in the manifest, `launchThread` sends `model: null` today. T3 rejects that: `ModelSelectionWire.model` is a `TrimmedNonEmptyString` (t3code 0.1.0 `binCli-*.mjs`). This manifest gives `codex` no default, so a bare `gpt` fails today.
- The adapter already speaks T3's WebSocket RPC through `request()`. First `request()` gets a ticket for the token, issuing a new token when T3 rejects the old one. Then it sends one `Request` frame and waits up to 120 s for its `Exit`. Only the reply wait has a time limit. `issueToken` runs `t3` with no limit, and `requestTicket` fetches with no signal.
- T3's `server.getConfig` (payload `{}`) returns the composer's catalogue. Each entry of its `providers[]` carries:
  - `instanceId`, `driver`, `enabled`, an optional `availability`, and a `status` of `ready`, `warning`, `error` or `disabled`;
  - `models[]`, each with a `slug`, and optionally `isDefault`, `isLegacy` and `isCustom`.

  `settings.providerModelPreferences[<instanceId>].hiddenModels` lists the slugs the user hid. The composer keeps a custom model even when its slug is hidden. It picks a default as `isDefault ?? first`, among the visible models. The author read all this in the t3code 0.1.0 bundle (`loadServerConfig`, the client's `utils-*.js`), and made a live call on 2026-10-31.
- `t3` follows the composer with three deliberate differences:
  - it lists instances in `warning` too (D9), where the composer waits for `ready`;
  - it keeps the catalogue's model order, and ignores the user's `modelOrder`;
  - it shows no model picker, so a model it lists may still be refused at run time.
- Some instances keep their models when they cannot run. `claudeAgent` keeps its bundled models in status `error`, and a disabled `grok` still lists `grok-build`.

## Goals / Non-Goals

**Goals:**

- One source of models for the `t3` resolver: the live catalogue, for both `options` and a bare family's model.
- A probe that ends within 10 seconds, and never fails the command because T3 is slow, refuses, or answers in a shape `t3` does not know.
- Catalogue logic in pure functions that a test can drive without a socket.

**Non-Goals:**

- Changing which id or effort `t3` sends for a named model. #121 settled that.
- Refusing a named `--model` that the catalogue lacks. "A resolver runs a model it never listed" stays as it is.
- Caching the catalogue between commands.
- Running models on a second instance of a provider, such as `codex_work`.

## Test Seams

- **Primary test seam:** `lets delegate review instructions` and `lets delegate handoff run`, driven through `tests/lets/resolvers/t3/delegate.test.ts`. The real T3 adapter runs on the kit's fake io. Its fake WebSocket learns to answer `server.getConfig` with a catalogue, by the request's `tag`. This seam covers every spec scenario.
- **Timeouts:** the timeout scenarios use `node:test` mock timers for both `setTimeout` and `Date`, so the deadline's clock moves on `tick()`. The `fetch` that never answers rejects when its `signal` aborts, as a real `fetch` does.
- **Existing seams reused:** `tests/lets/resolvers/t3/t3.test.ts`. Its `optionsFromT3Manifest` tests become tests of the pure catalogue functions. Its `silentWebSocket` and mock-timer pattern cover `request()`'s deadline.

## Scrutiny Tier & Blast Radius

- **Tier:** medium
- **Blast radius:** the `t3` resolver only (`lets/src/resolvers/t3/t3.ts` and its tests), plus `docs/resolvers.md`. The `options` shape and the resolver contract do not change. The new dependency on a private T3 request is the main exposure.

## Decisions

### Read the catalogue with `server.getConfig`

`server.getConfig` is the request the T3 UI makes to fill its model picker, so it lists what the composer offers.

- **Alternative: `orchestrator_capabilities`, the T3 MCP tool.** It reads the same catalogue, but its tools reach only the agent process T3 started, not a child like `lets` (see the comment at the top of `t3.ts`).
- **Alternative: subscribing to provider updates.** A subscription keeps a socket open for a list the probe needs once.

The request goes into the "What is private here" comment at the top of `t3.ts`, next to `launchThread`.

### One deadline covers the whole catalogue request

A new `readCatalogue(io, origin)` runs every step under one 10 s deadline (`CATALOGUE_TIMEOUT_MS`), and passes the time left to each:

- `readToken`, and the `issueToken` it may call, as `execFile`'s existing `timeoutMs`. This covers the first probe, which has no token yet (D7).
- `request()`, which takes an optional deadline. It passes it on as an `AbortSignal` to `requestTicket` and to `refusal`, and as the time left to the reply wait.
- `catalogueOf`, which reads the reply.

`request()` marks itself settled before its `finally` calls `ws.close()`. Closing a socket that is still connecting fires `error` and `close`, and the settled flag stops those from starting a late `refusal` fetch.

`readCatalogue` catches every error from these steps, of any class. It rethrows it as `Refused('T3 gave no model catalogue: <reason>')`, where the reason keeps the original message, such as T3's own refusal text. So the probe and a bare-family run both see one `Refused` with one known prefix. A plain `SpawnError` or `TypeError` never reaches `withModels`, which would turn it into exit 4.

Each step stops when the deadline passes, so no open handle keeps the process alive after the command answers. An outer `Promise.race` alone would answer on time, but a hung `fetch` would then hold the process for minutes.

### Read the reply defensively, in pure functions

The reply is untrusted data from a private protocol, so the functions take `unknown`:

- `catalogueOf(value)` returns the providers and hidden slugs. It throws when `value` is not an object or `providers` is not an array, and `readCatalogue` turns that into the `Refused` above. It skips any entry or model that lacks the fields the next functions need. It also skips a model whose id is empty or holds white space, after `withoutEffort` for gemini, because `parseModel` and T3 both reject such an id.
- `listable(instance)` holds when `enabled` is true, `status` is `ready` or `warning`, `availability` is not `unavailable`, and `instanceId` is in `T3_INSTANCE`.
- `optionsFromCatalogue(catalogue)` replaces `optionsFromT3Manifest`. It keeps the instances that are `listable`, in the catalogue's order. It filters each one's models to the visible ones first, then puts the visible default first, so a hidden default never leaks back in. It applies the gemini rule: no effort suffix, once per model.
- `defaultModel(catalogue, family)` keeps #121's signature shape. It returns null when the family's instance is missing or not `listable`. Otherwise it returns the visible `isDefault` model, else the first visible one, else null. For gemini it removes the suffix, as #121's version does.
- `visibleModels(instance, hidden)` is shared by both: `isCustom || !hidden.has(slug)`, as in the composer.

### Map providers by instance id, as runs do

`t3ModelSelection` always sends `T3_INSTANCE[family]`, such as `codex`. If the probe listed models from a second instance, such as `codex_work`, a run of one of them would go to the `codex` instance, which may not have it. So an instance counts only when its `instanceId` is in `T3_INSTANCE`, exactly as the manifest's keys did. The spec names the three ids.

### The probe turns every failure into a warning

The adapter's `options` catches the `Refused` from `readCatalogue`, returns `[]`, and warns with its message. The cause may be any of these:

- no running server, or a refused upgrade;
- a failed `getConfig`, or a timeout;
- a token that cannot be issued;
- a reply of another shape.

It also catches the error when no runtime file exists, before `readCatalogue` starts.

### A bare family fetches the catalogue, then reads the token again

When `model` is null, `launchThread` calls `readCatalogue` and `defaultModel` before it reads the token for the launch. If the catalogue request replaced a rejected token, the launch reads the new one from disk. It does not reuse a stale value and mint a second token.

When the catalogue fails, `readCatalogue`'s `Refused` passes through. When `defaultModel` returns null, `launchThread` throws `Refused` and names the instance. Either way, the resolver tries the next `--model`, or exits 3 (D10). `t3` never creates a thread in these cases, so it has nothing to archive.

## Risks / Trade-offs

- [A T3 update renames or reshapes `server.getConfig`] → The probe warns and lists no models, and a bare family refuses. The "After a t3 update" smoke test in `docs/resolvers.md` gains a step that compares the probe's `options` with the composer's picker.
- [The first probe issues a T3 token as a side effect] → It is the same token, path and label a run uses, so it adds no new kind of state (D7).
- [A probe now costs a network round trip] → It runs once per instructions command. When T3 hangs, the deadline stops it at 10 s.
- [`warning` includes an instance that is still being checked] → Antigravity can sit in `warning` with no models until its first session. `t3` lists its models once T3 has them, and a bare `gemini` refuses until then (D9, D10). A pending `claudeAgent` can list its bundled models for up to 25 s before T3 finds that `claude` is missing. A run on it is then refused, as today.
- [A named model is still sent when the catalogue lacks it] → This is the contract (ADR-006). `t3` reports T3's refusal as before.

## Migration & Rollback

N/A. No stored data changes shape. Reverting the commit puts the manifest reads back.
