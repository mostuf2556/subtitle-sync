# Tasks

## Task 53: Android E2E YouTube Share Intent Verification, Screencast Video Recording & GitHub Pages Presentation

- [x] **Subtask 53.1: Android E2E YouTube Link Share Testing (Browser & Official YouTube App)**:
  - Implement E2E tests validating that YouTube links shared from either:
    1. A web browser (via `ACTION_VIEW` with `youtube.com/watch?v=...`, `youtu.be/...`, or shorts).
    2. The official YouTube app (via `ACTION_SEND` with plain text or prefixed text like `"Check out this video on YouTube: ..."`).
  - Assert that `MainActivity.kt` and WebView bridge (`window.onNativeSharedLinkReceived`) cleanly switch to the shared video, reset state, and initiate caption discovery without crashing or reloading the entire webview session.
  - Add test coverage in `e2e/emulation.spec.ts` and `cypress/e2e/emulation.cy.ts`.
  - Create dedicated verification suite `scripts/verify-android-share-e2e.ts`, register `npm run test:android-share-e2e` in `package.json`, and update `docs/files.md`.

- [x] **Subtask 53.2: Emulator Screencast Video Recording, Artifact Staging & Report Presentation**:
  - Configure Android emulator workflow (`.github/workflows/emulation.yml`) and runner script (`scripts/run-android-e2e.sh`) to record a video screencast of the E2E test running on the emulator via `adb shell screenrecord`.
  - Pull and stage `android-emulator-video.mp4` as a workflow artifact and onto the `gh-pages` branch (`screenshots/android-emulator-video.mp4`), keeping the video ephemeral and ignored on the `main` branch as required by AGENTS.md.
  - Update `public/android-emulator-report.html` to embed and present the screencast video player (`<video controls autoplay muted loop>`) alongside the test steps, captured screenshots, Mochawesome report, Playwright report, and logcat telemetry.
  - Create dedicated verification suite `scripts/verify-emulator-screencast-report.ts`, register in `package.json`, and update `docs/files.md`.

## Task 54: Improve Android Device & Emulator E2E Testing Suite

- [x] **Subtask 54.1: Robust Device Environment, Lifecycle Management & Telemetry**:
  - Add explicit device serial selection (`adb -s <serial>`) to ensure stability across both physical hardware devices and emulators.
  - Implement screen wake, keyguard dismissal (`wm dismiss-keyguard`), device orientation locking, and battery/network health checks before test execution.
  - Collect rich hardware and system telemetry (Manufacturer, Model, Android Version, API Level, Display Resolution, Density, Architecture) and include it in the test summary and `public/android-emulator-report.html`.
  - Add dedicated verification suite `scripts/verify-android-device-e2e-suite.ts` and register `test:android-device-e2e` in `package.json`.

- [ ] **Subtask 54.2: Adaptive Device Interaction, Live Intent Assertions & Multi-Scenario Video Capture**:
  - Add adaptive coordinate scaling based on device display resolution for gestures and taps.
  - Implement real device live intent dispatch (`ACTION_VIEW` and `ACTION_SEND`) with verification of UI response in `scripts/android-e2e-assert.sh`.
  - Ensure video screencast recording and screenshot generation dynamically handle physical device screens and rotation gracefully.
  - Update `e2e/emulation.spec.ts` and Cypress emulation tests to reflect physical device and emulator parity.

## Task 55: Accordion Color Standardization, Auto-TTS Subtitle Fetching, Touch-Friendly Language Selection & Multi-Language Video Player

- [x] **Subtask 55.1: Constant Theme Colors per Accordion Type**:
  - Create `src/config/accordionThemes.ts` defining distinct constant color themes (borders, summary backgrounds, badges, and tags) for each accordion section (`player`, `playback`, `parser`, `languages`, `language-player`, `subtitles`, `library`).
  - Update `AccordionSection` to apply `data-accordion-type`, `data-accordion-color`, `data-testid="accordion-bar-{id}"`, and colored header bars.
  - Implement dedicated test `scripts/verify-accordion-colors.ts` and register `npm run test:accordion-colors`.

