# Backlog adapter conformance kit

This is an offline contract kit, not a production adapter or dispatcher.
Read [the contract](../../../docs/backlog-adapter-contract.md) before implementing
an adapter. Node 26 is required; no credentials, network or dependencies are
needed for the suite:

```sh
node --test "tests/lets/backlog/*.test.ts"
```

From a source checkout, `pnpm test:backlog` runs the same suite. `pnpm test`
also includes it and type-checks the kit. `nix flake check` checks the repository
suite and runtime release packaging.
The runtime release excludes this unused source, its tests and the contract
document; run conformance from a source checkout.
Scratch state lives under `.workspace/` and is removed after each profile.

`protocol.ts` exports required/optional operation definitions and validators.
`process.ts` exports `invoke(executable, request, options)`; default invocation
has no shell arguments. Valid provider failures reject with `AdapterFailure`,
preserving category and effects just like transport failures. This lets
`recoverMutation` reconcile adapter-reported uncertain writes as well as timeouts. Test options permit an interpreter plus fixture path.
`conformance.ts` exports `workflowOutcomes(call, provider, evidence)` for a disposable
acceptance backlog. The suite runs that shared lifecycle once, with named
provider cases for mappings, references and URL presence; these are behavioral
variations of one fake, not four API implementations.
Evidence names the authenticated actor/session and supplies an adapter-specific
`inspectUnrelated(identity)` callback that snapshots seeded unrelated provider
data before and after targeted writes. This test-only observation stays outside
the shared protocol. Supply worker context on calls to test same-account
session conflicts and release ownership. Atomic declarations additionally run
competing claims and require one winner; live acceptance must establish the
underlying primitive, beyond a finite concurrency test.

The call function returns the operation's result or throws its explicit error.
Never aim the mutating lifecycle at a user's normal backlog. Adapter authors
supply a scoped disposable context and their own cleanup.

`fake.ts` is an executable simulation driven through stdin/stdout. It keeps a
local JSON journal only for these sequential scenarios. Its crash consistency,
locking and simplified provider storage do not implement a provider guarantee.
The executable is the single source of provider-side behavior. Claims,
completion, relationships and replay failures are checked through stdin/stdout.
`recovery.ts` is a small caller example, not another provider journal. Pass
the original operation as its third argument; direct and reconciled results
are validated against that operation before they authorize progression. The fake
profile labels do not prove live provider support.

Every production adapter still needs automated checks against its actual
translation, safe retry/reconciliation and credential handling, followed by a
real end-to-end acceptance run for its pinned provider/configuration. See the
contract's evidence matrix for assumptions and outstanding live checks.
