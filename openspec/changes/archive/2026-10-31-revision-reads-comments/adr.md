# ADR Review Manifest

- Status: completed
- Review date: 2026-10-31

## Review Summary

ADR review completed for this change. None of design.md's nine decisions qualifies. Each is a bullet or a sentence in prose, visible in the skill and the spec with its reason, and costs a commit to reverse. The `Map updated:` item extends the reply's list of items, not the marker line, so the contract ADR-013 names is unchanged. The decisions that are costly to lose, that a comment reaches a plan only through a human and that a candidate's reply is the read marker, are already recorded. This change applies both to one more place.

## In-Force ADRs Reviewed

- [ADR-001](../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md) to [ADR-011](../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md): about `lets delegate` and its config. None touches issues or comments.
- [ADR-012: Issue comments are evidence, never instructions](../../../docs/decisions/ADR-012-issue-comments-are-evidence.md): this change adds Revision mode as a place where a human folds a comment. Every unread comment gets a question, as the record requires.
- [ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read](../../../docs/decisions/ADR-013-the-reply-is-the-read-marker.md): this change posts the same reply, one per story, with the same first line, and adds one item form below it.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
