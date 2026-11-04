## Context

The offline kit contains protocol validators, recovery helpers and a persistent
fake executable. Its tests call it through stdin/stdout. The release copies the
unused kit and fixtures into dist. `invoke` duplicates process execution, uses
`any` for envelopes and propagates raw spawn errors. The fake infers categories
from message substrings. Shared `Io.execFile` handles input and deadlines but
lacks the kit's combined byte-limit and explicit signal-result semantics.

ADR-014 on the stack base chooses the executable boundary. This cleanup keeps
that decision and the full executable lifecycle; it adds no production caller.

## Goals / Non-Goals

**Goals:** normal source layout and runtime packaging; typed protocol values;
reuse of `lets/src/io.ts`; preserved transport/recovery guarantees;
accurate capability, contract and discovery documentation.

**Non-Goals:** new provider APIs, dispatcher, wire fields, journal guarantees,
process sandboxing, changing `lets/src/resolvers/kit/io.ts`, or vocabulary beyond
the agreed definitions.

## Test Seams

- **Primary test seam:** existing executable conformance and process fixtures,
  moved to `tests/lets/backlog/`. Keep real subprocess coverage of the boundary.
- **Existing seams reused:** `tests/lets/io.test.ts` for shared execution limits;
  fake I/O for caller-only branches; release assertions in `flake.nix`; full
  `pnpm test`, `pnpm test:backlog` and `nix flake check` for integration.

Require table-driven tests through the real fake executable that assert category
and effects, not message substrings, for every expected failure: unmerged
evidence, rebound mutation keys, out-of-scope items, unknown patch fields and
relationship kinds, missing backlogs/items, acquire/release/completed/replay
conflicts, invalid mappings, unsupported capabilities, partial claims, and
injected authentication/permission/transient failures. A separate unexpected
programming-error case must remain unknown_outcome/unknown even when its message
contains a recognized category.

## Scrutiny Tier & Blast Radius

- **Tier:** high
- **Blast radius:** shared process I/O, kit protocol/runtime types, fake state,
  release packaging and capability documentation. Existing delegate consumers
  must retain their default execution behavior.

## Decisions

### Move the source and preserve executable coverage

Move all kit files to `lets/src/backlog/` and tests/fixtures to
`tests/lets/backlog/`. Update relative imports, scripts, TypeScript include paths,
README and contract references. Keep one persistent fake implementation and the
four provider variation cases; introduce no duplicate in-process lifecycle model.
Use in-process I/O doubles only where they isolate caller handling, while retaining
real timeout, malformed output, signal and combined-overflow subprocess tests.

Remove dist copies and the smoke test importing released TypeScript fixtures.
Assert dist has no contrib, test-fixture or copied-contract payload. Keep the
repository tests and existing runtime-bundle check; no standalone kit package.

### Extend the existing I/O seam without changing defaults

Let `Io.execFile` accept an optional combined stdout/stderr byte limit and
optional kill signal. The kit passes SIGKILL for both deadlines and overflow;
existing delegate callers keep SIGTERM by default. Test a subprocess that ignores
SIGTERM, including the deadline and output-limit paths. This guarantees killing
the directly launched adapter; it does not guarantee killing detached descendants
or rolling back provider writes. Unknown mutation outcomes still require the
contract's safe reconciliation, not an assumption that writes have stopped.

Without the new options, preserve existing limits and successful result shapes.
Always report a terminating signal when present; normal results omit it. Report
output-limit exhaustion explicitly. For a configured combined limit, collect raw
Buffer bytes, count both streams before UTF-8 decoding, terminate promptly,
release pipes and settle once. Set Node's per-stream buffer ceiling so it cannot
fire below the configured combined limit, including limits above 64 MiB. Classify
any internal buffering failure as an execution/output failure, never a spawn
failure. Preserve timeout behavior when descendants retain pipes. Test invalid
UTF-8, multibyte output, stderr-only overflow and combined overflow where each
stream alone stays below the limit.

