# Code Files Inventory

This document maintains the registry of codebase files, their specific roles, architectural responsibilities, and feature domain boundaries.

## Application Architecture & Routing

| File Path               | Role                         | Feature & Responsibilities                                                                                    |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `index.html`            | Application HTML Entry Point | Root HTML5 template mounting the React SPA into `#root`.                                                      |
| `src/routes/index.tsx`  | Main Workspace View          | Orchestrates player view, playback controls, parser selector, language controls, and parallel subtitle table. |
| `src/routes/__root.tsx` | Root Layout                  | Provides document shell, theme styling containers, QueryClient context, and child route outlet.               |
| `src/router.tsx`        | Router Definition            | Configures TanStack Router instance and integrates generated route tree.                                      |
| `src/client.tsx`        | Client Mount Entry           | Initializes client-side rendering with `createRoot` and mounts the router into the DOM.                       |

## Subtitles & Alignment Core (`src/lib/`)

| File Path                                     | Role                          | Feature & Responsibilities                                                                                                         |
| --------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/subtitles.ts`                        | Subtitle Alignment Engine     | Implements sentence, word, raw segment, and linear blend alignment across multi-language JSON3 tracks.                             |
| `src/lib/native-captions.ts`                  | Native Android Bridge Interop | Decodes intercepted base64 caption payloads and extracts timedtext URL parameters.                                                 |
| `src/lib/lovable-error-reporting.ts`          | Lovable Studio Telemetry      | Dispatches runtime error reports to the Lovable integration layer.                                                                 |
| `src/lib/utils.ts`                            | UI Utilities                  | Provides class name concatenation (`cn`) merging Tailwind classes and clsx.                                                        |
| `src/components/NetworkRequestsInspector.tsx` | Network Traffic Inspector UI  | Displays live captured network requests with URL, method, status, duration, and first 200 characters response body preview.        |
| `src/components/ApkReleaseModal.tsx`          | Latest APK Release Modal      | Displays direct APK downloads, GitHub release links, web artifacts, and CLI install commands for both mostuf2556 and mostuf25561.  |
| `src/components/SubtitleFetchToast.tsx`       | Subtitle Fetch Notification   | Popup indicator notifying when subtitle fetching begins and finishes, with quick link to table and mute option.                    |
| `src/components/VideoInstancesSwiper.tsx`     | Multi-Video Swiper Carousel   | Horizontal swipeable carousel for multi-instance YouTube video elements with slide indicators, touch gestures, and setup guidance. |
| `src/components/FloatingDraggablePauseButton.tsx` | Floating Setup Pause Button | Draggable fixed-position pause button allowing users to freeze playback, autoscroll, and autofocus during app setup.                 |
| `src/components/VideoLibraryPanel.tsx`        | Video Library / Watch History UI  | Collapsible panel presenting watched video history cards, search filter, thumbnail previews, active badge, and quick reload. |

## Feature Utilities (`src/utils/`)

| File Path                                  | Role                               | Feature & Responsibilities                                                                                             |
| ------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/utils/youtube.ts`                     | YouTube Player & URL Utility       | Parses video IDs, validates URLs, and configures YouTube iframe player parameters.                                     |
| `src/utils/captionParser.ts`               | Caption Normalizer                 | Validates and converts varying caption schemas into normalized subtitle events.                                        |
| `src/utils/appSettings.ts`                 | Preferences & State Persistence    | Manages local storage persistence for learning languages, TTS settings, and app snapshots.                             |
| `src/utils/audioTrackManager.ts`           | Multi-Audio Track & Repeat Manager | Manages Audio-Track Mode preferences, native YouTube audio track matching, and segment repeating.                      |
| `src/utils/apkUpdater.ts`                  | OTA Hot Update Manager             | Checks GitHub Releases, downloads release zip artifacts, and performs live web bundle updates.                         |
| `src/utils/networkInterceptor.ts`          | Network Traffic Interceptor        | Monitors browser requests to capture YouTube timedtext subtitle URLs.                                                  |
| `src/utils/networkTracker.ts`              | Live Network Request Tracker       | Records timedtext, bridge, and fetch requests, keeping response bodies strictly truncated to the first 200 characters. |
| `src/utils/rtlUtils.ts`                    | Text Direction Manager             | Detects RTL languages (Hebrew, Arabic, etc.) and formats directional rendering.                                        |
| `src/utils/subtitleCache.ts`               | Subtitle Cache Service             | Stores fetched subtitles in local browser storage to support offline replay.                                           |
| `src/utils/urlStateManager.ts`             | URL Parameter Synchronizer         | Reflects active video, languages, and settings into query parameters for deep linking.                                 |
| `src/utils/videoSettings.ts`               | Per-Video Preferences Store        | Persists language choices and playback configurations specific to individual video IDs.                                |
| `src/utils/logBuffer.ts`                   | Diagnostic Log Buffer              | Captures and retains rolling logs for network, bridge, and playback diagnostic inspection.                             |
| `src/utils/subtitleNotificationManager.ts` | Subtitle Notification State        | Manages subtitle fetch notifications, auto-dismiss timers, broadcast events, and notification mute state.              |
| `src/utils/speechVoiceUtils.ts`            | Speech Synthesis Voice Utilities   | Provides voice deduplication, language filtering, and unique React option key generation to eliminate duplicate keys.  |
| `src/utils/multiVideoPlayerManager.ts`     | Multi-Instance Player Manager      | Manages multiple video element instances, isolated audio-track state per instance, and player registry coordination.   |
| `src/utils/videoLibraryManager.ts`         | Video Library / History Store      | Manages persistent watch history, default library fallback, search indexing, deduplication, and thumbnail resolution.   |

