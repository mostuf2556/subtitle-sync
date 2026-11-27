# Todo

- [ ] **Task 461**: Fix `tts-play` not working and floating button unable to enable it:
  - [ ] Isolate touch/pointer events on `floating-menu-dropdown` & `floating-menu-toggle-btn`, add `role="menuitem"`, `tabIndex={0}`, `touchAction: "manipulation"`, keyboard handlers, and outside touch dismissal in `src/components/FloatingDraggablePauseButton.tsx`.
  - [ ] Wire `onNativeSpeak` into `executeTtsFallbackSequence` for `AndroidNativeShell.speak` in `executeSingleSpeech` and harden `onTtsPlayEnabledChange(true)` in `src/routes/index.tsx`.
  - [ ] Create `scripts/verify-tts-play-and-floating-enable-android.ts`, bump `v2.1.136`, and run full verification + `compile_applet` + `lint_applet`.