`invoke` serializes validated requests and calls injected shared I/O, defaulting
to `realIo()`. Preserve the 5-second/1-MiB defaults. Signal, deadline, overflow,
invalid output and spawn failures become AdapterFailure unknown_outcome/unknown,
so recovery cannot skip reconciliation. Invalid requests and invocation limits
become AdapterFailure invalid_request/none before launch. Preserve valid provider
categories/effects without rewrapping them as unknown. Invoke only the supplied
executable; a fake I/O test asserts there is no second executable invocation.

### Type data at its boundaries and classify errors explicitly

Use `unknown` for parsed external data, narrow it through validators, and define
request/response, operation, claim, journal, edge and persistent-state types.
Prefer discriminated unions over broad records or unchecked casts. Keep wire
validation unchanged apart from structured classification; no runtime dependency.
Format blocks and expressions in the surrounding `lets/src` style.

Use structured domain/validation errors for expected fake failures. The request
boundary includes stdin JSON parsing. Malformed JSON and unknown operations are
invalid_request/none. An unsupported request protocol is unsupported/none,
preserving the fake's current observable category. Document these categories in
the contract and test raw stdin requests through the executable; the caller's
local request validation remains invalid_request/none. Other known validation
failures become invalid_request/none at their explicit validation boundary,
not by inspecting text in a global catch. Preserve permission, capability,
conflict and partial-write categories at their source. Unknown programming errors
must become unknown_outcome/unknown, even when their text contains a category.
Validate persisted JSON before relying on typed state; a cast is not validation.
Name typed fake state fields `pullRequestReference` and `displayReference`, mapping
the latter to the unchanged wire `item.reference`. Qualify worker-session and
backlog-adapter identifiers where they could collide with delegation concepts.

### Keep definitions and evidence at their proper scope

The shared glossary owns Backlog, Work item and Packet. The contract defines
Claim, Worker session, Display reference, Pull request reference and Completion
beside their guarantees. Qualify session/reference uses to distinguish accounts,
scoped identities, labels and code-host associations. Do not duplicate definitions.

The delta retains every existing scenario on modified requirements and states
current guarantees. Delivery verification belongs in tasks. Discovery restores
Change to supported and describes actual GitHub setup/shaping/build paths, while
naming future provider work as gaps without implying production support. Remove
#145/#146 from Change: adapter authoring and live-data helpers are future paths,
not gaps in the existing maintainer change workflow. Keep those issues in the
backlog; do not add speculative journey stages for them. Call unselected provider
collections linked or candidate backlogs so they do not imply selection.

These are implementation and documentation choices within ADR-014, not a new
architectural extension point. Shared I/O options are additive and reversible.

### Preserve the four prior review fixes

Retain executable regressions for preselection backlog-creation reconciliation
(55b98d1), rejecting mutation keys on fresh reads (f13b612), validating recovered
results against the original operation (01e9579), and requiring an existing
selected backlog (6cd994f). These identify what D5 preserves.

## Risks / Trade-offs

- [Shared execution breaks delegate behavior] → optional limits/result fields,
  default-shape regressions and full delegate suite.
- [Type cleanup hides invalid persisted data behind casts] → validate at JSON
  boundaries and retain negative protocol/state cases.
- [Error refactoring changes uncertain-write recovery] → preserve partial/lost
  mutation and ownership-replay scenarios; assert categories and effects.
- [Moving tests weakens coverage] → move rather than replace the executable
  lifecycle; compare test inventory before/after.
- [Spec replacement loses scenarios] → carry complete modified requirement blocks.

## Migration & Rollback

No production data migration or config change. Source consumers update relative
imports; runtime releases stop including unused developer payloads. Revert this
layer to restore the old layout and packaging without altering the ADR decision.
Merge #163 first, then this layer; retarget/rebase only after its base lands.
