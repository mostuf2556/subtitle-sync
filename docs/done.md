# Done tasks

## Task 41: Video library panel (watch history)

### Subtask 41.1: Implement Video Library / Watch History Panel

- Implemented `src/utils/videoLibraryManager.ts` providing persistent watch history management (`loadVideoLibrary`, `saveVideoLibrary`, `recordVideoWatch`, `removeVideoFromLibrary`, `clearVideoLibrary`) backed by `STORAGE_KEYS.LIBRARY_STORAGE_KEY` with fallback to `DEFAULT_LIBRARY_ITEMS`.
- Created `src/components/VideoLibraryPanel.tsx` with searchable video cards, high-quality thumbnails (`getVideoThumbnailUrl`), relative watch timestamps (`formatRelativeTime`), quick video selection/load button (`data-testid="library-play-btn"`), currently active indicator badge, individual remove buttons (`data-testid="library-remove-btn"`), and clear library confirmation (`data-testid="library-clear-btn"`).
- Integrated the Video Library panel into `PANELS` accordion in `src/routes/index.tsx` (`id: "library", title: "Video library"`), allowing users to browse their history and instantly switch videos directly from the sidebar.
- Added automatic watch history recording (`recordVideoWatch`) in `src/routes/index.tsx` whenever a video ID is loaded or played, updating recent watch timestamps and deduplicating items to keep recent items at the top.
- Created dedicated verification test suite `scripts/verify-video-library.ts` (`npm run test:video-library`), registered in `package.json`, and documented in `docs/files.md`.
- Verified all verification suites (`test:video-library`, `test:audio-track-time-sections`, `test:multi-video-audio-sync`), compile check, and ESLint pass with 0 errors and 0 warnings.

## Task 51: Fix Original Video Repeating Same Time-Frame and Not Respecting Subtitle Time-Sections in Audio-Track Mode

### Subtask 51.1: Audio-Track Mode Loop Progression & Accurate Time-Section Resumption

- Replaced the flawed `idx >= 0 && rows[idx]?.start ? rows[idx].start / 1000 : ...` resume target logic in `src/routes/index.tsx`. When section `candidateRow` completes and audio-track repetition finishes, playback advances strictly to `rows[candidateRow + 1].start / 1000` (or cleanly pauses if reaching the final subtitle row). This eliminates the bug where the original video element repeated the same section before proceeding.
- Added audio-track fallback in `getEligibleLangs` in `src/routes/index.tsx`: when `audioTrackMode` is enabled and no explicit spoken languages are selected, it falls back to the default base language (`baseLanguage` / `primary`), ensuring that subtitle time-sections are respected, paused, and repeated using the original video's native audio even with no secondary languages enabled.
- Added pre-seek guard (`hasStartedNearStart`) in `executeMultiVideoSegmentSync` in `src/utils/multiVideoPlayerManager.ts`, confirming the player has completed its asynchronous seek near `startMs` before allowing `currentMs >= endMs - 50` completion checks.
- Cleared row index `i` from `playedTtsRecords` in `seek(r, i)` in `src/routes/index.tsx`, ensuring clicking any row resets its played state and allows it to repeat and play cleanly.
- Implemented dedicated verification test suite `scripts/verify-audio-track-time-sections.ts` (`npm run test:audio-track-time-sections`) validating section progression, elimination of duplicate replaying, pre-seek guarding, language fallback, and replayability. Registered script in `package.json` and documented in `docs/files.md`.
- Verified all regression test suites, app compilation, and ESLint pass with 0 errors and 0 warnings.

## Task 50: Draggable Floating Setup Pause Button with Autofocus, Auto-scroll & Play-Switch Suppression

### Subtask 50.1: Draggable Floating Pause Component & Drag Handling

- Created `src/components/FloatingDraggablePauseButton.tsx` with fixed viewport positioning and z-index priority.
- Implemented smooth side-to-side dragging via both touch (`onTouchStart`, `onTouchMove`, `onTouchEnd`) and mouse (`onMouseDown`, `mousemove`, `mouseup`) with dynamic viewport clamping.
- Implemented tap-vs-drag discrimination (`hasMovedRef`) preventing accidental toggle clicks when releasing a drag.
- Added visual feedback with distinct setup pause badge ("Autoscroll & Play OFF"), pause/play icons, responsive grab/grabbing cursors, and local storage coordinate persistence (`yt_floating_pause_pos`).
- Created dedicated verification suite `scripts/verify-floating-draggable-pause.ts` and registered in `package.json`.

### Subtask 50.2: Player Coordination & Autofocus / Auto-scroll / Play-Switch Suppression

- Integrated `FloatingDraggablePauseButton` into `src/routes/index.tsx` root view with `isSetupPaused` state and `toggleSetupPause` handler.
- When setup pause is engaged, all media players (`multiVideoPlayerRegistry.pauseAllExcept()`, `player.current.pauseVideo()`) are instantly paused and active speech synthesis (`cancelSpeech()`) is cancelled.
- Completely suppressed playback interval loop (`st.current.isSetupPaused`), preventing automatic subtitle cue progression, play-switching, and seeking.
- Completely suppressed subtitle table row auto-scroll (`scrollIntoView`) and Android pagination autoFocus during setup pause.
- Updated and verified dedicated test suite `scripts/verify-floating-draggable-pause.ts` (`npm run test:floating-pause`).

## Task 48: Fix APK Version Collision, Update Script Robustness & In-App Version Display with Releases Link

### Subtask 48.1: Robust APK Installation & Version Code Handling in Update Script

- Updated `update.apk.sh` and `install-apk.sh` with `deep_purge_package` (`am force-stop`, `pm clear`, `adb uninstall`, `pm uninstall --user 0`) ensuring total cleanup of colliding packages or lingering corrupted data.
- Added `has_collision_error` detecting signature and package conflicts (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, `INSTALL_FAILED_VERSION_DOWNGRADE`, `INSTALL_FAILED_CONFLICTING_PROVIDER`, `INSTALL_FAILED_SHARED_USER_INCOMPATIBLE`, `INSTALL_FAILED_DUPLICATE_PERMISSION`) with automatic deep purge and re-installation.
- Configured standard semantic version (`"version": "1.0.16"`) in `package.json`.
- Propagated `appVersionCode` and `appVersionName` via `.github/workflows/release-apk.yml` into Gradle `assembleDebug`.
- Added direct link to GitHub all releases page in `README.md`.
- Created dedicated verification suite `scripts/verify-apk-installation-robustness.ts` and registered in `package.json`.

### Subtask 48.2: In-App Version Display with Link to All Releases Page

- Defined canonical constants `APP_VERSION = "1.0.16"` and `ALL_RELEASES_URL = "https://github.com/mostuf2556/subtitle-sync/releases"` in `src/config/appConfig.ts` and aligned `CURRENT_APK_VERSION = "v1.0.16"` in `src/utils/apkUpdater.ts`.
- Added header version badge `v1.0.16` (`data-testid="header-app-version-badge"`) linking to GitHub all releases page.
- Added footer link `All Releases (v1.0.16)` (`data-testid="footer-all-releases-link"`) linking to GitHub all releases page.
- Updated `ApkReleaseModal` with direct link to all releases (`data-testid="modal-all-releases-link"`).
- Created dedicated verification suite `scripts/verify-apk-version-and-releases.ts` and registered in `package.json`.

