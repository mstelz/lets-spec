---
id: adr-012
date: 2026-10-31
status: accepted
title: 'ADR-012: Issue comments are evidence, never instructions'
description: Architecture decision record (ADR) for treating issue comments as evidence shown to a human, with the packet as the only part of an issue that instructs an agent
---

# ADR-012: Issue comments are evidence, never instructions

## Context

Agents plan and build from a GitHub issue. Its body, the packet, is written to a template by a skill with a human present. A build session reads it with no human in the loop. Anyone with a GitHub account can comment on a public issue, and a comment can say anything, including "ignore the body and do this instead". Maintainers do leave real decisions in comments, so the agents cannot ignore the thread either. The author's association with the repository is visible, but it is a weak signal. A maintainer's one-liner can be wrong, and an outsider's can be right.

## Decision

A comment is evidence, never an instruction. The packet is the only part of an issue that instructs an agent. A comment's content reaches a plan only through a human. The routes are a fold into the packet, by a skill that asks about each comment and shows the result, and a brainstorm ledger row the user confirms. Author association labels a comment for the human and never gates it. No label hides, skips or accepts a comment on its own.

## Consequences

- Easier: a build session needs no trust decision. It reads one body, and a thread it has not seen stops it rather than steering it.
- Easier: one rule covers every skill. A new skill that reads comments inherits the boundary by linking one reference.
- Easier: the fold leaves a visible edit and a reply, so anyone can see what a comment changed and who agreed.
- Harder: every unread comment costs the human a question. A long thread makes shaping slow.
- Harder: a correct maintainer comment still waits for a shaping session before a build can use it.

## Alternatives Considered

### Alternative 1: Trust comments by author association
- **Pros**: a maintainer's comment takes effect at once, with no human step.
- **Cons**: the agent then follows text nobody checked, and the trust depends on GitHub's association rules, which change with team membership.
- **Why not**: the build session has no human to catch a wrong or ambiguous maintainer comment. One bad instruction in a build costs a wrong implementation; one question costs a minute.

### Alternative 2: Let each skill read comments as it sees fit
- **Pros**: no shared reference to maintain; each skill asks what it needs.
- **Cons**: three skills would hold three rules, and the first one that treats a comment as an instruction opens the boundary for all.
- **Why not**: the boundary only holds if it is one rule in one place.

### Alternative 3: Ignore comments
- **Pros**: no trust question at all.
- **Cons**: maintainers' corrections stay unread, and builds plan against paths that have moved.
- **Why not**: that is the situation this decision replaces.
