# Token Economy Architecture & Task Decomposition Protocol (tokens.md)

This document establishes the lightweight, high-efficiency operational protocol for maximizing token usage efficiency across all prompts and automated agent execution cycles without heavy processing overhead.

---

- Prompt 215 (Go On — Resume Active Backlog): Verified `Task 427` & `Task 414` [COMPLETED & VERIFIED]; executing `Task 415` [ACTIVE] strictly serially and migrating to `docs/done.md` upon verification.
- Prompt 214 (Tasks 426, 425, 427 — AGENTS.md Sub-Task Git Commit & `docs/git.md` Logging, Demo Tab Switch Keeps Video Playing, & Floating Menu TTS-Play Active During Video Playback):
  - Task 426 [COMPLETED & VERIFIED]: Chapter 0 — Documented sub-task `git commit` + `docs/git.md` logging rule in `AGENTS.md`, created `docs/git.md` & verified `test:agents-git-log-rule` + `test:agents-all` (23/23).
  - Task 425 [COMPLETED & VERIFIED]: Chapter 1 — Kept video player mounted offscreen-invisible across Advanced stages/top tabs and Beginner `Preferences` <-> `Video` tabs so changing tabs never pauses or reloads the player (`test:tab-change-keeps-video-playing`, `v2.1.127`).
  - Task 427 [COMPLETED & VERIFIED]: Chapter 2 — Fixed `tts-play` showing as enabled on the floating button menu while inactive during video playback (`test:floating-tts-play-active-during-video`, `v2.1.128`).
- Prompt 213 (Go On — Resume Active Backlog): Execute active serial tasks strictly one at a time (`Task 414` [ACTIVE] -> `Task 415` [PENDING] -> `Task 425` [PENDING]), migrating each to `docs/done.md` upon verification.
- Prompt 212 (Go On Backlog + Task 425 — Keep Video Player Playing When Changing Tabs on Demo Webpage):
  - Chapter 1 (`1. go on`): Reconciled & migrated `Task 419` to `docs/done.md`; executing `Task 414` [ACTIVE] -> `Task 415` [PENDING] strictly serially.
  - Task 425 [PENDING]: Chapter 2 — Prevent changing tabs/stages on the demo webpage (`#accordion-stages-stepper`, `#top-tabs-nav`, Beginner `preferences`/`video` tabs, and `workflowMode` switch) from unmounting, pausing, or resetting the live YouTube video player.
- Prompt 211 (Tasks 422–424 — Remove Redundant Parallel Viewer Tab, Debug-Only History Stage, & Floating Settings OpenRouter/TTS-Service Credential Indication + Click-to-Update, `v2.1.126`):
  - Task 422 [COMPLETED & VERIFIED]: Removed redundant `#tab-viewer` ("Parallel Viewer") button and gated `#top-tabs-nav` on `workflowMode === "expert" && isDeveloperMode`; developer tabs toggle back to `"viewer"` when re-clicked (`e2e/web.spec.ts`, `scripts/verify-video-playground-tab.ts`, `test:prompt-211`).
  - Task 423 [COMPLETED & VERIFIED]: Restricted History stage (`#stage-step-history`, stage 6 container, `?stage=6`/`?stage=history` URL bootstrap, and Beginner `historyStageSlot`) to `debugMode === true` only, resetting stage 6 -> stage 1 when debug mode turns off (`test:prompt-211`, `test:tts-play-history-stage`).
  - Task 424 [COMPLETED & VERIFIED]: Added OpenRouter API Key (`OR Valid/Missing/Invalid`) & TTS-Service Token (`TTS Valid/Missing/Invalid`) status indicators on `floating-menu-toggle-btn` and clickable inline editors + `"Full Settings"` navigation inside `FloatingDraggablePauseButton`, synchronized via `src/utils/credentialStatus.ts` (`yt-credentials-updated`) across Beginner/Advanced modes + Storybook (`test:prompt-211`, `test:agents-all` 22/22, `compile_applet`, `lint_applet`).
- Prompt 210 (Hotfix — Vite HMR Reload & Stale Module Export Mismatch at Container Boot):
  - Hotfix [COMPLETED & VERIFIED]: Verified all 8 reported modules (`styles.css`, `FloatingErrorButton.tsx`, `routes/index.tsx`, `AiSubtitlePunctuationTab.tsx`, `alternative-tts.ts`, `listeningGame.ts`, `WordBalloonLearningView.tsx`, `ListeningGamePanel.tsx`) and exports (`unlockTtsAudioPlayback`, `splitSentenceHighlightParts`, `LISTENING_RATE_PRESETS`), bumped to `v2.1.125`, restarted Vite dev server (`restart_dev_server`), and verified HTTP 200 transforms, `test:vite-reload-modules`, `test:client-pretransform-health`, `test:dev-server-prewarming-hotfix`, `test:react-instance-and-vite-reload-hotfix`, `test:listening-game-mode`, live Chromium (`ERR_BTN: 0`), `compile_applet`, and `lint_applet`.
