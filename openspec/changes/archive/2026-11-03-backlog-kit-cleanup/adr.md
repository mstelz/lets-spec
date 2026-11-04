# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

Reviewed all existing ADRs. This cleanup implements the executable backlog
boundary recorded in ADR-014. Additive I/O options, types and source relocation
are reversible implementation choices; no new durable fork is introduced.

## In-Force ADRs Reviewed

- [ADR-001-default-delegate-starts-no-session](../../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md)
- [ADR-002-lets-owns-the-delegate-config](../../../../docs/decisions/ADR-002-lets-owns-the-delegate-config.md)
- [ADR-005-the-config-lists-the-chain](../../../../docs/decisions/ADR-005-the-config-lists-the-chain.md)
- [ADR-006-the-caller-chooses-the-model](../../../../docs/decisions/ADR-006-the-caller-chooses-the-model.md)
- [ADR-007-delegations-by-strategy-and-intent](../../../../docs/decisions/ADR-007-delegations-by-strategy-and-intent.md)
- [ADR-008-lets-tries-the-ranked-models](../../../../docs/decisions/ADR-008-lets-tries-the-ranked-models.md)
- [ADR-010-the-resolvers-are-built-into-lets](../../../../docs/decisions/ADR-010-the-resolvers-are-built-into-lets.md)
- [ADR-011-one-config-file-shaped-like-the-commands](../../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md)
- [ADR-012-issue-comments-are-evidence](../../../../docs/decisions/ADR-012-issue-comments-are-evidence.md)
- [ADR-013-the-reply-is-the-read-marker](../../../../docs/decisions/ADR-013-the-reply-is-the-read-marker.md)
- [ADR-014-backlog-adapters-use-an-executable-boundary](../../../../docs/decisions/ADR-014-backlog-adapters-use-an-executable-boundary.md)

## New Durable ADRs Created

None. ADR-014 on the stack base governs the unchanged boundary.
