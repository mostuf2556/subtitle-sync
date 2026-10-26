<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Subtitles fetching (read first)

- The subtitle fetch design (attempt order, session vs link-only sending, refetch buttons, web demo = local fixtures only) lives in [docs/reliable-subtitles-fetching.md](docs/reliable-subtitles-fetching.md). Follow it for any change to subtitle fetching.

## Codespaces, Docker, and E2E runbooks (read before running)

- Before running or troubleshooting these workflows, read [docs/codespace.md](docs/codespace.md), [docs/docker.md](docs/docker.md), and [docs/e2e.md](docs/e2e.md). Follow [docker/manage.sh](docker/manage.sh) for containerized Playwright runs and the detailed [docs/docker-e2e.md](docs/docker-e2e.md) and [docs/e2e-android.md](docs/e2e-android.md) guides for specific suites.
- When an experiment fails or succeeds, record its environment, exact command, observed result, resolution, and remaining limitations in the relevant runbook so future attempts do not repeat diagnosed failures.

## Subtitles fixtures restriction & zero hardcoded subtitles policy

- **Single permitted fixture video and directory**: The ONLY subtitles fixtures this application will ever have is strictly for video `L2Ryrr6txwA` and located strictly at `public/fixtures/L2Ryrr6txwA`. No other video ID, path, or directory may ever contain, bundle, or use static subtitle fixtures.
- **Mandatory fixture labelling and explicit developer approval**: Never ever show, load, or render any subtitle fixtures without explicitly writing/labeling that it is a fixture (e.g., `[Fixture]` badge or label). Fixtures may only ever be displayed after the developer has approved it explicitly.
- **Zero hardcoded subtitles policy**: All hardcoded subtitles, static cue arrays, and static translation maps are strictly prohibited in `src/config` (such as `src/config/fixtures.ts`, `src/config/appConfig.ts`) and everywhere else across the application runtime codebase. Video items in `DEFAULT_LIBRARY_ITEMS` and initial application state must have empty cues (`cues: []`), relying on authentic dynamic timedtext fetching or explicitly approved fixtures for `L2Ryrr6txwA`.

## Application stages pipeline & execution order

The application processes and presents subtitles through a strict sequential pipeline:

1. **Stage 1: Acquisition & Interception**: Intercepts authentic YouTube `api/timedtext` network queries from native WebView player on Android, accepts direct user-entered subtitle URLs, or loads local fixtures strictly for video `L2Ryrr6txwA` from `public/fixtures/L2Ryrr6txwA` if explicitly approved.
2. **Stage 2: Validation & Schema Conformance**: Enforces HTTP 200, valid non-HTML JSON, YouTube `json3` structure (`events` with `tStartMs`, `dDurationMs`, `segs[].utf8`), and non-empty cues (`cuesCount > 0`). Rejects HTML error pages or malformed payloads.
3. **Stage 3: Special Characters Removal & Sanitization**:
   - **RESTRICT RULE: Special characters removal MUST happen BEFORE the translation stage.**
   - Strips speaker tags/brackets (`[Speaker 1]:`, `[Host]:`), sound/music indicators (`[Music]`, `[Applause]`, `(cheers)`), arrow markers (`>`, `>>`), HTML entities, zero-width characters, and normalizes excess whitespace.
4. **Stage 4: Sentence Boundary Detection & Punctuation Splitting**: Splits continuous stream cues into grammatical sentences using terminal punctuation (`.`, `!`, `?` or configured criteria) with linear time interpolation for start and duration.
5. **Stage 5: Translation Stage**: Translates clean sentence text into target languages via `tlang` fallback, on-demand AI translation, or secondary track alignment. Operates strictly AFTER Stage 3 (Special Characters Removal).
6. **Stage 6: Multi-Language Alignment & Grid Formulation**: Synchronizes target language tracks with the base language track into parallel sentence rows. Formats aligned text side-by-side.
7. **Stage 7: Audio Playback Coordination & TTS Synthesis**: Highlights active sentences during video playback. Coordinates video pauses between sections to allow Web Speech or Alternative TTS voices to complete speech synthesis before resuming playback.

