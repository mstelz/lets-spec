## Context

The existing contract specifies versioned executable JSON requests and responses.
The offline kit exercises that contract. No production dispatcher invokes it.
ADR-010 keeps delegation resolvers in process because outside resolvers were
neither used nor expected. Backlog integrations have an explicit goal of allowing
independent authors to support other programs.

## Goals / Non-Goals

**Goals:** record the existing choice, its alternatives and accepted costs in
one durable ADR; make the contract point to that reasoning.

**Non-Goals:** alter protocol, implement dispatch, move the kit, repair packaging,
change glossary meanings or certify live providers.

## Test Seams

- **Primary test seam:** source review of the ADR and contract against the
  existing contract and ADR-010. Check links, scope, alternatives and guarantees.
- **Existing seams reused:** `pnpm test` and `nix flake check` check that the
  documentation change preserves repository and release checks. No new test
  should mirror sentences in the ADR; automated checks do not prove rationale.

## Scrutiny Tier & Blast Radius

- **Tier:** high
- **Blast radius:** an architectural extension boundary future integrations rely
  on; this change itself modifies documentation only.

## Decisions

### Record executable backlog adapters separately from delegation resolvers

Create ADR-014 using the repository template. Link only ADR-010, explain its
continuing scope, and compare built-in adapters, runtime-loaded plugins and a
long-running adapter service. Independent authors and language/runtime freedom
justify accepting a protocol here. This is a goal, not evidence that external
adapters already exist. Reversal after external adoption would break integrations,
so this decision qualifies for a durable record.

The decision preserves the contract's one-process-per-invocation boundary,
explicit selection, policy ownership, scoped identity and recovery guarantees.
It does not choose new installation or compatibility rules. Explain the costs
of maintaining those existing rules and warn that process isolation is not a
sandbox. An executable inherits access from the environment that launches it.

### Keep the contract as the operational reference

During apply, replace the brief rationale paragraph in the contract with a
reference to ADR-014 and an accurate summary. Keep request definitions, operation
semantics, examples, configuration, evidence dates and limits unchanged.
Documentation must distinguish proposed production use from offline simulation.
Do not duplicate the full ADR in the contract or add a second protocol definition.

## Risks / Trade-offs

- [Third-party uptake remains unproven] → State it as an extension goal and name
  the protocol's costs even if only built-in integrations use it initially.
- [Process isolation is mistaken for credential confinement] → State explicitly
  that an adapter is trusted executable code and is not sandboxed.
- [Separate releases drift] → Explain the existing protocol validation and
  compatibility obligations; do not promise unsupported version negotiation.
- [Timeout is mistaken for rollback] → Retain the existing uncertain-write and
  reconciliation guarantees; stopping a process cannot undo provider writes.
- [Documentation implies fixes already shipped] → Keep #161 work separate and
  describe the current kit and workflow accurately.

## Migration & Rollback

No runtime or data migration. Revert the documentation commits to undo this
change before external adoption. Reversing the boundary after adoption requires
a replacement decision and a migration for independently installed adapters.
