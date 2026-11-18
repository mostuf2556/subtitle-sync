# AGENTS.md Optimization Suggestions & Feasibility Analysis (`docs/suggestions.md`)

This document catalogs actionable optimization steps, priority rankings, feasibility assessments, and token-budget recommendations for keeping `AGENTS.md`, `docs/tokens.md`, and active task-tracking files lean beneath platform limits while guaranteeing 100% compliance with automated verification suites.

---

## 1. Context & Motivation

### The 24KB Rule Limit

In Google AI Studio Build environments, rules defined in repository rule files (such as `AGENTS.md`) are automatically ingested into the system prompt prefix under `<RULE[AGENTS_md]>`.

- **Platform Limit**: Files exceeding **24,576 bytes (24 KB)** are hard-truncated by the environment:
  `[TRUNCATED: This file exceeded the 24KB rule limit. Content beyond this point was omitted.]`
- **Consequence of Truncation**: When `AGENTS.md` exceeded 24 KB in earlier revisions, critical directives at the bottom of the file (including Subtitles Caching rules and `## Last raw prompt`) were omitted from the active agent system prompt, increasing token cost and risking context loss.
- **Target Size**: Maintain `AGENTS.md` strictly under **21,000 bytes (< 20.5 KB)** (ideally < 15 KB), leaving well over **3,576 bytes of safety headroom** for new raw user prompts.

---

## 2. Optimization Steps Ordered by Urgency and Importance

The following optimization steps are ordered hierarchically by urgency and importance.

### Priority 1 (Level: Critical Urgency | Critical Importance)

#### Step 1: Streamline Verbose Narrative Prose & Redundant Theoretical Descriptions

- **Description**: Condense wordy narrative explanations, redundant theoretical justifications, and duplicate rationale into concise, high-density bullet directives.
- **Feasibility**: **Bullet-proof (Recommended to Implement)**.
- **Implementation Status**: **Fully Implemented** (further tightened from ~19.5 KB down to ~12.1 KB in Task 428, giving >11.7 KB of headroom below the 24 KB limit).
- **Action**: Keep all directives actionable, imperative, and minimal.

---

### Priority 2 (Level: High Urgency | Critical Importance)

#### Step 2: Strict Keyword & Assertion Contract Preservation

