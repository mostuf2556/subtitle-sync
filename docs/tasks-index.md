# Project Tasks Index (`docs/tasks-index.md`)

High-level map of project milestones cleanly separating task navigation from `docs/tokens.md`.

---

## Active & Pending Tasks

- **Active Backlog**: [`docs/tasks.md`](tasks.md) — active, pending, and upcoming prompt tasks (plus `## Later Tasks`).
- **Active Staging Indicator**: [`current-sub-task.md`](../current-sub-task.md) (mirrored in [`docs/todo.md`](todo.md)) — single sub-task currently being executed.

---

## Completed Tasks Archive

All completed tasks, summaries, and test outcomes live permanently in [`docs/done.md`](done.md).

### High-Level Milestone Groupings in `docs/done.md`:

1. **Core TimedText Caption Discovery & Interception (Tasks 1–40)**: JSON3 interception, WebView bridge, OkHttp replay.
2. **Subtitle Parsing, Phonetic Alignment & Punctuation (Tasks 41–70)**: Multi-language tokenization, boundary splitting, RTL/BiDi.
3. **Android Shell & Emulator E2E Suite (Tasks 71–95)**: Native OkHttp, UA sanitization, API 34 emulator & screenrecord.
4. **Reliable Fetching, Anti-Bot & Fallback Strategies (Tasks 96–115)**: `tlang` vs `lang`, jitter pacing, cache gates.
5. **UI Architecture, Playground & Multi-Language Viewer (Tasks 116–122)**: Video Playground, web-demo input bar, custom URLs.
6. **Token Economy, Beginner/Advanced Parity & Listening Game (Tasks 123–428)**: Lean `docs/tokens.md`, Storybook-first workflow, Learning Goals filters, OpenRouter integration, persistent player across tabs, auto-scroll fixes, and boot-doc pruning.

---

## Agent Guidance

- **Token Efficiency**: Do NOT read full task histories (`docs/done.md`, `docs/files.md`, `prompt_history.md`) during routine turns.
- **Bounded Slice Reads**: Always inspect only targeted line windows (`StartLine`/`EndLine`, `tail`, or `grep`) when checking `docs/done.md`, `docs/files.md`, or `prompt_history.md`.
