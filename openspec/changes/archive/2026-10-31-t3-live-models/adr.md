# ADR Review Manifest

- Status: completed
- Review date: 2026-10-31

## Review Summary

ADR review completed for this change. None of design.md's decisions needs a new record.

- Reading T3's live catalogue instead of its model manifest is a requirement now: the `delegate-resolvers` spec says `t3` SHALL NOT read `model-manifest.json`. The spec guards it, so no record is needed.
- The other decisions are about how `t3` reads the catalogue:
  - one deadline for the whole catalogue request;
  - reading the reply defensively, in pure functions;
  - mapping providers by instance id;
  - warning instead of failing.

  A reader finds each one in the code beside it, and each is cheap to change. Refusing a bare family with no visible model is a requirement in the spec.
- The principle behind the change, that a resolver lists the models its harness can run now, is already [ADR-006](../../../docs/decisions/ADR-006-the-caller-chooses-the-model.md).

## In-Force ADRs Reviewed

- [ADR-001](../../../docs/decisions/ADR-001-default-delegate-starts-no-session.md): the built-in default delegate starts no session
- [ADR-002](../../../docs/decisions/ADR-002-lets-owns-the-delegate-config.md): lets owns the delegate config
- [ADR-005](../../../docs/decisions/ADR-005-the-config-lists-the-chain.md): the config lists the resolvers to ask, in order
- [ADR-006](../../../docs/decisions/ADR-006-the-caller-chooses-the-model.md): a resolver reports the models it can run, and the caller chooses one
- [ADR-007](../../../docs/decisions/ADR-007-delegations-by-strategy-and-intent.md): lets delegate is organized by strategy and intent
- [ADR-008](../../../docs/decisions/ADR-008-lets-tries-the-ranked-models.md): the skill ranks the models, and lets tries them in order
- [ADR-010](../../../docs/decisions/ADR-010-the-resolvers-are-built-into-lets.md): the resolvers are built into lets
- [ADR-011](../../../docs/decisions/ADR-011-one-config-file-shaped-like-the-commands.md): lets has one config file, shaped like its commands

## New Durable ADRs Created

- None. No decision in this change is both easy to reverse by accident and costly to reverse.
