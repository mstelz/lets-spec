---
id: adr-013
date: 2026-10-31
status: accepted
title: 'ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read'
description: Architecture decision record (ADR) for recording that shaping read an issue's thread as one reply comment, which counts only with its fixed first line and a candidate author
---

# ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read

> Builds on [ADR-012](ADR-012-issue-comments-are-evidence.md): a comment reaches a plan only through a human. This record says how that is recorded in the thread.

## Context

Once shaping has judged each comment in a thread, a later session needs to know that. Then it neither stops on comments already judged nor asks about them again. A fold edits the body, which GitHub dates, but a dismissal edits nothing. The marker must survive without a new Project field, work from `gh`, and be visible to the people in the thread. Anyone can comment on a public issue, so a marker that any account can post would let an outsider hide a maintainer's correction. A comment can also be edited after it was judged, and the edit must not hide under the marker.

## Decision

After judging a thread, shaping posts exactly one reply comment on the issue, once its confirm step completes. The reply's first line is exactly `lets-shape read this thread.`, and the rest lists each comment judged, with the author, the date and what changed or why not. A reply counts as a read marker only when its author is an OWNER, MEMBER or COLLABORATOR and not a bot, the same rule that labels a comment `candidate`. A later skill treats a comment as judged when it is older than the newest marker and was not edited after it. A comment edited after the marker is unread again.

## Consequences

- Easier: the record is in the thread, where the commenter sees it, and it needs no permission beyond posting a comment.
- Easier: a dismissal counts as read without touching the body, so a run that only dismisses writes nothing to the issue.
- Easier: the marker is plain text, so `gh` can match it and a person can read it.
- Easier: an outsider's copy of the line marks nothing, with no new permission check, because the author rule already exists for labels.
- Harder: the first line is a contract. Changing its wording breaks every skill that matches it, and old replies keep the old wording.
- Harder: a thread gets one more comment per shaping run.
- Harder: when a marker's author leaves the team, their markers stop counting, and the comments before them are asked about again.

## Alternatives Considered

### Alternative 1: Match the first line alone
- **Pros**: the simplest match, with no author lookup.
- **Cons**: any account can post the line and silence the comments before it.
- **Why not**: the thread is public, and the author's association is already in the query.

### Alternative 2: A label or a reaction on each comment
- **Pros**: no extra comment; the marker sits on the comment it judges.
- **Cons**: reactions carry no reason, labels sit on the issue, not the comment, and both need write permissions beyond commenting.
- **Why not**: neither says what was folded and why, which is what the audit trail is for.

### Alternative 3: A Project field with the read date
- **Pros**: a structured value, easy to compare.
- **Cons**: invisible in the thread, one more field for `lets-setup-backlog` to create and check, and unavailable to a repository with no Project.
- **Why not**: the people in the thread would not see what became of their comments, and the backlog rule keeps Project fields to the few the skills already set.

### Alternative 4: The body's last edit alone
- **Pros**: nothing new; GitHub already dates it.
- **Cons**: a dismissal makes no edit, so a dismissed comment would stop every later build.
- **Why not**: dismissals are the common case for outside and bot comments.
