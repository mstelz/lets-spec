## Purpose

Define and validate the shared backlog adapter boundary before production integrations are built, preserving the existing GitHub workflow while accommodating GitHub, Jira Cloud, Linear and local Beads.

## ADDED Requirements

### Requirement: Contract validation leaves production integrations unchanged
This change SHALL deliver a documented contract, machine-checkable request/response definitions and a reusable fake-executable conformance harness without introducing a production backlog dispatcher, provider adapter or workflow migration.

#### Scenario: Contract work ships
- **WHEN** this change is delivered
- **THEN** its conformance suite runs without provider credentials or network access
- **AND** the existing production workflow continues to use its existing GitHub commands

### Requirement: Executable boundary separates responsibilities
The contract SHALL define versioned JSON requests on stdin and responses on stdout for executable backlog adapters, with diagnostic stderr, supported operations, operation-specific invocation context, protocol compatibility, process exit behavior and timeout handling. It SHALL assign workflow policy to the shared caller, provider translation to adapters and branch/pull request operations to the code host.

#### Scenario: Fake adapter handles a request
- **WHEN** the harness invokes a fake adapter with a supported protocol and operation
- **THEN** it validates the response against the published response definition

#### Scenario: Broken process boundary
- **WHEN** a fake adapter returns malformed JSON, an unsupported protocol, an inconsistent exit/result pair or no response before the timeout
- **THEN** the harness reports a contract failure and does not treat the operation as successful

### Requirement: Contract covers the full backlog workflow
The contract SHALL define inputs, outputs, preconditions, side effects and failure outcomes for setup/checking, discovery and work-item reading/searching, creation and targeted updates, metadata, parent/child and directional blocker relationships, candidate enumeration, claiming/release, pull request references and completion. Shared policy SHALL retain packet validation, routing and ready-work ranking rather than delegating those decisions to provider-specific rules.

#### Scenario: GitHub behavior inventory
- **WHEN** the contract's operation inventory is checked against the current setup, shaping, build and finishing instructions
- **THEN** every existing GitHub workflow behavior is mapped to a contract operation or an explicitly retained shared-policy/code-host responsibility

#### Scenario: Readiness remains shared policy
- **WHEN** candidates include a Wont, an Epic, an assigned item, an item with an open blocker and eligible Must/Should/Could items
- **THEN** the worked conformance scenario excludes ineligible items and ranks eligible items by Must, Should, Could and the documented stable tie-break
- **AND** an unavailable blocker check is reported as a required capability gap rather than an empty blocker list

### Requirement: Shared identity works without browser URLs
The contract SHALL identify items by provider- and backlog-scoped opaque IDs, with a display reference and an optional browser URL. Relationships, claims and pull request references SHALL work without numeric GitHub references or browser URLs.

#### Scenario: Local item has no URL
- **WHEN** a fake local Beads item has a scoped ID and display reference but no browser URL
- **THEN** reading, linking and claiming it succeed without manufacturing a URL

#### Scenario: Equal IDs in different backlogs
- **WHEN** two items share a provider-local ID but belong to different backlog scopes
- **THEN** the harness treats them as different items

### Requirement: Shared metadata preserves current meanings
The contract SHALL define Kind as Epic/Story/Bug/Chore, Priority as Must/Should/Could/Wont, Size as XS/S/M/L/XL and Status as Todo/In Progress/Done. Provider storage and configured mappings SHALL remain behind the adapter. The shared contract SHALL exclude a general provider-specific field surface. Targeted updates SHALL preserve unrelated provider data.

#### Scenario: Provider mapping preserves meaning
- **WHEN** a fake provider stores normalized priority and size through configured labels or native fields
- **THEN** reading the item returns the original shared values
- **AND** changing its status preserves unrelated labels and fields

#### Scenario: Ambiguous mapping
- **WHEN** configured provider values cannot unambiguously represent a required shared value
- **THEN** validation reports an actionable configuration error rather than silently choosing a different meaning


#### Scenario: Stored mapping cardinality is wrong
- **WHEN** a stored metadata field has a scalar value for a many-value mapping or an array for a scalar mapping
- **THEN** reading it reports an actionable configuration error

### Requirement: Capabilities preserve workflow outcomes
The contract SHALL declare capabilities as native, emulated or unsupported, including emulation limits and claim guarantees. It SHALL preserve the existing GitHub behavior inventory and report an explicit gap when a current workflow step cannot achieve its required outcome. Conformance SHALL test the declared guarantee rather than infer support from the provider name.

#### Scenario: Required relationship is unsupported
- **WHEN** shaping needs parent/child relationships and the adapter declares them unsupported
- **THEN** the operation stops with a capability error before creating an incomplete hierarchy

