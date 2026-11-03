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