- Prompt 209 (Task 421 — YouTube API Default & Auto-Translation Container Inside `#switchable-default-subtitles-bar`):
  - Task 421 [COMPLETED & VERIFIED]: Added dedicated container `[data-testid="youtube-api-default-auto-translations-container"]` inside `#switchable-default-subtitles-bar` (`SwitchableDefaultSubtitlesBar.tsx`) powered by `src/utils/youtubeApiSubtitleTracks.ts` to show the video's YouTube API Default, Auto (ASR), and Auto-Translation (`tlang=`) tracks from live YouTube API requests (`timedtext?type=list`, `/api/timedtext`, `observedUrl`, `youtubeTranslatedLanguages`), with `Refresh API` querying and interactive track switching across Advanced Stage 3, Beginner Mode, `VideoPlayground`, and Storybook (`test:youtube-api-default-auto-translations`, `test:agents-all` 22/22, `compile_applet`, `lint_applet`, `v2.1.124`).
- Prompt 208 (Task 420 — Fix Progress Bar Seek During TTS-Play or Video Playback Overwritten by Next Queued Section):
  - Task 420 [COMPLETED & VERIFIED]: Fixed moving the progress bar (`VideoPlaybackControls` seekbar & native YouTube timeline scrub) during both TTS-play and video playback so seeking immediately cancels active TTS, increments `playbackSeekEpochRef`, sets `pendingSeekTargetRef` to avoid stale pre-seek `getCurrentTime()` reads, syncs `lastRow`/`active`, guards `getPlaybackSectionId` on empty/shrinking `rows`, and prevents completed/abandoned sections from snapping playback back to `rows[idx].start` or `rows[candidateRow + 1].start` (`test:seek-overrides-tts-queue`, `test:agents-all` 22/22, `compile_applet`, `lint_applet`, `v2.1.123`).
- Prompt 207 (Tasks 416–419 — Settings Accordions: OpenRouter 1st & TTS Service 2nd, OpenRouter Free Models Dropdown on Init, & Game OpenRouter X=5 Sentence Generation):
  - Task 416 [COMPLETED & VERIFIED]: Chapter 1 — Moved TTS Service upper in Settings into its own dedicated accordion (2nd accordion slot) across Advanced (`settings-tts-service-accordion`) and Beginner (`beginner-settings-tts-service-accordion`), verified with `test:settings-tts-service-accordion`, `test:agents-all`, Chromium E2E, `compile_applet`, and `lint_applet` (`v2.1.119`).
  - Task 417 [COMPLETED & VERIFIED]: Chapter 2 — Built shared `OpenRouterSettingsPanel` + Storybook story/Workbench tab and mounted it as 1st accordion directly above TTS Service (2nd accordion) across Advanced & Beginner modes (`test:openrouter-accordion`, `test:agents-all` 22/22, Chromium E2E, `compile_applet`, `lint_applet`, `v2.1.120`).
  - Task 418 [COMPLETED & VERIFIED]: Chapter 3 — Updated `fetchOpenRouterFreeModels` (`https://openrouter.ai/api/frontend/v1/models/find?active=true&fmt=cards&max_price=0` with Bearer API key auth), pinned `openrouter/auto:free` default, wired init fetch + `<select data-testid="openrouter-free-models-dropdown">` in `OpenRouterSettingsPanel` across Advanced, Beginner & Storybook (`test:openrouter-free-models`, `test:agents-all` 22/22, live Chromium E2E, `compile_applet`, `lint_applet`, `v2.1.121`).
  - Task 419 [ACTIVE]: Chapter 4 — Integrate OpenRouter into the Game (`WordBalloonLearningView`) to generate sentences using the target words to learn, ensuring on-demand fetching of the next `X=5` sentences.
- Prompt 206 (Hotfix — Dev Server Pre-warming Process Death & Vite Watch/Optimize Scoping):
  - Hotfix [COMPLETED & VERIFIED]: Scoped `vite.config.ts` (`optimizeDeps.entries: ["index.html"]`, `server.watch.ignored` for non-app directories), updated `scripts/verify-dev-server-prewarming-hotfix.ts`, bumped to `v2.1.118`, restarted Vite dev server, verified all modules HTTP 200, live Chromium (`ERR_BTN: 0`, `ERRORS: []`), `npx tsc --noEmit`, `compile_applet`, `lint_applet`, and resumed `Task 414`.
