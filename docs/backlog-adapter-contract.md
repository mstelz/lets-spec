# Backlog adapter contract

This contract defines the future `lets backlog` executable boundary. It does
not install a dispatcher or change the current GitHub workflow. The kit tests
representative simulations; passing them does not establish provider support.

## Workflow inventory

The baseline is `skills/lets-setup-backlog/SKILL.md`,
`skills/lets-shape/SKILL.md`, `skills/lets-build/SKILL.md` and
`overlays/AGENTS.md`. Shared policy owns decisions; adapters translate provider
data and operations; the code host owns branches and pull requests.

| Behavior | Owner | Preserved outcome |
|---|---|---|
| Project discovery | adapter | Enumerate open backlogs linked in either direction; deduplicate scoped identities. Shared policy requires exactly one. |
| Project creation | adapter | Create and link a backlog for the repository owner; report permission failures. |
| Field validation | adapter | Read and validate Kind, Priority, Size and Status mappings with exact shared meanings; preserve extra fields/options. Shared policy requires approval before destructive repair. |
| Item search | adapter | Search and read complete issue bodies, owners, metadata, parents and shared decisions within the selected repository/backlog. |
| Item creation | adapter | Create epics, stories, bugs and chores in the selected backlog and return scoped identity. |
| Targeted update | adapter | Change requested body or shared metadata only, preserving unrelated provider data. |
| Parent-child links | adapter | Create and enumerate epic/story relationships in both directions. |
| Directional blockers | adapter | Write and enumerate blocked-by relationships with item state; related links do not block. Incomplete enumeration cannot establish readiness. |
| Packet validation | shared policy | Require the outcome and Kind-specific packet fields; reject placeholders and route incomplete packets back to shaping. |
| Schema routing | shared policy | Route Chores and qualifying small changes to the minimal schema; retain new-code and shared-decision exceptions. |
| Ready-work ranking | shared policy | Exclude other repositories, non-Todo, Epic, Wont, assigned and blocked items. Rank Must, Should, Could then lowest GitHub issue number today; the portable tie-break will be defined in the protocol. |
| Claim | adapter | Check unassigned ownership, assign the actor and move to In Progress; expose races and partial progress. Shared policy requires verification before work. |
| Release | adapter | Undo this worker's claim and restore Todo after branch creation fails; preserve another worker's ownership. |
| Pull request references | code host | Create one branch and PR per change, stack dependent work, include the issue-closing reference and retain user-owned merge. Adapter identity supplies the reference without requiring a numeric ID. |
| Completion | shared policy | Ready for review remains In Progress. Confirm merge through the code host, then reconcile provider automation or request an idempotent Done update through the adapter. |
| Glossary handoff | shared policy | Check definition owner and merge prerequisites, verify checkpoint ancestry and owned paths, rehearse transfer, preserve user edits and import only verified glossary commits. Git operations belong to the code host; issue handoff text updates belong to the adapter. |

Shaping retains persona, journey, priority and scope decisions, confirmation
checkpoints, issue splitting and glossary ownership decisions. The adapter stores
the resulting packets and metadata. Build retains candidate selection, packet
checks, schema choice and OpenSpec orchestration. Setup retains the decision to
create a missing backlog or repair an existing one. Authentication scope errors
must remain explicit. No operation may select another provider as recovery.

Archive, review, checks, commits, branch creation, PR readiness, rejection and
archive reverts remain workflow/code-host responsibilities. Closing automation
is evidence to reconcile after merge, rather than permission to complete early.

## Protocol 1

Run the configured executable directly, with no shell and no appended arguments.
Write one UTF-8 JSON object to stdin and close stdin. Read one JSON object from
stdout; diagnostics go to stderr and must exclude credentials. Each invocation
is a separate process. The caller supplies an absolute repository `cwd` and
sets the process working directory to it. No adapter may infer another backlog.

Requests contain `protocol: 1`, `operation`, `context`, `input`, and, for a
mutation, a nonempty `mutationId` reused across retries. Context requires `cwd`,
`provider`, `backlog`, `repository`, `actor` and `session`. Actor identifies the
authenticated account; session identifies this worker, even when two workers
share an account. Backlog and item IDs are opaque, provider-scoped strings.
An item identity is `{provider, backlog, id}`. A display reference is required
on returned items; a browser URL is optional.