- **Description**: Ensure that any trimming or refactoring strictly retains 100% of the exact section headers, keywords, and text fragments asserted by the project's automated verification suites.
- **Feasibility**: **Bullet-proof (Mandatory Requirement)**.
- **Implementation Status**: **Fully Implemented** (`npm run test:agents-all` executes all 23 constitutional contract checks).
- **Audited Assertions Preserved**:
  1. `verify-agents-last-prompt-rule.ts`: `Always keep last raw prompt in AGENTS.md` and `## Last raw prompt`.
  2. `verify-agents-push-rule.ts`: `After git commit, try using git push` and `Enforce updating .md tracking files first before action`.
  3. `verify-agents-subtitles-spec.ts`: `Subtitles fetch fallback strategy`, `` `lang` replacement vs `tlang` parameterization ``, `Anti-bot strategy for YouTube API execution`, `Request validation & "Good" response criteria`, `Caching mechanism & invalidation rules`, `isValidJsonSubtitleResponse`.
  4. `verify-agents-version-rule.ts`: `the app version number must not stay 1.0 always`.
  5. `verify-android-e2e-spec.ts`: `Android app E2E validation, screencast video & GitHub Pages reporting`, `screenrecord`, `pkill -2`, `android.md`.
  6. `verify-application-stages-pipeline.ts`: `Application stages pipeline & execution order`, Stages 1–7 headers, `Special characters removal MUST happen BEFORE the translation stage`, `Absolute Parity Rule Between Advanced and Beginner Modes`.
  7. `verify-code-modularity-standards.ts`: `## Code architecture, modularity, and standards`, `Avoid single-file overload`, `index.tsx`, `Component decomposition discipline`, `src/components/`, `Custom hooks and state isolation`, `src/hooks/`.
  8. `verify-hotfix-and-done-workflow.ts`: `Mandatory migration to \`docs/done.md\``, `Prompt task completion audit`, `EVERY task and subtask planned for the prompt`, `Hotfix workflow with task suspension`, `Suspend current task`, `ON HOLD`, `Resume held task`.
  9. `verify-no-duplicate-md-files.ts`: `Mandatory location of all .md files under \`docs/*.md\` & zero duplicates policy`, `ZERO duplicate \`.md\` files`, `docs/tokens.md`, `docs/android.md`.
  10. `verify-numbered-chapters-protocol.ts`: `Numbered chapters as serial tasks protocol`, `numbered chapters`, `sub-tasks`, `serially`.
  11. `verify-readme-git-sync-rule.ts`: `README.md is to be created by GitHub Actions`, `do not copy it when syncing git`, `update-readme.yml`, `update-readme.mjs`.
  12. `verify-subtitles-fixtures-restriction.ts`: `Subtitles fixtures restriction & zero hardcoded subtitles policy`, `L2Ryrr6txwA`, `public/fixtures/L2Ryrr6txwA`, `Zero hardcoded subtitles policy`.
  13. `verify-task-management-workflow.ts`: `Move completed tasks and sub-tasks completely out of \`current-sub-task.md\`, \`docs/todo.md\`, and \`docs/tasks.md\` directly into \`docs/done.md\``, `` `docs/tasks.md` is strictly an active backlog containing ONLY pending, active, and upcoming tasks ``.
  14. `verify-tokens-economy.ts`: `tokens.md`, `current-sub-task.md`.
  15. `verify-web-demo-design-preservation.ts`: `Strict UI & Web-Demo Design Preservation Mandate`, `NEVER alter, redesign, replace, re-theme, or disrupt`, `without explicit user confirmation and request`.
  16. `verify-same-components-parity-policy.ts`, `verify-agents-git-log-rule.ts`, `verify-pending-prs-rule.ts`, `verify-no-more-tasks-go-on-rule.ts`, `verify-parallel-agent-coordination.ts`, `verify-parallel-planning-mode.ts`.

---

### Priority 3 (Level: High Urgency | High Importance)

#### Step 3: Offload Deep Technical Specifications to `docs/*.md` Reference Pointers

- **Description**: Treat `AGENTS.md` as a lightweight rule constitution, delegating comprehensive technical specifications to dedicated Markdown documents under `docs/*.md`.
- **Feasibility**: **Bullet-proof (Recommended to Implement)**.
- **Implementation Status**: **Fully Implemented**.
- **Canonical Destinations**: `docs/reliable-subtitles-fetching.md`, `docs/cache.md`, `docs/auto-retry.md`, `docs/android.md`, `docs/parser.md`, `docs/tokens.md`.

---

### Priority 4 (Level: High Urgency | High Importance)

#### Step 4: Automated Size Budget Guard & Headroom Assertion

- **Description**: Enforce `AGENTS.md` <= 21,000 bytes with >= 3,576 bytes of headroom (`npm run test:agents-size-budget`), plus `docs/tokens.md` < 12,000 bytes and `current-sub-task.md` / `docs/todo.md` < 4,000 bytes (`npm run test:lean-tokens`).
- **Feasibility**: **Bullet-proof (Recommended to Implement)**.
- **Implementation Status**: **Fully Implemented**.

---

### Priority 5 (Level: High Urgency | High Importance)

#### Step 5: Unified AGENTS.md Contract Test Suite Runner

- **Description**: Single consolidated test runner (`scripts/verify-agents-all.ts` / `npm run test:agents-all`) running all 23 AGENTS.md contract verification scripts.
- **Feasibility**: **Bullet-proof (Recommended to Implement)**.
- **Implementation Status**: **Fully Implemented**.

---

### Priority 6 (Level: High Urgency | High Importance)

#### Step 6 (New — Task 428): Prune Completed-History Bloat from Boot Docs & Enforce Slice-Only Log Reads

