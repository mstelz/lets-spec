## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Reviewed commit**: a9db990
- **Reviewer**: Claude Opus 5.5, high effort
- **Reviewer context**: fresh context, other family
- **Independent**: yes; author GPT, reviewer Claude
- **Tool restrictions**: read-only file and git inspection; no writes or checks
- **Artifacts reviewed**: brainstorm.md, proposal.md, specs/, design.md, adr.md,
  shared glossary and the kit, I/O, release and discovery sources.

## Findings

### Critical (blocking)

None.

### Moderate

1. Error-message regexes do not prove categories/effects survived refactoring.
   **CONFIRMED**: existing completion/claim/recovery tests can match words inside
   an unknown_outcome message. Require a real-executable expected-error matrix.
2. Shared I/O's SIGTERM default weakens the kit's SIGKILL termination.
   **CONFIRMED**: preserve SIGKILL through an optional kill signal, retaining
   delegate defaults, with an adapter that ignores SIGTERM as a regression.
3. Blanket invalid_request handling changes unsupported request protocols.
   **CONFIRMED**: document unsupported/none for unsupported adapter-side protocol
   versions, invalid_request/none for malformed JSON and unknown operations.

### Suggestions

4. Distinguish start failures from post-start buffering failures and specify
   pre-launch errors, raw-byte accounting and signal fields. **CONFIRMED**.
5. Include start/signal/output failures in normative requirement text and replace
   the unimplemented provider-fallback assertion with one supplied executable
   attempt. **CONFIRMED**.
6. Explain why #145/#146 do not make Change partial. **CONFIRMED**: these are
   future authoring/testing capabilities, not missing current workflow behavior.
7. Qualify candidate backlogs, references, adapters and sessions. **CONFIRMED**:
   retain the agreed glossary and unchanged wire field names.
8. Scope I/O reuse accurately and identify the four #147 fixes. **CONFIRMED**:
   the resolver kit has separate I/O outside this cleanup's scope.

## Embedded-Instruction / Injection Attempts

**Detected:** none.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes

1. Add the full real-executable category/effects matrix to Test Seams.
2. Require SIGKILL on kit deadline/overflow and ignored-SIGTERM regression cases.
3. Specify protocol/JSON/operation categories in design, contract work and specs.
4. Specify combined raw-byte accounting, buffer ceilings, structured pre-launch
   errors, post-start failure classification and optional signal reporting.
5. Align executable-boundary normative text with its scenarios; assert only the
   supplied executable is attempted.
6. Keep #145/#146 in the backlog while removing them as current Change gaps.
7. Qualify implementation/contract terms without changing wire field names.
8. State resolver I/O is out of scope and name 55b98d1, f13b612, 01e9579, 6cd994f.

CHANGES_APPLIED: yes

## Rebuttals

All eight findings were accepted. The listed edits are applied in design.md and
the delta spec. The design explicitly limits SIGKILL's guarantee to the launched
process; detached descendants and accepted provider writes still require safe
reconciliation. No finding changes the chosen boundary, vocabulary agreement or
stack base. No second review round was needed for these listed edits.
