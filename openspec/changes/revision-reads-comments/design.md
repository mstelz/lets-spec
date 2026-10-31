## Context

Revision mode is step 1 to 4 of `skills/lets-shape/SKILL.md`. Step 1 lists every issue with `gh issue list --state all`, finds the map's links to closed issues with a `grep -oE 'issues/[0-9]+'` pipeline, re-annotates every stage against the code, and dates the freshness line. It reads no issue body and no thread. Shape one issue reads a thread in step 1, asks in step 4, writes folds at its confirm step in step 7, fetches again in step 8 and replies in step 9. The reference `references/issue-comments.md` holds the query, the labels, the list, the marker and the reply, whose items are `Folded:`, `Taken into #<parent>:` and `Dismissed:`. The test suite checks that `lets-shape` links the reference, that the reference holds its fixed strings, and that `gh` knows every command the prose names. A linked story may be In Progress: a `partial` or `gap` stage links the open issues that close it, whatever their Status.

## Goals / Non-Goals

**Goals:**
- Revision mode judges a thread the same way Shape one issue does, so a reader of either learns one procedure.
- A fold in Revision mode touches the body only. A story someone is building keeps its Status.
- A comment that changes only the map still gets an honest line in the reply.
- The reference changes by one item form, nothing else.

**Non-Goals:**
- Any change to `lets-build` or `lets-brainstorm`.
- Reading closed issues, unlinked issues, the epic's own thread or pull request comments.
- Closing a superseded story. The epic keeps that as a Could.
- Resume mode, which has no reconcile step.

## Test Seams

- **Primary test seam:** `tests/skill-interfaces.bats`. One new `skill_says` test holds `Read the thread of each open issue the map links`, which no skill says today. The fixed-strings test on the reference gains `Map updated:`, and fails today. Both are source tests on the files the change edits.
- **Existing seams reused:** `each gh command the prose names is one gh knows`, which covers the `gh issue edit` and `gh issue comment` the new bullet names; `shaping links its issue-comments reference`; `the prose has no trailing whitespace`; and the published-flow link test, which resolves `lets-shape`'s links in each built flow.

## Scrutiny Tier & Blast Radius

- **Tier:** low. Prose in one skill and one reference, on the rules #125 set and ADR-012 and ADR-013 record. No code, schema, config or trust boundary changes.
- **Blast radius:** `skills/lets-shape/SKILL.md`, `skills/lets-shape/references/issue-comments.md`, `tests/skill-interfaces.bats`, `README.md`. Projects see it at the next release.

## Decisions

1. **One new bullet in Revision mode step 1, between the stale-link check and the re-annotation.** It opens with the sentence the test holds, says which issues count, and gives the per-issue procedure in order: fetch and show the list, ask about each comment not labelled `read`, write any fold, fetch again until nothing is new, reply. It links the reference and Shape one issue for the how, and restates neither. Alternative: a new step 2 and renumber. Rejected: the packet names step 1, the re-annotation in step 1 consumes the answers, and renumbering would move the three later steps for no gain.
2. **The issues come from the map's links, filtered to open.** The same `grep -oE 'issues/[0-9]+'` the stale-link check already runs, matched against the open numbers from the `gh issue list --state all` call step 1 already makes. No new query. Ascending number is the order, because it is stable across runs and the user can predict it. Alternative: every open story on the Project. Rejected: the packet says the stories the map links, and the map is what this step reconciles.
3. **One issue at a time, fetch to reply.** A thread is fetched, judged, written and replied to before the next one is fetched. The window between a fetch and its reply stays minutes, not the length of the whole backlog, so the second fetch rarely finds anything. Alternative: fetch every thread first, then ask. Rejected: a comment posted during a long pass would sit under a reply posted an hour later, and the user would juggle many lists.
4. **Three recommendations: fold, update the map, or dismiss.** Fold when the comment changes a packet line, naming the line. Update the map when it changes a stage and not the packet, naming the stage and the outcome from the stale-link check's three: upgrade the stage, link another open issue, or leave an unplanned gap. Dismiss when the packet already holds it or it changes neither, with that reason. Every unread comment gets a question, because the reply's marker will cover it (ADR-013). Alternative: ask only about comments that bear on a stage or the packet. Rejected: the others would be marked read with no human judgment, which ADR-012 rules out.
5. **A yes to a map change is written in the re-annotation, not at once.** The re-annotation that follows the bullet already edits the map and re-checks each stage against the code. The comment is evidence for that edit, carried as a note in the conversation. Alternative: edit `discovery.md` inside the bullet. Rejected: two places would edit the same stage in one step.
6. **A fold writes the body only, once per issue.** Shaping shows the folded body whole, gets a yes, and runs `gh issue edit <i> --body-file <file>`, with no `--title` and no `item-edit`. Shape one issue sets the four Project fields after its write because it may be creating the packet; here the packet exists and the story may be In Progress, so resetting Status to Todo would hide a claim. Alternative: reuse Shape one issue's step 7 as written. Rejected for that reason.
7. **The reply's confirm step is the body write, or the last answer when nothing was folded.** Revision mode has no template interview and no size check after the questions, so nothing else can stop the pass. The second fetch follows the confirm step, as in Shape one issue, and the reply follows the second fetch. One reply per issue, only when at least one comment was judged. Alternative: one reply at the end of the pass. Rejected: a comment posted during the pass would then hide under a marker on another issue's timeline, and ADR-013 puts the marker on the thread it covers.
8. **The reference gains `Map updated:`.** Its text is the stage and what changed, with the author and date like the other items. `Folded:` stays for a body change and names a map change the same comment made, so one comment gets one line. Alternative: write a map-only change as `Folded:`. Rejected: the glossary defines a fold as a body edit, and the reply would then claim an edit that did not happen. Alternative: `Dismissed:` with a note. Rejected: it was accepted. The fixed-strings test holds the new item so the three skills that link the reference keep seeing it.
9. **The README gains one sentence in the `lets-shape` section**, after the paragraph on folds: a revision run reads the comments on the open stories the map links the same way. Alternative: none. The section already describes the fold and the reply, and this is the one new occasion for them.

## Risks / Trade-offs

- [A backlog with many commented stories makes the pass long] → Each issue's list comes first, so the user sees its size. ADR-012 prices an unread comment as a question. A later story can batch or let the user skip a story for this run.
- [A fold on a story whose change is already planned] → Build's watermark moves with the body edit, so the running change is unaffected, and the next build reads the new packet. The pull request review is where a human sees the result.
- [The agent edits the map inside the bullet instead of in the re-annotation] → The bullet says the yes is carried into the re-annotation, and the spec's scenario says the body is unedited and the stage changes there.
- [The agent resets Status when it writes a fold] → The bullet says body only, and names no `item-edit`. The spec's In Progress scenario pins it.
- [A stale marker from a user who left the team] → As in #125: their markers stop counting and earlier comments are asked about again. Nothing is hidden.
- [`skill_says` matches the sentence elsewhere in the skill] → The sentence names the map's links, which only Revision mode has.

## Migration & Rollback

N/A. Rolling back is reverting the commits.
