# Active Tasks

## Task 453: Add Comprehensive Unit, Integration, and Live E2E Tests for TTS Delay Diagnostics & Unjustified Pause Fixes
- Expand runtime unit & integration coverage in `scripts/verify-tts-delay-logging-and-no-spurious-pause.ts` (including `web_media_session` command source tracking, simulated slow remote TTS triggering `TTS_UNJUSTIFIED_DELAY`, and full diagnostic reproducibility checks).
- Add live Playwright Chromium E2E tests (`scripts/verify-tts-delay-and-no-spurious-pause-e2e.ts`, registered in `package.json` and `docs/files.md`) verifying against live app (`localhost:3000`):
  1. Android native TTS stall (`onNativeTTSStart` missing > 1800ms) & slow TTS3 fallback emit `TTS_UNJUSTIFIED_DELAY` + `TTS_STEP_*` + `ttsConfig` in copied State Machine diagnostic report.
  2. Spurious `web_media_session` `pause` focus-bounce in Android mode does NOT pause playback (`SPURIOUS_MEDIA_PAUSE_IGNORED` logged, player remains active, no `"Paused via system media controls"`), whereas explicit `onNativeMediaCommand("pause")` pauses playback cleanly.
  3. Immediate post-play YouTube `onStateChange({ data: 2 })` bounce auto-recovers (`UNEXPECTED_PLAYER_PAUSE` logged with `autoRecovered: true`) without leaving the player paused.
  4. Beginner Mode parity for spurious `web_media_session` pause suppression.
