## Subtitles fetching (read first)

- Subtitle fetch design (attempt order, session vs link-only, refetch buttons, web demo = local fixtures only) lives in [docs/reliable-subtitles-fetching.md](docs/reliable-subtitles-fetching.md).

## Subtitles fixtures restriction & zero hardcoded subtitles policy

- **Single permitted fixture video and directory**: Strictly for video `L2Ryrr6txwA` at `public/fixtures/L2Ryrr6txwA`. No other video ID or path may use static fixtures.
- **Mandatory fixture labelling and explicit developer approval**: Never load or render subtitle fixtures without a `[Fixture]` label and explicit developer approval.
- **Zero hardcoded subtitles policy**: Hardcoded subtitles, static cue arrays, and static translation maps are prohibited in `src/config` (`fixtures.ts`, `appConfig.ts`) and across the codebase. `DEFAULT_LIBRARY_ITEMS` and initial state must have `cues: []`.

## Application stages pipeline & execution order

Sequential subtitle pipeline:
1. **Stage 1: Acquisition & Interception**: Intercepts YouTube `api/timedtext` queries from Android WebView, accepts direct URLs, or loads approved `L2Ryrr6txwA` fixtures from `public/fixtures/L2Ryrr6txwA`.
2. **Stage 2: Validation & Schema Conformance**: Enforces HTTP 200, valid non-HTML JSON, YouTube `json3` schema (`events` with `tStartMs`, `dDurationMs`, `segs[].utf8`), and `cuesCount > 0`.
3. **Stage 3: Special Characters Removal & Sanitization**:
   - **RESTRICT RULE: Special characters removal MUST happen BEFORE the translation stage.**
   - Strips speaker tags, sound cues (`[Music]`), arrows (`>`, `>>`), entities, and excess whitespace.
4. **Stage 4: Sentence Boundary Detection & Punctuation Splitting**: Splits cues into sentences on terminal punctuation (`.`, `!`, `?`) with linear time interpolation.
5. **Stage 5: Translation Stage**: Translates clean sentences via `tlang`, on-demand translation, or secondary track alignment strictly AFTER Stage 3.
6. **Stage 6: Multi-Language Alignment & Grid Formulation**: Synchronizes target tracks with base language into parallel rows.
7. **Stage 7: Audio Playback Coordination & TTS Synthesis**: Highlights active sentences and coordinates video pauses for Web Speech / Alternative TTS completion.

### Absolute Parity Rule Between Advanced and Beginner Modes:
- Shared behavior, settings, bug fixes, and processing rules **MUST BE 100% IDENTICAL** across Advanced and Beginner modes from the same component/source of truth.
- **Same Components Policy (Only Order Differs)**: Both modes MUST render identical shared UI blocks (`SpecialCharactersRemovalPanel`, `SubtitlesTablePanel`, `NewSubtitlesParserBar`, `GlobalFavoriteLanguagesPanel`, `LearningGoalsFiltersPanel`, `PerformanceModeSettingsPanel`, `LanguageBoxesSelector`, `VideoPlaybackControls`, `SwitchableDefaultSubtitlesBar`, `LanguageRatioCompositionSelector`, `TtsFallbackOrderSwitch`, `CriticalCaptionsAlert`, `AlternativeVideoPlayerView`, `WordBalloonLearningView`, `VideoLibraryPanel`, `WebDemoUrlsInput`, `TtsPlayHistoryPanel`) and differ strictly in layout/sequence order.
- **Parallel UI & Accordion Ordering**: Chars Removal (`SpecialCharactersRemovalPanel`) MUST exist in Advanced Mode and appear strictly BEFORE Parser in BOTH modes (Stage 3 precedes Stage 4).

### State Preservation Across Modes and Stages
- Mode/tab switches are view transitions, not application resets; preserve active video, playback position and playing/paused state, plus user language/parser/TTS/table state above conditional views. Add focused regression coverage for state continuity on ownership/lifecycle changes.

## Work tracking

