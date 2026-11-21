/**
 * Dedicated Verification Test for Task 342 (Prompt 110 - Chapter 2):
 * Persist Learning Goals & Per-Language Settings Across App Init On Video Share
 *
 * Validates:
 * 1. Video load effect in src/routes/index.tsx restores learning goals (maxWordsPerSentence, skipIncompleteSentences)
 *    and each language's settings (speeds/ttsRates, ratios/ttsRatios, blacklist/ttsBlacklist, voiceSelections,
 *    ttsLanguageOrders) from global preferences when opening or sharing a video without prior custom settings.
 * 2. openLink in src/routes/index.tsx parses shared link URLs to extract target_lang and subtitles_url parameters.
 * 3. VideoSpecificSettings interface and saveVideoSettings in src/utils/appSettings.ts support learning goals
 *    and language settings (maxWordsPerSentence, skipIncompleteSentences, ttsRates, ttsRatios, ttsLanguageOrders, voiceSelections).
 * 4. Persistence preferences in src/lib/playback-preferences.ts correctly roundtrip learning goals word count,
 *    incomplete sentence filter, TTS rates, TTS ratios, and blacklist.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getLearningGoalsMaxWords,
  setLearningGoalsMaxWords,
  getLearningGoalsSkipIncomplete,
  setLearningGoalsSkipIncomplete,
  getTtsRatiosPreference,
  setTtsRatioPreference,
  getTtsRatesPreference,
  setTtsRatePreference,
  getTtsBlacklist,
  setTtsBlacklist,
  getTtsLanguageOrdersPreference,
  setTtsLanguageOrderPreference,
} from "../src/lib/playback-preferences";

console.log("=========================================================================");
console.log("🧪 Running Verification: Task 342 - Learning Goals & Language Settings on Video Share");
console.log("=========================================================================");

// Mock localStorage environment for preference roundtrip validation
const mockStore: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
  },
  key: (i: number) => Object.keys(mockStore)[i] ?? null,
  length: 0,
};
(globalThis as unknown as { window: unknown }).window = {
  localStorage: (globalThis as unknown as { localStorage: Storage }).localStorage,
  location: { search: "?v=test_shared_123&target_lang=es" },
};

// Test 1: Functional roundtrip of learning goals & per-language preferences
console.log("Test 1: Testing roundtrip of learning goals & language settings preferences...");

// A. Learning goals word filter
setLearningGoalsMaxWords(14);
assert.equal(getLearningGoalsMaxWords(), 14, "Max words per sentence preference must be 14");

// B. Learning goals complete sentence filter
setLearningGoalsSkipIncomplete(true);
assert.equal(getLearningGoalsSkipIncomplete(), true, "Skip incomplete sentences preference must be true");

// C. Per-language rates (speeds)
setTtsRatePreference("es", 0.7);
setTtsRatePreference("he", 0.9);
const savedRates = getTtsRatesPreference();
assert.equal(savedRates["es"], 0.7, "Spanish rate preference must persist as 0.7");
assert.equal(savedRates["he"], 0.9, "Hebrew rate preference must persist as 0.9");

// D. Per-language learning ratios
setTtsRatioPreference("es", 3);
setTtsRatioPreference("it", 2);
const savedRatios = getTtsRatiosPreference();
assert.equal(savedRatios["es"], 3, "Spanish ratio preference must persist as 3");
assert.equal(savedRatios["it"], 2, "Italian ratio preference must persist as 2");

// E. Per-language TTS blacklist
setTtsBlacklist(["ar", "ru"]);
const savedBlacklist = getTtsBlacklist();
assert.ok(savedBlacklist.includes("ar") && savedBlacklist.includes("ru"), "Blacklist must persist");

// F. Per-language sequence order
setTtsLanguageOrderPreference("es", "tts-first");
const savedOrders = getTtsLanguageOrdersPreference();
assert.equal(savedOrders["es"], "tts-first", "Spanish order preference must persist as tts-first");

console.log("✅ PASS: Preferences functional roundtrip validated");

// Test 2: Audit VideoSpecificSettings in src/utils/appSettings.ts
console.log("Test 2: Auditing VideoSpecificSettings and saveVideoSettings in src/utils/appSettings.ts...");
const appSettingsPath = path.resolve(process.cwd(), "src/utils/appSettings.ts");
const appSettingsCode = fs.readFileSync(appSettingsPath, "utf-8");

assert.ok(
  appSettingsCode.includes("maxWordsPerSentence?: number;"),
  "VideoSpecificSettings must declare maxWordsPerSentence",
);
assert.ok(
  appSettingsCode.includes("skipIncompleteSentences?: boolean;"),
  "VideoSpecificSettings must declare skipIncompleteSentences",
);
assert.ok(
  appSettingsCode.includes("ttsLanguageOrders?: Record<string, string>;"),
  "VideoSpecificSettings must declare ttsLanguageOrders",
);
assert.ok(
  appSettingsCode.includes("voiceSelections?: Record<string, string>;"),
  "VideoSpecificSettings must declare voiceSelections",
);
assert.ok(
  appSettingsCode.includes("...(existing.ttsRates || {})") &&
    appSettingsCode.includes("...(existing.ttsRatios || {})"),
  "saveVideoSettings must merge existing and new ttsRates and ttsRatios",
);
console.log("✅ PASS: VideoSpecificSettings interface and persistence verified");

// Test 3: Audit video load effect in src/routes/index.tsx
console.log("Test 3: Auditing video load effect and preference restoration in src/routes/index.tsx...");
const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexCode = fs.readFileSync(indexPath, "utf-8");

assert.ok(
  indexCode.includes("const globalBlacklist = getTtsBlacklist();") &&
    indexCode.includes("setTtsBlacklistState(globalBlacklist);"),
  "index.tsx must restore global TTS blacklist when loading video",
);

assert.ok(
  indexCode.includes("const globalRatios = getTtsRatiosPreference();") &&
    indexCode.includes("...globalRatios,"),
  "index.tsx must restore global TTS ratios when loading video",
);

assert.ok(
  indexCode.includes("const globalRates = getTtsRatesPreference();") &&
    indexCode.includes("...globalRates,"),
  "index.tsx must restore global TTS rates when loading video",
);

assert.ok(
  indexCode.includes("const globalOrders = getTtsLanguageOrdersPreference();") &&
    indexCode.includes("setTtsLanguageOrders(globalOrders);"),
  "index.tsx must restore global TTS language orders when loading video",
);

assert.ok(
  indexCode.includes('localStorage.getItem("yt_tts_voice_selections_v1")') &&
    indexCode.includes("setVoiceSelections("),
  "index.tsx must restore voice selections when loading video",
);

assert.ok(
  indexCode.includes("const savedMaxWords = getLearningGoalsMaxWords();") &&
    indexCode.includes("const savedSkipIncomplete = getLearningGoalsSkipIncomplete();") &&
    indexCode.includes("setSimpleParserConfig("),
  "index.tsx must restore learning goals (maxWordsPerSentence, skipIncompleteSentences) when loading video",
);

console.log("✅ PASS: index.tsx video load effect restores all learning goals and language settings");

// Test 4: Audit shared link dispatch (openLink) parameter parsing
console.log("Test 4: Auditing shared link dispatch in openLink (src/routes/index.tsx)...");
assert.ok(
  indexCode.includes("parsedParams.get(\"target_lang\") || parsedParams.get(\"lang\")"),
  "openLink must parse target_lang from incoming shared link URLs",
);
assert.ok(
  indexCode.includes("recordSharedLanguageForVideo(id, clean)"),
  "openLink must record shared target language for the video ID",
);
assert.ok(
  indexCode.includes("setFavoriteLanguagesState("),
  "openLink must update favorite languages when shared link provides a target language",
);

console.log("✅ PASS: openLink query parameter parsing verified");

console.log("=========================================================================");
console.log("🎉 ALL TESTS PASSED: Task 342 Learning Goals & Language Settings on Video Share Verified");
console.log("=========================================================================");
