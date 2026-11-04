## Why

The backlog kit lives outside the normal source tree and ships unused source,
tests and documentation in releases. Its duplicate process runner and weak error
classification also make the boundary harder to maintain (D2, D4, D5).

## What Changes

- Move the kit into `lets/src/backlog/` and tests into `tests/lets/backlog/`.
- Remove unused kit payloads from releases and restore absence assertions.
- Reuse shared process I/O while preserving byte limits, deadlines, signal
  failures and uncertain-write handling. Normalize spawn failures and stop
  classifying unexpected fake errors by message substring.
- Replace `any` with appropriate types and format touched kit code consistently.
- Describe ongoing capability guarantees rather than delivery events in specs.
- Add the three agreed shared glossary concepts and define the five boundary
  concepts in the contract. Correct discovery to describe current GitHub support.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backlog-adapter-contract`: ongoing offline conformance guarantees, structured
  transport/unexpected failures and exclusion of unused kit payloads from runtime
  releases. Existing ownership, identity and reconciliation guarantees remain.

## Impact

Changes kit imports, tests, `lets/src/io.ts`, package scripts, TypeScript inputs,
release checks, README and contract references, glossary and discovery prose.
No provider integration, dispatcher, wire format or dependency is introduced.
This branch targets `backlog-boundary-decision` (#163), as requested (D1).