`contrib/backlog-adapter-kit/protocol.ts` publishes executable required/optional
field definitions in `INPUTS` and `OUTPUTS`; a trailing `?` marks an optional
field. Unknown operation input and result fields are rejected. Those definitions
are the machine-checkable protocol surface. The validators are dependency-free
and usable by adapter authors. Nested item, capability and claim meanings are
specified in the following sections and checked by the scenario suite.

Success is `{protocol:1, ok:true, result:{...}}` with exit 0. Failure is
`{protocol:1, ok:false, error:{category,message,effects}}` with nonzero exit.
Success cannot contain error and failure cannot contain result. Categories are
invalid_request, invalid_configuration, authentication, permission, not_found,
unsupported, conflict, transient and unknown_outcome. Effects are none, partial
or unknown; unknown_outcome must never promise none. Partial results must be
reconciled using the mutation key and ownership state before proceeding.

Enumerations return `items`, `complete` and `nextCursor`. Complete enumeration
has a null cursor; incomplete enumeration requires a nonempty next cursor.
The caller follows cursors and detects repeated cursors. A provider that cannot
finish a required enumeration reports unsupported; it cannot return an empty
complete result to hide a gap. Readiness requires complete blocker evidence.

The harness imposes a caller-selected positive timeout (default 5 seconds),
a 1 MiB output limit and process termination on timeout/overflow. Invalid JSON,
wrong protocol, signal termination and inconsistent exit/result are contract
failures. A timeout on a mutation is an unknown outcome, even if the process
was killed. Killing the client cannot roll back a provider write.

Example read request:

```json
{"protocol":1,"operation":"item.read","context":{"cwd":"/repo","provider":"beads","backlog":"local","repository":"repo","actor":"me","session":"worker-1"},"input":{"item":{"provider":"beads","backlog":"local","id":"bd-a"}}}
```

Example enumeration response:

```json
{"protocol":1,"ok":true,"result":{"items":[],"complete":true,"nextCursor":null}}
```

The executable boundary permits independently shipped adapters in any language,
using provider login tools without loading their dependencies into lets. An
in-process plugin would couple runtime versions and credentials to the caller.
Direct provider commands in skills duplicate policy and parsing. A long-running
service adds deployment and lifecycle requirements. Process isolation does not
sandbox an adapter: installing its executable is a repository trust decision.

## Operation semantics

Every operation is confined to context.repository and context.backlog. Reads
have no effects. Mutations require a key bound to the operation and exact input;
reusing a key with different input is invalid_request.

| Operation | Preconditions and input | Successful result and effects | Recovery |
|---|---|---|---|
| backlog.list | Authenticated repository context; optional cursor | Complete or paged linked backlogs; no writes | Retry reads |
| backlog.create | Permission to create/link; title | Selected backlog ID; creates and links once | Reconcile key before recreate |
| backlog.check | Selected backlog exists | valid and actionable mapping gaps; no writes | Fix configuration explicitly |
| item.search | Query and optional cursor | Scoped items with packet bodies | Retry reads |
| item.read | Existing scoped identity | Full normalized item | not_found stays explicit |
| item.create | Title, body and shared metadata | New normalized item in selected backlog | Reconcile key to avoid duplicates |
| item.update | Identity and targeted patch | Updated item; unrelated fields preserved | Read after uncertainty, reapply desired patch only |
| relationship.write | Two existing identities, kind and desired present boolean | Desired relationship state | Reconcile edge, then set desired state |
| relationship.list | Identity, kind and optional cursor | Directional edges with target state | Require complete evidence |
| candidate.list | Selected repository context | Normalized candidate items | Shared caller filters and ranks |
| claim.acquire | Unowned item | Verified ownership and In Progress state with declared guarantee | Reconcile ownership and status |
| claim.read | Identity | Ownership, session, token, guarantee and status | Read before retry/progression |
| claim.release | Identity and this session's token | released boolean; restores Todo only for own claim | Read ownership before retry |
| reference.write | Identity and code-host reference | Stored reference without duplicate association | Read/reconcile before retry |
| completion.write | Identity and code-host merge evidence | Done after confirmed merge | Read status; already Done succeeds |
| mutation.read | Original mutationId in same scope | state applied, absent or unknown; original result when applied | Unknown blocks retries and progression |
| capability.read | Selected context | Declared support and limits | Unknown capability is a gap |

Authentication and permission failures require intervention; they never cause
fallback. Invalid requests/configuration must be fixed. Conflicts preserve the
current owner's data. Transient reads may retry with bounded backoff. A mutation
with confirmed effects none may retry its original key; partial/unknown effects
require reconciliation. If the provider cannot prove absence or deduplicate a
creation, stop for manual reconciliation rather than issue another create.

