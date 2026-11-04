## 1. Clarify the contract

Documentation review is the primary seam. Check meaning against ADR-014 and the
existing contract; the commands below locate or validate the affected text and
do not substitute for that review. No tests should mirror the document wording.

- [x] 1.1 [easy] Link the contract's architecture rationale to ADR-014 and explain independent adapter releases without changing protocol guarantees (✓ rg -n 'ADR-014' docs/backlog-adapter-contract.md passed)
- [x] 1.2 [easy] Clarify that separating runtime dependencies does not confine credentials, and that process isolation is not a sandbox (✓ rg -n 'sandbox|credential' docs/backlog-adapter-contract.md passed)
- [x] 1.3 [easy] Review the ADR and contract together for accurate current-support limits, unchanged recovery guarantees and separation from ADR-010; retain the existing offline-only disclaimer (✓ git diff --check passed; ADR/contract source review confirmed unchanged guarantees)

## 2. Validate and finish documentation [depends-on: 1]

- [x] 2.1 [easy] Verify the documentation preserves the Node, type and shell checks (✓ pnpm test passed: 498 Node tests, type check, 130 shell tests)
- [x] 2.2 [easy] Verify the documentation preserves every flow and release check (✓ nix flake check passed: all five x86_64-linux checks)
- [x] 2.3 [easy] Complete the repository-required code review and verification, then mark ADR-014 accepted when the change is ready for user review; leave the merge to the user (✓ Claude Opus 5.5 review findings addressed; source verification and openspec validate backlog-boundary-decision --strict passed)

## Deviations Ledger

- 2026-11-03: User requested durable decision wording in ADR-014. Removed the
  implementation-status snapshot and adoption-status observation, and described
  the protocol as the chosen boundary rather than an existing artifact. The
  architecture decision and its guarantees are unchanged.

- 2026-11-03: Claude Opus 5.5 independently reviewed 7621cc7. Restored the
  direct-provider-tools alternative, aligned the ADR manifest status and made
  adoption wording durable. No architecture or protocol guarantees changed.

- 2026-11-03: Reviewer feedback on PR #163 said the decision named only a JSON
  format and did not say what an adapter is or point to its contract. Rewrote
  the Decision section of ADR-014 to name the adapter, its responsibilities, the
  contract as the only coupling and the per-operation process boundary. It still
  leaves fields, operations and configuration to the contract. No architecture
  or protocol guarantees changed.
