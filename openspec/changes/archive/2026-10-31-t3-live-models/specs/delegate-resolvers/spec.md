## MODIFIED Requirements

### Requirement: T3 Code has its own resolver
`lets` SHALL have a resolver named `t3`, which answers only for T3 Code. Inside T3 Code, it SHALL answer with `resolver` `t3` and its `options`. It SHALL find the process's parents both on a system with `/proc`, such as Linux, and on one without, such as macOS. `lets` SHALL NOT have a resolver for herdr.

#### Scenario: Inside T3 Code
- **WHEN** the config's `delegate.resolvers` is `[t3]` and the command runs in a process whose ancestor is the running T3 server
- **AND** T3's catalogue lists only disabled provider instances, and the user runs `lets delegate review instructions --for code`
- **THEN** it exits 0, its JSON line has `"resolver":"t3"` and `"options":[]`, and stderr is empty

#### Scenario: Inside T3 Code on a system with no /proc
- **WHEN** the same command runs on a system with no `/proc`, where `ps -o ppid= -p <pid>` shows that the running T3 server is the process's ancestor
- **THEN** it exits 0, its JSON line has `"resolver":"t3"` and `"options":[]`, and stderr is empty

### Requirement: The T3 resolver opens a session in a T3 thread
Inside T3 Code, when `t3` answers `lets delegate review run` or `lets delegate handoff run`, it SHALL open a session in a T3 thread that runs the `--model`. It SHALL send the model part of `--model` to T3 unchanged. For a `gemini` model, it SHALL send no effort, because T3 offers no effort option for Gemini; a review's `--effort` does not apply.

A bare family SHALL run a model from T3's catalogue, chosen from that family's provider instance, when `t3` lists that instance (see "The T3 resolver lists the models T3 Code can run now"):
- the visible model that the catalogue marks as the default;
- or else, when no visible model is the default, the first visible model.

A visible model is one the user has not hidden in T3 Code. A custom model is always visible. For `gemini`, the chosen model SHALL have its `-low`, `-medium` or `-high` suffix removed.

#### Scenario: A review inside T3 Code
- **WHEN** the config's `delegate.resolvers` is `[t3]`, the user runs `lets delegate review run --for code --model claude/claude-opus-5-5` inside T3 Code, and the session ends with a final message
- **THEN** the thread runs `claude-opus-5-5`, the command exits 0, and its JSON line on stderr has `"family":"claude"` and a `handle` of kind `thread`

#### Scenario: A handoff inside T3 Code
- **WHEN** the config's `delegate.resolvers` is `[t3]`, the user runs `lets delegate handoff run --for apply --model gpt/gpt-6-luna` inside T3 Code, and the project has a default model of `claude-opus-5-5`
- **THEN** the thread runs `gpt-6-luna`

#### Scenario: A gemini review runs the model as given
- **WHEN** the config's `delegate.resolvers` is `[t3]` and the user runs `lets delegate review run --for plan --effort medium --model gemini/gemini-4-argon` inside T3 Code
- **THEN** the thread runs `gemini-4-argon`, with no effort option

#### Scenario: A bare family runs the catalogue's default
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `codex` with `gpt-6-luna` and a default of `gpt-5.6-terra`
- **AND** T3's `model-manifest.json` gives `codex` no default, and the user runs `lets delegate handoff run --for apply --model gpt` inside T3 Code
- **THEN** the thread runs `gpt-5.6-terra`

#### Scenario: A bare family with no default runs the first visible model
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `codex` with `gpt-5.6-terra` as its default, then `gpt-6-luna`
- **AND** the user has hidden `gpt-5.6-terra` in T3 Code, and runs `lets delegate handoff run --for apply --model gpt` inside T3 Code
- **THEN** the thread runs `gpt-6-luna`

#### Scenario: A bare gemini review runs the default without its effort
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `antigravity` with a default of `gemini-3.8-flash-high`
- **AND** the user runs `lets delegate review run --for plan --effort low --model gemini` inside T3 Code
- **THEN** the thread runs `gemini-3.8-flash`, with no effort option

#### Scenario: A bare gemini handoff runs the default without its effort
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `antigravity` with a default of `gemini-3.8-flash-high`
- **AND** the user runs `lets delegate handoff run --for apply --model gemini` inside T3 Code
- **THEN** the thread runs `gemini-3.8-flash`, with no effort option

## ADDED Requirements

### Requirement: The T3 resolver lists the models T3 Code can run now
Inside T3 Code, `t3` SHALL list its `options` from the model catalogue that the running T3 server gives its composer. It SHALL NOT read T3's `model-manifest.json`.

It SHALL list a provider instance only when all of these hold:
- the instance is enabled;
- its status is `ready` or `warning`;
- T3 does not mark it `unavailable`;
- its id is `codex`, `claudeAgent` or `antigravity`, the instances that `t3` runs the families `gpt`, `claude` and `gemini` on.

It SHALL list the instances in the catalogue's order. For each one, it SHALL list `<family>/<model>` for each visible model, with any visible default model first. A visible model is one the user has not hidden in T3 Code, and a custom model is always visible. It SHALL list each `gemini` model once, with any `-low`, `-medium` or `-high` suffix removed. It SHALL skip a model whose id is empty or holds white space, after any suffix is removed.

