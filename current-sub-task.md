# Current Sub-Task

## Task 453: Add Unit/Integration + Live Playwright E2E Tests for TTS Delay & Unjustified Pause Fixes
- Status: Active
- Targets: `scripts/verify-tts-delay-logging-and-no-spurious-pause.ts`, `scripts/verify-tts-delay-and-no-spurious-pause-e2e.ts`, `package.json`, `docs/files.md`
- Next: Expand unit/runtime tests and create live Chromium E2E test suite verifying Android TTS stall recovery, delay report reproducibility, spurious `web_media_session` pause suppression vs explicit pause, player `event.data === 2` bounce auto-recovery, and Beginner parity.
