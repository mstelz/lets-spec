**Why:** The backlog workflow embeds GitHub operations, so an agreed and tested adapter boundary is needed before adding other backlog programs.

## Story

#135 backlog-adapter-contract — Define and validate the backlog adapter boundary

https://github.com/sidereal-io/lets-spec/issues/135

## Decisions

| # | Question | Answer | Source |
|---|---|---|---|
| D1 | What does this chore deliver? | Contract documents plus runnable conformance scenarios using fake adapters; production integrations remain in later stories. | User |
| D2 | Which programs must the contract cover? | GitHub Issues/Projects, Jira Cloud, Linear and local Beads; one selected backlog per repository, with GitHub the default. | Evidence: parent epic #52, Shared decisions |
| D3 | Which boundaries must it settle? | Shared workflow policy, provider operations and code-host operations, including identity, capabilities, configuration/authentication, claims, retries and completion. | Evidence: issue #135 and parent epic #52 |
| D4 | How do adapters integrate? | Executable programs exchange versioned JSON through a shared `lets backlog` command boundary; this chore defines the protocol and tests it with fakes. | User |
| D5 | How do capabilities differ across providers? | Preserve existing GitHub behavior; declare native, emulated or unsupported capabilities, document equivalent behavior and its limits, and stop explicitly when the current workflow step cannot achieve its required outcome. | User |
| D6 | What anchors the preservation checks? | Inventory setup/checking, shaping and metadata, parent/sub-issue and blocker relationships, readiness selection, claiming and release, pull request references and completion against the current GitHub workflow. | Evidence: skills/lets-setup-backlog/SKILL.md, skills/lets-shape/SKILL.md, skills/lets-build/SKILL.md and overlays/AGENTS.md |
| D7 | When is work complete? | Complete work only after its pull request merge is confirmed; making a pull request ready leaves it In Progress, and a failed backlog completion update can be retried idempotently. | User |
| D8 | Must every provider guarantee an exclusive claim? | Permit documented best-effort claims that check ownership, assign and verify; use stronger claims where supported, declare the guarantee, and resolve uncertain outcomes before building. A separate locking system is not required by this chore. | User |
| D9 | Where do configuration and credentials belong? | Commit the backlog selection and field mappings under `lets:` in `openspec/config.yaml`; adapters obtain credentials through provider login tools or the environment. Local Beads storage follows the project's chosen location and tracking policy. | User |
| D10 | Should the shared contract expose provider-specific fields? | Keep the shared contract focused; do not add a general provider-specific field surface. Adapters should leave unrelated provider data untouched when making targeted updates. | User |
| D11 | Which shared metadata is the starting point? | Preserve Kind (Epic, Story, Bug, Chore), Priority (Must, Should, Could, Wont), Size (XS, S, M, L, XL) and Status (Todo, In Progress, Done), with provider-specific storage and configured mappings behind the adapter. | User |
| D12 | How are work items identified? | Use a provider- and backlog-scoped opaque ID, a display reference and an optional browser URL; identity must work for local items without a URL and must not depend on GitHub issue numbers. | User |
| D13 | How are errors and uncertain writes handled? | Distinguish invalid requests/configuration, authentication/permission failures, missing items, unsupported capabilities, ownership conflicts, transient failures and unknown write outcomes; reconcile uncertain writes before retrying, and never silently fall back to another backlog. | User |
| D14 | What makes this chore's validation sufficient? | Inventory current GitHub behavior; define request/response schemas and operation semantics; exercise fake executables with representative scenarios for all four providers, failures and retries; document each scenario's primary-source evidence and limits. Fakes validate the contract, not live provider support. | User |
| D15 | Does this chore change the production workflow? | Deliver the contract, rationale, schemas and reusable fake-based conformance harness; document the future `lets backlog` boundary, but leave the production dispatcher, provider adapters and skill migration to implementation stories. | User |

## Changes from the story

None.

Confirmed by user: yes
