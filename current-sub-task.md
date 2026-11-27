# Current Sub-Task

### Task 461: Fix TTS-Play Not Working & Floating Button Unable to Enable It
- Status: `[IN PROGRESS]`
- Target files:
  - `src/components/FloatingDraggablePauseButton.tsx`
  - `src/routes/index.tsx`
  - `scripts/verify-tts-play-and-floating-enable-android.ts`
- Checks: `npx tsc --noEmit`, `npm run test:tts-play-and-floating-enable-android`, `npm run test:floating-tts-play-active-during-video`, `npm run test:floating-menu-third-option-tts-play`, `npm run test:default-native-tts-and-ondemand-x7`.