- [x] **Subtask 55.2: Automatic Speech Synthesis Announcement on Subtitle Fetch**:
  - Add persistent configuration `getAutoSpeakOnFetchSetting` and `setAutoSpeakOnFetchSetting` in `src/utils/appSettings.ts` (defaulting to enabled/`true`).
  - Trigger automatic pronunciation of language names via TTS (`speak`) upon live fetch completion, base64 caption interception, and language selection.
  - Add accessible toggle `data-testid="auto-speak-on-fetch-toggle"` in the Languages panel.
  - Implement dedicated test `scripts/verify-auto-speak-on-fetch.ts` and register `npm run test:auto-speak-on-fetch`.

- [x] **Subtask 55.3: Touch-Friendly Language Boxes & Keep Clicked Selections on Top**:
  - Create `src/components/LanguageBoxesSelector.tsx` featuring a mode toggle button (`#toggle-language-display-mode`) between boxes and list.
  - Provide large touch-friendly box elements (`min-h-[48px]`, `data-testid="language-box-{code}"`) suitable for Android.
  - Automatically partition and keep selected/clicked languages at the top of the grid and table (`orderedLangs`).
  - Maintain compatibility and synchronization with `#target-language-select` for all existing automation suites.
  - Implement dedicated test `scripts/verify-language-boxes-selection.ts` and register `npm run test:language-boxes`.

- [x] **Subtask 55.4: Dedicated Language Video Player Accordion with Iframe URL Subtitle Control & Network Inspector Integration**:
  - Register `"language-player"` accordion panel (`"Language video player"`) in `PANELS` and `panelOrder`.
  - Create `src/components/LanguageVideoPlayerPanel.tsx` rendering YouTube embed iframes with `https://www.youtube.com/embed/VIDEO_ID?hl=en&cc_load_policy=1&cc_lang_pref={lang}`.
  - Strictly maintain `hl=en` to keep menus in English, force captions via `cc_load_policy=1`, and control subtitle languages via `cc_lang_pref`.
  - Track subtitle requests in `networkTracker` (`/api/timedtext?...&fmt=json3`) and provide direct links to view them in the embedded Network Requests Inspector.
  - Implement dedicated test `scripts/verify-language-video-player-accordion.ts` and register `npm run test:language-player-accordion`.

## Task 56: Fix autoSpeakOnFetch ReferenceError Initialization Order

- [x] **Subtask 56.1: Initialize autoSpeakOnFetch Prior to Callback Bindings**:
  - Move `autoSpeakOnFetch` state initialization above `fetchFavoriteLanguageSubtitles` and other callbacks that reference it in `src/routes/index.tsx`.
  - Ensure zero temporal dead zone (TDZ) ReferenceError on component render.
  - Create dedicated test suite `scripts/verify-autospeak-initialization-order.ts` asserting top-level declaration order and runtime evaluation.
  - Register `npm run test:autospeak-init` in `package.json` and document in `docs/files.md`.

## Task 57: Remove Textual Color Names from Accordion Header Bars

- [x] **Subtask 57.1: Remove Color Names Text from Accordion Section Headers**:
  - Remove rendered textual color names (`theme.tagColor`) from `AccordionSection` header bars in `src/routes/index.tsx`.
  - Maintain constant visual color distinction per accordion type via left border styling (`theme.borderLeft`) and tinted summary background (`theme.summaryBg`).
  - Update `src/config/accordionThemes.ts` and `scripts/verify-accordion-colors.ts` to assert that textual color names are not rendered in the UI headers while preserving constant color bar styling.
  - Run dedicated tests, verify app compilation and linting, and perform dedicated git commit.

## Task 58: Auto-Enable "Speak" Checkbox on Favorites Language Panel Upon Subtitle Fetching

- [x] **Subtask 58.1: Auto-check "Speak" checkbox when favorite language subtitles are fetched and remove pronouncing language name**:
  - Remove pronouncing the language's name (e.g. `speak(meta.name)`) via TTS upon subtitle fetch in `src/routes/index.tsx` and related components.
  - When `autoSpeakOnFetch` is enabled and subtitles are fetched/loaded for language(s), automatically add those languages to `spoken` state (checking the checkbox under "Speak" in the Favorites Language panel).
  - Update `scripts/verify-auto-speak-on-fetch.ts` and related tests to validate that fetching subtitles automatically sets the "Speak" checkbox without pronouncing language names.
  - Run dedicated tests, verify app compilation (`compile_applet`) and linting (`lint_applet`), and perform dedicated git commit.