### Absolute Parity Rule Between Advanced and Beginner Modes:

- The processing rules (special characters removal before translation, punctuation splitting, alignment criteria, fallback order) **MUST BE 100% IDENTICAL** across both Advanced Mode and Beginner Mode.
- **Parallel UI & Accordion Ordering**:
  - The Special Characters Removal (Chars Removal) feature MUST be present in Advanced Mode as a dedicated accordion section, providing full functional parity with Beginner Mode.
  - In BOTH Advanced Mode and Beginner Mode, the Chars Removal section/accordion MUST strictly appear BEFORE the Parser (Sentence Splitting) section/accordion, adhering directly to the pipeline sequence (Stage 3 Chars Removal precedes Stage 4 Parser).

## Work tracking

- **New chat window for each sub-task**: Keep each sub-task scoped, resumable, and independent.
- **Resume after interruption**: Read this section, `current-sub-task.md`, `docs/todo.md`, and active entries in `docs/tasks.md` to identify the source of truth for where to continue.
- **Fresh-chat recommendation for uncommitted work**: Inspect `git status --short` and diffs. Reply **“go on”** when changes form one coherent task with passing validation. If uncertain, point user to `current-sub-task.md`.
- Inspect diffs before editing, reconcile trackers with worktree, and do not resume tasks already recorded in `docs/done.md`.

- **Mandatory location of all .md files under `docs/*.md` & zero duplicates policy**: ALL documentation, specification, design, operational, and architectural Markdown files MUST be located strictly under `docs/*.md` (or its subdirectories `docs/designs/`, `docs/specifications/`, and `docs/operations/`). There must be ZERO duplicate `.md` files in the repository. No Markdown file located under `docs/*.md` may have a redundant copy in root (`docs/tokens.md`, `docs/android.md`, `docs/parser.md`, `docs/self-verification.md`, and `docs/roadmap.md` reside exclusively in `docs/`). Only `README.md`, `AGENTS.md`, `current-sub-task.md`, and `temp.md` are permitted in root.
- **Mandatory token economy flow on every prompt (`docs/tokens.md`)**: On EVERY single prompt received, the agent MUST activate and process the token optimization flow defined in `docs/tokens.md` and maintain `current-sub-task.md`.
- **Task management protocol with `current-sub-task.md` & `temp.md`**: Break every prompt into clear numbered tasks and smaller sub-tasks in `docs/tasks.md` before performing actions. Maintain `current-sub-task.md` (and `docs/todo.md`) by staging the single active sub-task before executing any step. Use `temp.md` as an ephemeral scratchpad for draft diffs, checklists, or intermediate calculations.
- **Enforce updating .md tracking files first before action**: BEFORE jumping to any code edits, actions, or test implementations on a prompt, the agent MUST update `docs/tokens.md`, `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
- **Sub-task execution flow**:
  1. Ensure the sub-task is explicitly staged in `current-sub-task.md` (and `docs/todo.md`) first.
  2. Implement the sub-task's changes with minimal, targeted file edits.
  3. Add or update dedicated tests covering specific feature requirements.
  4. Test changes thoroughly with dedicated tests, verify app compilation (`compile_applet` / `npm run build`), and run code verification (`lint_applet` / `npm run lint`).
  5. Perform a dedicated Git commit after completing each step (`git commit`).
  6. After git commit, try using git push: attempt `git push` (handling failure gracefully if no remote or credentials) to keep editor and remote synchronized.
  7. **Mandatory migration to `docs/done.md`**: Move completed tasks and sub-tasks completely out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` directly into `docs/done.md`, documenting completed changes, dedicated test command, and verification outcome. `docs/tasks.md` is strictly an active backlog containing ONLY pending, active, and upcoming tasks. Completed items must never linger in `docs/tasks.md`.