## Configuration & Data Fixtures (`src/config/`)

| File Path                 | Role                   | Feature & Responsibilities                                                                        |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `src/config/appConfig.ts` | App Config & Constants | Defines storage keys, default settings, and system-wide constants.                                |
| `src/config/constants.ts` | Language Catalogs      | Holds supported language definitions, ISO language codes, and default video constants.            |
| `src/config/fixtures.ts`  | Test Fixture Data      | Supplies mock subtitles and fallback video datasets for offline testing and demo runs.            |
| `src/types.ts`            | Core Type Contracts    | Exports TypeScript interfaces and types for subtitle cues, tracks, speech progress, and settings. |

## Architectural Specifications & Design Contracts (`docs/`)

| File Path                                  | Role                              | Feature & Responsibilities                                                                           |
| ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `docs/operations/ACTIONS.md`               | CI/CD Pipelines Specification     | Details automated GitHub Actions workflows, triggers, build matrix, and release artifacts.           |
| `docs/specifications/LIBRARY.md`           | Subtitle Fixture Library Contract | Details JSON3 fixture directory schema, offline test coverage, and validation rules.                 |
| `docs/designs/DESIGN_SUBTITLE_VIEWS.md`    | Subtitle Views Contract           | Defines injectable view contract for subtitle rendering components, cues, and active sync.           |
| `docs/designs/DESIGN_VIEW_LANGS.md`        | Language Selection Views Contract | Defines injectable view contract for language selectors, favorite tags, and ordering.                |
| `docs/designs/DESIGN_CONTROLS_VIEW.md`     | Playback Controls Contract        | Defines injectable view contract for player controls, pause mode, and loop repeat settings.          |
| `docs/designs/DESIGN_PLAYER_PROVIDER.md`   | Player Provider Contract          | Defines vendor-agnostic media playback provider interface and time synchronization.                  |
| `docs/designs/DESIGN_STATE_COORDINATOR.md` | State Coordinator Contract        | Specifies finite state machine, lifecycle transitions, active cue resolution, and state flow.        |
| `docs/specifications/SCHEMA_TIMEDTEXT.md`  | Timed-Text Schema Contract        | Specifies YouTube JSON3 format, segment timing, entity decoding, and BiDi normalization.             |
| `docs/operations/DEBUG.md`                 | Diagnostics & Logging Contract    | Details internal logging ring buffer, network request tracker, and troubleshooting prompt generator. |

## Testing & Quality Assurance (`e2e/`, `cypress/`, `scripts/`)

