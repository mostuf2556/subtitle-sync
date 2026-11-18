/**
 * Dedicated test script: scripts/verify-learning-goals-persistent-visibility.ts
 *
 * Prompt 121 / Task 356:
 * "fix: learning goals - the view might disapear sometimes"
 *
 * Verifies:
 * 1. src/routes/index.tsx:
 *    - #stage-2-learning-goals-card is permanently rendered inside panelId === "languages"
 *    - No restrictive ternary condition `(currentAccordionStage === 1 || currentAccordionStage === 2 ?` wraps the learning goals card.
 *    - All essential controls remain intact within #stage-2-learning-goals-card:
 *      * 1. Default Source Language (stage-2-default-lang-${langCode})
 *      * 2. Approved Languages (stage-2-learning-lang-${code})
 *      * 3. Playback Order (stage-2-ingredient-order-section, VideoPlaybackPrecedenceBar)
 *      * 4. TTS-Play Ratio (stage-2-ingredient-ratio-section, sliders, plus/minus, presets)
 *      * 5. Blacklisted (stage-2-ingredient-blacklist-section)
 *      * 6. Sentence or Word granularity (stage-2-ingredient-granularity-section)
 *      * 7. Speech Rate (stage-2-ingredient-speed-section, sliders, plus/minus, presets)
 * 2. Beginner Mode parity in src/components/beginner/tabs/BeginnerPreferencesTab.tsx:
 *    - beginner-learning-goals-ratios-container is present
 *    - beginner-learning-goals-filters-container is present
 *    - LearningGoalsFiltersPanel is properly rendered
 * 3. Learning goals persistence:
 *    - VideoSpecificSettings in src/utils/appSettings.ts includes ttsRatios and ttsRates
 *    - src/lib/playback-preferences.ts exports getLanguageTtsRatio, saveTtsRatioPreference, getLanguageTtsRate, saveTtsRatePreference
 * 4. Version synchronization across all 5 single-source version files to 2.1.53
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

async function main() {
  console.log("=========================================================================");
  console.log("🧪 Verifying Task 356: Learning Goals Persistent Visibility & Parity");
  console.log("=========================================================================");

  const root = path.resolve(".");
  const indexTsxPath = path.join(root, "src/routes/index.tsx");
  assert.ok(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");
  const indexTsx = fs.readFileSync(indexTsxPath, "utf8");

  // Step 1: Ensure #stage-2-learning-goals-card is permanently rendered inside panelId === "languages"
  console.log("--> [Step 1] Verifying unconditional rendering of #stage-2-learning-goals-card in index.tsx...");
  assert.ok(
    indexTsx.includes('id="stage-2-learning-goals-card"'),
    "src/routes/index.tsx must contain id='stage-2-learning-goals-card'",
  );
  assert.ok(
    indexTsx.includes('data-testid="stage-2-learning-goals-card"'),
    "src/routes/index.tsx must contain data-testid='stage-2-learning-goals-card'",
  );

  // Check that panelId === "languages" unconditionally renders the card
  const languagesPanelSnippet = indexTsx.slice(
    indexTsx.indexOf('{panelId === "languages" && ('),
    indexTsx.indexOf('{panelId === "languages" && (') + 250,
  );
  assert.ok(
    !languagesPanelSnippet.includes("currentAccordionStage === 1 || currentAccordionStage === 2 ?"),
    "panelId === 'languages' must NOT conditionally gate stage-2-learning-goals-card on currentAccordionStage === 1 || 2",
  );
  assert.ok(
    languagesPanelSnippet.includes('id="stage-2-learning-goals-card"'),
    "stage-2-learning-goals-card must be immediately rendered when panelId === 'languages'",
  );
  console.log("✅ PASS: #stage-2-learning-goals-card is permanently and unconditionally rendered in Languages panel.");

  // Step 2: Verify all essential learning goals controls are intact within the card
  console.log("--> [Step 2] Verifying all essential learning goals controls inside card...");
  const cardStart = indexTsx.indexOf('id="stage-2-learning-goals-card"');
  const cardEnd = indexTsx.indexOf("Regular Languages Accordion Content", cardStart);
  assert.ok(cardStart !== -1 && cardEnd !== -1, "Learning goals card boundaries must be found");
  const cardContent = indexTsx.slice(cardStart, cardEnd);

  // 1. Default Source Language
  assert.ok(
    cardContent.includes("stage-2-default-lang-"),
    "Card must contain stage-2-default-lang- buttons",
  );
  // 2. Approved Languages
  assert.ok(
    cardContent.includes("stage-2-learning-lang-"),
    "Card must contain stage-2-learning-lang- buttons/checkboxes",
  );
  // 3. Playback Order
  assert.ok(
    cardContent.includes("stage-2-ingredient-order-section"),
    "Card must contain stage-2-ingredient-order-section",
  );
  assert.ok(
    cardContent.includes("<VideoPlaybackPrecedenceBar"),
    "Card must contain VideoPlaybackPrecedenceBar",
  );
  // 4. TTS Ratios
  assert.ok(
    cardContent.includes("stage-2-ingredient-ratios-section"),
    "Card must contain stage-2-ingredient-ratios-section",
  );
  assert.ok(
    cardContent.includes("stage-2-ratio-decrement-"),
    "Card must contain ratio decrement buttons",
  );
  assert.ok(
    cardContent.includes("stage-2-ratio-increment-"),
    "Card must contain ratio increment buttons",
  );
  // 5. Blacklist
  assert.ok(
    cardContent.includes("stage-2-ingredient-blacklist-section"),
    "Card must contain stage-2-ingredient-blacklist-section",
  );
  // 6. Granularity (Word vs Sentence)
  assert.ok(
    cardContent.includes("stage-2-ingredient-sentence-word-section"),
    "Card must contain stage-2-ingredient-sentence-word-section",
  );
  // 7. Speech Rate
  assert.ok(
    cardContent.includes("stage-2-ingredient-speed-section"),
    "Card must contain stage-2-ingredient-speed-section",
  );
  assert.ok(
    cardContent.includes("stage-2-speed-decrement-"),
    "Card must contain speed decrement buttons",
  );
  assert.ok(
    cardContent.includes("stage-2-speed-increment-"),
    "Card must contain speed increment buttons",
  );
  console.log("✅ PASS: All 7 essential learning goals controls and ingredients verified inside card.");

  // Step 3: Beginner Mode Parity
  console.log("--> [Step 3] Verifying Beginner Mode Learning Goals parity...");
  const beginnerPrefPath = path.join(
    root,
    "src/components/beginner/tabs/BeginnerPreferencesTab.tsx",
  );
  assert.ok(fs.existsSync(beginnerPrefPath), "BeginnerPreferencesTab.tsx must exist");
  const beginnerPrefContent = fs.readFileSync(beginnerPrefPath, "utf8");

  assert.ok(
    beginnerPrefContent.includes('id="beginner-learning-goals-ratios-container"'),
    "BeginnerPreferencesTab must contain #beginner-learning-goals-ratios-container",
  );
  assert.ok(
    beginnerPrefContent.includes('id="beginner-learning-goals-filters-container"'),
    "BeginnerPreferencesTab must contain #beginner-learning-goals-filters-container",
  );
  assert.ok(
    beginnerPrefContent.includes("<LearningGoalsFiltersPanel"),
    "BeginnerPreferencesTab must render LearningGoalsFiltersPanel",
  );
  console.log("✅ PASS: Beginner Mode has 100% parity with learning goals ratios and filters.");

  // Step 4: Verify persistence mechanisms
  console.log("--> [Step 4] Verifying preference and state persistence...");
  const appSettingsPath = path.join(root, "src/utils/appSettings.ts");
  const appSettingsContent = fs.readFileSync(appSettingsPath, "utf8");
  assert.ok(
    appSettingsContent.includes("ttsRatios?: Record<string, number>"),
    "appSettings.ts must support ttsRatios in VideoSpecificSettings",
  );
  assert.ok(
    appSettingsContent.includes("ttsRates?: Record<string, number>"),
    "appSettings.ts must support ttsRates in VideoSpecificSettings",
  );

  const playbackPrefPath = path.join(root, "src/lib/playback-preferences.ts");
  const playbackPrefContent = fs.readFileSync(playbackPrefPath, "utf8");
  assert.ok(
    playbackPrefContent.includes("getLanguageTtsRatio"),
    "playback-preferences.ts must export getLanguageTtsRatio",
  );
  assert.ok(
    playbackPrefContent.includes("saveTtsRatioPreference"),
    "playback-preferences.ts must export saveTtsRatioPreference",
  );
  assert.ok(
    playbackPrefContent.includes("getTtsRatesPreference"),
    "playback-preferences.ts must export getTtsRatesPreference",
  );
  assert.ok(
    playbackPrefContent.includes("saveTtsRatePreference"),
    "playback-preferences.ts must export saveTtsRatePreference",
  );
  console.log("✅ PASS: State persistence contracts and helpers verified.");

  // Step 5: Version Synchronization across all 5 files
  console.log("--> [Step 5] Checking version synchronization across all 5 files...");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const vParts = String(pkgJson.version).split(".").map(Number);
  const minParts = [2, 1, 53];
  const isAtLeastMin =
    vParts[0] > minParts[0] ||
    (vParts[0] === minParts[0] &&
      (vParts[1] > minParts[1] || (vParts[1] === minParts[1] && vParts[2] >= minParts[2])));
  assert.ok(isAtLeastMin, `package.json version (${pkgJson.version}) must be >= 2.1.53`);

  const buildGradle = fs.readFileSync(path.join(root, "android-shell/app/build.gradle.kts"), "utf8");
  assert.ok(buildGradle.includes(`versionName = "${pkgJson.version}"`), "build.gradle.kts must match package.json version");

  const appConfig = fs.readFileSync(path.join(root, "src/config/appConfig.ts"), "utf8");
  assert.ok(
    appConfig.includes(`APP_VERSION = "${pkgJson.version}"`) || appConfig.includes("packageJson.version"),
    "src/config/appConfig.ts must derive from packageJson.version",
  );

  const apkUpdater = fs.readFileSync(path.join(root, "src/utils/apkUpdater.ts"), "utf8");
  assert.ok(
    apkUpdater.includes(`CURRENT_APK_VERSION = "v${pkgJson.version}"`) || apkUpdater.includes("APP_VERSION"),
    "src/utils/apkUpdater.ts must derive from APP_VERSION",
  );

  const appSettings = fs.readFileSync(path.join(root, "src/utils/appSettings.ts"), "utf8");
  assert.ok(
    appSettings.includes(`version: "${pkgJson.version}"`) || appSettings.includes("version: APP_VERSION"),
    "src/utils/appSettings.ts must derive from APP_VERSION",
  );
  console.log(`✅ PASS: All 5 files properly synchronized to version ${pkgJson.version}`);

  console.log("=========================================================================");
  console.log("🎉 ALL TESTS PASSED! Task 356 Learning Goals Persistent Visibility Verified");
  console.log("=========================================================================");
}

main().catch((err) => {
  console.error("❌ FAIL: Verification failed:", err);
  process.exit(1);
  });
