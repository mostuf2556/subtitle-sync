# Current Sub-Task

## [ACTIVE] Sub-task 459.1 — Full Learning Goals configuration persistence inside language configuration profiles
- **Goal**: Ensure language configuration profiles (`#stage-2-top-profile-container` & `#beginner-top-profile-container`) remember and restore the entire list of languages and all settings on the Learning Goals stage across profile save, update, switch, and page reloads.
- **Root Causes Identified**:
  1. `LearningProfileConfig` & `LanguageRatioComposition` (`src/utils/ratioCompositionsManager.ts`) only store `ratios`, `maxWordsPerSentence`, `skipIncompleteSentences`, `sectionOrder`, `rates`, `volumes`, `ttsLanguageOrders` — omitting `favoriteLanguages`, `targetLanguages`, `baseLanguage`, `primaryTtsLang`, `languageOrder`, `ttsBlacklist`, `zeroKnowledgeLangs`, `pickWordStrategy`, `perLanguagePickWordStrategies`, `languageMaxWords`, `languageSkipIncomplete`, `shown`, and `spoken`.
  2. In `src/routes/index.tsx`, `languageOrder` has no `localStorage` persistence, `sectionOrder` initializes hardcoded to `"video-first"` instead of `getSectionOrderPreference()`, and `handleSaveComposition` / `handleUpdateRatioComposition` / `handleSelectRatioComposition` + reload hydration do not capture/restore the full Learning Goals state.
- **Changes planned**:
  1. `src/lib/playback-preferences.ts`: Add `getAllPerLanguagePickWordStrategies()`, `setAllPerLanguagePickWordStrategies()`, `getLanguageOrderPreference()`, and `saveLanguageOrderPreference()`.
  2. `src/utils/ratioCompositionsManager.ts`: Extend `LearningProfileConfig` / `LanguageRatioComposition` and `saveRatioComposition` / `updateRatioComposition` with all Learning Goals fields (keeping built-in presets non-destructive).
  3. `src/routes/index.tsx`: Initialize `sectionOrder` and `languageOrder` from preferences, persist `languageOrder` on `moveLanguage`, capture & restore full Learning Goals config on save/update/select, and ensure reload honors the active custom profile cleanly across Advanced and Beginner modes.