- **Check pending pull requests before starting features**: Check `https://github.com/mostuf2556/subtitle-sync/pulls` before starting features.
- **Resume after interruption**: Read this section, `current-sub-task.md`, `docs/todo.md`, and active entries in `docs/tasks.md`.
- **Mandatory location of all .md files under `docs/*.md` & zero duplicates policy**: All docs must live under `docs/*.md` with ZERO duplicate `.md` files. Only `README.md`, `AGENTS.md`, `current-sub-task.md`, `temp.md`, `chat.md`, and `prompt_history.md` are permitted in root. Key specs: `docs/tokens.md`, `docs/android.md`, `docs/parser.md`.
- **Mandatory token economy flow on every prompt (`docs/tokens.md`)**: Activate `docs/tokens.md`, stage `current-sub-task.md`, and use `temp.md` as ephemeral scratchpad. Keep `docs/tokens.md` < 12 KB (zero historical logs), `current-sub-task.md` & `docs/todo.md` < 2 KB (no completed-task dumps), and `AGENTS.md` < 20 KB. Read only bounded slices (`StartLine`/`EndLine`, `tail`, `grep`) of large logs (`docs/done.md`, `docs/files.md`, `prompt_history.md`, `src/routes/index.tsx`).
- **Enforce updating .md tracking files first before action**: BEFORE any code edits or tests, update `docs/tokens.md` (if needed), `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
- **Sub-task execution flow**:
  1. Stage single sub-task in `current-sub-task.md` and `docs/todo.md`.
  2. Implement minimal, targeted edits; add/update dedicated tests.
  3. Verify tests, `compile_applet` / `npm run build`, and `lint_applet` / `npm run lint`.
  4. **Checkpoint Git commit & log in `docs/git.md`**: Attempt `git commit` after each sub-task and log outcome in `docs/git.md`.
  5. **After git commit, try using git push**: Attempt `git push` (handle missing remote/credentials gracefully) and log outcome in `docs/git.md`.
  6. **Mandatory migration to `docs/done.md`**: Move completed tasks and sub-tasks completely out of `current-sub-task.md`, `docs/todo.md`, and `docs/tasks.md` directly into `docs/done.md` with changes, test command, and verification outcome. `docs/tasks.md` is strictly an active backlog containing ONLY pending, active, and upcoming tasks.
- **Prompt task completion audit**: Verify EVERY task and subtask planned for the prompt is implemented, tested, committed/logged, and archived in `docs/done.md` before finishing.
- **Hotfix workflow with task suspension**:
  1. **Suspend current task**: Mark active item in `current-sub-task.md` as `[ON HOLD]` with resumption notes.
  2. **Stage hotfix**: Add `Hotfix: <issue>` in `docs/tasks.md`, `current-sub-task.md`, and `docs/todo.md`.
  3. **Execute & commit**: Minimal fix, dedicated test, compile, lint, commit (`fix(hotfix): <desc>`), log in `docs/git.md`, archive in `docs/done.md` under `### Hotfix: <issue>`.
  4. **Resume held task**: Restore suspended task to active status.
- **Always keep last raw prompt in AGENTS.md**: Preserve exact unedited latest user prompt in `## Last raw prompt` on every prompt.
- **Later tasks protocol**: Store deferred tasks under `## Later Tasks` in `docs/tasks.md` (and `docs/later.md`); ask user before executing.
- **No more tasks "go on" handling**: In case no more tasks are left (`docs/tasks.md` active backlog and `current-sub-task.md` empty), if prompt is "go on", just summarize that there are no more tasks left. No need to show anything else.
- **Numbered chapters as serial tasks protocol**: Treat numbered chapters (`1. ...`, `2. ...`) as separate tasks in `docs/tasks.md` divided into sub-tasks worked on serially (implement, test, compile, lint, commit, move to `docs/done.md`) before advancing.

## Parallel AI agent coordination & lock mechanism (chat.md)

- **Quarantine agent chat (chat.md) & do not use for now**: Agent chat (`chat.md`) is quarantined and must NOT be used for now. Execute independently without locks or messages in `chat.md`.
- *(Quarantined spec)*: **Mandatory lock release upon job completion** (reset `[UNLOCKED]`), **Interrupted job priority resolution**, **Duplicate job suspicion communication**, **Fallback redirection to user**.
- **Parallel planning mode in `docs/plans/`**: When asked to plan without editing code, write plans strictly in `docs/plans/timestamp_<desc>.md` and do NOT update any other repo file. Record continuations as `prompt: <x>` / `work: <y>`.

## Code architecture, modularity, and standards

- **Avoid single-file overload**: Never concentrate code into monolithic files (`index.tsx`, `index.ts`).
- **Component decomposition discipline**: Place distinct/reusable UI components in `src/components/`.
- **Custom hooks and state isolation**: Isolate complex state, TTS, and multi-player logic in `src/hooks/` or `src/utils/`.
- **Naming and file inventory**: Register files in `docs/files.md`.
- **Storybook-first component workflow**: Build/test new components in Storybook (`.stories.tsx` or `src/storybook/`) before app integration.
- **Experimental features isolation & undo/cancel rule**: When a prompt requests an experimental feature, label it `[Experimental]`, isolate it in standalone module(s)/component(s) so it does not affect or break any existing component, and keep it cleanly undoable/removable on an undo or cancel request.

