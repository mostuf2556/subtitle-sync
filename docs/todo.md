# Current task

## Task 4: Align and verify web and Android E2E coverage

Replace stale selectors and assumptions from the previous app with tests for the current Parallel Subtitles UI. The Android test will inject the native bridge that the WebView provides and assert the selected language codes sent to it.

## Done looks like

- Web smoke tests use the current app's title, panels, fixtures, and language selector.
- Android emulation verifies the bridge receives the selected language list.
- The Playwright web and emulation projects pass when Chromium is available.