#### Scenario: Reading the catalogue
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and every instance in the catalogue is enabled and `ready`
- **AND** the catalogue lists `codex` with `gpt-6-luna` and a default of `gpt-5.6-terra`, then `claudeAgent` with `claude-opus-5-5` and a default of `claude-fable-5-1`, then `antigravity` with `gemini-4-argon` and `gemini-3.8-flash`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gpt/gpt-5.6-terra","gpt/gpt-6-luna","claude/claude-fable-5-1","claude/claude-opus-5-5","gemini/gemini-4-argon","gemini/gemini-3.8-flash"]`

#### Scenario: Disabled and failing instances
- **WHEN** the catalogue lists `codex` disabled with `gpt-6-luna`, `claudeAgent` with status `error` and `claude-opus-5-5`, and `antigravity` with status `warning` and `gemini-4-argon`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gemini/gemini-4-argon"]`

#### Scenario: An unavailable instance
- **WHEN** the catalogue lists `antigravity`, enabled and `ready`, with `gemini-4-argon`, and T3 marks it `unavailable`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":[]`

#### Scenario: Model ids that cannot run
- **WHEN** the catalogue lists `codex`, `ready`, with the custom models `my model` and `""`, then `gpt-6-luna`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gpt/gpt-6-luna"]`

#### Scenario: Hidden models
- **WHEN** the catalogue lists `claudeAgent`, `ready`, with `claude-opus-5-5`, the default `claude-opus-4-5`, and the custom model `claude-lab`
- **AND** the user has hidden `claude-opus-4-5` and `claude-lab` in T3 Code, and runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["claude/claude-opus-5-5","claude/claude-lab"]`

#### Scenario: An instance t3 does not run
- **WHEN** the catalogue lists `cursor`, then a second Codex instance `codex_work`, then `codex`, each enabled and `ready` with one model
- **AND** `codex` lists `gpt-6-luna`, and the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gpt/gpt-6-luna"]`

#### Scenario: Gemini models with an effort suffix
- **WHEN** the catalogue lists `antigravity`, `ready`, with `gemini-3.8-flash-high` and `gemini-3.8-flash-low`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gemini/gemini-3.8-flash"]`

#### Scenario: The manifest lists a model the catalogue lacks
- **WHEN** T3's `model-manifest.json` lists `codex` with `gpt-6-astra`, and the catalogue lists `codex`, `ready`, with only `gpt-6-luna`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** its JSON line has `"options":["gpt/gpt-6-luna"]`

### Requirement: The T3 resolver lists no models when T3 gives no catalogue
Inside T3 Code, `t3` SHALL list no `options` when it has no catalogue 10 seconds after it starts asking. The 10 seconds SHALL include issuing a token, requesting a ticket, and waiting for the reply. It SHALL also list no `options` when T3 refuses the request, or the reply holds no list of providers. In each case the command SHALL exit 0, and stderr SHALL say why `t3` lists no models.

#### Scenario: T3 does not reply
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the T3 server accepts the WebSocket but never replies
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** within 15 seconds it exits 0, its JSON line has `"options":[]`, and stderr says that T3 gave no model catalogue

#### Scenario: T3 does not answer the ticket request
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the T3 server never answers the request for a WebSocket ticket
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** within 15 seconds it exits 0, its JSON line has `"options":[]`, and stderr says that T3 gave no model catalogue

#### Scenario: T3 refuses the request
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and T3 refuses the WebSocket with the message `unsupported orchestration protocol`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** it exits 0, its JSON line has `"options":[]`, and stderr contains `unsupported orchestration protocol`

#### Scenario: The reply has another shape
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and T3 answers the catalogue request with `{"instances":[]}`
- **AND** the user runs `lets delegate review instructions --for code` inside T3 Code
- **THEN** it exits 0, its JSON line has `"options":[]`, and stderr says that T3 gave no model catalogue

### Requirement: The T3 resolver refuses a bare family T3 lists no model for
Inside T3 Code, when `--model` names a bare family, `t3` SHALL refuse that model in three cases:
- `t3` does not list the family's provider instance: it is missing, disabled, `unavailable`, or in status `error`;
- the instance has no visible model in the catalogue;
- `t3` has no catalogue 10 seconds after it starts asking.

It SHALL start no thread, and SHALL say why on stderr. When it refuses every `--model`, the command exits 3.

#### Scenario: No visible model
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `codex` with no models
- **AND** the user runs `lets delegate handoff run --for apply --model gpt` inside T3 Code
- **THEN** it exits 3, stderr names `codex`, and T3 receives no request to start a thread

#### Scenario: A failing instance
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the catalogue lists `claudeAgent` with status `error` and a default of `claude-fable-5-1`
- **AND** the user runs `lets delegate handoff run --for apply --model claude --model gpt` inside T3 Code, and the catalogue lists `codex`, `ready`, with `gpt-6-luna`
- **THEN** T3 receives one request to start a thread, and that thread runs `gpt-6-luna`

#### Scenario: No catalogue
- **WHEN** the config's `delegate.resolvers` is `[t3]`, and the T3 server never replies to the catalogue request
- **AND** the user runs `lets delegate handoff run --for apply --model claude` inside T3 Code
- **THEN** within 15 seconds it exits 3, stderr says that T3 gave no model catalogue, and T3 receives no request to start a thread

## REMOVED Requirements

### Requirement: The T3 resolver lists the models in its manifest
**Reason**: T3's downloaded model manifest is not the catalogue the composer offers. It listed models T3 Code could not run, and left out models it could.
**Migration**: None for callers, because `options` keeps its shape. "The T3 resolver lists the models T3 Code can run now" replaces this requirement, and lists from the running T3 server's catalogue instead.
