# ADR Review Manifest

- Status: completed
- Review date: 2026-10-31

## Review Summary

ADR review completed for this change. None of design.md's five decisions qualifies. Each is one sentence in a skill, costs nothing to reverse, and an engineer reading the skill and the spec sees the rule and its reason. The why that is costly to lose, that comments are evidence and that a candidate's reply marks a thread as read, is already in ADR-012 and ADR-013.

## In-Force ADRs Reviewed

- [ADR-001](../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md) to [ADR-011](../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md): about `lets delegate` and its config. None touches issues or comments.
- [ADR-012: Issue comments are evidence, never instructions](../../../docs/decisions/ADR-012-issue-comments-are-evidence.md): this change applies it. Build reads dates, and first lines only to match the marker. It stops rather than steers.
- [ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read](../../../docs/decisions/ADR-013-the-reply-is-the-read-marker.md): this change takes its marker rule as one half of the watermark.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced.