- **Description**: Prevent recurring prompt-boot bloat in `docs/tokens.md` (which had ballooned to 43.6 KB with historical prompt summaries), `current-sub-task.md` (10.2 KB), and `docs/todo.md` (8.9 KB), and prohibit reading full append-only logs (`docs/done.md` > 1.1 MB, `docs/files.md` > 187 KB, `prompt_history.md` > 135 KB) during routine turns.
- **Feasibility**: **Bullet-proof (Recommended to Implement)**.
- **Implementation Status**: **Fully Implemented (Task 428)** — saves ~59 KB (~14,700 input tokens) per prompt boot and keeps `test:lean-tokens` green.

---

### Priority 7 (Level: Medium Urgency | Medium Importance)

#### Step 7: Extract Application Stages Pipeline & Anti-Bot Tables Entirely Out of AGENTS.md

- **Description**: Relocating Stage 1–7 definitions and Subtitle Anti-Bot / Good Response criteria completely out of `AGENTS.md`.
- **Feasibility**: **NOT Bullet-Proof (HIGH REGRESSION RISK)**.
- **Recommendation**: **PARTIALLY IMPLEMENT ONLY (Do NOT fully extract)** — keep compact single-sentence keyword anchors in `AGENTS.md` so CI verifiers remain green.

---

### Priority 8 (Level: Low Urgency | Low Importance)

#### Step 8: Aggressively Truncate or Summarize `## Last raw prompt`

- **Description**: Truncating long user prompts or replacing the raw prompt with an abbreviated excerpt.
- **Feasibility**: **NOT Bullet-Proof (HIGH COMPLIANCE RISK)**.
- **Recommendation**: **SKIP ENTIRELY (Do NOT implement)** — violates `verify-agents-last-prompt-rule.ts`.

---

## 3. Decision Matrix & Action Summary

| Step # | Proposed Optimization | Urgency | Importance | Bullet-Proof? | Action Taken / Recommendation |
| :----: | :--- | :---: | :---: | :---: | :--- |
| **1** | Condense narrative prose & theory | Critical | Critical | **Yes** | **Fully Implemented** (~19.5 KB -> ~12.1 KB) |
| **2** | Preserve all 23 test suite assertion strings | High | Critical | **Yes** | **Fully Implemented** (100% tests pass) |
| **3** | Delegate deep specs to `docs/*.md` pointers | High | High | **Yes** | **Fully Implemented** |
| **4** | Automated size budget guards (`test:agents-size-budget`, `test:lean-tokens`) | High | High | **Yes** | **Fully Implemented** |
| **5** | Unified AGENTS contract test suite (`test:agents-all`) | High | High | **Yes** | **Fully Implemented** |
| **6** | Prune boot-doc completed bloat & enforce slice-only log reads | High | High | **Yes** | **Fully Implemented (Task 428)** (saved ~59 KB/boot) |
| **7** | Extract Stage 1–7 pipeline entirely out of `AGENTS.md` | Medium | Medium | **No** | **Partially Implemented** (kept keyword anchors) |
| **8** | Truncate / summarize `## Last raw prompt` | Low | Low | **No** | **Skipped** (preserves raw prompt contract) |

---

## 4. Maintenance Guidelines

1. **Automated Budget Guards**: Run `npm run test:agents-size-budget` and `npm run test:lean-tokens` on every turn that edits `AGENTS.md`, `docs/tokens.md`, `current-sub-task.md`, or `docs/todo.md`.
2. **Unified Contract Verification**: Run `npm run test:agents-all` before completing any prompt that alters rules or documentation contracts.
3. **Slice-Only Log Reads**: Never call full-file reads on `docs/done.md`, `docs/files.md`, or `prompt_history.md`; use `StartLine`/`EndLine`, `tail`, or `grep`.
4. **Docs Hygiene**: Place all supporting analysis under `docs/*.md` and never duplicate files in the root directory.

---

## 5. Current Backlog Policy

- Keep `docs/tasks.md` strictly for active/upcoming prompt tasks and `## Later Tasks` (mirrored in `docs/later.md`).
- Move completed tasks out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md` immediately upon verification.
