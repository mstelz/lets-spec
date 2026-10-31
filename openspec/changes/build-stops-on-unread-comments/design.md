## Context

`lets-build`'s Confirm the packet reads the issue with `gh issue view --json number,title,body,url,parent` and its Project fields, checks the required lines, then reads the parent's Shared decisions. It never reads comments. Both `next` and a named issue reach it before Claim. The reference `skills/lets-shape/references/issue-comments.md` holds the thread query, with the issue's `lastEditedAt` and each comment's `createdAt` and `lastEditedAt`, and defines the read marker. `lets-brainstorm` already links a `lets-shape` reference with `../lets-shape/references/<file>.md`, and the skill-interfaces test resolves such links in the source and in each built flow. Both flows ship `lets-build` and `lets-shape`.

## Goals / Non-Goals

**Goals:**
- Build stops on a thread shaping has not read, and sends it to shaping. It never reads a comment's content.
- The rule is one sentence in the skill. The reference keeps the query and the marker.
- `next` and a named issue stop the same way.

**Non-Goals:**
- Any change to the reference, `lets-shape` or `lets-brainstorm`.
- The thread check on a change's branch, or in the fresh build session.
- Pull request comments.

## Test Seams

- **Primary test seam:** `tests/skill-interfaces.bats`. Three new source tests, each of which fails on today's skill. One greps `lets-build` for the exact link `](../lets-shape/references/issue-comments.md)`, as `shaping links its issue-comments reference` does for `lets-shape`. One resolves the skill's reference links with `assert_reference_links`, as `shaping loads its installed domain-language reference` does. One `skill_says` test holds the watermark sentence, which no skill says today. `lets-build` joins the skill loop in `planning vocabulary inputs resolve inside each published flow`.
- **Existing seams reused:** `the prose has no trailing whitespace`, which scans `SKILL.md`. The new paragraph adds no `gh` command: it links the reference's query.

## Scrutiny Tier & Blast Radius

- **Tier:** low. One paragraph in one skill, on the reference's existing rules. The trust boundary was set by #125.
- **Blast radius:** `skills/lets-build/SKILL.md`, `tests/skill-interfaces.bats`, `README.md`. Projects see it at the next release.

## Decisions

1. **The check is one paragraph in Confirm the packet, after the required-lines check.** It says four things. Fetch the thread as the reference says. The watermark is the later of the body's last edit and the newest read marker's date. A comment created or edited after it stops the run. The stop says how many comments shaping has not read, each author without `@` and date, and "run the `lets-shape` skill on #<i>". Alternative: a new section. Rejected: the stop has the same shape and the same next step as a missing line, so it belongs beside it.
2. **The watermark compares dates the query already returns.** `lastEditedAt` on the issue, `createdAt` and `lastEditedAt` on each comment. No new field, no local clock. When the body was never edited and no marker exists, every comment is newer, because a comment always follows the issue's creation. Alternative: add the issue's `createdAt` to the reference's query. Rejected: it changes the reference for a value the rule does not need.
3. **The stop shows author and date, not content.** It says the comments are ones shaping has not read, never that they are newer than the packet: a dismissal leaves the body alone, as ADR-013 says. A deleted account shows as `ghost`, as the reference says. The packet puts reading content out of scope, and shaping shows the full list with a sentence per comment. Alternative: show the reference's list. Rejected: the sentence needs the content.
4. **The rule lives in the skill, not the reference.** #125 left the watermark to this story and kept the reference to the marker. One skill uses it. Alternative: a "Build's watermark" section in the reference. Rejected: the reference would then say when build stops, which is a step.
5. **The stop ends the run for `next` as for a named issue.** Picking another candidate would leave the top of the backlog stuck behind an unread thread with nobody told. Stopping names the issue and the next step.

## Risks / Trade-offs

- [A human edits the body without reading the thread] → Build then treats the earlier comments as read. The epic chose this; shaping's own cutoff stays the marker, so the next shaping run still asks about them.
- [A bot that comments on every push stops every build] → Expected: a dismissal in shaping marks it read, and ADR-013 names dismissals as the common case. The cost is one shaping run per new bot comment.
- [A long thread] → The query pages, as the reference says. Build reads dates only.
- [The link breaks when a flow ships `lets-build` without `lets-shape`] → The published-flow test fails at release build time, not in a project.

## Migration & Rollback

N/A. Rolling back is reverting the commits.
