<!-- LOVABLE: Avoid rewriting published git history (force push/rebase/amend) to protect Lovable sync. Keep working state. -->

## Subtitles fetching (read first)

- Subtitle fetch design (attempt order, session vs link-only sending, refetch buttons, web demo = local fixtures only) lives in [docs/reliable-subtitles-fetching.md](docs/reliable-subtitles-fetching.md).

## Codespaces, Docker, and E2E runbooks (read before running)

- See [docs/codespace.md](docs/codespace.md), [docs/docker.md](docs/docker.md), [docs/e2e.md](docs/e2e.md), [docker/manage.sh](docker/manage.sh), [docs/docker-e2e.md](docs/docker-e2e.md), and [docs/e2e-android.md](docs/e2e-android.md).

## Subtitles fixtures restriction & zero hardcoded subtitles policy

- **Single permitted fixture video and directory**: The ONLY subtitles fixtures this application will ever have is strictly for video `L2Ryrr6txwA` and located strictly at `public/fixtures/L2Ryrr6txwA`. No other video ID, path, or directory may contain, bundle, or use static subtitle fixtures.
- **Mandatory fixture labelling and explicit developer approval**: Never show, load, or render subtitle fixtures without explicitly labelling it as a fixture (e.g., `[Fixture]` badge or label). Fixtures may only ever be displayed after explicit developer approval.
- **Zero hardcoded subtitles policy**: All hardcoded subtitles, static cue arrays, and static translation maps are strictly prohibited in `src/config` (such as `src/config/fixtures.ts`, `src/config/appConfig.ts`) and everywhere across the codebase. Video items in `DEFAULT_LIBRARY_ITEMS` and initial application state must have empty cues (`cues: []`), relying on dynamic timedtext fetching or approved fixtures for `L2Ryrr6txwA`.

## Application stages pipeline & execution order

The application processes and presents subtitles through a strict sequential pipeline:

1. **Stage 1: Acquisition & Interception**: Intercepts authentic YouTube `api/timedtext` queries from native WebView player on Android, accepts direct user-entered subtitle URLs, or loads local fixtures strictly for video `L2Ryrr6txwA` from `public/fixtures/L2Ryrr6txwA` if explicitly approved.
2. **Stage 2: Validation & Schema Conformance**: Enforces HTTP 200, valid non-HTML JSON, YouTube `json3` structure (`events` with `tStartMs`, `dDurationMs`, `segs[].utf8`), and non-empty cues (`cuesCount > 0`). Rejects HTML error pages or malformed payloads.
3. **Stage 3: Special Characters Removal & Sanitization**:
   - **RESTRICT RULE: Special characters removal MUST happen BEFORE the translation stage.**
   - Strips speaker tags (`[Speaker 1]:`), sound indicators (`[Music]`, `[Applause]`), arrows (`>`, `>>`), entities, and normalizes excess whitespace.
4. **Stage 4: Sentence Boundary Detection & Punctuation Splitting**: Splits continuous stream cues into grammatical sentences using terminal punctuation (`.`, `!`, `?` or configured criteria) with linear time interpolation.
5. **Stage 5: Translation Stage**: Translates clean sentence text into target languages via `tlang` fallback, on-demand AI translation, or secondary track alignment. Operates strictly AFTER Stage 3 (Special Characters Removal).
6. **Stage 6: Multi-Language Alignment & Grid Formulation**: Synchronizes target language tracks with the base language track into parallel sentence rows side-by-side.
7. **Stage 7: Audio Playback Coordination & TTS Synthesis**: Highlights active sentences during video playback. Coordinates video pauses between sections to allow Web Speech or Alternative TTS voices to complete speech synthesis before resuming.

### Absolute Parity Rule Between Advanced and Beginner Modes:

- **Default cross-mode scope**: Unless a prompt explicitly limits its scope, every requested behavior, setting, bug fix, and UI capability MUST apply to both Beginner and Advanced modes. Implement shared behavior through the same component or source of truth whenever both modes expose the feature; mode-specific differences may change presentation or ordering only when explicitly required.
- The processing rules (special characters removal before translation, punctuation splitting, alignment criteria, fallback order) **MUST BE 100% IDENTICAL** across both Advanced Mode and Beginner Mode.
- Tests for shared behavior MUST cover both modes unless the behavior is inherently mode-specific.
- **Parallel UI & Accordion Ordering**:
  - The Special Characters Removal (Chars Removal) feature MUST be present in Advanced Mode as a dedicated accordion section, providing full functional parity with Beginner Mode.
  - In BOTH Advanced Mode and Beginner Mode, the Chars Removal section/accordion MUST strictly appear BEFORE the Parser (Sentence Splitting) section/accordion, adhering directly to the pipeline sequence (Stage 3 Chars Removal precedes Stage 4 Parser).