## Project-specific delivery

- **README.md is to be created by GitHub Actions — do not copy it when syncing git**: Managed by `.github/workflows/update-readme.yml` and `scripts/update-readme.mjs` (`README.md merge=ours`); never overwrite or copy from other repos.
- **App version updates & single source of truth**: The app version number must not stay 1.0 always; update for prompt response with `package.json` as single source of truth, synced via `npm run sync-version` and `.github/workflows/version-sync.yml`.
- **Strict UI & Web-Demo Design Preservation Mandate**: NEVER alter, redesign, replace, re-theme, or disrupt UI layout, component structure, or web-demo design without explicit user confirmation and request.
### Android app E2E validation, screencast video & GitHub Pages reporting

- Validate Android shell/WebView bridges on API 34 emulator/device (`scripts/run-android-e2e.sh`, `scripts/android-e2e-assert.sh`, `e2e/emulation.spec.ts`); record with `adb shell screenrecord` and finalize with SIGINT `adb shell pkill -2 -f screenrecord` before `adb pull`. Never store video/build binaries on `main` (use `gh-pages`). Specs: `docs/android.md`, `docs/parser.md`, `docs/self-verification.md`.

## Subtitles fetch, anti-bot, validation, and caching architecture

### 1. Subtitles fetch fallback strategy (`lang` replacement vs `tlang` parameterization)
- **Two fetch strategies**: `tlang` translation (`lang=en&tlang=he`) vs `lang` code replacement (`lang=he`).
- **User toggle & preferences**: Allow the user to toggle between these two request modes (`SubtitleRequestMode` in `src/lib/playback-preferences.ts`: `"tlang"` | `"lang"`), executing preferred mode first with automatic fallback (`subtitleRequestModeOrder`).

### 2. Anti-bot strategy for YouTube API execution
- **Authentic session capture**: Intercept live `youtube.com/api/timedtext` requests on Android (`lastObservedHeaders`, cookies, `Referer: https://www.youtube.com/`).
- **WebView User-Agent sanitization**: Strip `; wv` via `userAgentString = userAgentString.replace("; wv", "")`.
- **Request pacing & rate control**: Serialize/jitter requests and back off on 429/403; use native `OkHttpClient` on Android.

### 3. Request validation & "Good" response criteria
- **Request validation**: Status code must be 200 OK; non-empty valid JSON (no HTML); YouTube `json3` schema with non-empty `events` (`tStartMs`, `dDurationMs`, `segs[].utf8` string); Non-zero cue count (`cuesCount > 0`).

### 4. Caching mechanism & invalidation rules
- **Pre-cache validation gate**: Verify with `isValidJsonSubtitleResponse()` before caching.
- **Never cache invalidated responses**: Reject HTTP errors, HTML pages, malformed JSON, and empty cues.
- **Read-time eviction & controls**: Evict invalid entries on read; expose "Clear cache" and "Fetch from scratch".

## Default Subtitle & Shared-Subtitle Favorites Policy

- **Single favorites manager**: Global favorites have one shared source for Beginner and Advanced modes and one user-facing manager in the Languages panel (searchable with add/remove/clear; do not duplicate it under general Settings).
- **Separate global and per-video choices**: Global favorites apply to new videos; per-video target selection changes only that video's selection unless explicitly saved as global.
- **Leftmost column & `target_lang` sync**: Leftmost parallel-table column is default language (auto-added to favorites); `?target_lang=` URL param auto-enables and adds that language to favorites.

## Supabase quarantine & prompt history policy

- **Quarantine Supabase & `chat.md`**: Keep Supabase files under `quarentined/` and `chat.md` unused.
- **Historic prompts tracking in `prompt_history.md`**: Record all historic prompts in `prompt_history.md`.

## Last raw prompt
```
0. use accordions on learning goals - this should help cleaning the view

1.
listening game:
allow to click or swap righ or left in order to archive a word - this will filter out the word for the next game.

also support unquarenine the archived words.

2. creating more sentences using the list of words using openrouter - the openrouter option should be presented on the relevant section

3. AGENTS.md - prompting: if  prompt says to create expermental feature - allow to undone the feature using an undo/cancel request. experimental feature should not effect any existing component.

4. upon feching subtitles success - tts-play what what fetched and on which method (via server? anonymously? )

5.experminental:  
add controls around the video :
- add an experimental feature (): test-id=automate_clicking_on_subtitles content:
allow switching to another subtitles language using a list of languages: russian/spanish/arabic/hebrew/english. add experimental tag and ensure it doenst conflict with existing features
```