## Items and shared metadata

Returned items contain identity, reference, title, body, metadata and owners;
url is optional. Identity comparisons use the full provider/backlog/id tuple,
encoded without delimiter ambiguity. Neither a URL nor a display reference is
an identity. Shared metadata is exactly Kind, Priority, Size and Status, using
the values in `METADATA` in the kit. There is no generic provider-field input.

Mappings associate each shared value with an adapter-local field/value pair.
Each pair must have one meaning. Reads reject missing or ambiguous values.
The reference mapping simulator accepts scalar fields and label arrays. Updates
remove only the old values owned by the changed mapping; other labels and fields
remain. Production adapters must validate provider field types and permitted
values themselves, including workflow transition constraints.

## Repository configuration

The proposed location is `lets.backlog` under `openspec/config.yaml`, one
object rather than a list. Missing selection means GitHub and executable
`lets-backlog-github`; setup still requires exactly one linked backlog. An
explicit selection requires provider, executable, id and all metadata mappings.
A bare executable name resolves through PATH; a path resolves relative to the
repository root. Resolve once, verify executable permission, and report a
configuration error if unavailable. Do not interpret shell syntax.

Example local selection (value mappings abbreviated here; the executable
examples in config.test.ts contain all values):

```yaml
lets:
  backlog:
    provider: beads
    executable: ./bin/lets-backlog-beads
    id: local
    storage:
      path: .beads
      tracking: ignored
    mappings: # complete Kind/Priority/Size/Status mappings required
```

The adapter validates native provider field IDs, allowed values and transitions
before mutations. The kit checks normalized example configuration and mapping
ambiguity; it does not parse YAML or consume production configuration. The
current sync parser reads `schema:` only. Production parsing, dispatch and
migration of skills are later work.

Credentials come from provider login tools or environment variables. Do not
commit tokens, passwords or API keys in selection or mappings. Missing login
returns authentication; insufficient scope returns permission. Neither selects
another backlog. Provider tenant/team/project context belongs to the opaque
backlog selection or adapter-specific local configuration, not shared item
fields. The actor in a request must match the authenticated identity.

For local Beads, choose the storage location and tracked/ignored policy
explicitly. The adapter must check that policy before writing, including any
files generated by the selected Beads version. No implicit Git add/commit is
permitted. A tracked choice is not permission to publish secrets.

## Capabilities and selection

Capabilities are named hierarchy, blockers, claims, metadata, references and
completion. Each declares support native, emulated or unsupported and limits.
Emulation requires a nonempty explanation of storage, visibility, permissions,
consistency and any outcome it cannot achieve. Unknown declarations fail closed.
A workflow step checks every required capability before its first mutation.
Native names do not establish support; adapter acceptance must prove outcomes.

Relationships use child/parent, blocked_by and related kinds. blocked_by points
from the blocked item to its prerequisite. Hierarchy is readable both ways;
related links never enter blocker enumeration. Deleting an edge is a desired
state operation. Listing blockers includes their open/closed state and must be
complete before selection proceeds.

The shared caller filters repository, Todo, non-Epic, Must/Should/Could,
unassigned and no open blockers. It ranks Must, Should, Could, then compares
scoped identity tuples lexically by code point. The GitHub profile preserves its
existing same-backlog numeric issue-reference tie-break before the tuple fallback.
No locale-dependent collation or provider search ordering determines selection.

## Claim guarantees

A claim reports actor, session, token, status and guarantee (atomic or
best-effort). Existing ownership is a conflict, including another session using
the same account. Acquire checks ownership, assigns, moves to In Progress and
verifies the result. Only matching ownership and In Progress permit build.
Lost responses require claim.read/mutation.read reconciliation before another
acquire. Assignment without the status transition is partial progress and
cannot authorize a build. Repair or release only after proving current ownership.

Release requires the original actor, session and token and restores Todo. A
provider without durable session provenance cannot safely distinguish workers
sharing an account: declare that limitation and stop uncertain release or claim
recovery for manual reconciliation. Never remove another worker's ownership.

Best-effort verification is a snapshot, not exclusive execution: another worker
may race after verification. Do not advertise atomic guarantees for a sequence
of assignment and status writes. The synchronous reference state machine tests
outcomes; a production atomic profile requires evidence of a provider primitive
that enforces the declared ownership condition under concurrent attempts.
