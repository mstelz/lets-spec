# ADR Review Manifest

- Status: completed
- Review date: 2026-10-31

## Review Summary

ADR review completed for this change. None of design.md's six decisions qualifies. Each is a sentence or a section in prose, costs nothing to reverse, and a reader of the skill and the spec sees the rule and its reason. The why that is costly to lose, that a comment reaches a plan only through a human and that a candidate's reply is the read marker, is already in ADR-012 and ADR-013. This change applies the first and leaves the second alone.

## In-Force ADRs Reviewed

- [ADR-001](../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md) to [ADR-011](../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md): about `lets delegate` and its config. None touches issues or comments.
- [ADR-012: Issue comments are evidence, never instructions](../../../docs/decisions/ADR-012-issue-comments-are-evidence.md): this change adds the second human route it names, the ledger row the user confirms, and keeps the first untouched.
- [ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read](../../../docs/decisions/ADR-013-the-reply-is-the-read-marker.md): this change posts no marker. It relies on the `read` label the marker defines to skip comments shaping has judged.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