#### Scenario: Emulated relationship is equivalent
- **WHEN** an adapter declares an emulated directional blocker relationship
- **THEN** the suite verifies that it can be written and read with its direction intact and distinguished from a non-blocking related link

### Requirement: Configuration separates shared settings from authentication
The contract SHALL define repository backlog selection and mappings under `lets:` in `openspec/config.yaml`, one selected backlog per repository and GitHub as the default. Authentication SHALL come from provider login tools or the environment rather than committed credentials. The contract SHALL define executable selection, resolution and validation, provider context, local storage location/tracking boundaries and configuration errors without silently falling back to another backlog.

#### Scenario: Explicit configuration is invalid
- **WHEN** the selected executable or required provider mapping is invalid
- **THEN** validation names the configuration problem and performs no provider mutation or fallback

#### Scenario: Provider authentication is missing
- **WHEN** a fake provider requires unavailable authentication
- **THEN** the harness observes an authentication error without credentials appearing in the shared configuration or diagnostic fixtures

### Requirement: Claims report their actual guarantee
The contract SHALL permit documented best-effort claims that check ownership, assign and verify, and use stronger claims where supported. It SHALL distinguish the authenticated actor from a claim/session identity, define release ownership and partial-failure recovery, and stop progression on ownership conflicts or unresolved outcomes. It SHALL NOT claim that best-effort verification guarantees exclusive execution.

#### Scenario: Another worker owns the item
- **WHEN** a claim finds an existing owner
- **THEN** it reports a conflict without overwriting that ownership or authorizing a build

#### Scenario: Claim response is lost
- **WHEN** a claim write times out after the fake provider accepts it
- **THEN** the scenario reconciles ownership before retrying or progressing

#### Scenario: Claim spans separate updates
- **WHEN** assignment succeeds but moving the item to In Progress fails
- **THEN** the result exposes partial progress and the documented recovery preserves ownership belonging to other workers

### Requirement: Mutation errors support safe recovery
The contract SHALL distinguish invalid requests/configuration, authentication, permission, missing items, unsupported capabilities, ownership conflicts, transient failures and unknown mutation outcomes. It SHALL define reconciliation and retry behavior for each mutation, including duplicate creation prevention and relationship/update retries. Unknown outcomes SHALL NOT be reported as confirmed failure with no side effects.

#### Scenario: Create response is lost
- **WHEN** the fake provider creates an item but its response is lost
- **THEN** reconciliation identifies the existing item before another creation is attempted

#### Scenario: Permission failure
- **WHEN** a provider denies an update
- **THEN** the error identifies the permission failure and does not trigger fallback to another provider

### Requirement: Completion follows confirmed merge
The contract SHALL accept completion only after the code-host boundary confirms merge of the associated pull request. A ready pull request SHALL leave the work In Progress. Completion SHALL be idempotent and reconcile provider-native closing automation with explicit updates.

#### Scenario: Pull request is ready but unmerged
- **WHEN** an associated pull request becomes ready for review without merging
- **THEN** completion is rejected and the work remains In Progress

#### Scenario: Completion update is retried
- **WHEN** merge is confirmed and completion succeeds but its response is lost
- **THEN** retrying observes Done without duplicate completion effects

### Requirement: Four-provider evidence qualifies conformance claims
The delivered contract SHALL include a traceable behavior inventory, rationale for the chosen integration boundary and a primary-source evidence matrix for representative GitHub, Jira Cloud, Linear and local Beads scenarios. Each scenario SHALL identify native/emulated/unsupported behavior, assumptions and configuration/version limits. The fake suite SHALL detect intentionally nonconforming behavior as well as accept conforming fixtures. Fake results SHALL NOT establish live adapter support; each production adapter still requires automated checks and a real end-to-end test before release support is claimed.

#### Scenario: Four profiles are checked
- **WHEN** the offline conformance suite runs
- **THEN** it reports results for all four representative profiles, including relationships, mapped metadata, identity, claims and completion
- **AND** the evidence matrix distinguishes documented facts from assumptions and live checks still needed

#### Scenario: Fake violates a required guarantee
- **WHEN** a deliberately broken fixture silently ignores a blocker or duplicates a retried creation
- **THEN** conformance fails with the violated outcome identified

### Requirement: Discovery establishes backlog selection
Backlog discovery and creation SHALL accept repository/provider context without an already selected backlog. Other item operations SHALL require a selected backlog and SHALL confine reads and enumeration to its provider, backlog and repository scope.

#### Scenario: No backlog selected yet
- **WHEN** a caller lists or creates backlogs without a backlog identity
- **THEN** the operation returns discovered or created backlog identities that can establish selection

#### Scenario: Another scope shares local storage
- **WHEN** another repository or backlog uses the same fake storage directory
- **THEN** item reads and enumeration do not expose items outside the selected scope
