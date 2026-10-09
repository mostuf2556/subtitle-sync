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