### State Preservation Across Modes and Stages

- Beginner stage/tab changes and Beginner/Advanced mode switches are view transitions, not application resets. Preserve the active video and player state, including playback position and playing/paused state, across those transitions.
- Preserve user selections and configuration across modes and stages, including base/target/favorite languages, parser settings, TTS settings, and subtitle-table state. Keep shared state above conditional views or persist it in the established settings store.
- If a platform requires recreating the player host, restore the same video's prior position and play/pause state. Do not reset or reload the active video solely because the user changes mode or stage.
- Add focused regression coverage for state continuity whenever changing mode or stage ownership, player lifecycle, or settings persistence.

## Work tracking

- **Check pending pull requests before starting features**: Before starting work on another feature, always check that there are no pending open pull requests by checking `https://github.com/mostuf2556/subtitle-sync/pulls` (e.g. via GitHub API, web, or CLI).
- **New chat window for each sub-task**: Keep each sub-task scoped, resumable, and independent.
- **Resume after interruption**: Read this section, `current-sub-task.md`, `docs/todo.md`, and active entries in `docs/tasks.md` to identify the source of truth for where to continue.
- **Fresh-chat recommendation for uncommitted work**: Inspect `git status --short` and diffs. Reply **“go on”** when changes form one coherent task with passing validation. If uncertain, point user to `current-sub-task.md`.
- Inspect diffs before editing, reconcile trackers with worktree, and do not resume tasks already recorded in `docs/done.md`.
- **Mandatory location of all .md files under `docs/*.md` & zero duplicates policy**: ALL documentation, specification, design, operational, and architectural Markdown files MUST be located strictly under `docs/*.md`. There must be ZERO duplicate `.md` files in the repository. Only `README.md`, `AGENTS.md`, `current-sub-task.md`, and `temp.md` are permitted in root.
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
- **Codespace platform blockers**: If blocked in Codespaces without toolchain/device, move to `## Later Tasks` in `docs/tasks.md` and `docs/later.md` with exact validation command, then resume remaining tasks.
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

- Keep repository strictly clean of build products, generated artifacts, and synthetic report files: only genuine source code, configs, GitHub Actions workflows, and Markdown documentation (`.md` files) belong in repository. Build outputs (`dist/`, caches) remain ephemeral.
- Do not maintain hardcoded report generators or synthetic artifact creators.
- E2E and integration tests validate real application source code directly.

## Project-specific delivery

