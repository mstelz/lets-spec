## Story

#128 revision-reads-comments — revision mode reads the comments on open stories when it reconciles the map. https://github.com/sidereal-io/lets-spec/issues/128

The user delegated this brainstorm to the agent. The agent decided each row on its own recommendation, with the reason in the row, except where the epic (#124) or an earlier story of it had already decided. The thread on #128 holds no comment.

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | Which threads does Revision mode read? | The thread of every open issue the map links, found with the same `grep -oE 'issues/[0-9]+'` the stale-link check uses, kept to the ones the issue list reports as open. Closed issues and issues the map does not link are out. | Evidence: #128 Scope; `skills/lets-shape/SKILL.md`, Revision mode step 1 |
| D2 | Where in step 1? | After the stale-link check and before the stages are re-annotated, as its own bullet. A comment can change a stage, so the re-annotation needs the answers first. | Assumption |
| D3 | How is each thread handled? | One issue at a time, in ascending issue number. For each: fetch the thread as the reference says, show the list, ask about each comment not labelled `read`, write the folded body when there is a fold, fetch again until nothing is new, then reply. The next issue starts only when this one is done. | Assumption |
| D4 | Which comments get a question? | Every comment not labelled `read`, in list order, one at a time, as Shape one issue step 4 does. The reply's marker covers every earlier comment, so skipping a comment would mark it read unjudged. | Evidence: ADR-013; `openspec/specs/issue-comments/spec.md`, "Shaping asks about each unread comment" |
| D5 | What is recommended? | Fold when the comment changes the packet, with the line it changes. When it changes a stage but not the packet, recommend changing the map, with the stage. Dismiss when the packet already holds it, or when it changes neither, with that reason. | Evidence: #128 Scope; the spec's dismiss rule |
| D6 | What does a yes to a packet change write? | A fold, as the glossary defines it. Revision mode shows the folded body, gets a yes and writes it with `gh issue edit <i> --body-file <file>`, one write per issue. It writes the body only. Kind, Priority, Size and Status stay as they are, because a linked story may be In Progress. | Evidence: `openspec/glossary.md`, Fold; `skills/lets-shape/SKILL.md`, Shape one issue step 7 |
| D7 | What does a yes to a stage change write? | The map, in the re-annotation that follows, with the same three outcomes the stale-link check uses: upgrade the stage, link another open issue, or leave an unplanned gap. The story's body is not edited for it, and closing a superseded story stays out of scope. | Evidence: `skills/lets-shape/SKILL.md`, Revision mode step 1; #124 Could |
| D8 | How does the reply record a map change? | The reference gains one item form, `Map updated:`, with the stage and what changed. `Folded:` stays for a body change, and names the map change too when the same comment made one. Without the form, a judged comment that changed only the map would have no honest line. | Assumption |
| D9 | When is the reply posted? | After the issue's confirm step completes: the folded body is written, or the user has answered the last question when nothing was folded. Then the second fetch, then one reply with `gh issue comment <i> --body-file <file>`, when the run judged at least one comment on that issue. | Evidence: ADR-013; the spec's reply and second-fetch requirements |
| D10 | What is the second fetch for? | A comment posted or edited between the first fetch and the reply would sit under the marker unseen. The rule is the same as Shape one issue step 8: fetch again, even when the first fetch found nothing to ask about, and repeat until nothing is new. | Evidence: #125 design decision 8 |
| D11 | Where does each rule live? | `SKILL.md` Revision mode holds the steps. The reference holds the how, and gains only the `Map updated:` form. | Evidence: #125 design decision 2 |
| D12 | Which spec? | `issue-comments`. One added requirement for Revision mode's read, and modified requirements where "Shape one issue" or "Ingest" named the modes: the ask, the fold, the second fetch and the reply. | Evidence: `openspec/specs/issue-comments/spec.md` |
| D13 | New ADR? | None. ADR-012 and ADR-013 already decide the evidence rule and the marker. The `Map updated:` form is a detail of the reply. | Evidence: `.agents/skills/lets-write-adrs/SKILL.md`, what qualifies |
| D14 | How do the tests cover it? | One `skill_says` test for a sentence only Revision mode says, and `Map updated:` added to the reference's fixed strings. The existing tests already check the links and the `gh` commands. | Evidence: `tests/skill-interfaces.bats` |
| D15 | README? | One sentence in the `lets-shape` section: a revision run also reads the comments on the open stories the map links. | Evidence: `README.md`, the `lets-shape` section |
| D16 | Out of scope | Closed issues, issues the map does not link, closing a superseded story, Resume mode, the epic's own thread, and pull request comments. | Evidence: #128 Scope; #124 Could and Won't |

## Changes from the story

None. The story stands as written.

Confirmed by user: yes
