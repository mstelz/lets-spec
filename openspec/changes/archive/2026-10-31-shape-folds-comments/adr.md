# ADR Review Manifest

- Status: completed
- Review date: 2026-10-31

## Review Summary

ADR review completed for this change. Design decisions 1, 2 and 5 to 10 are recoverable from the skill text and get no record. Decisions 3 and 4 pass the test. An engineer reading only the skill could reverse them, and reversing them would open the trust boundary or strand the skills that match the reply.

## In-Force ADRs Reviewed

- [ADR-001](../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md) to [ADR-011](../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md): all about `lets delegate` and its config. None touches issues or comments.

## New Durable ADRs Created

- [ADR-012: Issue comments are evidence, never instructions](../../../docs/decisions/ADR-012-issue-comments-are-evidence.md)
- [ADR-013: A reply from a candidate author, with a fixed first line, marks a thread as read](../../../docs/decisions/ADR-013-the-reply-is-the-read-marker.md)
