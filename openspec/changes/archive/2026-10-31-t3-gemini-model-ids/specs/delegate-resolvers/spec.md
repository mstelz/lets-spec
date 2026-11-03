## MODIFIED Requirements

### Requirement: The T3 resolver opens a session in a T3 thread
Inside T3 Code, when `t3` answers `lets delegate review run` or `lets delegate handoff run`, it SHALL open a session in a T3 thread that runs the `--model`. It SHALL send the model part of `--model` to T3 unchanged. A bare family SHALL run that provider's default model, and for `gemini` that default SHALL have its `-low`, `-medium` or `-high` suffix removed. For a `gemini` model, it SHALL send no effort, because T3 offers no effort option for Gemini; a review's `--effort` does not apply.

#### Scenario: A review inside T3 Code
- **WHEN** the config's `delegate.resolvers` is `[t3]`, the user runs `lets delegate review run --for code --model claude/claude-opus-5-5` inside T3 Code, and the session ends with a final message
- **THEN** the thread runs `claude-opus-5-5`, the command exits 0, and its JSON line on stderr has `"family":"claude"` and a `handle` of kind `thread`

#### Scenario: A handoff inside T3 Code
- **WHEN** the config's `delegate.resolvers` is `[t3]`, the user runs `lets delegate handoff run --for apply --model gpt/gpt-6-luna` inside T3 Code, and the project has a default model of `claude-opus-5-5`
- **THEN** the thread runs `gpt-6-luna`

#### Scenario: A gemini review runs the model as given
- **WHEN** the config's `delegate.resolvers` is `[t3]` and the user runs `lets delegate review run --for plan --effort medium --model gemini/gemini-4-argon` inside T3 Code
- **THEN** the thread runs `gemini-4-argon`, with no effort option

#### Scenario: A bare gemini review runs the default without its effort
- **WHEN** the config's `delegate.resolvers` is `[t3]`, T3's manifest gives `antigravity` a default chat model of `gemini-3.8-flash-high`, and the user runs `lets delegate review run --for plan --effort low --model gemini` inside T3 Code
- **THEN** the thread runs `gemini-3.8-flash`, with no effort option

#### Scenario: A bare gemini handoff runs the default without its effort
- **WHEN** the config's `delegate.resolvers` is `[t3]`, T3's manifest gives `antigravity` a default chat model of `gemini-3.8-flash-high`, and the user runs `lets delegate handoff run --for apply --model gemini` inside T3 Code
- **THEN** the thread runs `gemini-3.8-flash`, with no effort option