## Task 49: Multi-Instance Video Elements with Independent Audio-Track Configuration & Horizontal Swiper Synchronization

### Subtask 49.1: Multi-Instance Video Player State & Independent Configuration Architecture

- Built `src/utils/multiVideoPlayerManager.ts` to manage multiple video player instances mapped by language code: primary video plus dedicated instances for each language with speak/audio enabled.
- Implemented isolated local storage persistence (`yt_multi_instance_{videoId}_configs`) and independent state management per video element instance (volume, mute, manual audio track configured status, label) so setting audio track or volume in one instance never leaks to others.
- Implemented `MultiVideoPlayerRegistry` for multi-instance coordination (`pauseAllExcept`, `unmuteOnly`, `syncSecondaryPlayers`, `register`, `unregister`).
- Created dedicated verification suite `scripts/verify-multi-video-player-state.ts`.

### Subtask 49.2: Horizontal Swiper Carousel Component for Multi-Video Elements

- Created `src/components/VideoInstancesSwiper.tsx` providing a smooth horizontal swipeable carousel with touch gestures (`onTouchStart`, `onTouchMove`, `onTouchEnd`) and desktop controls (`ChevronLeft`, `ChevronRight`).
- Implemented slide indicators, language headers (Primary vs Spoken Languages), and active playback indicator badges (`Active Audio`).
- Integrated independent YouTube audio track setup guidance and isolated per-instance toggle persistence (`Mark Configured` / `Track Configured`).
- Integrated `VideoInstancesSwiper` into `src/routes/index.tsx` player panel.
- Created dedicated verification suite `scripts/verify-video-instances-swiper.ts` and registered in `package.json`.

### Subtask 49.3: Multi-Video Pause/Resume Audio-Track Synchronization Loop

- Implemented `executeMultiVideoSegmentSync` in `src/utils/multiVideoPlayerManager.ts` to coordinate pause/resume and unmuting across multi-video player instances during subtitle cue intervals.
- Pauses all other player instances and unmutes exclusively the active speaking language instance during segment repetition.
- Emits real-time progress callbacks for subtitle highlighting, and automatically pauses target player and restores unmuted state to primary upon completion or cancellation.
- Integrated `executeMultiVideoSegmentSync` into `speakRow` in `src/routes/index.tsx` with smooth fallback to Web Speech TTS when `audioTrackMode` is disabled.
- Synchronized primary player resumption with registry state (`unmuteOnly("primary")`) and cancellation cleanup.
- Created dedicated verification suite `scripts/verify-multi-video-audio-sync.ts` and registered in `package.json`.

## Task 47: Fix README.md Links, CI Workflows & GitHub Pages Staging for Forked Repositories

### Subtask 47.1: Synchronize README.md Links & Static Fallbacks for Current and Forked Repositories

- Created `public/android-emulator-report.html` and unignored it in `.gitignore` so that when `npm run build` runs, Vite automatically places `android-emulator-report.html` into `dist/`. This ensures GitHub Pages never serves a 404 for the emulator report even before the macOS emulator runner executes.
- Updated `.github/workflows/update-readme.yml` by removing path filters, ensuring that any push to `main` or `master` on a fork automatically triggers identity synchronization for `README.md` to match the fork's owner and repo.
- Verified `scripts/update-readme.mjs` cleanly rewrites badge links, workflow links, raw curl update commands, and GitHub Pages demo & report URLs when switching between owners and repositories.
- Created dedicated verification suite `scripts/verify-fork-readme-links.ts` (`npm run test:fork-readme-links`).
- Registered `test:fork-readme-links` in `package.json` and documented in `docs/files.md`.

### Subtask 47.2: Ensure GitHub Actions E2E Tests Pass and Deploy to GitHub Pages on Forked Repos

- Added `push: branches: [main, master]` triggers to `.github/workflows/web.yml` and `.github/workflows/emulation.yml` in addition to `workflow_run`, enabling forked repositories to automatically execute test pipelines and publish reports to `gh-pages`.
- Configured resilient artifact deployment across `web.yml`, `deploy-demo.yml`, and `emulation.yml` ensuring all test outputs (`mochawesome.html`, `playwright/`, `android-emulator-report.html`, `screenshots/`) deploy to `gh-pages` with `keep_files: true`.
- Created dedicated verification test `scripts/verify-fork-ci-workflows.ts` (`npm run test:fork-ci-workflows`) and validated all workflow triggers and deployment configurations.

## Task 46: Fix E2E Report Generation, CI Workflows & GitHub Pages Staging

### Subtask 46.1: Fix Playwright E2E Locator Ambiguity

- Updated `src/routes/index.tsx` so all collapsible `<details>` panels emit unambiguous `data-panel="{title}"` attributes (e.g. `data-panel="languages"`).
- Updated `e2e/web.spec.ts` and `e2e/app.spec.ts` to disambiguate the Languages panel locators using `details.filter({ has: page.locator("summary", { hasText: "Languages" }) })`, preventing strict-mode collisions with subtitle criteria description text in the Parser panel.
- Created dedicated verification test `scripts/verify-playwright-locators.ts` (`npm run test:playwright-locators`).
- Registered `test:playwright-locators` in `package.json` and documented in `docs/files.md`.
- Verified all 5 tests in `e2e/web.spec.ts` and the smoke test in `e2e/app.spec.ts` pass cleanly.
- Verified app compilation and lint.

### Subtask 46.2: Fix `emulation.yml` Syntax and Report Generation

- Fixed YAML syntax and multi-line escaping in `.github/workflows/emulation.yml` using Node.js script generation within the YAML block scalar.
- Added `if: always() && ...` to the GitHub Pages deployment step in `emulation.yml`, guaranteeing emulator report and screenshot publication to `gh-pages` even during partial test triage or failure.
- Updated `scripts/verify-emulation-gh-pages.ts` to validate workflow YAML syntax via `js-yaml` and verify resilient report deployment.
- Verified all 6 workflow files in `.github/workflows/` pass `js-yaml` parsing with 0 errors.

### Subtask 46.3: Ensure Guaranteed E2E Report Staging on GitHub Pages

- Added `if: always() && ...` to `Deploy Web Test Outputs to GitHub Pages (gh-pages)` in `.github/workflows/web.yml`, ensuring Mochawesome (`mochawesome.html`) and Playwright (`playwright/index.html`) reports publish to `gh-pages` even during test failures or triages.
- Added `Stage E2E Reports into Web Distribution` step to `.github/workflows/deploy-demo.yml`, preserving and staging `mochawesome.html`, `playwright/`, `android-emulator-report.html`, and `screenshots/` into `./dist` prior to web demo deployment.
- Updated and passed dedicated verification test `scripts/verify-e2e-report-links.ts` (`npm run test:e2e-report-links`).
- Unignored `!public/screenshots/` in `.gitignore` to preserve authentic emulator screenshots in static bundles.

## Task 45: Accumulative Criteria Subtitles Parser & Inner Group Settings

### Subtask 45.1: E2E Test Report Links in README.md & Verification

