## Context

`lets-shape` reads an issue with `gh issue view --json title,body,url,parent` in Shape one issue, and with `gh issue view <n>` in Ingest. Neither reads comments. Shape one issue reads the issue only when the user named it; an issue found by title search is confirmed but not read. The skill's rules live in `SKILL.md` and one reference, `references/domain-language.md`, which other skills link by relative path. The skill-interfaces test scans `skills/*/SKILL.md`, the schemas and the templates for `gh` commands and checks each against the installed `gh`. It does not scan references. The release build copies each skill folder whole, so a new reference ships with no build change. `gh issue view --json comments` returns author, association and date but no bot flag. GitHub's `IssueComment.author` is null when the account was deleted.

## Goals / Non-Goals

**Goals:**
- One reference that #126 and #127 link to without change.
- The skill's steps say only when to read, ask, fold and reply. The reference says how.
- No comment is marked read unseen, and no outsider can mark one read.
- Every `gh` command in a reference is checked like one in a `SKILL.md`.

**Non-Goals:**
- Any change to `lets-build`, `lets-brainstorm` or revision mode.
- Reading pull request review comments, reactions or minimized comments.
- Enforcing the rule in code. Skills are prose; the rule binds the agent.

## Test Seams

- **Primary test seam:** `tests/skill-interfaces.bats`. The `prose()` helper gains `skills/*/references/*.md`, so the `gh` command test and the trailing-whitespace test cover the new reference. Two new tests at the same seam: `lets-shape` links `references/issue-comments.md`, and the reference itself holds `lets-shape read this thread.`, the three labels, `gh api graphql` and `gh issue comment` with `--body-file`. The last two are asserted on the reference file, because `prose()` deduplicates matches and `SKILL.md` already names `gh api graphql`. Links to the reference carry no `#anchor`, because the link test's pattern skips anchored links.
- **Existing seams reused:** `shaping loads its installed domain-language reference` and `planning vocabulary inputs resolve inside each published flow`, which resolve every `references/*.md` link in the source and in the built overlay.

## Scrutiny Tier & Blast Radius

- **Tier:** medium. The change states a trust boundary, but it is prose in one skill on the skill's existing pattern, and no code or schema changes.
- **Blast radius:** `skills/lets-shape/` (SKILL.md and one new reference), `tests/skill-interfaces.bats`, `README.md`. Projects see it at the next release through `lets sync`.

## Decisions

1. **The thread query is one `gh api graphql` call.** It returns each comment's `url`, `author { __typename login }`, `authorAssociation`, `createdAt`, `lastEditedAt` and `body`, `pageInfo` for paging, and the issue's `lastEditedAt`. The comment's edit date is what lets a later run notice an edit under an old marker. Alternatives: `gh issue view --json comments`, which has no bot flag; `gh api repos/{owner}/{repo}/issues/<i>/comments`, which has `user.type` but fails the test's `gh api` check, which only knows `graphql`. The skill already uses `gh api graphql` for the Project lookup. A null `author` is shown as `ghost`.
2. **The reference holds the rules; the skill holds the steps.** Same split as `domain-language.md`. #126 and #127 link the reference and add no rule of their own.
3. **Labels describe, never gate.** `candidate` is OWNER, MEMBER or COLLABORATOR and not a bot; everything else is `outside`. A comment the newest read marker covers is `read`: it is older than the marker and not edited after it, or it is a marker. Shaping shows every comment and asks about every unread one. Authors appear without `@`, and summaries carry no `@mention`, so nothing shaping writes pings anyone. Recorded in ADR-012, because the next person to touch this will be tempted to skip `outside` comments or auto-fold `candidate` ones.
4. **The read marker is a candidate's reply with a fixed first line.** Matching the line alone would let any account silence a thread. Matching the author as `candidate` uses the same rule as the labels, with no new permission check. Recorded in ADR-013. The alternatives (a label, a reaction, a Project field) are cheap to switch to and would strand #126.
5. **Shaping's cutoff is the newest marker only.** A body edit by a human says nothing about the thread. Build's watermark is #126's to define; the reference states only the marker.
6. **The comment questions are their own step.** They sit between step 3 and step 4 of Shape one issue: after the code and glossaries are read, before the template interview, for every Kind. Inside step 4 they would skip Chores, which have no template. Step 1 reads an issue found by title search, once the user confirms it, the same way as a named one; today it confirms the match and reads nothing.
7. **Folds ride the existing confirm step.** Shape one issue already shows the whole body and gets one yes before writing. Folds change the drafted body, so there is one public write, not one per comment. In Ingest, which never edits its input, an accepted comment goes into the parent issue's Scope or Open questions, and the reply calls that `Taken into #<parent>:`, not a fold.
8. **Fetch again after the confirm step, always.** The interview can take many minutes. A comment posted or edited in that window would otherwise sit under the reply, or under the body's edit date, and never be seen. The second fetch runs even when the first found nothing unread, because an empty thread can fill during the interview. New comments are matched by URL and edit date, never by the local clock. Anything new is asked about, the updated body is confirmed and written with `gh issue edit`, on the issue or on the parent, and the fetch repeats until nothing is new.
9. **The reply follows the confirm step.** It is posted once the step completes: the body is written, the parent issue is created, or the user confirms that an already-shaped packet stands unchanged. In that last case shaping writes no body and leaves the Project fields alone, so a dismiss-only run does not reset Status. The reply goes through `--body-file`, so no comment text reaches a shell. A pass that stops earlier leaves no false marker.
10. **A fold rewrites the line; it never pastes the comment.** The packet stays in the template's voice, and the reply says where the content came from.

## Risks / Trade-offs

- [Long threads make the interview long] → The list comes first, so the user sees the size before the first question, and only unread comments get one. A later story can batch.
- [GraphQL comment nodes cap at 100 per page] → The query carries `pageInfo`; the reference says to page with `after` when `hasNextPage` is true.
- [An agent treats a comment's imperative text as an instruction] → The reference opens with the rule, in the same words as `domain-language.md` uses for glossaries, and ADR-012 records why.
- [A marker from a user who later leaves the team] → Their association drops and old markers stop counting, so the comments before it are asked about again. Nothing is hidden, so the cost is questions, not a missed comment.
- [A comment edited after a marker] → Its edit date is after the marker, so it loses the `read` label and is asked about again. #126 gets the same rule from the reference.
- [Adding references to `prose()` catches old text] → The three existing references, in `lets-shape` and `lets-test-first`, have no `gh` commands and no trailing whitespace. Checked before writing this design.

## Migration & Rollback

N/A. No data or config changes shape. Rolling back is reverting the commits.
