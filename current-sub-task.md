# Current Sub-Task

## [ACTIVE] Sub-task 459.2 — Verify full Learning Goals profile persistence, bump version & archive
- **Goal**: Add `scripts/verify-learning-goals-profile-full-persistence.ts` testing full field round-trip, stale per-language `localStorage` key eviction, `saveVideoSettings(..., { replaceMaps: true })`, `src/routes/index.tsx` save/update/select/reload hydration wiring across Advanced & Beginner modes, and live Chromium save/switch/reload persistence if server is reachable; register script in `package.json` & `docs/files.md`, bump & sync version (`2.1.135`), run regressions + `compile_applet` + `lint_applet`, log `docs/git.md`, and archive Task 459 to `docs/done.md`.
- **Completed in 459.1**: Extended `playback-preferences.ts`, `ratioCompositionsManager.ts`, `appSettings.ts`, and `src/routes/index.tsx` (`handleSaveComposition`, `handleUpdateRatioComposition`, `handleSelectRatioComposition`, `moveLanguage`, reload hydration, and `primaryTtsLang` hook order).