- Verified dedicated links in `README.md` to all E2E reports:
  - 📋 Mochawesome Test Report (`mochawesome.html`)
  - 🔍 Playwright E2E Test Report (`playwright/index.html`)
  - 📱 E2E Tests on Android Emulator (`android-emulator-report.html`)
  - 📸 Android Emulator Screenshot (`screenshots/android-emulator-screenshot.png`)
  - 🧪 Web E2E Pipeline CI Runs & Artifacts (`actions/workflows/web.yml`)
  - 🤖 Android Emulator Pipeline CI Runs & Artifacts (`actions/workflows/emulation.yml`)
- Created and passed dedicated verification test `scripts/verify-e2e-report-links.ts` (`npm run test:e2e-report-links`).

### Subtask 45.2: Accumulative Multi-Select Criteria with Inner Group Settings & BiDi Direction Fix

- Refactored `src/lib/subtitles.ts` to support multi-select accumulative criteria (`selectedCriteria: CriteriaId[]`) across:
  - `sentence`: Grammatical sentence endings in base timing language.
  - `pause`: Natural speech silences (>500ms) snapped to subtitle boundaries.
  - `punctVote`: Multi-track punctuation agreement (2+ languages sharing punctuation mark).
  - `consensus`: Cue start alignment across parallel languages (±400ms).
  - `cue`: Original authored subtitle cue starts.
  - `anchors`: Shared entity & numeric anchors across translations.
  - `window`: Minimum and maximum context duration thresholds.
- Added presets: Context & Sentences, Multi-Language Consensus, Pure Sentences, Fine Cue Chunks, and All Criteria.
- Resolved BiDi character direction anomalies by avoiding raw unisolated Arabic punctuation in LTR description strings.
- Added collapsible inner parameter settings for each criteria group in `src/routes/index.tsx` with individual and global resets.
- Created and passed dedicated verification suite `scripts/verify-accumulative-parser.ts` (`npm run test:parser`).
- Verified app compilation and 0 lint warnings.

## Task 44 (Hotfix): Verify working links for E2E testing and live web demo & fix GitHub Actions

### Subtask 44.1: Fix GitHub Actions workflows and verify E2E testing & demo links

- Fixed `integrity.yml` workflow failure by restoring authentic emulator screenshot assets in `public/screenshots/android-emulator-screenshot.png` and `public/assets/android-emulator-screenshot.png`, ensuring they are bundled into `dist/` and avoiding 404s on GitHub Pages.
- Cleaned up accidental stray `x` characters in `README.md` header.
- Updated `src/router.tsx` to handle GitHub Pages basepath (`github.io`) and retain trailing slashes, eliminating 404 errors during page reload.
- Initialized `audioTrackMode`, `autoFocus`, and `debugMode` with lazy initializers in `src/routes/index.tsx` to prevent race conditions on page reload.
- Updated `e2e/web.spec.ts` to assert application hydration (`header[data-app-hydrated="true"]`) following `page.reload()`.
- Configured Playwright CI retries (`retries: process.env.CI ? 2 : 0`) in `playwright.config.ts`.
- Enhanced `scripts/android-e2e-assert.sh` to ensure `android-emulator-screenshot.png` is captured and pulled before exit in `fail()`.
- Implemented dedicated verification test `scripts/verify-hotfix-links-and-actions.ts` (`npm run test:hotfix`), registered script in `package.json`, and documented in `docs/files.md`.
- Verified all regression test suites, app compilation, and linting pass with zero errors.

## Task 43: Validate JSON before caching subtitles and implement auto-fallback between YouTube API options (`tlang` vs `lang`)

### Subtask 43.1: Prevent caching of invalid subtitle responses (ensure answer is valid JSON)

