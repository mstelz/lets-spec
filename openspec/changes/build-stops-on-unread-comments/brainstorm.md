## Story

#126 build-stops-on-unread-comments — build stops on a packet with comments newer than its watermark and sends them to shaping. https://github.com/sidereal-io/lets-spec/issues/126

The user delegated this brainstorm to the agent. The agent decided each row below on its own recommendation, with the reason in the row, except where the epic (#124) or #125's archived change had already decided it.

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | What is the watermark? | The later of the body's last edit (`lastEditedAt` on the issue) and the newest read marker's `createdAt`. When neither exists, the watermark is the issue's creation, so every comment is after it. | Evidence: #124 Shared decisions; ADR-013 |
| D2 | Which read markers count? | Those the reference defines: first line exactly `lets-shape read this thread.`, from a `candidate` author. Build takes the rule from the reference and adds none. | Evidence: `skills/lets-shape/references/issue-comments.md`, The read marker |
| D3 | Which comments stop the run? | Every comment whose `createdAt`, or `lastEditedAt` when it has one, is after the watermark, whoever wrote it. A label never gates. A read marker is never one of them: the newest sets the watermark, and older ones are before it. | Evidence: ADR-012; the reference, "A comment edited after the marker is unread again" |
| D4 | Where does the check run? | In Confirm the packet, after the required-lines check and before the parent's Shared decisions are read. Both `next` and a named issue pass through it, so both stop the same way, before Claim, with nothing to release. | Evidence: `skills/lets-build/SKILL.md`, Confirm the packet; #126 Scope |
| D5 | How does build fetch the thread? | With the reference's query, paging as it says. It links `../lets-shape/references/issue-comments.md` from `lets-build`, as `lets-brainstorm` links the domain-language reference. Both flows ship `lets-shape` beside `lets-build`. | Evidence: `flows.json`; `skills/lets-brainstorm/SKILL.md` line 14 |
| D6 | What does the stop say? | How many comments are newer than the packet, each with its author without `@` and its date, and then "run the `lets-shape` skill on #<i>". No sentence on what a comment says: reading content is out of scope, and shaping shows the full list. | Assumption |
| D7 | Does the stop skip to the next candidate? | No. It stops the run, as a missing template line does. Shaping is the way forward, with the user present. | Evidence: #126 Scope, "as a missing template line does" |
| D8 | Does a human's body edit count as read, for build? | Yes. The epic decided the watermark takes the body's last edit, so a human who rewrote the packet has read the thread up to then. Shaping's own cutoff stays the marker only (#125 D16). | Evidence: #124 Shared decisions |
| D9 | Where does the rule live? | The watermark and the stop are `lets-build` steps, in its `SKILL.md`. The reference keeps the query, the labels and the marker, unchanged. | Evidence: #125 design decisions 2 and 5 |
| D10 | Which spec? | ADDED requirements on the existing `issue-comments` capability, as #125's D10 planned. No other capability changes. | Evidence: `openspec list --specs`; #125 brainstorm D10 |
| D11 | How do the tests cover it? | `tests/skill-interfaces.bats`: `lets-build`'s reference link resolves in the source and in each published flow, and `skill_says` checks the watermark sentence and the link. The `gh` command test already scans `SKILL.md`. | Evidence: `tests/skill-interfaces.bats`, `assert_reference_links` and `skill_says` |
| D12 | What does the README say? | The packet sentence gains that `lets-build` stops when the thread has comments newer than the packet, and the `lets-build` table's first row says it. One sentence each. | Evidence: `README.md` lines 164 and 199 |
| D13 | Does the check run on a change's branch? | No. Confirm the packet runs from the default branch only. A build session reads the packet and the change folder. | Evidence: #124 Won't, "Comments in the fresh build session" |
| D14 | New glossary terms? | None. *Watermark* is one skill's rule for one step; promoting it is reuse that has not happened. | Evidence: `openspec/glossary.md`; the domain-language reference |
| D15 | Out of scope, as the packet says | Reading a comment's content, folding, pull request comments, the brainstorm ledger row (#127) and revision mode (#128). | Evidence: #126 Scope; #124 |

## Changes from the story

None. The story stands as written.

Confirmed by user: yes