- Prompt 205 (Resume Backlog — "go on"): Execute active Prompt 204 serial tasks (`Task 414` -> `Task 415`).
- Prompt 204 (Tasks 414–415 — Fix Unintended Auto-Scroll in Learning Goals Stage & Fix Enabling Auto-Scroll Subtitles in Subtitles Table Stage):
  - Task 414 [ACTIVE]: Chapter 1 — Prevent interacting with controls in the Learning Goals stage (Stage 1 / Beginner Preferences) from triggering unintended auto-scroll (`scrollIntoView` / focus-scroll / container scroll jumps).
  - Task 415 [PENDING]: Chapter 2 — Fix enabling Auto-Scroll Subtitles (`menu-option-auto-scroll`) so it reliably triggers auto-scroll on the Subtitles Table stage across both Advanced and Beginner modes.
- Prompt 203 (Hotfix — Vite HMR Reload Errors Across 10 Modules & Fast-Refresh / ESLint Cleanup):
  - Hotfix [COMPLETED & VERIFIED]: Audited all 10 reported modules + 200 `src/` files, removed non-component Fast Refresh export (`MAX_WORDS_OPTIONS` in `LearningGoalsFiltersPanel.tsx`), fixed ESLint errors (`no-explicit-any` in `AiSubtitlePunctuationTab.tsx`, `no-extra-boolean-cast` in `NetworkRequestsInspector.tsx`), bumped to `v2.1.117`, restarted Vite dev server, and verified HTTP 200 transforms, `npx tsc --noEmit`, `eslint`, `test:vite-reload-modules`, `test:client-pretransform-health`, `test:react-instance-and-vite-reload-hotfix`, `compile_applet`, and `lint_applet`.
- Prompt 202 (Continue Backlog — "go on"): Completed & verified remaining active tasks (`Task 413` `v2.1.115` & `Task 409` `v2.1.116`); all active backlog tasks now completed and archived in `docs/done.md`.
- Prompt 201 (Tasks 410–413 — Listening Game: Configurable Languages & Order, Word Sorting, TTS Speed Override, & Both Lists Playback):
  - Task 410 [COMPLETED & VERIFIED]: Chapter 1 — Allow setting the list of languages to listen to & their playback order (`listeningGame.ts`, `ListeningGamePanel.tsx`, `WordBalloonLearningView.tsx`, `src/routes/index.tsx`, Storybook), verified via `test:listening-languages-order`.
  - Task 411 [COMPLETED & VERIFIED]: Chapter 2 — Allow sorting the list of words by alphabet, word size, or sentence length (word count) with asc/desc direction (`test:listening-word-sorting` PASSED).
  - Task 412 [COMPLETED & VERIFIED]: Chapter 3 — Allow setting a TTS-play speed override to override the configured per-language rate (`test:listening-tts-speed-override` PASSED).
  - Task 413 [COMPLETED & VERIFIED]: Chapter 4 — Fixed clicking "Both" (`listening-list-both-tab` & `listening-play-all-both-btn`) so it triggers listening to both words and their derived/filtered sentences sequentially (`test:listening-both-playback` PASSED, `v2.1.115`).
- Prompt 200 (Hotfix — Vite Startup Pre-Transform Stale Module Cache & Clean Dev Server Verification):
  - Hotfix [COMPLETED & VERIFIED]: Confirmed zero references to `componentOptimizationService` across all 200 `src/` modules (`Checked 200 files in src/. Bad: 0`), verified zero TypeScript/runtime/FloatingErrorButton errors in live headless Chromium, and restarted the Vite dev server to clear the container-boot pre-transform log error recorded before workspace file sync completed.
- Prompt 199 (Continue Backlog — "go on"): Execute active Prompt 197 chapters serially (`Task 407` -> `Task 408` -> `Task 409`).
- Prompt 198 (Hotfix — Fix Vite Pre-transform Cache & On-Demand Translation CORS Console Error Flood):
  - Hotfix [COMPLETED & VERIFIED]: Verified zero stale `componentOptimizationService` imports across `BottomLogViewer.tsx`, `AlternativeVideoPlayerView.tsx`, and `CanvasBalloonGame.tsx`; fixed `translate.googleapis.com` 302 `/sorry/index` CORS `console.error` flood in `onDemandTranslationManager.ts` (browser-first `clients5.google.com` CORS-enabled endpoint, typed `extractTranslatedText`, 5m cooldown circuit-breaker, concurrency-capped lookahead); restarted Vite dev server and bumped to `v2.1.114`.