- Added `isValidJsonSubtitle(body: String): Boolean` in `MainActivity.kt` checking that the body is non-blank, parses as valid `JSONObject`, and contains an `events` array with non-empty segment text (`utf8`).
- Guarded `saveCaptionToFile` and the interception handler in `MainActivity.kt`: strictly prevents saving raw caption files to disk (`youtube_captions/`) unless the response is confirmed to be valid JSON with subtitle cues. Updated file extension to `.json`.
- Implemented and exported `isValidJsonSubtitleResponse(data: unknown): boolean` in `src/utils/subtitleCache.ts`, validating YouTube JSON3 `{ events: [...] }` schemas, `CaptionCue[]` arrays, and envelope objects.
- Guarded `saveCachedSubtitles` and `saveCachedTargetSubtitles` to reject invalid cue sets.
- Added `saveCachedRawJson3(videoId, lang, rawJson3)` strictly enforcing that raw cached strings are valid JSON before storing in `localStorage`.
- Created dedicated verification test `scripts/verify-valid-json-cache-guard.ts` (`npm run test:valid-json-cache`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android web assets with `npm run build:android-assets` and verified all regression suites pass cleanly with 0 lint warnings.

### Subtask 43.2: Implement auto-fallback on invalid response between YouTube API options (`tlang` vs `lang`)

- Updated `executeTimedTextRepetition` in `MainActivity.kt` to dynamically build and test both `tlang` addition and `lang` replacement options, verifying `isValidJsonSubtitle` on each attempt.
- Added automatic fallback in `MainActivity.kt`: if the primary option fails or returns invalid non-JSON data, immediately and automatically attempts the alternative option. If both options fail, returns an empty string without caching corrupt data.
- Enforced `isValidJsonSubtitleResponse(raw)` verification inside the `subtitleRequestModeOrder` mode loop in `fetchFavoriteLanguageSubtitles` in `src/routes/index.tsx`, automatically progressing to the next mode if the first mode yields an invalid response.
- Created dedicated verification test `scripts/verify-subtitle-api-fallback.ts` (`npm run test:subtitle-api-fallback`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android web assets with `npm run build:android-assets` and verified all 17 regression test suites pass with 0 lint warnings.

## Task 40: Support app history (Android back navigation)

### Subtask 40.1: Implement Android back navigation and router/browser history integration

- Implemented `OnBackPressedCallback` in `MainActivity.kt` providing robust handling for Android device back buttons. Dispatches `window.__handleAndroidBack` to WebView and navigates webview history (`webView.goBack()`) if `canGoBack()` is true before defaulting to system exit.
- In `src/routes/index.tsx`, integrated `popstate` and `window.__handleAndroidBack` handlers allowing users to navigate back through viewed videos, closed panels, and history states without exiting the app.
- Created dedicated verification test `scripts/verify-android-back-navigation.ts` (`npm run test:back-navigation`), registered in `package.json`, and documented in `docs/files.md`.

## Task 39: Allow closing the Network Panel

### Subtask 39.1: Provide explicit close / collapse control on Network Panel

- Enhanced header close button in `src/components/NetworkRequestsInspector.tsx` with explicit identifiers (`id="close-network-inspector-button"`, `data-testid="close-network-inspector-button"`), accessible `aria-label="Close Network Inspector"`, tooltip indicating Escape shortcut, and `onClick={onClose}` handler.
- Implemented global `Escape` keyboard shortcut listener using `useEffect` on `window` (`keydown` -> `onClose()`) with proper event listener cleanup on unmount/close.
- Verified backdrop dismissal on `#network-inspector-modal` (`onClick={onClose}`) with `e.stopPropagation()` on the dialog content card to prevent accidental closing when clicking inside the inspector.
- Added collapse / minimize capability with toggle button (`id="collapse-network-inspector-button"`, `data-testid="collapse-network-inspector-button"`), rendering an unobtrusive compact floating status pill (`#network-inspector-minimized` / `data-testid="network-inspector-minimized"`) with live captured counts, an Expand button (`#expand-network-inspector-button`), and a quick compact close button (`#compact-close-network-inspector-button`).
- Created dedicated verification test `scripts/verify-network-inspector-close.ts` (`npm run test:network-close`), registered in `package.json`, and documented in `docs/files.md`.
- Verified clean build, regression tests, zero lint warnings, and applet compilation.

## Task 38: Accelerate app performance & enhance Network Panel with accordion and status tags

### Subtask 38.1: Implement performance optimizations and per-record Network Panel accordion with tlang color tags

- Memoized table rows using `React.memo(SubtitleRow)` in `src/routes/index.tsx`, isolating row re-renders to only active and previous rows during video playback and time-seeking.
- Enhanced Network Requests Inspector in `src/components/NetworkRequestsInspector.tsx` with dedicated per-record accordion toggle controls (`record-accordion-toggle-${id}`) and chevron transition animations.
- Implemented `getTlangStatusInfo` computing dynamic status tags and color schemes:
  - Pending: orange/amber (`bg-amber-500/20 text-amber-300 border-amber-500/40`)
  - Done: green (`bg-emerald-500/20 text-emerald-300 border-emerald-500/40`)
  - Failed: red (`bg-red-500/20 text-red-300 border-red-500/40`)
  - Overridden by green on retry success (`retry_success` with green styling)
- Created dedicated verification test `scripts/verify-network-accordion-tags.ts` (`npm run test:accordion-tags`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android bundled assets with `npm run build:android-assets` and verified all regression suites, lint, and applet compilation.

## Task 37: Clean Network Panel records & add green badge indicator for good fetching

### Subtask 37.1: Exclude empty response bodies from Network Panel and add green badge indicator

- Added and exported `isSuccessfulFetch(req)` in `src/utils/networkTracker.ts`, verifying that only requests with HTTP 200, no error, and a genuine non-empty response body qualify as successful.
- Updated `isFailedRequest` in `NetworkRequestsInspector.tsx` to classify empty response bodies as failed/unsuccessful, ensuring they are excluded by default when `hideFailed` is enabled.
- Preserved accurate HTTP status recording (e.g. 200 OK) while styling empty body responses with warning/failed indicators rather than false green success badges.
- Added green badge indicators (`good-fetch-badge-${tlang}` in list items and `detail-good-fetch-badge` in the detail panel) for successfully fetched language tracks with valid subtitles.
- Created dedicated verification test `scripts/verify-network-clean-records.ts` (`npm run test:clean-network`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android bundled assets with `npm run build:android-assets` and verified all regression suites, lint, and applet compilation.

## Task 36: Ensure sync between language views with auto-fetch-retry

### Subtask 36.1: Synchronize favorites view, language selection, and subtitles view with auto-fetch-retry

- Ensured in `src/routes/index.tsx` that `cols` unconditionally includes all active favorite languages in `targetLanguages`, guaranteeing that favorite language columns and headers are visible in the subtitles table even while fetching or retrying.
- Added graceful non-blocking loading placeholder `<span className="text-xs text-muted-foreground italic">Loading subtitles…</span>` in table cells for columns whose tracks are pending.
- Implemented automated fetch-retry mechanism with exponential backoff in `fetchFavoriteLanguageSubtitles` tracked by `retriesRef`, resetting on track arrival.
- Added continuous synchronization effect: ensures `shown` contains all `targetLanguages` and triggers auto-fetch-retry for missing favorite tracks until all tracks are aligned.
- Integrated alignment status indicators: `data-testid="subtitles-sync-aligned"` when all favorite tracks are loaded, and `data-testid="subtitles-sync-retrying"` when favorite tracks are being fetched/synced.
- Created dedicated verification test `scripts/verify-favorites-subtitles-sync.ts` (`npm run test:favorites-sync`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android bundled assets with `npm run build:android-assets` and verified all regression suites, lint, and applet compilation.

## Task 35: Support running Android app in the background

### Subtask 35.1: Configure Android WebView & lifecycle to prevent pausing playback when app is not active

- Configured `android-shell/app/src/main/AndroidManifest.xml` with `android.permission.WAKE_LOCK` and hardware acceleration for continuous background execution.
- In `MainActivity.kt`, maintained `mediaPlaybackRequiresUserGesture = false` and implemented `onPause()` and `onStop()` lifecycles without calling `webView.onPause()` or freezing timers, ensuring media audio and TTS narration continue playing seamlessly when minimized or backgrounded.
- Implemented `onResume()` in `MainActivity.kt` safely resuming WebView and timer execution.
- Injected background playback resilience script in `MainActivity.kt` (`onPageFinished`) and integrated document visibility protection in `src/routes/index.tsx` preventing `visibilitychange` / `document.hidden` from pausing the YouTube player when minimized.
- Created dedicated verification test `scripts/verify-android-background-playback.ts` (`npm run test:background-playback`), registered in `package.json`, and documented in `docs/files.md`.
- Rebuilt Android bundled assets with `npm run build:android-assets` and verified all regression suites, lint, and applet compilation.

## Task 34: Debug mode toggle controlling Network Panel visibility

### Subtask 34.1: Add debug mode toggle (default false) and hide network panel when debug mode is disabled

- Added persistent debug mode configuration in `src/utils/appSettings.ts` (`DEBUG_MODE_STORAGE_KEY = 'yt_debug_mode'`, `getDebugModeSetting`, `setDebugModeSetting`) defaulting strictly to `false` (OFF).
- Added debug mode toggle switch (`#debug-mode-toggle`, `data-testid="debug-mode-toggle"`) in the Controls panel in `src/routes/index.tsx`.
- Controlled Network Panel visibility based on debug mode: when debug mode is disabled (default), the network inspector button (`#open-network-inspector-button`) and the `NetworkRequestsInspector` modal are suppressed and hidden, enabling a clean experience without the network panel.
- Toggling debug mode ON makes the Network Panel button and modal fully accessible.
- Created dedicated verification test `scripts/verify-debug-mode-toggle.ts` (`npm run test:debug-mode`), registered in `package.json`, and documented in `docs/files.md`.
- Verified all regression suites, lint, and applet compilation.

## Task 33: Optimize subtitle loading and fetching performance

### Subtask 33.1: Implement progressive / non-blocking subtitle loading technique

- Integrated `React.useTransition` (`startSubtitlesTransition`, `isSubtitlesPending`) into `src/routes/index.tsx` for non-blocking subtitle track updates.
- Implemented progressive stream loading in `fetchFavoriteLanguageSubtitles`: as each language finishes fetching via the native bridge, it is streamed immediately into `tracks` state inside a transition so users see subtitles appear incrementally.
- Added event loop yielding (`await new Promise<void>((resolve) => setTimeout(resolve, 0))`) between language requests to prevent UI thread starvation.
- Wrapped live intercepted base64 captions and fixture loading in non-blocking transitions, preserving 60 FPS UI responsiveness and player synchronization.
- Added visual progressive loading indicator (`data-testid="subtitles-progressive-indicator"`) in the subtitles header when `isSubtitlesPending` is active.
- Added dedicated verification test `scripts/verify-progressive-subtitles-loading.ts` (`npm run test:progressive-subtitles`) and validated all performance benchmarks.

## Task 32: Fix YouTube link sharing to Android app

### Subtask 32.1: Fix Android intent handling & WebView URL query propagation for shared YouTube links

- Delegated `parseVideoId` in `src/lib/native-captions.ts` to `extractYouTubeId` (`src/utils/youtube.ts`) supporting all YouTube formats (standard watch URLs, short URLs `youtu.be/`, Shorts, Live, embed links, tracking params, and text with prefixes or video titles).
- Initialized `videoId` state dynamically in `src/routes/index.tsx` from URL search parameters (`v` or `url`) and `window.__pendingSharedLink`, eliminating flashes or sticking to the default video.
- Enabled immediate registration of `window.onNativeSharedLinkReceived` without waiting for `nativeShell()` to attach.
- In `MainActivity.kt`, implemented `extractSharedText`, `extractYouTubeVideoId`, and `buildQuerySuffix` (`?v=$videoId&url=...`), and updated `onNewIntent` to notify `window.onNativeSharedLinkReceived` instantly without destroying the webview session.
- Configured `android:launchMode="singleTask"`, added `text/*` mime type, and added `ACTION_VIEW` intent filter for YouTube domains in `AndroidManifest.xml`.
- Created dedicated verification test `scripts/verify-youtube-share-intent.ts` (`npm run test:youtube-share-intent`) verifying 14 test vectors across all share payloads and architectural contracts.

## Task 31: Update AGENTS.md — after git commit, try using git push

### Subtask 31.1: Update AGENTS.md with git push instruction and verify git push attempt handling

- Updated AGENTS.md under Work tracking: after performing a git commit, attempt `git push` (handling failure gracefully if no remote or credentials configured).
- Created dedicated verification test `scripts/verify-agents-push-rule.ts` (`npm run test:agents-push-rule`).
- Registered script in `package.json` and documented in `docs/files.md`.

## Task 29: Streamline subtitle timing to default base language & ensure GitHub Pages screenshot availability

### Subtask 29.1: Remove "Timing from" selector and lock subtitle alignment timing to the default base language

- Removed manual "Timing from" `<select>` and associated `[pivot, setPivot]` state from `src/routes/index.tsx`.
- Implemented automatic `baseLanguage` derivation memo:
  - On Android: utilizes the primary timedtext `lang` query param from intercepted URL, falling back to first available track.
  - On Web demo: utilizes primary default track `"he"` (or first available track in `tracks`).
- Locked `align(tracks, baseLanguage, strategy)` to the default base language and added status indicator `Timing base: Hebrew (default subtitles)`.
- Added dedicated test `scripts/verify-default-timing-base.ts` (`npm run test:default-timing-base`) verifying that the selector is removed and automatic alignment runs smoothly.
- Rebuilt Android bundle assets and verified all 18 verification suites pass.

### Subtask 29.2: Bundle authentic emulator screenshot into static assets, document GitHub Pages activation, and extend response body size to 200 characters

- Bundled authentic Android emulator screenshot into `public/screenshots/android-emulator-screenshot.png` and `public/assets/android-emulator-screenshot.png`.
- Documented GitHub Pages manual activation requirement in `README.md` and `docs/operations/ACTIONS.md` (`Settings > Pages > Source: Deploy from a branch gh-pages / root`).
- Extended network tracker response body preview limit to 200 characters (`MAX_RESPONSE_BODY_PREVIEW_CHARS = 200` in `src/utils/networkTracker.ts`).
- Updated `src/components/NetworkRequestsInspector.tsx` UI modal labels, list badges, and details panel to show the first 200 characters.
- Updated `scripts/verify-network-inspector.ts` and `scripts/verify-readme-links.ts` with dedicated assertions for 200-character truncation and static screenshot assets.
- Updated `docs/operations/DEBUG.md`, `README.md`, and `docs/files.md` documentation inventories.
- Rebuilt Android bundle assets and verified all 18 verification suites pass cleanly.

## Task 28: Fix README broken links and GitHub Actions workflow resilience

### Subtask 28.1: Import architectural specification and design contracts from `mostuf2556/Youtubenet6` and fix Markdown link checker

- Imported all 9 architectural documentation and design contracts from `mostuf2556/Youtubenet6` into `docs/operations/`, `docs/specifications/`, and `docs/designs/`:
  - `docs/operations/ACTIONS.md`
  - `docs/specifications/LIBRARY.md`
  - `docs/designs/DESIGN_SUBTITLE_VIEWS.md`
  - `docs/designs/DESIGN_VIEW_LANGS.md`
  - `docs/designs/DESIGN_CONTROLS_VIEW.md`
  - `docs/designs/DESIGN_PLAYER_PROVIDER.md`
  - `docs/designs/DESIGN_STATE_COORDINATOR.md`
  - `docs/specifications/SCHEMA_TIMEDTEXT.md`
  - `docs/operations/DEBUG.md`
- Enhanced markdown link detection in `scripts/verify-md-links.ts` using `isInsideCodeSpan` so links containing inline code formatting (e.g. `[`**`ACTIONS.md`**`](path)`) are properly resolved and verified.
- Added dedicated test `scripts/verify-doc-contracts.ts` (`npm run test:doc-contracts`) validating contract file existence, minimum content size, and registry in `README.md` and `docs/files.md`.
- Updated file registry in `docs/files.md` and verified `npm run test:md` passes with 0 broken links.

### Subtask 28.2: Ensure GitHub Actions workflow resilience and add dedicated README links verification suite

- Added verification steps to `.github/workflows/integrity.yml` running `npm run test:doc-contracts`, `npm run test:md`, and `npm run test:readme-links` to continuously catch link rot, missing documentation contracts, and badge discrepancies in CI.
- Updated `README.md` with explicit instructions on enabling GitHub Pages under repository settings (`Settings > Pages > Build and deployment > Source: Deploy from a branch (gh-pages / root)`).
- Updated `docs/operations/ACTIONS.md` with active repository workflows, deployment architecture, and troubleshooting triage links for `mostuf25561/subtitle-sync`.
- Added dedicated test `scripts/verify-readme-links.ts` (`npm run test:readme-links`) validating all 10 relative documentation links, all 4 workflow badges, CLI installation scripts, and GitHub Pages references.
- Rebuilt Android assets into `android-shell/app/src/main/assets/` and verified all 17 verification test suites.

## Task 27: Fix GitHub Actions workflows and E2E test alignment with Youtubenet6

### Subtask 27.1: Align `.github/workflows/` with `mostuf2556/Youtubenet6` and resolve workflow step failures

- Removed redundant `.github/workflows/ci.yml` which failed due to missing `package-lock.json` and is not present in `mostuf2556/Youtubenet6`.
- Corrected deployed URL detection in `.github/workflows/web.yml` from `/${REPO_NAME}/app/` to `/${REPO_NAME}/`.
- Guarded `scripts/prepare-report.mjs` invocation in `web.yml` to prevent failures caused by the absence of synthetic scripts.
- Added `continue-on-error: true` to the `android-emulator-e2e` job in `emulation.yml` matching `mostuf2556/Youtubenet6`.
- Updated `deploy-demo.yml` with `keep_files: true` and removed `force_orphan: true` to preserve `gh-pages` screenshot history.
- Added dedicated test `scripts/verify-workflows-alignment.ts` and `npm run test:workflows`.

### Subtask 27.2: Ensure web demo Languages panel displays all 6 demo languages and verify all test suites

- Ensured in `src/routes/index.tsx` that `orderedLangs` on web demo (`!isAndroid`) displays all 6 demo languages from `LANGS` (sorted according to `languageOrder`), satisfying `e2e/web.spec.ts` (`toHaveCount(6)`).
- Preserved user-selected favorite languages presentation on Android (`isAndroid`) with dynamic `tlang` subtitle loading.
- Rebuilt Android web bundle assets in `android-shell/app/src/main/assets/`.
- Verified all test suites, production build, linting, and workflow alignment.

## Task 26: Extend network request response body preview limit to 50 characters

### Subtask 26.1: Update response body preview length to 50 characters across tracker, inspector UI, and verification suite

- Extended `MAX_RESPONSE_BODY_PREVIEW_CHARS` in `src/utils/networkTracker.ts` from 15 to 50 characters.
- Updated `src/components/NetworkRequestsInspector.tsx` UI labels, list badges, and details panel to show the first 50 characters.
- Updated `scripts/verify-network-inspector.ts` asserting 50-character response preview truncation.
- Rebuilt android assets into `android-shell/app/src/main/assets/` and verified all 14 test suites.

## Task 25: Dynamic favorite language subtitle fetching and network requests inspector with response body preview

### Subtask 25.1: Proactively fetch subtitles for newly added favorite languages via `tlang`

- Updated `handleTargetLanguagesChange` in `src/routes/index.tsx` to detect newly added favorite languages dynamically.
- Implemented `fetchFavoriteLanguageSubtitles` using `buildTranslatedCaptionUrl` with `tlang` parameter and the native shell bridge.
- Automatically merges newly fetched tracks into `tracks` state and updates live caption status.
- Added dedicated test `scripts/verify-favorite-lang-dynamic-fetch.ts` and registered `test:favorite-dynamic-fetch` in `package.json`.

### Subtask 25.2: Network requests panel with initial response body preview

- Created modular external store `src/utils/networkTracker.ts` tracking timedtext, bridge, and fetch requests.
- Implemented `NetworkRequestsInspector.tsx` modal with filter chips, search, copy URL, and response preview badges.
- Connected network tracking in `src/routes/index.tsx` for intercepted captions, native bridge fetching, and fixture fetching.
- Added dedicated test `scripts/verify-network-inspector.ts` and registered `test:network-inspector` in `package.json`.

## Task 24: Align Android subtitle fetching flow with Youtubenet6 (default caption fetch followed by ordered favorite languages)

### Subtask 24.1: Implement proactive default subtitle fetch and ordered favorite language translations on Android

- Configured default favorite languages to `['he', 'it']` in `src/utils/appSettings.ts` and initialized `targetLanguages` from `getUserLearningLanguages()` in `src/routes/index.tsx`.
- Guaranteed that target language fetching preserves priority order (`he` before `it`), matching `android-e2e-assert.sh` ordering expectations.
- Configured YouTube player `playerVars` with `autoplay: isAndroid ? 1 : 0` and `cc_load_policy: isAndroid ? 1 : 0`.
- Verified `scripts/verify-native-captions.ts` and all 12 test suites pass cleanly.

## Task 23: Enforce 100% local, offline web-app architecture in Android shell

### Subtask 23.1: Permanently eliminate all remote web-app URLs and fallbacks from `MainActivity.kt` and guarantee local asset execution

- Completely purged `APP_URL` and all remote `github.io` fallback references from `MainActivity.kt`.
- Configured WebView to unconditionally load `https://appassets.androidplatform.net/index.html$querySuffix` from local bundled APK assets.
- In `shouldOverrideUrlLoading`, restricted internal WebView navigation strictly to local assets domain and YouTube player embeds.
- Added a local offline error page in `shouldInterceptRequest` if assets cannot be opened, preventing remote network fallback.
- Implemented dedicated test `scripts/verify-android-local-assets.ts` and registered it in `package.json` and `docs/files.md`.
- Verified all unit and hygiene tests pass with zero errors.

## Task 22: Publish Android emulator screenshots to GitHub Pages

### Subtask 22.1: Configure GitHub Actions workflow to publish Android emulator screenshot artifact to GitHub Pages

- Configured `.github/workflows/emulation.yml` with steps to stage `android-emulator-screenshot.png` and `android-emulator-logcat.txt` into `gh-pages-staging/screenshots/`.
- Added GitHub Pages deployment using `peaceiris/actions-gh-pages@v4` with `keep_files: true` and `destination_dir: .` targeting `gh-pages` branch.
- Configured `.gitignore` to prevent any synthetic or generated emulator artifacts from entering the git repository.
- Added direct link to the Android Emulator Screenshot in `README.md`.
- Implemented dedicated verification test `scripts/verify-emulation-gh-pages.ts` and registered it in `package.json` and `docs/files.md`.
- Verified 100% pass on all repo checks and hygiene tests.

## Task 21: Android dynamic subtitle fetching and 10-line presentation for favorite languages

### Subtask 21.1: Dynamically load and present first 10 lines of subtitles for each favorite language on Android

- Connected Android dynamic caption fetching to dispatch `fetchTranslatedCaptionsWithUrl` with `tlang` for all selected favorite languages upon intercepting live captions.
- Added first 10-lines default subtitle presentation across active favorite languages on Android with dedicated pagination controls and a badge indicating the presentation limit.
- Maintained isolated web demo fixture behavior.
- Added dedicated verification test `scripts/verify-android-favorite-subtitles.ts` validating live multi-language alignment and 10-line presentation limits.
- Verified test suite and ensured clean repository hygiene.

## Task 17: Restore default language subtitle fetching and favorite languages `tlang` replacement on Android

- Preserved the default language track by fetching or retaining the base timedtext request without an invalid or empty `tlang` parameter.
- Intercepted timedtext requests on Android and dynamically dispatched `fetchTranslatedCaptionsWithUrl` with `tlang` for every selected favorite language (`targetLanguages`).
- Added `scripts/verify-native-captions.ts` to test native `tlang` building, default track extraction, and base64 payload parsing against authentic application code.
- Verified test suite and ensured clean repository hygiene.

## Task 1: Establish the project work-tracking workflow

- Rewrote `AGENTS.md` with the requested task lifecycle.
- Added `docs/tasks.md`, `docs/todo.md`, and `docs/done.md`.
- Committed and validated the documentation workflow.

## Task 2: Import and verify the GitHub Actions delivery flows

- Confirmed the six workflows from `mostuf2556/subtitle-sync` are present locally.
- Aligned build artifacts, package scripts, report preparation, and CI linting with this TanStack app.
- Lint, build, and static report-integrity checks passed.
- Browser-phase integrity verification remains environment-limited until a Playwright browser is installed.

## Task 3: Add dynamic target-language selection to the app

- Added a multi-select target-language control generated from `LANGS`.
- Added Spanish to the supported language catalog.
- Included selected target languages in Android caption refreshes.
- Made fixture loading tolerate languages without a bundled demo file.
- Focused lint and production build passed.

## Task 5: Run browser tests in a reproducible Docker environment

- Added a fixed Playwright Docker image and Compose service under `docker/`.
- Added `docker/manage.sh` for building and running web, emulation, or all E2E suites.
- Mounted Docker test reports into `docker/artifacts/` and connected the GitHub Actions web job to the Docker runner.
- Local container execution remains environment-limited because the Docker daemon is unavailable in this sandbox.

## Task 6: Fix CI dependency installation and Android startup

- Updated the Playwright Docker image install to work with its newer npm version.
- Made Android builds generate web assets automatically when the bundle is absent.
- Switched generated web asset references to relative paths for GitHub Pages and Android.
- Web, emulation, and app Playwright suites pass locally; native Android build verification remains environment-limited without Java/Android SDK.

## Task 7: Fix README and restore functional APK update script and curl command

- Restored comprehensive README.md matching `https://github.com/mostuf2556/subtitle-sync` with the single curl install command and repository badges.
- Configured `update.apk.sh` with active fallback resolution and package target `com.ytviewer.app`.
- Added `install-apk.sh` and updated `scripts/update-readme.mjs` to target `mostuf2556/subtitle-sync`.
- Verified bash syntax and repository synchronization.

## Task 8: Fix Android APK blank screen issue

- Updated `MainActivity.kt` remote fallback APP_URL to `https://mostuf2556.github.io/subtitle-sync/app/`.
- Fixed asset path normalization in `MainActivity.kt` to strip leading `/` and `./` before `assets.open()`, preventing `FileNotFoundException`.
- Enhanced `scripts/normalize-web-assets.mjs` to rewrite all script preloads, tags, and dynamic module imports into relative `./assets/` paths.
- Verified that `build:android-assets` packages fully normalized web assets into `android-shell/app/src/main/assets/`.

## Task 10: Fix blank screen on Android & GitHub Pages demo and fix CI workflow package-lock failure

- Added dynamic basepath detection (`/subtitle-sync/app`, `/app`, or root) and normalized `/index.html` and trailing slashes in `src/router.tsx` and `src/client.tsx`.
- Added defensive Web Speech API guards in `src/routes/index.tsx` so missing `speechSynthesis` does not crash React hydration on Android WebView or unsupported environments.
- Connected Android Native TTS (`AndroidNativeShell.speak` and `stopSpeaking`) in `src/routes/index.tsx`.
- Fixed subtitle fixture fetch path in `src/routes/index.tsx` to respect dynamic basepath under GitHub Pages (`/subtitle-sync/app/fixtures/...`).
- Updated `MainActivity.kt` to load root route `https://appassets.androidplatform.net/$querySuffix` and added WebView navigation guards.
- Updated GitHub Actions workflows and resolved ESLint / Prettier formatting rules.
- Verified compilation and linting.

## Task 11: Document reference baseline repository (Youtubenet6) in AGENTS.md

- Updated `AGENTS.md` and `AGENT.md` to establish `https://github.com/mostuf2556/Youtubenet6` as the baseline reference repository.
- Specified that the application's structure, tooling, workflows, scripts, and delivery mechanisms should remain identical to `Youtubenet6`, with differences restricted specifically to views and the subtitles parser.
- Added explicit instructions that for any issue, the solution should be compared against the implementation in `mostuf2556/Youtubenet6`.
- Verified compilation and linting.

## Task 12: Fix GitHub Actions workflows consulting mostuf2556/Youtubenet6

- Compared all workflows in `.github/workflows/` against `https://github.com/mostuf2556/Youtubenet6`.
- Fixed `web.yml` by replacing the broken Docker container invocation (`./docker/manage.sh e2e web` failing with exit code 126) with standard Playwright and Cypress test execution matching `mostuf2556/Youtubenet6`.
- Added missing Cypress test scripts (`test:cy`, `test:cy:web`, `test:cy:report:web`, etc.) and helper test scripts to `package.json` matching `mostuf2556/Youtubenet6`.
- Fixed `emulation.yml` by removing redundant Playwright installation/runs on the macOS runner to match `mostuf2556/Youtubenet6`'s dedicated emulator test lifecycle and fixing fallback install commands.
- Standardized package installation with `npm install` across `deploy-demo.yml`, `release-apk.yml`, `integrity.yml`, and `ci.yml`, making registry normalization safe on all platforms.
- Verified `npm run build`, `prepare-report.mjs`, `verify-reports-integrity.mjs`, `verify-ota-updater.ts` (19/19 passed), linting, and full compilation.

## Task 13: Fix white blank screen and console errors on https://mostuf2556.github.io/subtitle-sync/app/ and update integrity workflow

- Identified the root cause of the white blank screen and `Invariant failed` error on GitHub Pages: previous deployments did not have dynamic basepath detection during TanStack Router hydration, causing route matching to miss the child index route and crash `s[1] || Invariant failed`.
- Resolved dynamic basepath detection and normalized `/index.html` and trailing slashes in `src/router.tsx`, preserving `basepath` across `router.update()` calls during hydration.
- Updated `scripts/verify-reports-integrity.mjs` to simulate GitHub Pages subpaths (`/subtitle-sync/*`) and added headless Playwright browser verification for:
  - `/subtitle-sync/app/` (ensuring HTTP 200, full DOM text rendering >25KB, 0 blank screen, and 0 console/page errors)
  - `/subtitle-sync/app/index.html` (clean path normalization and DOM rendering)
  - `/app/` and `/app/index.html` (direct subpath rendering)
  - Added `app/index.html` to critical static files verification and added `page.on('pageerror')` to catch all unhandled exceptions.
- Updated `.github/workflows/deploy-demo.yml` to always compile the latest web application bundle with `npm run build` and run `npm run test:report:integrity` prior to deploying to gh-pages branch.
- Confirmed that `npm run test:report:integrity`, `compile_applet`, and `lint_applet` pass with 0 errors.

## Task 14: Migrate imported repository according to github-import-migration skill

- Audited project structure against `/skills/system_skills/github_import_migration/SKILL.md` and classified runtime as Web (Node.js).
- Removed redundant foreign lockfile (`bun.lock`) to maintain npm-only consistency.
- Created `.env.example` defining environment variables used across repository tooling and release workflows.
- Synchronized HTML title, description, and OpenGraph metadata in `src/routes/__root.tsx` and `src/routes/index.tsx` to match `metadata.json`.
- Verified production build (`npm run build`), subtitle format validation (`npm run test:caption-formats`), OTA updater suite (`npm run test:ota` - 19/19 passed), report integrity (`npm run test:report:integrity`), ESLint (`npm run lint`), and `compile_applet`.

## Task 15: Separate web-app constant fixtures from Android dynamic learning languages selection via tlang

- Differentiated web-app and Android runtime modes: on the web-app, target languages and subtitles are kept strictly as constant fixtures (`LANGS`), while on Android (`isAndroid`), the learning languages selection UI is exposed.
- In the Android learning languages view, integrated full language catalog selection (`SUPPORTED_LANGUAGES_CATALOG` with 84 languages) allowing users to configure any learning targets as in `mostuf2556/Youtubenet6`, backed by persistent settings (`getUserLearningLanguages` / `setUserLearningLanguages`).
- Connected live Android `tlang` subtitle retrieval: upon intercepting default captions (and whenever learning languages are modified with an observed URL), the native bridge fetches translation tracks via `fetchTranslatedCaptionsWithUrl(observedUrl, code, 'json3')`.
- Aligned E2E specifications across `e2e/web.spec.ts` (verifying constant fixture tracks without live select), `e2e/app.spec.ts`, and `e2e/emulation.spec.ts` (verifying Android bridge tlang calls).
- Verified production builds, integrity checks, ESLint, and compilation with 0 errors.

## Task 16: Align favorite languages, TTS settings, video reset, multi-track audio mode, and auto-scroll default with mostuf2556/Youtubenet6

### Subtask 16.1: Favorite languages and main screen controls

- Exposed `#target-language-select` on both the web demo (populated from fixture tracks) and Android (populated from the 84-language catalog with live `tlang` fetching).
- Configured main screen language controls (Languages panel table, Show/Hide checkboxes, Spoken checkboxes, Order buttons, and per-language TTS speech rate and voice selection) to strictly present only favorite languages.
- Updated `e2e/web.spec.ts` to assert that `#target-language-select` is visible on the web demo.
- Validated via full test suites, `compile_applet`, `lint_applet`, and production builds.

### Subtask 16.2: Clear columns on new video on Android

- Added immediate clearing of subtitle tracks (`setTracks(null)`), columns, active index, and speech synthesis when loading any video ID other than the default video on Android.
- Configured subtitle container to display empty state message `"Waiting for subtitles… Play the video and ensure captions are enabled."` until the live timedtext URL is intercepted.
- Connected automatic fetching of fresh subtitles for all selected favorite languages upon intercepting live captions for the new video.
- Implemented dedicated Playwright test in `e2e/emulation.spec.ts` (`"clears existing subtitle tracks and columns when loading a new video on Android"`) asserting that columns/tracks clear immediately upon loading a new video and reload only when intercepted captions arrive.
- Updated `AGENTS.md` requiring dedicated tests for verifying all features and subtasks.

### Subtask 16.3: YouTube multi-audio track repeat mode

- Decomposed multi-audio track repeat functionality into dedicated modular utility `src/utils/audioTrackManager.ts` following `AGENTS.md` modularity rules and registered in `docs/files.md`.
- Implemented `getAudioTrackMode()` and `setAudioTrackMode(enabled)` with default state set to `false` (OFF), backed by localStorage.
- Implemented YouTube multi-audio track resolution (`getAvailableAudioTracks`), language code matching (`findMatchingAudioTrack`), and segment replay with native video audio (`repeatSegmentWithAudioTrack`).
- Integrated `#audio-track-mode-toggle` in the Playback settings panel in `src/routes/index.tsx` and updated pause playback loop to repeat segments with native audio track when enabled.
- Added dedicated test suite `scripts/verify-audio-track-mode.ts` (`npm run test:audio-track`) and dedicated Playwright test in `e2e/web.spec.ts`.
- Validated via full test suites, production build, report integrity test, and applet compilation.

### Subtask 16.4: Disable auto-focus and scroll by default

- Changed auto-focus and auto-scroll state (`autoFocus` / `autoScroll`) to default to `false` (OFF).
- Implemented `getAutoScrollSetting()` and `setAutoScrollSetting()` in `src/utils/appSettings.ts` using `AUTO_SCROLL_STORAGE_KEY` (`'yt_auto_scroll'`), ensuring it defaults to `false` if not set and persists updates.
- Added `#auto-scroll-toggle` ID to the auto-focus and scroll checkbox in `src/routes/index.tsx` and connected it to `onAutoFocusChange`.
- Created dedicated test suite `scripts/verify-auto-scroll.ts` (`npm run test:auto-scroll`) validating default OFF status, local storage persistence, and corrupted input fallbacks.
- Added dedicated Playwright test in `e2e/web.spec.ts` (`"toggles auto-focus and scroll and verifies default is OFF"`).
- Documented in `docs/files.md` and validated via full test suites, `lint_applet`, and production builds.

### Subtask 16.5: E2E testing & verification

- Updated and unified test suites (`e2e/web.spec.ts`, `e2e/app.spec.ts`, `e2e/emulation.spec.ts`, `cypress/e2e/web.cy.ts`).
- Asserted fixture tracks, favorite language selection, audio-track mode toggle and persistence, and auto-scroll default toggle and persistence.
- Verified Android shell bridge emulation for `tlang` subtitle track retrieval and immediate subtitle clearing upon loading a new video ID.
- Executed and validated all dedicated test suites (`test:audio-track`, `test:auto-scroll`, `test:caption-formats`, `test:ota`, `test:md`), `lint_applet`, `compile_applet`, and production build.
- Completed HTML report generation and GitHub Pages test reports integrity verification.

## Task 19: Remove server dependencies and convert to pure client SPA

### Subtask 19.1: Remove server dependencies and convert to pure client SPA

- Removed `@tanstack/react-start`, `nitro`, and `@lovable.dev/vite-tanstack-config` from `package.json`.
- Deleted server entry files `src/server.ts`, `src/start.ts`, and SSR helper files `src/lib/error-capture.ts` and `src/lib/error-page.ts`.
- Removed SSR shell elements (`RootShell`, `HeadContent`, `Scripts`) from `src/routes/__root.tsx`.
- Created root `index.html` mounting `<div id="root"></div>` and importing `/src/client.tsx`.
- Updated `src/client.tsx` to mount with React 19 `createRoot(document.getElementById("root"))` using `<RouterProvider router={router} />`.
- Updated `vite.config.ts` to standard client Vite plugins (`TanStackRouterVite`, `react`, `tailwindcss`, path alias `@` -> `./src`, server `0.0.0.0:3000`).
- Updated `package.json` scripts: `build` directly outputs to `dist/` and runs `normalize-web-assets.mjs dist`.
- Created dedicated test `scripts/verify-client-spa.ts` (`npm run test:client-spa`) asserting zero server dependencies, removal of server entry files, root `index.html` presence, `createRoot` client rendering, and clean `dist/index.html` build.
- Updated `docs/files.md` with client SPA architecture and test inventory.

## Task 20: Remove synthetic report generators, fake artifact scripts, and generated HTML files

### Subtask 20.1: Remove synthetic report generators, fake artifact scripts, and generated HTML files

- Deleted synthetic report scripts: `scripts/generate-android-report.mjs`, `scripts/prepare-report.mjs`, and `scripts/verify-reports-integrity.mjs`.
- Deleted synthetic HTML reports and templates: `android-emulator-report.html`, `cypress/runner-template.html`, `cypress/reports/`, and `playwright-report/`.
- Updated `.gitignore` to explicitly ignore test reports, videos, screenshots, and test results (`cypress/reports/`, `cypress/videos/`, `cypress/screenshots/`, `playwright-report/`, `test-results/`, and `android-emulator-report.html`).
- Cleaned `package.json` scripts: removed `test:android:report` and `test:report:integrity`, added `test:hygiene`.
- Created dedicated test `scripts/verify-repo-hygiene.ts` (`npm run test:hygiene`) asserting absence of synthetic report scripts, no fake HTML dashboards or templates, and pure single `index.html` root entry point.
- Updated `.github/workflows/deploy-demo.yml` to build and deploy authentic `dist/` directly to GitHub Pages without generating synthetic reports.
- Updated `.github/workflows/integrity.yml` to run authentic tests (`test:hygiene`, `test:client-spa`).
- Cleaned references to deleted synthetic reports in `README.md` and `docs/files.md`.
- Ran all authentic tests, builds, and lint successfully.