- This project remains identical in architecture, tooling, workflows, scripts, and conventions to [mostuf2556/Youtubenet6](https://github.com/mostuf2556/Youtubenet6), with deliberate differences limited strictly to views and subtitles parser.
- **README.md is to be created by GitHub Actions — do not copy it when syncing git**: `README.md` is to be created and dynamically updated by GitHub Actions (via `.github/workflows/update-readme.yml` and `scripts/update-readme.mjs`). When syncing git, **`README.md` MUST NOT be copied or overwritten**.
- **App version updates**: The app version number must not stay 1.0 always; it should be updated across `package.json`, `android-shell/app/build.gradle.kts`, `src/config/appConfig.ts`, `src/utils/apkUpdater.ts`, and `src/utils/appSettings.ts` when delivering updates for prompt response.
- **Strict UI & Web-Demo Design Preservation Mandate**: NEVER alter, redesign, replace, re-theme, or disrupt the user interface, page layout, component structure, or web-demo design without explicit user confirmation and request. The clean, original web-demo layout MUST remain intact.
- **Zero GitHub Actions cron jobs policy**: All GitHub Actions workflows under `.github/workflows/` must strictly be event-driven (`push`, `pull_request`, `workflow_dispatch`, `workflow_run`). No workflow may define a `schedule:` or `cron` trigger under any circumstances.

### Android app E2E validation, screencast video & GitHub Pages reporting

- **Mandatory E2E verification on real Android runtimes**: Changes to Android shell components, WebView bridges, native caption interception, or video player integrations MUST be validated through E2E execution on an Android device or emulator (API 34 Google APIs) using `scripts/run-android-e2e.sh`, `scripts/android-e2e-assert.sh`, and `e2e/emulation.spec.ts`.
- **Screencast video recording protocol**: When screencast is enabled, record via `adb shell screenrecord --time-limit 180 --bit-rate 4000000 /sdcard/android-emulator-video.mp4` and finalize with graceful SIGINT `adb shell pkill -2 -f screenrecord` before pulling via `adb pull`.
- **Strict repository hygiene for video & build outputs**: Video recordings, device screenshots, and build binaries MUST NEVER exist on `main` (staged to orphaned `gh-pages`). Operational instructions in `docs/android.md`, parser specs in `docs/parser.md`, self-verification protocol in `docs/self-verification.md`.

## Subtitles fetch, anti-bot, validation, and caching architecture

### 1. Subtitles fetch fallback strategy (`lang` replacement vs `tlang` parameterization)

- **Two fetch strategies**: `tlang` parameterization (translation mode, e.g. `lang=en&tlang=he`) vs `lang` code replacement (direct track mode, e.g. `lang=he`).
- **User toggle & preferences**: The application MUST allow the user to toggle between these two request modes via device-saved preferences (`SubtitleRequestMode` in `src/lib/playback-preferences.ts`, values `"tlang"` | `"lang"`).
- **Graceful fallback sequencing**: User mode executes first; on failure, fallback mode executes automatically (`subtitleRequestModeOrder`). Session signature parameters are retained.

### 2. Anti-bot strategy for YouTube API execution

- **Authentic session capture**: Subtitle requests must never originate from raw scrapers. On Android, native shell intercepts real `youtube.com/api/timedtext` requests, capturing live headers (`lastObservedHeaders`), cookies, tokens, and `Referer: https://www.youtube.com/`.
- **WebView User-Agent sanitization**: The WebView User-Agent string MUST be sanitized by stripping `; wv` (`userAgentString = userAgentString.replace("; wv", "")`).
- **Request pacing & rate control**: Requests must never hammer YouTube concurrently. Calls must be paced with serialized execution or jitter. If 429 or 403 occurs, back off.
- **Native OkHttp repetition**: On Android, repetition requests use native `OkHttpClient` with captured session headers and cookies.

### 3. Request validation & "Good" response criteria

A subtitle HTTP response is considered valid and "good" ONLY when it satisfies all criteria:

- **HTTP status**: Status code must be 200 OK. 4xx/5xx codes are rejected.
- **Valid JSON parsing**: Response body must be non-empty, start with `{` or `[`, and parse successfully. HTML error pages are rejected immediately.
- **YouTube `json3` structural schema compliance**: Must contain non-empty `events` array (`events.length > 0`), valid events with numeric `tStartMs` and `dDurationMs`, and `segs` array with non-empty string in `utf8` property (`typeof seg.utf8 === "string"`).
- **Non-zero cue count**: Parsed result must yield at least one valid subtitle cue (`cuesCount > 0`).

### 4. Caching mechanism & invalidation rules

- **Pre-cache validation gate**: Every subtitle response must be verified with `isValidJsonSubtitleResponse()` before writing to cache.
- **Never cache invalidated responses**: Responses returning HTTP errors or non-200 status codes MUST NEVER be cached. HTML error pages, malformed payloads, and empty cues (`events: []`) MUST NEVER be cached.
- **Read-time eviction**: Purge and evict corrupted or zero-cue entries from cache immediately.
- **Explicit cache management**: Provide explicit cache controls ("Clear cache" and "Fetch from scratch") to re-fetch on demand.

## Default Subtitle & Shared-Subtitle Favorites Policy

- **Single favorites manager**: Global favorite languages have one shared source for Beginner and Advanced modes and one user-facing manager in the Languages panel. Keep that manager searchable with visible add/remove controls and clear actions; do not duplicate it under general Settings.
- **Separate global and per-video choices**: Global favorites are defaults for new videos. Selecting target languages for the active video changes only that video's selection unless the user explicitly chooses to save it as the global favorites list.
- **Leftmost column as default language**: The leftmost column in the parallel subtitles table always acts as the default language and is automatically added to the user's favorite languages as the default-subtitle.
- **Shared-subtitle parameter synchronization**: When the app or web-demo is triggered by a URL containing a `target_lang` query parameter (e.g. `?target_lang=he`), that shared-subtitle language is automatically added to the list of favorite languages and enabled for the current video.

## Product design standards

- Distinguish new-user setup from daily viewing; keep video and subtitles table central to repeat use.
- Beginner mode is guided setup; Advanced mode contains feature controls; diagnostics require `debug=true`.
- Follow [`docs/design.md`](docs/design.md) and [`docs/developer.md`](docs/developer.md).

## Last raw prompt

```
1. by default split by punctuations (in case of ".",
,","?", "!" (but wrap together text within start/closing couples of punctuation chars  such as: "\"\" or "("  )
2. should the video be played before or after the tts-play? add another option which is to play the video in between tts-play groups (1 group to play before , one group to play after the video-play)
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(5) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```