- **Prompt task completion audit**: Before concluding any prompt or turn, the agent MUST audit and verify that EVERY task and subtask planned for the prompt in `docs/tasks.md` has been fully accomplished, thoroughly tested with its dedicated automated test, committed, and logged in `docs/done.md`.
- **Hotfix workflow with task suspension (holding pattern)**: When an unexpected defect, broken build, regression, or failing CI flow arises:
  1. **Suspend current task**: Place the active task/sub-task in `current-sub-task.md` **ON HOLD** (marked `[ON HOLD]`), saving state and resumption notes.
  2. **Stage hotfix**: Stage a dedicated `Hotfix: <issue>` subtask in `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
  3. **Execute in isolation**: Implement minimal targeted fix, verify with dedicated automated test, compile (`compile_applet`), and lint (`lint_applet`).
  4. **Commit and document**: Perform dedicated git commit (`fix(hotfix): <description>`), move hotfix directly out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` into `docs/done.md` under `### Hotfix: <issue>`.
  5. **Resume held task**: After hotfix is verified, restore suspended task back to active status in `current-sub-task.md` and `docs/todo.md`, and resume work.
- **Always keep last raw prompt in AGENTS.md**: `AGENTS.md` must continuously record and preserve the exact, unedited raw text of the user's latest prompt in a dedicated `## Last raw prompt` section on EVERY single prompt received.
- **Later tasks protocol**: Any "later" task MUST be stored at the bottom under `## Later Tasks` in `docs/tasks.md` (and `docs/later.md`). When active tasks are complete, ask user whether to proceed with "later" tasks.
- **Codespace platform blockers**: If a required task cannot run in Codespaces because a platform toolchain, device, emulator, or permission is unavailable, move only that blocked work to `## Later Tasks` in `docs/tasks.md` and `docs/later.md`, name the required platform/agent and exact validation command, then resume any remaining Codespace-doable task. Do not leave the blocked work as the active subtask.
- **No more tasks "go on" handling**: In case no more tasks are left (active backlog in `docs/tasks.md` and `current-sub-task.md` is empty), if prompt is "go on", then just summarize that there are no more tasks left. No need to show anything else.
- **Numbered chapters as serial tasks protocol**: When user prompt consists of numbered chapters (e.g. `1. ...`, `2. ...`), treat each as a separate distinct task in `docs/tasks.md`, divided into sub-tasks worked on strictly serially: execute, test, verify, compile, lint, commit, and migrate to `docs/done.md` BEFORE proceeding to the next numbered chapter.
- To verify any feature, always implement a dedicated test specifically validating the new behavior.
- Check last GitHub Actions result and fix failed flows promptly (`web.yml`, `emulation.yml`, `deploy-demo.yml`, `release-apk.yml`, `integrity.yml`).

## Code architecture, modularity, and standards

- **Avoid single-file overload**: Never concentrate or overload code into a single monolithic file (such as `index.tsx`, `index.ts`, or central entry points). Proactively decompose large files into modular, focused files with single responsibilities in `src/components/`.
- **Component decomposition discipline**: Every structurally distinct or reusable UI component must be defined in its own dedicated component file under `src/components/`. Do not define multiple complex UI components in the same file alongside page or route definitions.
- **Custom hooks and state isolation**: Complex state management, reactive side-effects, speech synthesis/TTS management, and multi-player coordination must be extracted into dedicated custom hooks under `src/hooks/` or state managers under `src/utils/`.
- **Naming and file inventory**: Maintain a documented inventory of files in `docs/files.md`. Name every code file descriptively according to its exact function and feature responsibility.

## Clean repository hygiene and authentic testing