| File Path                                         | Role                                              | Feature & Responsibilities                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `e2e/web.spec.ts`                                 | Playwright Web Test                               | Tests web demo fixture loading, theme toggling, favorite language controls, and SSR hydration consistency.                                             |
| `e2e/app.spec.ts`                                 | Playwright App Smoke Test                         | Verifies core UI rendering and table layout integrity.                                                                                                 |
| `e2e/emulation.spec.ts`                           | Android Native Shell Emulation Test               | Simulates Android bridge timedtext interception and `tlang` subtitle track retrieval.                                                                  |
| `scripts/verify-client-spa.ts`                    | Pure Client SPA Architecture Verification         | Validates zero server dependencies, removal of SSR files, and valid client build.                                                                      |
| `scripts/verify-caption-formats.ts`               | Caption Format Verification                       | Asserts valid JSON3 structure across all repository subtitle fixtures.                                                                                 |
| `scripts/verify-accumulative-parser.ts`           | Accumulative Criteria Subtitles Parser Test       | Asserts multi-select criteria division, accumulative section calculation, presets, and backwards compatibility.                                        |
| `scripts/verify-ota-updater.ts`                   | OTA Updater Test Suite                            | Tests version comparison, GitHub release artifact resolution, and bundle application.                                                                  |
| `scripts/verify-audio-track-mode.ts`              | Audio-Track Repeat Mode Test Suite                | Validates default OFF state, preference persistence, audio track matching, and repeat pipeline.                                                        |
| `scripts/verify-auto-scroll.ts`                   | Auto-Scroll Setting Test Suite                    | Validates default OFF state, storage persistence, and safe fallback handling.                                                                          |
| `scripts/verify-hydration.ts`                     | SSR Hydration Determinism Test                    | Validates deterministic default language state consistency.                                                                                            |
| `scripts/verify-repo-hygiene.ts`                  | Repository Hygiene Verification                   | Asserts absence of synthetic report generators, fake HTML report dashboards, and unignored test artifacts.                                             |
| `scripts/verify-native-captions.ts`               | Native Captions & tlang Verification              | Asserts valid tlang handling, base language preservation, base64 payload decoding, and Kotlin bridge logic.                                            |
| `scripts/verify-android-favorite-subtitles.ts`    | Android Dynamic Subtitles & 10-Line Presentation  | Asserts dynamic multi-favorite language track loading, default 10-line presentation per column, and pagination on Android.                             |
| `scripts/verify-emulation-gh-pages.ts`            | Emulation GitHub Pages Publication Test           | Asserts workflow permissions, artifact staging, and keep_files deployment configuration for Android emulator artifacts on GitHub Pages.                |
| `scripts/verify-android-local-assets.ts`          | Android Local Assets Verification                 | Asserts complete removal of remote web-app fallbacks (APP_URL, github.io) and strict local asset execution in MainActivity.kt.                         |
| `scripts/verify-favorite-lang-dynamic-fetch.ts`   | Dynamic Favorite Languages Fetch Verification     | Validates dynamic timedtext subtitle requests via tlang when new favorite languages are selected and merged into tracks.                               |
| `scripts/verify-network-inspector.ts`             | Network Inspector & 200-char Body Verification    | Validates 200-character response body truncation, request recording, and inspector UI modal integration.                                               |
| `scripts/verify-workflows-alignment.ts`           | GitHub Workflows Alignment Test                   | Asserts exact workflow parity with Youtubenet6, deployed URL correctness, and error resilience.                                                        |
| `scripts/verify-doc-contracts.ts`                 | Architectural Contracts Verification              | Asserts presence and integrity of all 9 architectural documentation and specification contracts.                                                       |
| `scripts/verify-readme-links.ts`                  | README Links and Workflow Badges Verification     | Asserts validity of all relative cross-references, workflow badges, and release links in README.md.                                                    |
| `scripts/verify-default-timing-base.ts`           | Default Timing Base Verification                  | Validates removal of manual timing selector and automatic alignment using default base subtitle language.                                              |
| `scripts/verify-default-video-subtitles-e2e.ts`   | Default Video Subtitles E2E Verification          | Validates default video subtitles integrity, cue parsing, timing monotonicity, and alignment for Android and Web Demo.                                 |
| `scripts/verify-agents-push-rule.ts`              | AGENTS.md Git Push Rule Verification              | Asserts instruction to attempt git push after git commit in AGENTS.md and validates safe helper logic.                                                 |
| `scripts/verify-youtube-share-intent.ts`          | YouTube Share Intent Verification                 | Validates extraction of video IDs across all YouTube formats and intent propagation into Android WebView and React router.                             |
| `scripts/verify-progressive-subtitles-loading.ts` | Progressive Subtitles Loading Verification        | Asserts non-blocking React useTransition integration, per-track streaming, and event loop yielding during subtitle loading.                            |
| `scripts/verify-debug-mode-toggle.ts`             | Debug Mode Toggle & Suppression Verification      | Validates default OFF state, localStorage persistence, and conditional Network Panel button and modal suppression.                                     |
| `scripts/verify-android-background-playback.ts`   | Android Background Playback Verification          | Asserts WAKE_LOCK, hardware acceleration, WebView settings, continuous lifecycle management, and visibility protection in onPause/onStop.              |
| `scripts/verify-favorites-subtitles-sync.ts`      | Favorites & Subtitles Sync & Auto-Retry Test      | Validates favorite language column presence, continuous shown synchronization, auto-fetch-retry loop, and alignment status badges.                     |
| `scripts/verify-network-clean-records.ts`         | Clean Network Records & Good Fetch Verification   | Asserts exclusion of empty response bodies from successful, accurate HTTP status preservation, and green good fetch badge indicators.                  |
| `scripts/verify-network-accordion-tags.ts`        | Network Accordion, tlang Tags & Performance Test  | Validates SubtitleRow React.memo performance optimization, per-record accordion toggle, and dynamic tlang status colors (pending/done/failed/retried). |
| `scripts/verify-network-inspector-close.ts`       | Network Inspector Close & Collapse Verification   | Validates close button with testid/aria-label, backdrop click dismiss with stopPropagation, Escape key listener, and minimize/collapse dock.           |
| `scripts/verify-android-back-navigation.ts`       | Android Back Navigation & History Verification    | Validates OnBackPressedCallback in MainActivity, window.__handleAndroidBack modal consumption, history.pushState, and popstate navigation.             |
| `scripts/verify-valid-json-cache-guard.ts`        | Valid JSON Subtitle Cache Guard Verification      | Asserts rejection of non-JSON / error responses from caching in MainActivity and subtitleCache.ts, ensuring only valid JSON is stored.                 |
| `scripts/verify-subtitle-api-fallback.ts`         | Subtitle API Auto-Fallback Verification           | Asserts automatic fallback between tlang and lang options on invalid response in MainActivity and React route mode loop.                               |
| `scripts/verify-hotfix-links-and-actions.ts`      | Hotfix Links & GitHub Actions Verification        | Asserts validity of README links, presence of authentic screenshot assets in public/ & dist/, basepath handling, and workflow integrity.               |
| `scripts/verify-e2e-report-links.ts`              | Dedicated E2E Report Links Verification           | Asserts presence of all E2E report links (Mochawesome, Playwright, Android Emulator) in README.md and workflow staging.                                |
| `scripts/verify-playwright-locators.ts`           | Playwright Panel Locators Verification            | Validates disambiguation of Languages panel and data-panel attributes across Playwright test specifications.                                           |
| `scripts/verify-fork-readme-links.ts`             | Fork README & Report Staging Test                 | Validates zero-touch repository identity synchronization for forks and static fallback report staging in public/.                                      |
| `scripts/verify-fork-ci-workflows.ts`             | Fork CI Workflows & Staging Test                  | Asserts push triggers on web and emulation workflows, resilient report deployment, and preservation in deploy-demo.                                    |
| `scripts/verify-tts-subtitles-ratio.ts`           | Foreign Subtitles TTS Playback Ratio Verification | Validates per-language TTS frequency ratio calculations, device & video persistence, uninterrupted playback on skipped instances, and UI controls.     |
| `scripts/verify-unique-voice-keys.ts`             | Speech Voice Keys & Deduplication Verification    | Asserts deduplication of duplicate system voices (e.g. Microsoft Asaf) and guaranteed unique React keys for voice options.                             |
| `scripts/verify-multi-video-player-state.ts`      | Multi-Video Instance State Verification           | Asserts independent instance configuration, state persistence per video element, and multi-player registry coordination.                               |
| `scripts/verify-video-instances-swiper.ts`        | Video Instances Swiper Verification               | Validates carousel swiping, indicators, YouTube audio track setup guidance, isolated persistence, and route integration.                               |
| `scripts/verify-multi-video-audio-sync.ts`        | Multi-Video Audio-Track Sync Verification         | Validates pause/resume coordination across matched video elements, seek-to-segment, unmuting speaking instance, and primary resume.                    |
| `scripts/verify-apk-installation-robustness.ts`   | APK Install Robustness & Version Code Verification | Asserts deep purge on collision, downgrade & provider collision handling, standard version in package.json, and releases link in README.               |
| `scripts/verify-floating-draggable-pause.ts`      | Floating Draggable Pause Verification              | Asserts component contracts, touch & mouse drag clamping, tap-vs-drag discrimination, visual indicators, and accessibility semantics.                   |
| `scripts/verify-apk-version-and-releases.ts`      | In-App Version & Releases Link Verification        | Asserts version parity across manifests, header version badge, footer all releases link, and modal direct release links.                               |
| `scripts/verify-audio-track-time-sections.ts`     | Audio-Track Time-Sections Progression Verification | Asserts progression to next time-section, elimination of duplicate replay, pre-seek guard, and audio-track fallback.                                    |
| `scripts/verify-video-library.ts`                 | Video Library / Watch History Verification         | Validates persistent watch history, default seeding, deduplication, thumbnail resolution, time formatting, and panel integration.                        |
| `scripts/verify-md-links.ts`                      | Markdown Links Checker                            | Validates that all documentation cross-references and links resolve properly.                                                                          |
| `scripts/normalize-web-assets.mjs`                | Build Asset Normalizer                            | Adjusts asset paths for GitHub Pages sub-path hosting.                                                                                                 |
