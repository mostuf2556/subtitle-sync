# Token Economy Architecture & Task Decomposition Protocol (`docs/tokens.md`)

Lightweight operational protocol for maximizing token usage efficiency across all prompts without context bloat.

---

## 1. The Token Economy Problem: Why Big Tasks Fail

1. **Context Bloat & Token Exhaustion**: Loading massive files, long task histories, and sprawling outputs burns context windows.
2. **Abrupt Execution Termination**: Running out of tokens mid-turn leaves unfinished edits and a broken repository.
3. **Compound Regression Cascades**: Changing multiple subsystems simultaneously makes diagnosis expensive in tokens.
4. **Waste of Prior Token Expenditure**: Without incremental git commits and task checkpoints, failures wipe out prior progress.

---

## 2. Granular Decomposition Maximizes Token Efficiency

> **Golden Rule**: Break every user prompt into small, isolated sub-tasks and stage `current-sub-task.md` on **every single prompt**.

- **Token Input is Minimized**: Load only files and line slices strictly relevant to the active sub-task.
- **Token Output is Bounded**: Code edits are targeted and verified immediately.
- **Progress is Checkpointed**: Completed sub-tasks are committed to Git (logged in `docs/git.md`) and moved to `docs/done.md`.
- **Context Stays Crisp**: Each step maintains a single, verifiable goal with the cheapest discriminating check.
- **Rules & Configuration Economy**: Keep `AGENTS.md` under 20 KB (hard budget <= 21,000 bytes) and this file under 12 KB (< 200 lines); see [`docs/suggestions.md`](suggestions.md).

---

## 3. Mandatory Task Management File Protocol

| File | Purpose | Retention |
| :--- | :--- | :--- |
| `docs/tokens.md` | Protocol specification for token economy and task decomposition. | Permanent (< 12 KB) |
| `docs/tasks.md` | Master backlog of active, pending, and upcoming numbered tasks and sub-tasks. | Active backlog only |
| `docs/tasks-index.md` | High-level map of milestones linking `docs/tasks.md` and `docs/done.md`. | Permanent index |
| `current-sub-task.md` | Strictly focused staging of the single sub-task currently being executed. | Active state (< 2 KB) |
| `temp.md` | Ephemeral scratchpad for intermediate notes, checklists, or diff drafts. | Ephemeral / cleared |
| `docs/todo.md` | Concise mirror of the single active sub-task. | Active mirror (< 2 KB) |
| `docs/done.md` | Permanent verified archive of completed tasks and test outcomes. | Append-only archive |
| `docs/git.md` | Per-sub-task log of `git commit` / `git push` checkpoints or skip reasons. | Checkpoint log |
| `docs/self-verification.md` | Automated verification suite and release sanity-check protocol. | Permanent spec |
| `docs/suggestions.md` | Optimization steps, byte budgets, and feasibility analysis for `AGENTS.md`. | Permanent spec |

---

## 4. Step-by-Step Prompt Execution Flow

```
[Prompt] -> 1. Stage sub-tasks in docs/tasks.md, current-sub-task.md, docs/todo.md
         -> 2. Implement ONLY the active sub-task (use temp.md for scratch)
         -> 3. Run dedicated test + compile_applet + lint_applet
         -> 4. Git commit & push checkpoint (log in docs/git.md)
         -> 5. Move to done.md -> More sub-tasks? -> [YES: loop] / [NO: Audit Gate]
```

### Recovery After an Interrupted Session

- Read `AGENTS.md` (`## Resume after interruption`), `current-sub-task.md`, `docs/todo.md`, and active entries in `docs/tasks.md`.
- Inspect `git status` / `git diff` (when `.git` exists) before editing; preserve uncommitted work and verify against `docs/done.md` before resuming.

### Protocol Requirements

- **Activate Token Economy on Prompt Entry**: Acknowledge `docs/tokens.md` quickly; never begin un-staged source edits.
- **Numbered Prompt Routing**: Create one ordered backlog task per numbered user chapter; keep deferred items in `## Later Tasks` / `docs/later.md`.
- **Move to done.md and Cycle**: Move the completed subtask/task completely out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md`, and keep `docs/tasks.md` strictly as the active backlog of pending and upcoming items.
- **Prompt Completion Audit Gate**: Before finishing any prompt, verify that EVERY task and subtask planned for the prompt is implemented, tested, committed/logged, and recorded in `docs/done.md`.

---

## 5. Hotfix Workflow: Keeping Active Tasks on Hold

1. **SUSPEND ACTIVE TASK**: Mark the active item in `current-sub-task.md` as `[ON HOLD]` with resumption notes.
2. **STAGE HOTFIX**: Add `Hotfix: <issue>` to `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
3. **EXECUTE IN ISOLATION**: Apply minimal fix, run dedicated test, `compile_applet`, and `lint_applet`.
4. **COMMIT & MIGRATE**: Commit (`fix(hotfix): <desc>`), attempt push, log in `docs/git.md`, and move into `docs/done.md` under `### Hotfix: <issue>`.
5. **RESUME SUSPENDED TASK**: Restore the held item to active status and continue.

---

## 6. Token Optimization Guidelines

- **Smart Read-Before-Write & Bounded Slices**: Never read entire huge files (`docs/done.md`, `docs/files.md`, `prompt_history.md`, or `src/routes/index.tsx`) when `StartLine`/`EndLine`, `tail`, or `grep` suffices.
- **Zero Completed-History Bloat**: Never append completed task summaries into `docs/tokens.md`, `current-sub-task.md`, or `docs/todo.md` — archive them strictly in `docs/done.md`.
- **One Sub-Task at a Time**: Never combine multiple unverified features.
- **Default Mode Coverage**: Apply shared behavior/settings changes across Beginner and Advanced modes per `AGENTS.md`.
- **Fail Fast, Fix Fast**: Diagnose failures locally with the cheapest discriminating test before running broad suites.
- **Precedence**: This protocol governs agent task execution across all prompts.

---

## 7. Zero Task Overhead & Task Index Delegation

- **No Historical Task Logs in tokens.md**: `docs/tokens.md` strictly defines the operational efficiency protocol and contains zero historical prompt/task logs.
- **Delegation to `docs/tasks-index.md`**:
  - Active backlog lives in [`docs/tasks.md`](tasks.md); milestone map lives in [`docs/tasks-index.md`](tasks-index.md); completed archive lives in [`docs/done.md`](done.md).
- **Fast Agent Overview**: Keeping `docs/tokens.md` < 12 KB (< 200 lines) and `current-sub-task.md` / `docs/todo.md` < 2 KB saves > 13,000 input tokens per prompt boot.
