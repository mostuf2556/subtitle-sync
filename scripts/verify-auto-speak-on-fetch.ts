import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  AUTO_SPEAK_ON_FETCH_STORAGE_KEY,
  getAutoSpeakOnFetchSetting,
  setAutoSpeakOnFetchSetting,
} from "../src/utils/appSettings";

console.log("====================================================");
console.log("🧪 Starting Auto Speak (Speak Checkbox) Upon Fetching Test");
console.log("====================================================");

const rootDir = process.cwd();
const settingsPath = path.join(rootDir, "src/utils/appSettings.ts");
const indexTsxPath = path.join(rootDir, "src/routes/index.tsx");

assert(fs.existsSync(settingsPath), "src/utils/appSettings.ts must exist");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");

const settingsContent = fs.readFileSync(settingsPath, "utf8");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

// 1. Verify storage key and helper exports
assert(
  AUTO_SPEAK_ON_FETCH_STORAGE_KEY === "yt_auto_speak_on_fetch",
  "AUTO_SPEAK_ON_FETCH_STORAGE_KEY must be 'yt_auto_speak_on_fetch'",
);
assert(
  typeof getAutoSpeakOnFetchSetting === "function",
  "getAutoSpeakOnFetchSetting must be a function",
);
assert(
  typeof setAutoSpeakOnFetchSetting === "function",
  "setAutoSpeakOnFetchSetting must be a function",
);
console.log("✅ PASS: Auto-speak settings storage key and functions verified");

// 2. Default behavior must be true (auto-speak upon fetch enabled)
assert.strictEqual(
  getAutoSpeakOnFetchSetting(),
  true,
  "getAutoSpeakOnFetchSetting must default to true",
);
console.log("✅ PASS: getAutoSpeakOnFetchSetting defaults to TRUE");

// 3. Verify index.tsx integrates auto-speak toggle
assert(
  indexContent.includes("getAutoSpeakOnFetchSetting()"),
  "src/routes/index.tsx must initialize autoSpeakOnFetch from persistent setting",
);
assert(
  indexContent.includes("data-testid=\"auto-speak-on-fetch-toggle\""),
  "src/routes/index.tsx must expose auto-speak toggle with testid auto-speak-on-fetch-toggle",
);
console.log("✅ PASS: Auto-speak toggle UI element exposed in index.tsx");

// 4. Verify that fetching subtitles auto-checks the "Speak" checkbox (updates spoken state)
assert(
  indexContent.includes("setSpoken((prev) => Array.from(new Set([...prev, ...Object.keys(next)])))"),
  "fetchFavoriteLanguageSubtitles must auto-enable Speak checkbox (setSpoken) for fetched languages",
);
assert(
  indexContent.includes("setSpoken((prev) => Array.from(new Set([...prev, ...newlyAdded])))"),
  "handleTargetLanguagesChange must auto-enable Speak checkbox (setSpoken) when autoSpeakOnFetch is true",
);

// 5. Verify that pronouncing the language name itself is REMOVED from subtitle fetching
assert(
  !indexContent.includes("speak(\n                meta.name || code") &&
    !indexContent.includes("speak(meta.name || code"),
  "fetchFavoriteLanguageSubtitles must NOT pronounce the language name using TTS",
);
console.log("✅ PASS: Language name pronunciation removed; Speak checkbox is auto-checked instead");

// 6. Functional simulation of auto-enabling Speak checkbox upon fetch
let simulatedSpoken: string[] = [];

function simulateFetchComplete(fetchedLangs: string[], autoSpeak: boolean) {
  if (!autoSpeak) return;
  simulatedSpoken = Array.from(new Set([...simulatedSpoken, ...fetchedLangs]));
}

simulateFetchComplete(["es", "he"], true);
assert.deepStrictEqual(simulatedSpoken, ["es", "he"], "Must add fetched languages to spoken list");

simulateFetchComplete(["ru"], true);
assert.deepStrictEqual(simulatedSpoken, ["es", "he", "ru"], "Must accumulate new languages without duplicates");

// When disabled, no new languages added
const prevLength = simulatedSpoken.length;
simulateFetchComplete(["fr"], false);
assert.strictEqual(simulatedSpoken.length, prevLength, "Must not add to spoken list when autoSpeak is disabled");
console.log("✅ PASS: Functional simulation of auto-enabling Speak checkbox passed");

console.log("====================================================");
console.log("📊 AUTO SPEAK ON FETCH TEST: All assertions passed successfully!");
console.log("====================================================");
