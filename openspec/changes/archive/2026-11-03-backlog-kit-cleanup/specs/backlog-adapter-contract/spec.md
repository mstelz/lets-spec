## MODIFIED Requirements

### Requirement: Contract validation leaves production integrations unchanged
The backlog adapter contract SHALL provide machine-checkable request/response
definitions and an offline executable conformance harness. Running conformance
SHALL require neither provider credentials nor network access and SHALL NOT
mutate production backlogs or migrate the production workflow.

#### Scenario: Contract work ships
- **WHEN** a maintainer runs the conformance suite without provider credentials or network access
- **THEN** the suite exercises local fixtures successfully
- **AND** no production provider calls or workflow migrations occur

### Requirement: Executable boundary separates responsibilities
The contract SHALL define versioned JSON requests on stdin and responses on stdout for executable backlog adapters, with diagnostic stderr, supported operations, operation-specific invocation context, protocol compatibility, process exit behavior, start failures, signal termination, combined stdout/stderr byte limits and timeout handling. It SHALL assign workflow policy to the shared caller, provider translation to adapters and branch/pull request operations to the code host.

#### Scenario: Fake adapter handles a request
- **WHEN** the harness invokes a fake adapter with a supported protocol and operation
- **THEN** it validates the response against the published response definition

#### Scenario: Broken process boundary
- **WHEN** a fake adapter returns malformed JSON, an unsupported protocol, an inconsistent exit/result pair or no response before the timeout
- **THEN** the harness reports a contract failure and does not treat the operation as successful

#### Scenario: Executable cannot start
- **WHEN** the configured adapter executable cannot be started
- **THEN** invocation rejects with category unknown_outcome and effects unknown
- **AND** only the supplied executable is attempted

#### Scenario: Combined diagnostic and response output exceeds its limit
- **WHEN** adapter stdout and stderr together exceed the configured byte limit
- **THEN** the caller stops the adapter with SIGKILL and reports an unknown outcome
- **AND** mutation retry or progression requires reconciliation

#### Scenario: Signal interrupts an invocation
- **WHEN** an adapter prints a valid response and then terminates by signal
- **THEN** the caller rejects the invocation as an unknown outcome rather than accepting the response

#### Scenario: Adapter ignores graceful termination
- **WHEN** an adapter ignores SIGTERM and exceeds its deadline
- **THEN** the invocation stops the adapter with SIGKILL and reports unknown_outcome with unknown effects

### Requirement: Mutation errors support safe recovery
The contract SHALL distinguish invalid requests/configuration, authentication, permission, missing items, unsupported capabilities, ownership conflicts, transient failures and unknown mutation outcomes. It SHALL define reconciliation and retry behavior for each mutation, including duplicate creation prevention and relationship/update retries. Unknown outcomes SHALL NOT be reported as confirmed failure with no side effects.

#### Scenario: Create response is lost
- **WHEN** the fake provider creates an item but its response is lost
- **THEN** reconciliation identifies the existing item before another creation is attempted

#### Scenario: Permission failure
- **WHEN** a provider denies an update
- **THEN** the error identifies the permission failure and does not trigger fallback to another provider

#### Scenario: Unsupported request protocol
- **WHEN** the representative adapter receives a request using an unsupported protocol version
- **THEN** it returns category unsupported with effects none

#### Scenario: Invalid request input
- **WHEN** the representative adapter receives malformed JSON or an unknown operation
- **THEN** it returns category invalid_request with effects none

#### Scenario: Unexpected adapter implementation error
- **WHEN** the representative adapter encounters an unexpected programming error whose message contains a known error-category word
- **THEN** its response reports unknown_outcome with unknown effects
- **AND** it does not classify the error by matching words in the message

### Requirement: Four-provider evidence qualifies conformance claims
The contract SHALL include a traceable behavior inventory, rationale for the chosen integration boundary and a primary-source evidence matrix for representative GitHub, Jira Cloud, Linear and local Beads scenarios. Each scenario SHALL identify native/emulated/unsupported behavior, assumptions and configuration/version limits. The fake suite SHALL detect intentionally nonconforming behavior as well as accept conforming fixtures. Fake results SHALL NOT establish live adapter support; each production adapter still requires automated checks and a real end-to-end test before release support is claimed.

#### Scenario: Four profiles are checked
- **WHEN** the offline conformance suite runs
- **THEN** it reports named variation cases for all four profiles covering mapped metadata, identity and optional URLs
- **AND** a shared executable suite checks the common relationship, claim, recovery and completion outcomes
- **AND** the evidence matrix distinguishes documented facts from assumptions and live checks still needed

#### Scenario: Fake violates a required guarantee
- **WHEN** a deliberately broken fixture silently ignores a blocker or duplicates a retried creation
- **THEN** conformance fails with the violated outcome identified

## ADDED Requirements

### Requirement: Runtime releases exclude unused conformance payloads
The runtime release SHALL exclude unused adapter-kit source, test fixtures and
contract documentation. Offline conformance SHALL remain runnable from the
repository independently of the runtime release.

#### Scenario: Runtime release is inspected
- **WHEN** a maintainer builds and inspects the runtime release before any production command consumes the kit
- **THEN** the release contains no standalone adapter-kit source, test fixtures or copied contract document
- **AND** the repository conformance suite remains runnable
