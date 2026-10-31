# Token Economy Architecture & Task Decomposition Protocol (tokens.md)

This document establishes the lightweight, high-efficiency operational protocol for maximizing token usage efficiency across all prompts and automated agent execution cycles without heavy processing overhead.

---

### Current Prompt Routing

Keep this file limited to the token-economy workflow, not per-prompt objectives or completion history. Stage numbered prompt items and their verification criteria in [`docs/tasks.md`](tasks.md), and keep only the current subtask in [`current-sub-task.md`](../current-sub-task.md).

---

## 1. The Token Economy Problem: Why Big Tasks Fail

In complex full-stack applications, processing broad or monolithic tasks directly in a single sprawling execution pass leads to critical failure modes:

1. **Context Bloat & Token Exhaustion**: Loading massive files, long task histories, and sprawling outputs rapidly burns context windows.
2. **Abrupt Execution Termination**: Running out of tokens mid-turn leaves unfinished edits and a broken repository.
3. **Compound Regression Cascades**: Changing multiple distinct subsystems simultaneously makes diagnosis expensive in tokens.
4. **Waste of Prior Token Expenditure**: Without incremental git commits and task checkpoints, any subsequent failure wipes out prior progress.

---

## 2. The Core Principle: Granular Decomposition Maximizes Token Efficiency

Current task state is maintained in `current-sub-task.md`; this protocol contains no task history.

> **Golden Rule**: **Always break every user prompt into small, isolated sub-tasks and stage `current-sub-task.md` on every step.**

- **Token Input is Minimized**: Load only files strictly relevant to the active sub-task.
- **Token Output is Bounded**: Code edits are targeted and verified immediately.
- **Progress is Checkpointed**: Completed sub-tasks are committed to Git and logged in `docs/done.md`.
- **Context Stays Crisp**: Each step maintains a single, verifiable goal.
- **Validation is Discriminating**: Stage one falsifiable behavior hypothesis and the cheapest focused check alongside each active sub-task.
- **Experiments are Reusable**: Record environment, exact command, observed failure or result, resolution, and limitations in the relevant runbook.
- **Rules & Configuration Economy**: Keep top-level instruction files like `AGENTS.md` lean (< 20KB) to prevent platform rule truncation and wasted context window tokens. Detailed optimization guidelines live in [`docs/suggestions.md`](suggestions.md).

---

## 3. Mandatory Task Management File Protocol

To guarantee token economy without heavy processing, maintain the following files on **every single prompt**:

| File                        | Purpose                                                                                                                                            | Retention               |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------- |
| `docs/tokens.md`            | Protocol specification defining the token economy and task decomposition rules.                                                                    | Permanent specification |
| `docs/tasks.md`             | Master backlog of active, pending, and upcoming numbered tasks and sub-tasks across the project. Completed items are migrated to `docs/done.md`.   | Active backlog          |
| `docs/tasks-index.md`       | High-level index of project milestones and links to backlog & completed archives.                                                                  | Permanent index         |
| `current-sub-task.md`       | **Strictly focused staging of the single sub-task currently being executed.** Updated on every single step.                                        | Active state indicator  |
| `temp.md`                   | **Ephemeral scratchpad** for drafting file edits, temporary checklists, raw diffs, or intermediate calculations. Avoids cluttering permanent docs. | Ephemeral / Scratchpad  |
| `docs/todo.md`              | High-level active sub-task synchronization mirror.                                                                                                 | Single active task      |
| `docs/done.md`              | Permanent verified changelog and archive of all completed tasks and sub-tasks.                                                                     | Permanent archive / log |
| `docs/self-verification.md` | Comprehensive self-verification protocol for automated test execution, screencast linking in README, and full sanity check audits.                 | Permanent specification |
| `docs/suggestions.md`       | Ranked optimization steps, feasibility analysis, and rule size monitoring guidelines for instruction files.                                        | Permanent specification |

---

## 4. Step-by-Step Prompt Execution Flow

```
[Prompt Received] ──► 1. Process tokens.md (lean preface)
        │
        ▼
2. Decompose prompt into numbered sub-tasks in docs/tasks.md
        │
        ▼
3. Stage single active sub-task in current-sub-task.md & docs/todo.md (use temp.md for draft notes)
        │
        ▼
4. Implement atomic changes for ONLY the active sub-task
        │
        ▼
5. Run dedicated test & compile verification (compile_applet, lint_applet)
        │
        ▼
6. Git commit checkpoint & attempt git push
        │
        ▼
7. Move completed tasks/sub-tasks to docs/done.md (keep docs/tasks.md clean)
        │
        ▼
   More sub-tasks? ──► [YES] ──► Advance current-sub-task.md
        │ [NO]
        ▼
8. Prompt Completion Audit Gate: Verify EVERY task is complete & tested; clean temp.md
```