- Prompt 197 (Tasks 406–409 — Listening Game Word Cards: Remove "X letters", Fix Word TTS Playback, Show & Play Derived Sentence + Translation, UI/UX Space Optimization):
  - Task 406 [COMPLETED & VERIFIED]: Chapter 1 — Removed `{item.letterCount} letters` badge from Listening Game word cards (`ListeningGamePanel.tsx`).
  - Task 407 [COMPLETED & VERIFIED]: Chapter 2 — Fixed Listening trigger dropping the base word before speaking its translation (`cancelSpeech` / `window.speechSynthesis.cancel()` async race in `src/routes/index.tsx`, `src/lib/alternative-tts.ts`, and `ListeningGamePanel.tsx`, verified via `test:listening-word-base-before-translation` + Chromium E2E).
  - Task 408 [COMPLETED & VERIFIED]: Chapter 3 — Displayed the original sentence from which each word is derived (`item.sourceSentence`, highlighting derived word) and allowed playing that sentence and its translation (`handlePlayWordSentence`), verified via `test:listening-word-derived-sentence`.
  - Task 409 [COMPLETED & VERIFIED]: Chapter 4 — Structured word cards into an aligned two-band layout (`listening-word-band-*` + `listening-word-sentence-band-*`) with `max-h-[26rem]` list containers and zero truncation (`test:listening-word-cards-ui-ux` PASSED, `v2.1.116`).
