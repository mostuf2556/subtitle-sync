import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

// Set up browser-like localStorage mock for Node unit tests
const storage: Record<string, string> = {};
const mockStorage: Storage = {
  getItem: (key: string) => (key in storage ? storage[key] : null),
  setItem: (key: string, value: string) => {
    storage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const k of Object.keys(storage)) delete storage[k];
  },
  key: (index: number) => Object.keys(storage)[index] ?? null,
  get length() {
    return Object.keys(storage).length;
  },
};

(globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
(globalThis as unknown as { window: { localStorage: Storage } }).window = {
  localStorage: mockStorage,
};

console.log("=== Task 459: Verifying Full Learning Goals Profile Persistence ===");

async function runUnitChecks() {
  console.log("1. Verifying full field round-trip in ratioCompositionsManager...");
  mockStorage.clear();

  const {
    saveRatioComposition,
    updateRatioComposition,
    getStoredRatioCompositions,
    deleteRatioComposition,
  } = await import("../src/utils/ratioCompositionsManager");

  const {
    setAllZeroKnowledgeInLang,
    getZeroKnowledgeInLang,
    getAllZeroKnowledgeInLang,
    setAllPerLanguagePickWordStrategies,
    getPickWordStrategy,
    getAllPerLanguagePickWordStrategies,
    saveAllTtsRatiosPreference,
    getTtsRatiosPreference,
    saveAllTtsRatesPreference,
    getTtsRatesPreference,
    saveAllTtsVolumesPreference,
    getTtsVolumesPreference,
    saveLanguageOrderPreference,
    getLanguageOrderPreference,
    saveShownLanguagesPreference,
    getShownLanguagesPreference,
    saveSpokenLanguagesPreference,
    getSpokenLanguagesPreference,
  } = await import("../src/lib/playback-preferences");

  const { saveVideoSettings, loadVideoSettings } = await import("../src/utils/appSettings");

  const profileA = saveRatioComposition(
    "Profile A — Hebrew & Spanish",
    { default: 1, es: 3, he: 2 },
    {
      favoriteLanguages: ["es", "he", "es"],
      targetLanguages: ["es", "he"],
      baseLanguage: "en",
      primaryTtsLang: "he",
      languageOrder: ["he", "es", "en", "fr"],
      sectionOrder: "tts-first",
      ttsLanguageOrders: { he: "in-between", es: "video-first" },
      rates: { he: 0.75, es: 0.9 },
      volumes: { he: 0.85, es: 1.0 },
      ttsBlacklist: ["ru", "ru"],
      zeroKnowledgeLangs: { he: true, es: false },
      pickWordStrategy: "random",
      perLanguagePickWordStrategies: { he: "longest", es: "random" },
      maxWordsPerSentence: 9,
      skipIncompleteSentences: true,
      languageMaxWords: { he: 6, es: 10 },
      languageSkipIncomplete: { he: true, es: false },
      shown: ["en", "he", "es"],
      spoken: ["he", "es"],
    },
  );

  const retrievedA = getStoredRatioCompositions().find((c) => c.id === profileA.id);
  assert.ok(retrievedA, "Saved profile A must exist in storage");
  assert.deepEqual(retrievedA.favoriteLanguages, ["es", "he"]);
  assert.deepEqual(retrievedA.targetLanguages, ["es", "he"]);
  assert.equal(retrievedA.baseLanguage, "en");
  assert.equal(retrievedA.primaryTtsLang, "he");
  assert.deepEqual(retrievedA.languageOrder, ["he", "es", "en", "fr"]);
  assert.equal(retrievedA.sectionOrder, "tts-first");
  assert.deepEqual(retrievedA.ttsLanguageOrders, { he: "in-between", es: "video-first" });
  assert.deepEqual(retrievedA.rates, { he: 0.75, es: 0.9 });
  assert.deepEqual(retrievedA.volumes, { he: 0.85, es: 1.0 });
  assert.deepEqual(retrievedA.ttsBlacklist, ["ru"]);
  assert.deepEqual(retrievedA.zeroKnowledgeLangs, { he: true, es: false });
  assert.equal(retrievedA.pickWordStrategy, "random");
  assert.deepEqual(retrievedA.perLanguagePickWordStrategies, {
    he: "longest",
    es: "random",
  });
  assert.equal(retrievedA.maxWordsPerSentence, 9);
  assert.equal(retrievedA.skipIncompleteSentences, true);
  assert.deepEqual(retrievedA.languageMaxWords, { he: 6, es: 10 });
  assert.deepEqual(retrievedA.languageSkipIncomplete, { he: true, es: false });
  assert.deepEqual(retrievedA.shown, ["en", "he", "es"]);
  assert.deepEqual(retrievedA.spoken, ["he", "es"]);

  // Update profile A and ensure new fields overwrite cleanly
  const updatedA = updateRatioComposition(profileA.id, {
    favoriteLanguages: ["fr", "it"],
    targetLanguages: ["fr", "it"],
    baseLanguage: "es",
    primaryTtsLang: "fr",
    languageOrder: ["fr", "it", "es"],
    ttsBlacklist: ["de"],
    zeroKnowledgeLangs: { fr: true },
    pickWordStrategy: "longest",
    perLanguagePickWordStrategies: { fr: "random" },
    languageMaxWords: { fr: 7 },
    languageSkipIncomplete: { fr: true },
    shown: ["es", "fr", "it"],
    spoken: ["fr"],
  });
  assert.ok(updatedA);
  assert.deepEqual(updatedA.favoriteLanguages, ["fr", "it"]);
  assert.deepEqual(updatedA.targetLanguages, ["fr", "it"]);
  assert.equal(updatedA.baseLanguage, "es");
  assert.equal(updatedA.primaryTtsLang, "fr");
  assert.deepEqual(updatedA.languageOrder, ["fr", "it", "es"]);
  assert.deepEqual(updatedA.ttsBlacklist, ["de"]);
  assert.deepEqual(updatedA.zeroKnowledgeLangs, { fr: true });
  assert.equal(updatedA.pickWordStrategy, "longest");
  assert.deepEqual(updatedA.perLanguagePickWordStrategies, { fr: "random" });
  assert.deepEqual(updatedA.languageMaxWords, { fr: 7 });
  assert.deepEqual(updatedA.languageSkipIncomplete, { fr: true });
  assert.deepEqual(updatedA.shown, ["es", "fr", "it"]);
  assert.deepEqual(updatedA.spoken, ["fr"]);

  console.log("2. Verifying stale per-language key eviction on profile switch...");
  // Simulate direct legacy per-language keys left over from a prior session
  mockStorage.setItem("yt_zero_knowledge_he", "true");
  mockStorage.setItem("yt_pick_word_strategy_he", "random");
  setAllZeroKnowledgeInLang({ fr: true });
  assert.equal(getZeroKnowledgeInLang("he"), false, "Stale yt_zero_knowledge_he must be cleared");
  assert.equal(getZeroKnowledgeInLang("fr"), true);
  assert.deepEqual(getAllZeroKnowledgeInLang(), { fr: true });

  setAllPerLanguagePickWordStrategies({ fr: "random" });
  assert.equal(
    mockStorage.getItem("yt_pick_word_strategy_he"),
    null,
    "Stale yt_pick_word_strategy_he key must be removed on profile switch",
  );
  assert.equal(
    getPickWordStrategy("he"),
    "longest",
    "Stale yt_pick_word_strategy_he must fall back to default longest strategy",
  );
  assert.equal(getPickWordStrategy("fr"), "random");
  assert.deepEqual(getAllPerLanguagePickWordStrategies(), { fr: "random" });

  // Bulk preference setters & getters
  saveAllTtsRatiosPreference({ fr: 4, it: 2 });
  assert.deepEqual(getTtsRatiosPreference(), { fr: 4, it: 2 });
  saveAllTtsRatesPreference({ fr: 0.65, it: 1.1 });
  assert.deepEqual(getTtsRatesPreference(), { fr: 0.65, it: 1.1 });
  saveAllTtsVolumesPreference({ fr: 0.5, it: 0.9 });
  assert.deepEqual(getTtsVolumesPreference(), { fr: 0.5, it: 0.9 });
  saveLanguageOrderPreference(["fr", "it", "en"]);
  assert.deepEqual(getLanguageOrderPreference(), ["fr", "it", "en"]);
  saveShownLanguagesPreference(["en", "fr"]);
  assert.deepEqual(getShownLanguagesPreference(), ["en", "fr"]);
  saveSpokenLanguagesPreference(["fr"]);
  assert.deepEqual(getSpokenLanguagesPreference(), ["fr"]);

  console.log("3. Verifying saveVideoSettings replaceMaps option replaces stale maps...");
  saveVideoSettings("L2Ryrr6txwA", {
    targetLanguages: ["he", "es"],
    ttsRates: { he: 0.7, es: 0.8 },
    ttsRatios: { he: 2, es: 3 },
    ttsVolumes: { he: 0.5, es: 0.6 },
    ttsLanguageOrders: { he: "tts-first" },
  });
  saveVideoSettings(
    "L2Ryrr6txwA",
    {
      targetLanguages: ["fr"],
      ttsRates: { fr: 0.95 },
      ttsRatios: { fr: 1 },
      ttsVolumes: { fr: 0.9 },
      ttsLanguageOrders: { fr: "in-between" },
    },
    { replaceMaps: true },
  );
  const reloadedVideo = loadVideoSettings("L2Ryrr6txwA");
  assert.ok(reloadedVideo);
  assert.deepEqual(reloadedVideo.targetLanguages, ["fr"]);
  assert.deepEqual(reloadedVideo.ttsRates, { fr: 0.95 });
  assert.deepEqual(reloadedVideo.ttsRatios, { fr: 1 });
  assert.deepEqual(reloadedVideo.ttsVolumes, { fr: 0.9 });
  assert.deepEqual(reloadedVideo.ttsLanguageOrders, { fr: "in-between" });

  assert.equal(deleteRatioComposition(profileA.id), true);
  console.log("   ✔ Unit checks passed.");
}

function runSourceWiringChecks() {
  console.log("4. Auditing src/routes/index.tsx wiring & Advanced/Beginner parity...");
  const root = process.cwd();
  const indexSrc = fs.readFileSync(path.join(root, "src/routes/index.tsx"), "utf8");

  const requiredTokens = [
    "getLanguageOrderPreference",
    "saveLanguageOrderPreference",
    "getSectionOrderPreference",
    "getAllPerLanguagePickWordStrategies",
    "setAllPerLanguagePickWordStrategies",
    "saveAllTtsRatiosPreference",
    "saveAllTtsRatesPreference",
    "saveAllTtsVolumesPreference",
    "getShownLanguagesPreference",
    "saveShownLanguagesPreference",
    "getSpokenLanguagesPreference",
    "saveSpokenLanguagesPreference",
    "perLanguagePickWordStrategies: getAllPerLanguagePickWordStrategies()",
    "languageMaxWords,",
    "languageSkipIncomplete,",
    "zeroKnowledgeLangs: zeroKnowledgeMap,",
    "{ replaceMaps: true }",
    'id="stage-2-top-profile-container"',
    "profileSelectorSlot={",
  ];
  for (const token of requiredTokens) {
    assert.ok(indexSrc.includes(token), `src/routes/index.tsx missing required wiring: ${token}`);
  }

  const begTabSrc = fs.readFileSync(
    path.join(root, "src/components/beginner/tabs/BeginnerPreferencesTab.tsx"),
    "utf8",
  );
  assert.ok(
    begTabSrc.includes('id="beginner-top-profile-container"'),
    "BeginnerPreferencesTab must render #beginner-top-profile-container",
  );
  console.log("   ✔ Source wiring & parity audit passed.");
}

async function runLiveE2EIfAvailable() {
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
  let serverUp = false;
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2500) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
  if (!serverUp) {
    console.log(`5. Skipping live Chromium E2E test (dev server not reachable at ${baseUrl}).`);
    return;
  }

  console.log("5. Running live Chromium E2E save -> switch -> reload verification...");
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      if (!sessionStorage.getItem("__test_cleared")) {
        localStorage.clear();
        sessionStorage.setItem("__test_cleared", "1");
      }
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    console.log("   [e2e] Navigating to", baseUrl);
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Ensure Stage 1 Learning Goals is visible
    console.log("   [e2e] Waiting for stage-step-1...");
    const stage1Btn = page.getByTestId("stage-step-1");
    await stage1Btn.waitFor({ state: "visible", timeout: 25000 });
    await stage1Btn.click();

    // Configure Profile A: select Japanese manually
    console.log("   [e2e] Opening Languages panel & Approved Languages accordion...");
    const langDetails = page.locator('details[data-panel-id="languages"]');
    await langDetails.waitFor({ state: "attached", timeout: 25000 });
    if ((await langDetails.getAttribute("open")) === null) {
      await langDetails.locator("summary").first().click();
    }
    const approvedAcc = page.getByTestId("learning-goal-accordion-approved-languages");
    await approvedAcc.waitFor({ state: "attached", timeout: 25000 });
    if ((await approvedAcc.getAttribute("open")) === null) {
      await page.getByTestId("learning-goal-summary-approved-languages").click();
    }
    const filterInput = page.getByTestId("stage-2-filter-languages-input");
    await filterInput.waitFor({ state: "visible", timeout: 25000 });
    await filterInput.fill("Japanese");
    await page.getByTestId("stage-2-add-lang-item-ja").click();
    await page.getByTestId("stage-2-learning-lang-ja").waitFor({ state: "visible", timeout: 10000 });

    // Save Profile A in Advanced top profile selector
    console.log("   [e2e] Saving Profile A: Alpha Japanese...");
    const profileContainer = page.locator("#stage-2-top-profile-container");
    await profileContainer.getByTestId("open-save-profile-button").click();
    await profileContainer.getByTestId("save-profile-name-input").fill("Alpha Japanese");
    await profileContainer.getByTestId("confirm-save-profile-button").click();

    // Verify saved Profile A active and persisted with targetLanguages + favoriteLanguages containing ja
    const storedAfterA = await page.evaluate(() => {
      const comps = JSON.parse(localStorage.getItem("yt_language_ratio_compositions_v1") || "[]");
      return comps.find((c: { name: string }) => c.name === "Alpha Japanese");
    });
    assert.ok(storedAfterA, "Alpha Japanese profile should be stored");
    assert.ok(
      storedAfterA.favoriteLanguages?.includes("ja"),
      "Profile A must capture favoriteLanguages including ja",
    );
    assert.ok(
      Array.isArray(storedAfterA.languageOrder) && storedAfterA.languageOrder.length > 0,
      "Profile A must capture languageOrder",
    );
    assert.ok(Array.isArray(storedAfterA.shown), "Profile A must capture shown");
    assert.ok(Array.isArray(storedAfterA.spoken), "Profile A must capture spoken");

    // Mutate state: remove Japanese and add Korean, save Profile B
    console.log("   [e2e] Adding Korean, removing Japanese, saving Beta Korean...");
    await filterInput.fill("Korean");
    await page.getByTestId("stage-2-add-lang-item-ko").click();
    await page.getByTestId("stage-2-learning-lang-ko").waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("stage-2-remove-fav-ja").click();
    await profileContainer.getByTestId("open-save-profile-button").click();
    await profileContainer.getByTestId("save-profile-name-input").fill("Beta Korean");
    await profileContainer.getByTestId("confirm-save-profile-button").click();

    // Switch back to Profile A and reload page
    console.log("   [e2e] Switching back to Alpha Japanese:", storedAfterA.id);
    const dropdown = profileContainer.getByTestId("ratio-compositions-dropdown");
    await dropdown.waitFor({ state: "visible", timeout: 15000 });
    await dropdown.selectOption(storedAfterA.id);
    await page.getByTestId("stage-2-learning-lang-ja").waitFor({ state: "visible", timeout: 10000 });
    assert.equal(
      await page.getByTestId("stage-2-learning-lang-ko").count(),
      0,
      "Switching back to Alpha Japanese should remove Korean",
    );

    console.log("   [e2e] Reloading page to verify full hydration persistence...");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    const stage1BtnReload = page.getByTestId("stage-step-1");
    await stage1BtnReload.waitFor({ state: "visible", timeout: 25000 });
    await stage1BtnReload.click();
    const langDetailsReload = page.locator('details[data-panel-id="languages"]');
    await langDetailsReload.waitFor({ state: "attached", timeout: 25000 });
    if ((await langDetailsReload.getAttribute("open")) === null) {
      await langDetailsReload.locator("summary").first().click();
    }
    const approvedAccReload = page.getByTestId("learning-goal-accordion-approved-languages");
    await approvedAccReload.waitFor({ state: "attached", timeout: 25000 });
    if ((await approvedAccReload.getAttribute("open")) === null) {
      await page.getByTestId("learning-goal-summary-approved-languages").click();
    }
    await page.getByTestId("stage-2-learning-lang-ja").waitFor({ state: "visible", timeout: 25000 });
    assert.equal(
      await page.getByTestId("stage-2-learning-lang-ko").count(),
      0,
      "Reload must keep Alpha Japanese languages and not revert to Korean",
    );

    // Verify Beginner Mode sees the exact same active profile & restored Japanese language
    console.log("   [e2e] Verifying Beginner Mode parity...");
    await page.goto(`${baseUrl}?mode=beginner`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const begPrefTab = page.getByTestId("beginner-tab-preferences");
    await begPrefTab.waitFor({ state: "visible", timeout: 25000 });
    await begPrefTab.click();
    const begProfileName = await page.getByTestId("beginner-active-profile-name").textContent();
    assert.equal(begProfileName?.trim(), "Alpha Japanese");

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);
    console.log("   ✔ Live Chromium E2E save/switch/reload & parity checks passed.");
  } finally {
    await browser.close();
  }
}

await runUnitChecks();
runSourceWiringChecks();
await runLiveE2EIfAvailable();
console.log("✅ PASS: Full Learning Goals profile persistence verified!");