### Recovery After an Interrupted Session

- On resumption, read `AGENTS.md`'s `## Resume after interruption` section first, then inspect `current-sub-task.md`, `docs/todo.md`, and the active entries in `docs/tasks.md`.
- Treat `git status` and the relevant `git diff` as authoritative evidence of uncommitted work. Preserve existing edits; do not reset, overwrite, or assume they are complete.
- Record the exact next action, validation still needed, and any blockers in `current-sub-task.md` before continuing. If the active state is missing or inconsistent, reconcile it from the task backlog, scratchpad, and worktree, and explicitly note any uncertainty rather than guessing.
- Do not resume an item already marked complete in `docs/done.md`; reconcile stale backlog or mirror entries against the archived verification record before selecting the next task.
- Update `AGENTS.md`'s `## Last raw prompt` only with the exact latest user message; do not use that section as a substitute for durable task progress notes.

### Protocol Requirements:

- **Activate Token Economy on Prompt Entry**: Acknowledge `tokens.md` as an ultra-fast preface; never begin un-staged source edits.
- **Atomic Sub-tasks in Backlog**: Numbered sub-tasks belong in `docs/tasks.md`.
- **Numbered Prompt Routing**: Create one ordered backlog task per numbered user item; put explicitly deferred items only in the Later Tasks sections, and stage the earliest active item before implementation.
- **Requested Commit/Push**: When explicitly requested, commit and push only after all active tasks pass focused validation and required build/lint checks; never rewrite published history.
- **Stage `current-sub-task.md`**: Focus exclusively on the active sub-task.
- **Move to done.md and Cycle**: Move the completed subtask/task completely out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md`. keep `docs/tasks.md` strictly as the active backlog of pending and upcoming items.
- **Prompt Completion Audit Gate**: Before completing any prompt, verify that EVERY task and subtask planned for the prompt has been fully implemented, tested with a dedicated test, marked complete `[x]`, and recorded in `docs/done.md`.

---

## 5. Hotfix Workflow: Keeping Active Tasks on Hold

When an unexpected defect, broken build, regression, or failing CI flow arises during active development:

1. **SUSPEND ACTIVE TASK**: Place the active task/sub-task in `current-sub-task.md` **ON HOLD** (marked `[ON HOLD]`).
2. **STAGE HOTFIX**: Create `Hotfix: <issue>` in `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
3. **EXECUTE IN ISOLATION**: Implement minimal targeted fix, verify with dedicated test, compile, and lint.
4. **COMMIT & MIGRATE**: Commit checkpoint (`fix(hotfix): <description>`), attempt push, and move hotfix out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md` under `### Hotfix: <issue>`.
5. **RESUME SUSPENDED TASK**: Restore held subtask to active status in `current-sub-task.md` and resume execution.

---

## 6. Token Optimization Guidelines

- **Smart Read-Before-Write**: Never view entire files when a targeted slice is sufficient.
- **One Sub-Task at a Time**: Never combine multiple unverified features.
- **Default Mode Coverage**: Follow [`AGENTS.md`](../AGENTS.md): unless explicitly scoped otherwise, apply behavior and settings changes to Beginner and Advanced modes and test both.
- **Fail Fast, Fix Fast**: Diagnose issues locally within the active subtask scope.
- **Precedence**: This lightweight workflow governs agent task execution across all prompts.

---

## 7. Zero Task Overhead & Task Index Delegation

- **No Historical Task Logs in tokens.md**: `docs/tokens.md` strictly defines the operational efficiency protocol and contains zero task logs.
- **Delegation to tasks.md & tasks-index.md**:
  - Active prompt backlog is staged exclusively in [`docs/tasks.md`](tasks.md).
  - High-level project milestones are indexed in [`docs/tasks-index.md`](tasks-index.md).
  - Permanent completed archives reside exclusively in [`docs/done.md`](done.md).
- **Fast Agent Overview**: The agent reviews this concise specification in seconds using minimal tokens before jumping into action.
