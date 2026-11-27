# Active Tasks

### Task 461: Prompt 228 — Fix TTS-Play Not Working & Floating Button Unable to Enable It
- Status: `[IN PROGRESS]`
- Goal: Restore reliable TTS-Play playback across Android/Web (`native_tts3` & `altTtsMode === "always"`) and ensure tapping the floating menu toggle and `menu-option-tts-play` reliably opens and enables TTS-Play on Android touch & desktop.
- Sub-Tasks:
  1. `[ ]` Fix `FloatingDraggablePauseButton.tsx` touch/pointer isolation, `role="menuitem"`, `touch-action: manipulation`, and outside-touch dismissal so Android taps on `floating-menu-toggle-btn` and `menu-option-tts-play` never get swallowed by container drag.
  2. `[ ]` Pass `onNativeSpeak` into `executeTtsFallbackSequence` in `executeSingleSpeech` (`src/routes/index.tsx`) so `AndroidNativeShell.speak` executes on `"native_tts3"` even under `altTtsMode === "always"` (with startup watchdog -> TTS3 fallback); harden `onTtsPlayEnabledChange(true)` so enabling TTS-Play clears stale setup pause / current-row blocks / empty speakable target list and speaks immediately.
  3. `[ ]` Add & verify `scripts/verify-tts-play-and-floating-enable-android.ts` (`npm run test:tts-play-and-floating-enable-android`), bump version to `2.1.136`, and run full verification + `compile_applet` + `lint_applet`.
