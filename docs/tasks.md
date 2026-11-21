# Active Tasks

## Serial Chapters (Latest Prompt)

1. **Task 459 — Persist & restore full Learning Goals configuration inside language configuration profiles** (`[ACTIVE]`)
   - **Sub-task 459.1 (`[DONE]`)**: Extended `LearningProfileConfig` and `LanguageRatioComposition` (`src/utils/ratioCompositionsManager.ts`), added preference accessors in `src/lib/playback-preferences.ts`, added `replaceMaps` support in `src/utils/appSettings.ts`, and updated profile handlers + reload hydration in `src/routes/index.tsx`.
   - **Sub-task 459.2 (`[ACTIVE]`)**: Add verification script (`scripts/verify-learning-goals-profile-full-persistence.ts`), register in `package.json` & `docs/files.md`, bump & sync `package.json` version (`npm run sync-version`), run Learning Goals & full regression tests + final `compile_applet` & `lint_applet`, log `docs/git.md`, and archive to `docs/done.md`.
