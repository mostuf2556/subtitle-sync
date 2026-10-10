# Tasks

## Task 49: Native YouTube Free API Subtitles Discovery & Auto-Activation

- [x] **Subtask 49.1: Automatic IFrame Captions Activation & Multi-Format Negotiation**:
  - In `src/lib/iframe-player.ts`, activate YouTube IFrame captions module (`loadModule('captions')` and setting initial caption track) on player ready so that `/api/timedtext` is triggered automatically upon loading any video without user interaction.
  - In `src/lib/native-captions.ts`, enhance `parseJson3` and format builders with multi-format fallback negotiation (`json3` -> `srv3` -> `srv1` -> `vtt`) for translated and native subtitles.
  - Implement dedicated test `scripts/verify-native-captions-discovery.ts` and verify.
- [ ] **Subtask 49.2: Native Android Direct Caption Discovery via Innertube Player API**:
  - In `MainActivity.kt`, add native endpoint discovery via YouTube's public free Innertube player endpoint (`https://www.youtube.com/youtubei/v1/player` with client `ANDROID`) when `lastObservedTimedTextUrl` is null.
  - Extract and cache `baseUrl` from `playerCaptionsTracklistRenderer.captionTracks` so any video ID can immediately fetch captions in any target language even before the player fires timedtext.
  - Implement dedicated test `scripts/verify-innertube-discovery.ts` and verify.

## Task 48: Fix APK Version Collision, Update Script Robustness & In-App Version Display with Releases Link

- [x] **Subtask 48.1: Robust APK Installation & Version Code Handling in Update Script**:
  - Update `update.apk.sh` to handle package collisions (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, `INSTALL_FAILED_VERSION_DOWNGRADE`, `INSTALL_FAILED_CONFLICTING_PROVIDER`), performing deep purge (`pm uninstall`, `pm uninstall --user 0`, `pm clear`) and retrying cleanly.
  - Ensure `package.json` defines a standard `"version"` field and `release-apk.yml` correctly propagates version code and version name.
  - In `README.md`, ensure the APK section links to the all releases page (`https://github.com/ofer-shaham/subtitle-sync/releases`).
- [x] **Subtask 48.2: In-App Version Display with Link to All Releases Page**:
  - Display the application version in the UI.
  - Link the version directly to the GitHub All Releases page (`https://github.com/ofer-shaham/subtitle-sync/releases`).
  - Add dedicated test `scripts/verify-apk-version-and-releases.ts` and verify.

## Task 47: Fix README.md Links, CI Workflows & GitHub Pages Staging for Forked Repositories

- [x] **Subtask 47.1: Synchronize README.md Links & Static Fallbacks for Current and Forked Repositories**:
  - Ensure all badge URLs, CLI install scripts, GitHub Pages web demo, and E2E report links in `README.md` cleanly resolve to the current repository identity (`subtitle-sync`).
  - Provide static `public/android-emulator-report.html` asset so GitHub Pages never serves a 404 for the emulator report.
  - Update `scripts/update-readme.mjs` and `.github/workflows/update-readme.yml` for zero-touch fork sync.
  - Add dedicated test `scripts/verify-fork-readme-links.ts` and verify.
- [x] **Subtask 47.2: Ensure GitHub Actions E2E Tests Pass and Deploy to GitHub Pages on Forked Repos**:
  - Add `push: branches: [main, master]` triggers to `web.yml` and `emulation.yml` in addition to `workflow_run` so forks automatically run CI and publish to `gh-pages`.
  - Verify `web.yml`, `deploy-demo.yml`, and `emulation.yml` deploy all reports (`mochawesome.html`, `playwright/`, `android-emulator-report.html`, `screenshots/`) to `gh-pages` with `keep_files: true`.
  - Run all E2E test suites locally and verify app compilation and linting.

## Task 46: Fix E2E Report Generation, CI Workflows & GitHub Pages Staging

- [x] **Subtask 46.1: Fix Playwright E2E Locator Ambiguity**:
  - Update `e2e/web.spec.ts` and `e2e/app.spec.ts` to disambiguate the Languages panel locators (e.g., `details > summary:has-text('Languages')` or matching header `summary h2:has-text('Languages')`).
  - Add dedicated verification test `scripts/verify-playwright-locators.ts`.
  - Verify all 5 tests in `e2e/web.spec.ts` and `e2e/app.spec.ts` pass with Playwright locally.
- [x] **Subtask 46.2: Fix `emulation.yml` Syntax and Report Generation**:
  - Fix YAML syntax and multi-line escaping in `.github/workflows/emulation.yml` verified by `js-yaml`.
  - Ensure `android-emulator-report.html` and screenshots are reliably staged for `gh-pages`.
- [x] **Subtask 46.3: Ensure Guaranteed E2E Report Staging on GitHub Pages**:
  - Update `web.yml` and `deploy-demo.yml` to stage Mochawesome, Playwright, and Android reports with resilient deployment steps.
  - Add dedicated verification tests in `scripts/verify-e2e-report-links.ts` and verify build, lint, and workflow integrity.

## Task 45: Accumulative Criteria Subtitles Parser & Inner Group Settings

- [x] **Subtask 45.1: E2E Test Report Links in README.md & Verification**:
  - Ensure links to Mochawesome, Playwright, and Android Emulator reports in README.md.
  - Implement and pass dedicated test `scripts/verify-e2e-report-links.ts`.
- [x] **Subtask 45.2: Accumulative Multi-Select Criteria with Inner Group Settings & BiDi Direction Fix**:
  - Implement accumulative multi-select criteria in `src/lib/subtitles.ts`.
  - Add collapsible inner parameter settings for each criteria group in `src/routes/index.tsx`.
  - Resolve BiDi character direction anomalies in criteria descriptions.
  - Implement and pass dedicated verification suite `scripts/verify-accumulative-parser.ts`.

