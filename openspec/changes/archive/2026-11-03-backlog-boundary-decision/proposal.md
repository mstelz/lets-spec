## Why

The backlog contract introduces executable adapters without explaining why the
reasoning in ADR-010 differs for this boundary. Maintainers need that decision
before production integrations depend on it (D1, D2).

## What Changes

- Add an ADR explaining independently shipped backlog adapters, the alternatives
  rejected and the costs accepted. Keep ADR-010 in force for resolvers (D3).
- Clarify the architecture rationale in `docs/backlog-adapter-contract.md` and
  link it to the ADR without changing protocol guarantees (D4).
- Separate the proposed extension mechanism from current GitHub workflows and
  offline simulation evidence (D6).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a documentation change recording an existing boundary decision.
`skip_specs: true` is set; no capability delta is needed. The existing
`backlog-adapter-contract` spec is context. Its delivery-oriented wording is
addressed in #161 (D5).

## Impact

Adds one record under `docs/decisions/` and updates the contract's explanation.
No API, configuration, dependency, process behavior or release payload changes.
Kit relocation, glossary agreement, discovery corrections and implementation
fixes remain in #161. Production adapters remain out of scope (D5).
