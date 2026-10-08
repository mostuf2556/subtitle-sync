# YouTube Subtitle & Speech Flow Viewer

[![Build & Release Android APK](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/release-apk.yml/badge.svg)](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/release-apk.yml)
[![Web E2E Tests](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/web.yml/badge.svg)](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/web.yml)
[![Android Emulator E2E Tests](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/emulation.yml/badge.svg)](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/emulation.yml)
[![Publish Web Demo](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/deploy-demo.yml/badge.svg)](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/deploy-demo.yml)

A dedicated Android native shell application for YouTube video learning with synchronized multi-language subtitles, native hardware TTS speech flow, and on-the-fly translation switching. Accompanied by a scoped web companion for automated CI/CD test drivers and live interactive demonstration.

---

## 📲 Install & Update Android APK via CLI

All releases, version changelogs, and compiled APK artifacts are published on GitHub: [**Browse All Releases**](https://github.com/baobabitogether1-hash/subtitle-sync/releases).

To download and install the latest `YouTube-Viewer-debug.apk` directly onto any connected Android device or emulator via ADB without cloning this repository or keeping local build files, run this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/baobabitogether1-hash/subtitle-sync/main/update.apk.sh | bash -s -- "https://github.com/baobabitogether1-hash/subtitle-sync/releases/latest/download/YouTube-Viewer-debug.apk"
```

### What this command does:

1. **Locates ADB**: Automatically detects `adb` across Windows (Git Bash / MSYS2 / CMD), macOS, and Linux.
2. **Downloads APK**: Streams the latest debug APK from the GitHub release to the local downloads folder.
3. **Installs onto Device**: Executes `adb install -r -d -t` targeting package `com.ytviewer.app` with multi-tiered fallback pipelines.
4. **Launches App**: Starts `com.ytviewer.app/.MainActivity` on the connected target device or emulator.

---

## 🌐 GitHub Pages Links

Access the live web demo, web end-to-end test runner, and Android emulator verification reports:

| Resource                                               | Direct URL                                                                                                                     | Description                                                                                                                                                    |
| :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🚀 **Web-App Demo Landing Page**                       | [**Open Live Web Demo**](https://baobabitogether1-hash.github.io/subtitle-sync/)                                                         | Standalone browser build with responsive playback controls, dual-language subtitles (`top`/`above`/`under`/`bottom`), and instant target language switching.   |
| 📋 **Mochawesome Test Report**                         | [**Open Mochawesome Report**](https://baobabitogether1-hash.github.io/subtitle-sync/mochawesome.html)                                    | Suite breakdown, pass/fail metrics, step timing breakdown, and test assertion logs from Cypress E2E suite.                                                     |
| 🔍 **Playwright E2E Test Report**                      | [**Open Playwright Report**](https://baobabitogether1-hash.github.io/subtitle-sync/playwright/index.html)                                | Network timeline, console events, and action waterfall inspector for web test execution.                                                                       |
| 📱 **E2E Tests on Android Emulator**                   | [**Open Android Emulator Report**](https://baobabitogether1-hash.github.io/subtitle-sync/android-emulator-report.html)                   | Standalone report verifying native WebView `shouldInterceptRequest` on Google Pixel 7 (Android 14 / API 34), Logcat audit, and hardware TTS loop verification. |
| 📸 **Android Emulator Screenshot**                     | [**View Latest Emulator Screenshot**](https://baobabitogether1-hash.github.io/subtitle-sync/screenshots/android-emulator-screenshot.png) | Latest authentic screenshot captured directly from the Android Emulator during CI verification.                                                                |
| 🧪 **Web E2E Pipeline (CI Runs & Artifacts)**          | [**View Web E2E Test Workflow**](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/web.yml)                       | Continuous CI run history, Playwright traces, and Mochawesome build artifacts.                                                                                 |
| 🤖 **Android Emulator Pipeline (CI Runs & Artifacts)** | [**View Android E2E Workflow**](https://github.com/baobabitogether1-hash/subtitle-sync/actions/workflows/emulation.yml)                  | Continuous CI run history, job summary with live Logcat telemetry, and APK binaries.                                                                           |

> **Note on GitHub Pages Availability:**
> Artifacts, test reports, and demo assets are automatically published to the `gh-pages` branch on every push. To access the live web demo, reports, and screenshot URLs, ensure GitHub Pages is enabled in repository settings:
> 👉 **Settings > Pages > Build and deployment > Source: Deploy from a branch (`gh-pages` / `/root`)**.

---

## 📁 Modular Architecture & Documentation

The project is governed by strict Markdown contracts that decouple visual view implementations from data acquisition and platform internals. Any view can be recreated or swapped using different tools and frameworks by following these specifications:

| Document                                                                        | Purpose & Scope                                                                                                  |
| :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| **[`AGENTS.md`](./AGENTS.md)**                                                  | Core architectural foundation, pure view mandates, data-flow boundaries, and testing phases.                     |
| **[`ACTIONS.md`](./docs/operations/ACTIONS.md)**                                | GitHub Actions CI/CD guide: APK release, web testing, emulator pipelines, and artifact flow.                     |
| **[`LIBRARY.md`](./docs/specifications/LIBRARY.md)**                            | JSON3 subtitle fixture library schema (`test/fixtures/<VIDEO_ID>/*.json`) and verification.                      |
| **[`DESIGN_SUBTITLE_VIEWS.md`](./docs/designs/DESIGN_SUBTITLE_VIEWS.md)**       | Replaceable view contract for subtitle renderers (injected cues, active state, intent dispatch).                 |
| **[`DESIGN_VIEW_LANGS.md`](./docs/designs/DESIGN_VIEW_LANGS.md)**               | Replaceable view contract for language selectors (injected language options, selection dispatch).                |
| **[`DESIGN_CONTROLS_VIEW.md`](./docs/designs/DESIGN_CONTROLS_VIEW.md)**         | Replaceable view contract for media playback controls (injected playback metrics, intent callbacks).             |
| **[`DESIGN_PLAYER_PROVIDER.md`](./docs/designs/DESIGN_PLAYER_PROVIDER.md)**     | Vendor-agnostic media player controller and time-synchronization contract.                                       |
| **[`DESIGN_STATE_COORDINATOR.md`](./docs/designs/DESIGN_STATE_COORDINATOR.md)** | Finite state machine, lifecycle transitions, active cue resolution, and state flow.                              |
| **[`SCHEMA_TIMEDTEXT.md`](./docs/specifications/SCHEMA_TIMEDTEXT.md)**          | Format definitions, segment timings, entity decoding, and RTL/BiDi normalization.                                |
| **[`DEBUG.md`](./docs/operations/DEBUG.md)**                                    | Diagnostic log viewer, network interception, 200-char response preview, and AI troubleshooting prompt generator. |

---

## 🏗️ Architectural Core: Pure Views & Dependency Injection

```text
[ Data Providers ] ──► [ Normalized Data ] ──► [ Pure Views ] ──► [ User Callbacks ]
   - Local Fixtures (Web)     - SubtitleCue[]       - Overlay        - onSelectCue
   - TimedText Hook (Android) - LanguageOption[]    - Transcript     - onSelectLanguage
```

1. **Pure Presentation**: Views never make network calls, read files, or parse raw timed-text files directly.
2. **Implementation Independent**: Any view can be replaced (e.g. replacing a complex transcript panel with a parallel subtitles matrix) without touching the data acquisition logic.
3. **Format Support**: Uses YouTube JSON3 (`.json`) exclusively for millisecond segment timing and word-level highlighting.