## Task 43: Validate JSON before caching subtitles and implement auto-fallback between YouTube API options (`tlang` vs `lang`)

- [x] **Subtask 43.1: Prevent caching of invalid subtitle responses (ensure answer is valid JSON)**:
  - Add JSON validation (`isValidJsonSubtitle(body: String): Boolean`) in `MainActivity.kt` ensuring responses are valid JSON containing subtitle events before saving to disk.
  - Guard `saveCaptionToFile` and interception storage: do not cache raw caption bytes to disk if the response is not valid JSON.
  - Implement `isValidJsonSubtitleResponse(data: unknown): boolean` in `src/utils/subtitleCache.ts`, ensuring invalid/empty/malformed subtitle payloads are rejected and never cached in memory or `localStorage`.
  - Add dedicated test `scripts/verify-valid-json-cache-guard.ts` verifying that invalid responses are strictly blocked from caching.
- [x] **Subtask 43.2: Implement auto-fallback on invalid response between YouTube API options (`tlang` vs `lang`)**:
  - In `MainActivity.kt` (`executeTimedTextRepetition`), try the primary option (`tlang` or `lang`), and if the response is not HTTP 200 or not valid JSON, automatically fallback to the other option, returning valid JSON.
  - In `src/routes/index.tsx` (`fetchFavoriteLanguageSubtitles`), verify each request mode produces valid JSON, auto-falling back across `subtitleRequestModeOrder`.
  - Add dedicated test `scripts/verify-subtitle-api-fallback.ts`, register in `package.json`, update `docs/files.md`, rebuild Android bundle assets, commit, and verify all test suites.

## Task 31: Update AGENTS.md — after git commit, try using git push

- [x] **Subtask 31.1: Update AGENTS.md with git push instruction and verify git push attempt handling**: Update AGENTS.md under Work tracking to specify that after performing a git commit, attempt `git push` (handling failure gracefully if no remote or credentials configured). Add dedicated test to verify this rule and workflow integrity.

## Task 32: Fix YouTube link sharing to Android app

- [x] **Subtask 32.1: Fix Android intent handling & WebView URL query propagation for shared YouTube links**: Diagnose and fix why sharing a YouTube URL/intent to Android keeps showing the default video. Ensure MainActivity intent filters, extras (`Intent.EXTRA_TEXT`), query parameter extraction (`v=` or `youtu.be/` video ID), and WebView local asset URL generation (`index.html?v=...`) reliably update React app state and switch to the shared video. Add dedicated verification test.

## Task 33: Optimize subtitle loading and fetching performance

- [x] **Subtask 33.1: Implement progressive / non-blocking subtitle loading technique**: Ensure subtitle parsing and network fetching do not block or stutter the UI/player, employing progressive chunked loading, idle callbacks, or microtask batching. Add dedicated performance verification test.

## Task 34: Debug mode toggle controlling Network Panel visibility

- [x] **Subtask 34.1: Add debug mode toggle (default false) and hide network panel when debug mode is disabled**: Allow using the app without the network panel. Add a settings toggle for debug mode, defaulting to `false`. Add dedicated verification test.

## Task 35: Support running Android app in the background

- [x] **Subtask 35.1: Configure Android WebView & lifecycle to prevent pausing playback when app is not active**: Ensure WebView does not pause media on pause/background (`setMediaPlaybackRequiresUserGesture(false)`, background audio flags, keeping WebView active in onPause/onStop where appropriate). Add dedicated verification test.

## Task 36: Ensure sync between language views with auto-fetch-retry

- [x] **Subtask 36.1: Synchronize favorites view, language selection, and subtitles view with auto-fetch-retry**: Ensure every favorite language is consistently present in the subtitles view. If a favorite language track fails or is missing, automatically trigger auto-fetch-retry until aligned. Add dedicated verification test.

## Task 37: Clean Network Panel records & add green badge indicator for good fetching

- [x] **Subtask 37.1: Exclude empty response bodies from Network Panel and add green badge indicator**: Do not list requests with no response body as successful. Ensure HTTP status reflects actual responses. Add green badge indicator for successfully fetched languages. Add dedicated verification test.

## Task 38: Accelerate app performance & enhance Network Panel with accordion and status tags

- [x] **Subtask 38.1: Implement performance optimizations and per-record Network Panel accordion with tlang color tags**: Add memoization/rendering optimizations. Enhance Network Panel with accordion per record and tlang tags with status colors (pending: orange, done: green, failed: red, overridden by green on retry success). Add dedicated verification test.

## Task 39: Allow closing the Network Panel

- [x] **Subtask 39.1: Provide explicit close / collapse control on Network Panel**: Allow users to close the network panel easily via close button, escape key, or backdrop click. Add dedicated verification test.

## Task 40: Support app history (Android back navigation)

- [ ] **Subtask 40.1: Implement Android back navigation and router/browser history integration**: Support Android back button events (`onBackPressed` / WebView `canGoBack()` or React popstate) to navigate back through viewed videos and panels instead of exiting immediately. Add dedicated verification test.

## Task 41: Video library panel (watch history)

- [ ] **Subtask 41.1: Implement Video Library / Watch History panel**: Maintain a persistent history of played YouTube videos (ID, title, timestamp, thumbnail) with quick reload / selection. Add dedicated verification test.

## Task 44 (Hotfix): Verify working links for E2E testing and live web demo & fix GitHub Actions

- [x] **Subtask 44.1: Fix GitHub Actions workflows and verify E2E testing & demo links**: Restore authentic emulator screenshot in `public/` and `dist/`, remove stray `x` from `README.md`, fix router basepath on `github.io`, add lazy setting initialization, and add dedicated verification test.
 