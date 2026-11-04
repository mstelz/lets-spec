## Story

#160 — explain the executable adapter architecture and contract

https://github.com/sidereal-io/lets-spec/issues/160

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | How is the merged review addressed? | Separate the architecture and contract from the implementation cleanup; #161 follows #160. | User |
| D2 | Which extension mechanism is the direction for this decision? | Retain the executable backlog boundary and explain its third-party extension rationale and maintenance costs. | User |
| D3 | Does this change reopen delegation resolver extensibility? | No; ADR-010 continues to govern delegation resolvers. | Evidence: docs/decisions/ADR-010-the-resolvers-are-built-into-lets.md |
| D4 | What demonstrates acceptance? | The ADR cites ADR-010, evaluates alternatives and tradeoffs, and agrees with the contract without changing existing protocol guarantees. | User |
| D5 | What is deferred? | Kit relocation, packaging, typing, process/error handling, spec wording, glossary agreement and discovery corrections belong to #161; production adapters remain outside both follow-ups. | User |
| D6 | What support can the contract claim today? | The kit provides offline simulation evidence; current workflows still use GitHub commands and no production backlog dispatcher is installed. | Evidence: docs/backlog-adapter-contract.md |

## Changes from the story

None.

Confirmed by user: yes
