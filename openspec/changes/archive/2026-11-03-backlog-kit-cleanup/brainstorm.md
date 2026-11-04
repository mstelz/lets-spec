## Story

#161 — restore source layout, release packaging and contract consistency

https://github.com/sidereal-io/lets-spec/issues/161

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | What is the base? | Stack backlog-kit-cleanup on backlog-boundary-decision (#163), at edbfb6bc61b0c76ed3b4a454bb7842d666331875; target its branch and merge bottom-up. | User |
| D2 | What stays in scope? | Source/test relocation, release payload removal, shared I/O reuse, typing/style, structured failures, capability wording, agreed vocabulary and accurate discovery annotations. | Evidence: #161 packet |
| D3 | What is excluded? | Production adapters and a different extension mechanism. | Evidence: #161 packet |
| D4 | Which execution guarantees must survive I/O reuse? | Keep the kit's combined stdout/stderr byte limit, deadlines, signal handling and uncertain-write recovery; io.ts currently has a different output limit. | Evidence: contrib/backlog-adapter-kit/process.ts; lets/src/io.ts |
| D5 | What coverage must survive? | Preserve conformance coverage and the four review fixes carried from #147. Add regressions for structured spawn failures and unexpected fake errors. | Evidence: #161 packet; tests/backlog-adapter-kit/ |

## Vocabulary agreement

The user confirmed these meanings and this split:

- Shared glossary: Backlog, Work item and Packet. Packet explicitly covers the
  templated work-item body, with the GitHub issue body as its GitHub form.
- Contract definitions: Claim, Worker session, Display reference, Pull request
  reference and Completion. Their agreed meanings are recorded below for apply;
  the contract will own the definitions, without duplicating them in the glossary.
- Claim: a worker's recorded ownership of an item, with the adapter's stated concurrency guarantee.
- Worker session: one worker identity, distinct from the authenticated account.
- Display reference: a human-readable item label, distinct from scoped identity and optional URL.
- Pull request reference: the code-host link associated with an item.
- Completion: moving work to Done after the code host confirms merge.

## Changes from the story

The user explicitly requested a stack on #163 rather than waiting for it to
merge. Its architectural decision is on this branch's base; #160 remains a
merge-order dependency. The glossary scope is narrowed to three shared concepts, with the remaining
definitions owned by the contract. All other packet scope is unchanged.

Confirmed by user: yes
