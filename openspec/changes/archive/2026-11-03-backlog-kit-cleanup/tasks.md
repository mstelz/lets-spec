## 1. Source layout and types

- [x] 1.1 [easy] Preserve all executable conformance cases when moving source to lets/src/backlog and tests to tests/lets/backlog, updating imports, scripts and docs paths (✓ pnpm test:backlog passed after source relocation)
- [x] 1.2 [complex] Validate external and persisted values through typed protocol/state boundaries without any, preserving wire fields and using qualified internal reference/session names (✓ pnpm test:backlog and pnpm check passed)

## 2. Process execution and failure semantics [depends-on: 1]

- [x] 2.1 [medium] Return explicit unsupported/none for unsupported fake request versions and invalid_request/none for malformed JSON or unknown operations, with raw-stdin executable regressions (✓ node --test tests/lets/backlog/protocol.test.ts passed)
- [x] 2.2 [complex] Enforce an optional shared-I/O combined raw-byte limit with explicit overflow/signal results and configurable kill signal while preserving delegate defaults, testing SIGTERM-resistant children, UTF-8 and buffer ceilings (✓ node --test tests/lets/io.test.ts passed: 13 tests; new regressions failed before implementation)
- [x] 2.3 [medium] Invoke backlog executables through shared I/O with SIGKILL limits and consistent AdapterFailure categories/effects for pre-launch, spawn, signal and invalid-output failures (✓ node --test tests/lets/backlog/process.test.ts passed; structured failure regressions failed before implementation)
- [x] 2.4 [complex] Preserve every expected fake failure category/effect using structured errors and a real-executable table, including all cases listed in design Test Seams (✓ real executable category/effects matrix passed: 17 cases)
- [x] 2.5 [medium] Report unexpected fake implementation errors as unknown_outcome/unknown without substring classification, retaining lost/partial-write and claim-replay recovery including the four named prior fixes (✓ pnpm test:backlog passed; unexpected-error regressions failed on substring classification)

## 3. Release and documentation [depends-on: 2]

- [x] 3.1 [medium] Exclude unused kit source, fixtures and copied contract from runtime releases, restoring dist absence assertions and removing the released-fixture smoke test (✓ nix flake check passed: all five x86_64-linux checks)
- [x] 3.2 [easy] Define the five agreed contract concepts beside their guarantees and document error classifications without duplicating shared glossary definitions (✓ git diff --check passed; agreed definitions and error categories reviewed)
- [x] 3.3 [easy] State ongoing capability guarantees and correct discovery to current GitHub behavior, restoring Change support without dropping #145/#146 from the backlog (✓ openspec validate backlog-kit-cleanup --strict passed; main requirement changes sync at archive)

## 4. Integration [depends-on: 3]

- [x] 4.1 [medium] Verify complete Node, type and shell coverage after comparing the moved test inventory and checking readable house style (✓ pnpm test passed: 543 Node tests, type check, 130 shell tests; original test inventory retained)
- [x] 4.2 [medium] Verify all flow and release builds after the final implementation (✓ nix flake check passed: all five x86_64-linux checks after review fixes)

## Deviations Ledger

- 2026-11-03: Independent code review identified an uncaught output-decoding
  failure plus inherited split-UTF-8 and overflowing-deadline bugs. Fixed each
  separately with a regression that failed first. No wire or ownership guarantee
  changed. Final spec sync preserves every existing scenario.