- Keep repository strictly clean of build products, generated artifacts, and synthetic report files: only genuine source code, configs, GitHub Actions workflows, and Markdown documentation (`.md` files) belong in the repository. Build outputs (`dist/`, runtime caches) must remain ephemeral and ignored.
- Do not add or maintain hardcoded report generators, fabricated HTML presentation dashboards, or synthetic artifact creators.
- All end-to-end (E2E) and integration tests must validate real application source code and dynamic runtime execution directly.

## Project-specific delivery

- This project should remain identical in architecture, tooling, workflows, scripts, and conventions to [mostuf2556/Youtubenet6](https://github.com/mostuf2556/Youtubenet6), with deliberate differences limited strictly to the views and the subtitles parser. For every issue or discrepancy, inspect and compare against the corresponding solution in `https://github.com/mostuf2556/Youtubenet6`.
- **README.md is to be created by GitHub Actions — do not copy it when syncing git**: `README.md` is to be created and dynamically updated by GitHub Actions (via `.github/workflows/update-readme.yml` and `scripts/update-readme.mjs`). When syncing git, **`README.md` MUST NOT be copied or overwritten**.
- **App version updates**: The app version number must not stay 1.0 always; it should be updated across `package.json`, `android-shell/app/build.gradle.kts`, `src/config/appConfig.ts`, `src/utils/apkUpdater.ts`, and `src/utils/appSettings.ts` when delivering updates for prompt response.
- **Strict UI & Web-Demo Design Preservation Mandate**: NEVER alter, redesign, replace, re-theme, or disrupt the user interface, page layout, component structure, or web-demo design without explicit user confirmation and request. The clean, original web-demo layout MUST remain intact.
- **Zero GitHub Actions cron jobs policy**: All GitHub Actions workflows under `.github/workflows/` must strictly be event-driven (`push`, `pull_request`, `workflow_dispatch`, `workflow_run`). No workflow may define a `schedule:` or `cron` trigger under any circumstances.

### Android app E2E validation, screencast video & GitHub Pages reporting

- **Mandatory E2E verification on real Android runtimes**: Changes to Android shell components, WebView bridges, native caption interception, or video player integrations MUST be validated through E2E execution on an Android device or emulator (API 34 Google APIs) using `scripts/run-android-e2e.sh`, `scripts/android-e2e-assert.sh`, and `e2e/emulation.spec.ts`.
- **Screencast video recording protocol**: When screencast is enabled, record via `adb shell screenrecord --time-limit 180 --bit-rate 4000000 /sdcard/android-emulator-video.mp4` and finalize with graceful SIGINT `adb shell pkill -2 -f screenrecord` before pulling via `adb pull`.
- **Strict repository hygiene for video & build outputs**: Video recordings, device screenshots, and build binaries MUST NEVER exist on `main`. Build outputs and artifacts are staged to the orphaned `gh-pages` branch. Detailed operational instructions and schemas are maintained in `docs/android.md`. Subtitle parsing specifications are maintained in `docs/parser.md`. Self-verification protocol is maintained in `docs/self-verification.md`.

## Subtitles fetch, anti-bot, validation, and caching architecture

### 1. Subtitles fetch fallback strategy (`lang` replacement vs `tlang` parameterization)

- **Two fetch strategies**:
  - **`tlang` parameterization (translation mode)**: Preserves original spoken language track in `lang` (e.g., `lang=en`) and specifies desired target language using `tlang` (e.g., `tlang=he`).
  - **`lang` code replacement (direct track mode)**: Replaces `lang` parameter directly with target language (e.g., `lang=he`) while omitting `tlang`.
- **User toggle & preferences**: The application MUST allow the user to toggle between these two request modes via device-saved preferences (`SubtitleRequestMode` in `src/lib/playback-preferences.ts`, values `"tlang"` | `"lang"`). The UI must expose this selection.
- **Graceful fallback sequencing**: User-selected mode executes first; on failure, fallback mode executes automatically (`subtitleRequestModeOrder`). Session signature parameters (`v`, `expire`, `sparams`, `signature`, `key`, `caps`, `asr_langs`) are retained.

### 2. Anti-bot strategy for YouTube API execution

- **Authentic session capture**: Subtitle requests must never originate from raw unauthenticated scrapers. On Android, native shell intercepts real `youtube.com/api/timedtext` requests issued by embedded YouTube player inside WebView, capturing live session headers (`lastObservedHeaders`), cookies (`PREF`, `YSC`, `VISITOR_INFO1_LIVE`), Authorization/SAPISIDHASH tokens, and `Referer: https://www.youtube.com/`.
- **WebView User-Agent sanitization**: The WebView User-Agent string MUST be sanitized by stripping `; wv` (`userAgentString = userAgentString.replace("; wv", "")`).
- **Request pacing & rate control**: Requests must never hammer YouTube's API concurrently across all target languages. Calls must be paced with serialized execution or staggered jitter. If 429 or 403 is encountered, pause and back off.
- **Native OkHttp repetition**: On Android, repetition requests use native `OkHttpClient` initialized with captured session headers and cookies.

### 3. Request validation & "Good" response criteria

A subtitle HTTP response is considered valid and "good" ONLY when it satisfies all of the following criteria:

- **HTTP status**: Status code must be 200 OK. Any 4xx or 5xx status code is strictly rejected as a failure.
- **Valid JSON parsing**: Response body must be non-empty, start with `{` or `[`, and parse successfully without syntax errors. HTML error responses are rejected immediately.
- **YouTube `json3` structural schema compliance**:
  - Must contain a top-level `events` array (or list of cue objects).
  - The `events` array must be non-empty (`events.length > 0`).
  - Valid events must contain numeric start and duration timing attributes (`tStartMs` and `dDurationMs` numbers).
  - Valid events must contain a `segs` array with at least one segment object containing a non-empty string in the `utf8` property (`typeof seg.utf8 === "string" && seg.utf8.trim().length > 0`).
- **Non-zero cue count**: Parsed result must yield at least one valid subtitle cue (`cuesCount > 0`). Empty subtitle files (`events: []`) are rejected.

### 4. Caching mechanism & invalidation rules

- **Pre-cache validation gate**: Every subtitle response must be verified with `isValidJsonSubtitleResponse()` before being written to memory cache, `localStorage`, or SQLite/file storage.
- **Never cache invalidated responses**: Responses that return HTTP errors, network timeouts, or non-200 status codes MUST NEVER be cached. HTML error pages, malformed payloads, synthetic placeholders, and empty cue lists (`events: []`) MUST NEVER be cached. Only responses satisfying all "good" response criteria above are eligible for storage.
- **Read-time eviction**: Purge and evict corrupted, malformed, or zero-cue entries from cache immediately.
- **Explicit cache management**: The application must provide explicit cache controls ("Clear cache" and "Fetch from scratch") allowing users to clear cached entries and re-fetch authentic subtitle data on demand.

## Product design standards

- Help users watch YouTube videos while listening to preferred translations. Android can observe authentic native subtitle traffic; web subtitle access remains challenging and is currently most reliable through Android-shared subtitle links. Improving subtitle parsing efficiency is an ongoing challenge.
- Distinguish occasional new-user preference setup from daily viewing actions; keep the video and subtitles table central to repeat use.
- Beginner mode is guided setup and should lead to video-plus-table daily use. Advanced mode contains useful feature controls. Experimental and diagnostic views require the explicit URL parameter `debug=true`.
- Use subtle category backgrounds for review: green for daily-use controls, amber for new-user setup, and blue for experimental/developer-only controls. Color is an accessible supplemental cue, not a placement decision.
- Follow [`docs/design.md`](docs/design.md) and [`docs/developer.md`](docs/developer.md). Do not relocate controls before the user reviews the category color recommendations.

## Last raw prompt

```
go on
```