- Prompt 196 (Task 405 — Listening Game Words List On-Demand Translation & Default Play):
  - Task 405 [COMPLETED & VERIFIED]: Added normalized sync cache & concurrent deduplication in `zeroKnowledgeWordManager.ts`, scrollable `IntersectionObserver` + concurrency-capped on-demand word translation fetching and inline rendering (`listening-word-ondemand-translation-*`) across all word cards (including scrolled items like #73) in `ListeningGamePanel.tsx`, and default parallel resolution + playback of the on-demand word translation on `Listen` / `Listen All` play requests (`speakWordEntry`), verified in unit/source & live Chromium E2E (`test:listening-word-ondemand-translation`), `v2.1.113`.
- Prompt 195 (Hotfix + Task 404 — Fix App Errors, HMR/FloatingErrorButton State & Game View Words List TTS-Play):
  - Hotfix & Task 404 [COMPLETED & VERIFIED]: Eliminated false `[State Machine] Native speech synthesis failed` `FloatingErrorButton` error flood during TTS playback when native speech voices are unavailable or fail; refactored `playAlternativeTtsAudio` & `executeTtsFallbackSequence` to return strict `Promise<boolean>` playback outcomes (`skipInternalWebSpeechFallback`, clean `activeAudioCancel`); enabled automatic TTS3 fallback (`auto`/`google`) unless `native_only` in both `executeSingleSpeech` and `BeginnerPreferencesTab.tsx`; added synchronous `unlockTtsAudioPlayback()` across `ListeningGamePanel.tsx` and `handleSpeakTextFromAlternativeView`; fixed `FloatingErrorButton.tsx` drag listener churn (`positionRef`) and `WordBalloonLearningView.tsx` `useMemo` dependency warning (`[matchPairs]`); fixed `BeginnerPreferencesTab.tsx` explicit `any`; bumped version to `v2.1.112` and verified with Playwright Chromium E2E (`test:listening-words-tts-playback`), `npx tsc --noEmit`, `compile_applet`, `lint_applet`, and `test:agents-all` (22/22).
- Prompt 194 (Task 404 — Fix Game View Words List TTS-Play Execution & Fallback Chain):
  - Task 404 [COMPLETED & VERIFIED WITH HOTFIX P195]: See Prompt 195 above; `listening-play-all-words-btn`, `listening-play-word-*`, and `listening-play-all-sentences-btn` verified in live Chromium E2E triggering real `tts3.lovable.app` synthesis with zero floating/console/page errors.
- Prompt 193 (Task 403 — Game View List TTS-Play Fix, Guided Wizard Menu & Empty-Content Guard):
  - Task 403 [COMPLETED & VERIFIED]: Fixed `listening-play-all-words-btn` / `listening-play-all-sentences-btn` sequential TTS-play `Promise` return & stop cancellation (`v2.1.111`), added `rows[0]` fallback + `game-empty-content-wizard` with explicit `[Fixture]` loader, and added step-by-step `game-wizard-menu` across Beginner & Advanced modes + Storybook, verified by `test:game-view-tts-wizard`.
- Prompt 192 (Tasks 400, 401, 402 — Log Error Copy Modes, Listening Game Mode, & TTS-Play History Stage):
  - Task 400 [COMPLETED & VERIFIED]: Chapter 1 — Log Element Error Copy Modes (`BottomLogViewer.tsx`, `FloatingErrorButton.tsx`, `StateMachineActionLogsInspector.tsx`): error-only & around-error copy buttons (`v2.1.108`), verified by `test:log-error-copy-modes`.
  - Task 401 [COMPLETED & VERIFIED]: Chapter 2 — Game Mode Listening Game (`ListeningGamePanel` + `WordBalloonLearningView` + `listeningGame.ts` + Storybook): with/without translations toggle, words minLetters filter, and punctuation sentences maxWords filter across Beginner & Advanced modes (`v2.1.109`), verified by `test:listening-game-mode`.
  - Task 402 [COMPLETED & VERIFIED]: Chapter 3 — History Stage TTS-Play History (`TtsPlayHistoryPanel` + `ttsPlayHistory` store + Storybook): records and displays played sentence, translation & language used, timestamp, videoId/title, playback position, provider, and source for debugging/reproducing behavior across Advanced Stage 6 & Beginner Mode (`v2.1.110`), verified by `test:tts-play-history-stage`.
- Prompt 190 / Prompt 191 (Task 399: Keep localStorage Data Between Android Installations):
  - Task 399 [COMPLETED & VERIFIED]: Preserved WebView `localStorage` across Android APK upgrades, signature-mismatched reinstalls, and Auto Backups via non-wipe `update.apk.sh`/`install-apk.sh` upgrade flow (`run-as` backup/restore on collision purge), native `AndroidNativeShell` (`saveLocalStorageBackup`/`readLocalStorageBackup`) backed by `SharedPreferences` + `filesDir` + external Documents mirror + `onPause()` flush, Android Auto Backup `@xml/backup_rules` & `@xml/data_extraction_rules`, and synchronous WebView startup restoration (`setupAndroidLocalStoragePersistence` in `src/lib/android-local-storage.ts`), verified with `test:android-localstorage-persistence`, `test:android-loading`, `test:apk-installable`, `test:agents-all` (22/22), `compile_applet`, and `lint_applet` (`v2.1.107`).
- Prompt 186 (Task 263 Later 2: Executable Later Tasks Only — Enforce Same Components Policy in AGENTS.md & Parity Audit):
  - Task 263 (Later 2) [COMPLETED & VERIFIED]: Formalized "Same Components Policy (Only Order Differs)" between Beginner & Advanced modes in `AGENTS.md`, verified all 16 shared component blocks across both modes via `scripts/verify-same-components-parity-policy.ts` (integrated as check 22/22 in `verify-agents-all.ts`), cleaned up stale `Task 224` in `docs/later.md`, bumped version to `v2.1.106` (`code: 20206`), and skipped hardware/external/user-review blocked later items.
- Prompt 183 (Hotfix: Verify bun install & Full Post-Recovery Build/Lint/Test Validation):
  - Hotfix [COMPLETED & VERIFIED]: Verified `bun install` exits cleanly (`EXIT=0`, 700 installs across 831 packages), ran full post-recovery `compile_applet`, `lint_applet`, `npx tsc --noEmit`, `test:stage-click-view-visibility`, `test:video-stage-visibility-no-word-game`, `test:vite-reload-modules`, and `test:agents-all`.
- Prompt 182 (Hotfix: Diagnostic Fix-It Check, Stage Click Visibility Test Alignment & Dev Server Clean State):
  - Hotfix [COMPLETED & VERIFIED]: Diagnosed Vite client HMR notification log (`2:40:10 AM [vite] (client) hmr update ...`), verified zero TS/lint/runtime errors in headless Chromium across Advanced (Stages 1-5 -> 3) & Beginner modes, aligned `scripts/verify-stage-click-view-visibility.ts` with Stage 3/5 player slot sharing, and restarted dev server for clean state.
- Prompt 181 / Prompt 184 (Task 397 & Task 398):
  - Task 397 [COMPLETED & VERIFIED]: Fixed Stage 3 / Beginner Video tab showing `WordBalloonLearningView` or disappearing player accordion/controls when transitioning from Stage 5 or stale `localStorage` state (`v2.1.104`).
  - Task 398 [COMPLETED & VERIFIED]: Added 3rd option (`menu-option-tts-play`) to `FloatingDraggablePauseButton` floating controls menu (`div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1)`), wired persistent global TTS-Play toggle (`autoPlayTTS` default `true` in `yt_app_settings_v4`) in `src/routes/index.tsx`, updated Storybook, added `verify-floating-menu-third-option-tts-play.ts`, and bumped version to `v2.1.105`.
- Prompt 180 (Task 396: Define king-of-comma & mother-tongue-language Default Subtitle Auto-Selection):
  - Task 396 [COMPLETED & VERIFIED]: Defined `king-of-comma` (`resolveKingOfComma` in `subtitlePunctuationStats.ts`) selecting the highest-comma language automatically as translation `baseLanguage`, and `mother-tongue-language` (`generateMotherTongueFromKingOfComma` / `setMotherTongueLanguage` in `defaultLanguageManager.ts`) generated from `king-of-comma` and acting as `default-language`; exposed cleanly in `#switchable-default-subtitles-bar` across Beginner Mode, Advanced Mode, and Storybook; added `verify-king-of-comma-and-mother-tongue.ts`, bumped version to `v2.1.103`, passed all tests, `eslint`, and `tsc --noEmit`.
- Prompt 179 (Task 395: Unfoldable Per-Language Eligible Records 2-Column List):
  - Task 395 [COMPLETED & VERIFIED]: Added `getEligibleLanguageRecords` in `newSubtitlesParser.ts` (shared with `computeLanguageCriteriaStats`), made per-language rows unfoldable in `LearningGoalsFiltersPanel.tsx` exposing a 2-column table (language record + matching default language text) across Advanced and Beginner modes, added `verify-learning-goals-unfold-eligible-records.ts`, bumped version to `v2.1.102`, passed all tests, `tsc --noEmit`, `compile_applet`, and `lint_applet`.
- Prompt 178 (Task 394: Show Eligible/Valid Record Statistics in LearningGoalsFiltersPanel):
  - Task 394 [COMPLETED & VERIFIED]: Added `computeLanguageCriteriaStats`, `computeOverallCriteriaStats`, and `languageSkipIncomplete` matching support in `newSubtitlesParser.ts`; wired `rows` & `baseLanguage` to `LearningGoalsFiltersPanel` across `SubtitlesTablePanel` and Advanced/Beginner Learning Goals; rendered live per-language and overall eligible/valid record statistics; added `verify-learning-goals-criteria-statistics.ts`; bumped version to `v2.1.101`; passed all tests, `tsc --noEmit`, `compile_applet`, and `lint_applet`.
- Prompt 177 (Task 393: Remove 3 Redundant Dropdowns in LearningGoalsFiltersPanel):
  - Task 393 [COMPLETED & VERIFIED]: Removed the 3 focused redundant dropdowns (`#learning-goals-add-language-dropdown`, `#learning-goals-lang-max-words-dropdown-${lang.code}`, `#learning-goals-lang-complete-dropdown-${lang.code}`) from `LearningGoalsFiltersPanel.tsx`, keeping the stepper/numeric input and switch controls intact across both Advanced and Beginner modes, added `verify-learning-goals-remove-redundant-dropdowns.ts`, bumped version to `v2.1.100`, synced Android version, and passed all tests, `tsc --noEmit`, `compile_applet`, and `lint_applet`.
- Prompt 176 (Hotfix: Fix Duplicate React Key Error "pt-BR" & Deleted Optimization Imports):
  - Hotfix [COMPLETED & VERIFIED]: Canonicalized & deduplicated language codes (`pt-br` vs `pt-BR`) across `orderedLangs`, `activeCatalog`, `LanguageBoxesSelector`, and all language list `.map()` renders with compound keys; replaced deleted `@/utils/componentOptimizationService` imports across 4 components via modular helpers (`newSubtitlesParser.ts` + local utilities); removed deleted script entries; bumped version to v2.1.99; passed `test:unique-language-keys`, `tsc --noEmit`, `compile_applet`, and `lint_applet`.
- Prompt 175 (Task 392: Rollback Learning Goals Accordions & Retain Open Category for Row-Criteria):
  - Task 392 [COMPLETED & VERIFIED]: Rolled back `LearningGoalAccordion` wrapping from Learning Goals across both Advanced Mode (`src/routes/index.tsx`) and Beginner Mode (`BeginnerPreferencesTab.tsx`), restoring clean, permanently visible open category containers. Retained the dedicated "row-criteria" category (`#stage-2-ingredient-row-criteria-section` / `#beginner-row-criteria-section`) hosting `LearningGoalsFiltersPanel` for configuring max words limitation filter per language. Enhanced `componentOptimizationService.ts` and `SubtitlesTablePanel.tsx` to filter rows according to per-language word limits. Passed `verify-learning-goals-rollback-and-row-criteria.ts`, passed compile and lint, bumped version to v2.1.98.
- Prompt 174 (Hotfix: Fix Missing componentOptimizationService Module, Dev Server Pre-Transform & TypeScript Errors):
  - Hotfix [COMPLETED & VERIFIED]: Restored `src/utils/componentOptimizationService.ts` with complete type definitions (`tokenizeSentenceToWordTokens`, `filterLogEntriesOptimized`, `isSubtitleRowMatchingCriteria`, `filterSubtitleRowsByCriteria`, `createVisibilitySafeAnimationLoop`, `shouldComponentProcess`), restarted Vite dev server, passed `npx tsc --noEmit` with 0 errors, passed `npm run test:hotfix-component-optimization-service`, passed `compile_applet` and `lint_applet`, bumped version to v2.1.97.
- Prompt 173 (Task 372: Subtitles-Table Highlight vs Filter Toggle):
  - Task 372 [COMPLETED & VERIFIED]: Added `criteriaMatchAction` ("filter" | "highlight") persistent preference, toggle control in `SubtitlesTablePanel.tsx`, and highlighting matching sentences with `data-testid="row-criteria-highlighted"`.
- Prompt 172 (Hotfix: Fix TypeScript Compile Errors & Stale HMR Module Resolution):
  - Hotfix [COMPLETED & VERIFIED]: Resolved undeclared variable `curPlaying` in `src/routes/index.tsx`, added missing `NewSubtitlesParserBar` import in `src/components/SubtitlesTablePanel.tsx`, supported `readonly LogEntry[]` in `filterLogEntriesOptimized`, passed `npx tsc --noEmit` with 0 errors, refreshed dev server, added dedicated test `scripts/verify-hotfix-dev-errors-resolution.ts`, passed compile and lint, bumped version to v2.1.95.
- Prompt 171 (Task 391: Optimize Application - Inactive/Hidden Components Zero-Processing, Pure Components & Logic in Services):
  - Task 391 [COMPLETED & VERIFIED]: Extracted pure logic to `componentOptimizationService.ts`, memoized 16 core UI components, gated background timers and animation frames, passed `verify-inactive-components-zero-processing.ts`.
- Prompt 170 (Task 381: OpenAPI Multi-Provider Testing, Playback & Custom Auto Provider Selection):
  - Task 381 [COMPLETED & VERIFIED]: Added custom multi-provider testing, playback verification, and provider selection.
- Prompt 169 (Task 380: Strict Sequential TTS Playback & Respect Audio Playing Duration):
  - Task 380 [COMPLETED & VERIFIED]: Enqueued `playAlternativeTtsAudio` and `speak(...)` sequentially via `activePlaybackQueue` and `activeSpeechQueue`, preserving full audio duration without overlapping or cutoffs, verified cancellation flushes, added dedicated test `scripts/verify-tts-playback-duration-and-queue.ts`, bumped version to v2.1.93.

- Prompt 166 (Hotfix: Fix ReferenceError - TDZ on showWordBalloonLearningView in src/routes/index.tsx):
  - Hotfix [COMPLETED & VERIFIED]: Resolved TDZ ReferenceError by relocating the pause useEffect to after `showWordBalloonLearningView` is declared and initialized, passed `verify-hotfix-word-balloon-init.ts`, bumped version to 2.1.90.
- Prompt 165 (Task 389: Word Balloons Stage - Remove Video Player & Deliver Pure Learning Words Game):
  - Task 389 [COMPLETED & VERIFIED]: Removed video player constraints, URL input, and video display controls from Word Balloons/Learning game stage in `BeginnerVideoTab.tsx`, added auto-pause of video playback on entering game view or Stage 5 in `src/routes/index.tsx`, verified zero video distractions and 100% pure learning games with "Back to Video" control, passed `verify-word-balloons-stage-no-video.ts`, bumped version to 2.1.89.
  - Task 380 [PENDING]: Strict sequential TTS playback and respect audio playing duration.
- Prompt 164 (Diagnostic Fix-It Check & Dev Server Clean State):
  - Hotfix [COMPLETED & VERIFIED]: Diagnosed Vite client HMR notification log, confirmed clean zero-error build via `compile_applet` and 0 lint warnings via `lint_applet`, refreshed dev server to ensure clean in-memory state.
- Prompt 163 (Task 388: Visible Global Row-Criteria in Subtitles Table View, Learning Goals Dropdown Lists, Per-Language Row-Criteria & Default Language Filtering):
  - Task 388 [COMPLETED & VERIFIED]: Made global Row-Criteria visibly rendered in `SubtitlesTablePanel.tsx`, added dropdown lists for max words, sentence completeness, and per-language selection in `LearningGoalsFiltersPanel.tsx`, filtered displayed rows by default language word limit, passed all dedicated tests (`verify-learning-goals-dropdowns-and-row-criteria.ts`).
- Prompt 161 (Hotfix: Fix Vite Reload, Module Import & Syntax Errors):
  - Hotfix [COMPLETED & VERIFIED]: Diagnosed Vite client reload logs caused by rapid multi-module invalidations, restarted dev server to clean module cache, audited HTTP 200 transforms across all 17 target components, optimized `AGENTS.md` size to 20,550 bytes (< 21,000 bytes budget) with 21/21 contract checks passing, added dedicated test `scripts/verify-vite-reload-and-modules-hotfix.ts`, bumped version to 2.1.86.
- Prompt 160 (Hotfix: Fix Duplicate React Key Error for "pt-BR"):
  - Hotfix [COMPLETED & VERIFIED]: Deduplicated `targetLanguages`, `favoriteLanguages`, and `learningLanguages` in `src/routes/index.tsx`, `LearningGoalsFiltersPanel.tsx`, `appSettings.ts`, `BeginnerFavoriteLanguageSelector.tsx`, and `GlobalFavoriteLanguagesPanel.tsx`, added dedicated test `scripts/verify-unique-language-keys.ts`, bumped version to 2.1.85.
- Prompt 159 (Hotfix: Fix Syntax Error in src/routes/index.tsx - Missing Closing Tag for <div>):
  - Hotfix [COMPLETED & VERIFIED]: Fixed unclosed `<div id="stage-2-language-ratios-container">` in `src/routes/index.tsx`, fixed `isAudioTrackMode: audioTrackMode` in state provider registration, added `return fallback;` to `getEffectiveLanguageMaxWords`, bumped version to 2.1.84.
- Prompt 158 (Resume Backlog - Learning Goals Folded Accordions & Row-Criteria Per Language):
  - Task 386 [COMPLETED & VERIFIED]: Chapter 1 (from Prompt 154) - Learning Goals Folded Accordions with Timeout (`LearningGoalAccordion` with `defaultOpen={false}`, 10s auto-fold hourglass indicator, pin toggle, 100% parity across Advanced and Beginner modes).
  - Task 387 [ACTIVE]: Chapter 2 (from Prompt 154) - Learning Goals Row-Criteria Per Language (max words limit, complete sentence punctuation filter per language, reset options, 100% parity across modes).
  - Task 388 [PENDING]: Chapter 3 (from Prompt 154) - Subtitles Table View Visible Global Row-Criteria with Default Language Filtering.
- Prompt 157 (Bug Report / Diagnostic Error Log: Register State Provider, Prioritize Errors & Cap Reproduction Sequence):
  - Hotfix [COMPLETED & VERIFIED]: Fixed `[State provider not registered]` by registering live app state provider in `src/routes/index.tsx`, prioritized active errors at `## 0. Active Errors & Failures` at top of diagnostic report in `src/utils/logBuffer.ts`, capped reproduction sequence to prevent clipboard truncation (>65KB), mirrored network requests into `logBuffer`, bumped version to 2.1.82.
- Prompt 156 (Replace Word Balloons Stage with Subtitles Sentence & Word Learning Game):
  - Task 390 [COMPLETED & VERIFIED]: Replace Word Balloons Stage with interactive Subtitles Sentence & Word Learning Game (Sentence Builder, Word Match, Missing Word, and Word Discovery) driven by current subtitles, with zero video distraction.
- Prompt 155 (Hotfix: Vite Reload Failure & Undeclared Identifiers in index.tsx):
  - Hotfix [COMPLETED & VERIFIED]: Resolved undeclared identifiers `isPlaying` and `handlePause` in `src/routes/index.tsx`, verified dev server transforms, clean module imports, bumped version to 2.1.80.
- Prompt 154 (Disable Readme Flow, Learning Goals Folded Accordions with Timeout, Per-Language Row-Criteria, Subtitles Table Global Row-Criteria Default Lang Filter, Word Balloons Stage Video Removal):
  - Task 385 [COMPLETED & VERIFIED]: Chapter 0 - Disable GitHub Actions Readme Workflow (`update-readme.yml`).
  - Task 386 [ACTIVE]: Chapter 1 - Learning Goals Folded Accordions with Timeout (`AccordionSection`).
  - Task 387 [PENDING]: Chapter 2 - Learning Goals Row-Criteria Per Language.
  - Task 388 [PENDING]: Chapter 3 - Subtitles Table View Visible Global Row-Criteria with Default Language Filtering.
  - Task 389 [SUPERSEDED by Task 390]: Chapter 4 - Word Balloons Stage Video Removal.
- Prompt 153 (Hotfix: Fix Maximum Update Depth Exceeded in React Components):
  - Hotfix [COMPLETED & VERIFIED]: Fixed recursive `useEffect` / `setState` triggering "Maximum update depth exceeded" in `src/routes/index.tsx`.
- Prompt 152 (Fix GitHub Actions Demo Website Deployment):
  - Task 384 [COMPLETED & VERIFIED]: Fixed concurrency in `deploy-demo.yml` (`cancel-in-progress: false`, scoped by event_name), removed APK release trigger, restored minimalist README, bumped version to 2.1.78.
- Resumed Active Backlog: Task 380 [PENDING], Task 381 [PENDING], Task 372 [PENDING] in [`docs/tasks.md`](tasks.md).



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
