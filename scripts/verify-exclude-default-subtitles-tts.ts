import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  DEFAULT_APP_SETTINGS,
  getExcludeDefaultSubtitlesFromTTSSetting,
  setExcludeDefaultSubtitlesFromTTSSetting,
} from "../src/utils/appSettings";
import { isTtsSpeakableLanguage } from "../src/lib/playback-preferences";

console.log("=========================================================================");
console.log("🧪 Verifying Default Subtitles Exclusion from TTS-Play (Task 142)");
console.log("=========================================================================");

const rootDir = process.cwd();

// Test 1: Validate DEFAULT_APP_SETTINGS and getters/setters
console.log("--> [Test 1] Validating DEFAULT_APP_SETTINGS default value...");
assert.strictEqual(
  DEFAULT_APP_SETTINGS.excludeDefaultSubtitlesFromTTS,
  true,
  "DEFAULT_APP_SETTINGS.excludeDefaultSubtitlesFromTTS must be true by default",
);
console.log("✅ PASS: DEFAULT_APP_SETTINGS.excludeDefaultSubtitlesFromTTS is true by default.");

console.log("--> [Test 2] Validating get/setExcludeDefaultSubtitlesFromTTSSetting...");
const settingsStorage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => settingsStorage.get(key) ?? null,
      setItem: (key: string, value: string) => settingsStorage.set(key, value),
    },
  },
});
assert.strictEqual(
  typeof getExcludeDefaultSubtitlesFromTTSSetting,
  "function",
  "getExcludeDefaultSubtitlesFromTTSSetting must be exported as a function",
);
assert.strictEqual(
  typeof setExcludeDefaultSubtitlesFromTTSSetting,
  "function",
  "setExcludeDefaultSubtitlesFromTTSSetting must be exported as a function",
);

// Test toggling
setExcludeDefaultSubtitlesFromTTSSetting(false);
assert.strictEqual(
  getExcludeDefaultSubtitlesFromTTSSetting(),
  false,
  "Setting should toggle to false",
);

setExcludeDefaultSubtitlesFromTTSSetting(true);
assert.strictEqual(
  getExcludeDefaultSubtitlesFromTTSSetting(),
  true,
  "Setting should toggle back to true",
);
console.log("✅ PASS: Getter and setter correctly persist setting.");

// Test 3: Validate src/routes/index.tsx logic
console.log("--> [Test 3] Auditing src/routes/index.tsx...");
const indexTsxPath = path.resolve(rootDir, "src/routes/index.tsx");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

assert(
  indexContent.includes("isTtsSpeakableLanguage"),
  "src/routes/index.tsx must use the base-language TTS exclusion rule",
);

assert(
  indexContent.includes("setSpoken((prev) => prev.filter((lang) => lang !== baseLanguage))") ||
    indexContent.includes("isTtsSpeakableLanguage(lang, baseLanguage)"),
  "src/routes/index.tsx must filter baseLanguage from spoken state when discovered",
);
assert(
  indexContent.includes("isTtsSpeakableLanguage(l.code, currentBaseLanguage"),
  "Automatic TTS scheduling must exclude the base subtitle language",
);
assert(
  indexContent.includes(
    "autoSpeakOnFetch && targetLanguage && isTtsSpeakableLanguage(lang, baseLanguage)",
  ),
  "Fetching the default caption must not auto-enable its language for TTS",
);
assert.strictEqual(isTtsSpeakableLanguage("en", "en"), false);
assert.strictEqual(isTtsSpeakableLanguage("he", "en"), true);
const autoSpokenTranslations = ["en", "he", "es"].filter((lang) =>
  isTtsSpeakableLanguage(lang, "en"),
);
assert.deepStrictEqual(autoSpokenTranslations, ["he", "es"]);
console.log("✅ PASS: src/routes/index.tsx correctly integrates default subtitle exclusion logic.");

// Test 4: Validate BeginnerFlowContainer.tsx logic
console.log("--> [Test 4] Auditing src/components/beginner/BeginnerFlowContainer.tsx...");
const beginnerFlowPath = path.resolve(rootDir, "src/components/beginner/BeginnerFlowContainer.tsx");
assert(fs.existsSync(beginnerFlowPath), "BeginnerFlowContainer.tsx must exist");
const beginnerFlowContent = fs.readFileSync(beginnerFlowPath, "utf8");

const beginnerPlayerPath = path.resolve(
  rootDir,
  "src/components/beginner/tabs/BeginnerPlayerTab.tsx",
);
const beginnerPlayerContent = fs.readFileSync(beginnerPlayerPath, "utf8");
assert(
  beginnerPlayerContent.includes("cues.some((cue) => cue.targetText)") &&
    beginnerPlayerContent.includes("cue.targetText && targetLanguage") &&
    !beginnerPlayerContent.includes("targetCue.targetText || targetCue.baseText"),
  "Beginner mode must offer subtitle TTS only for translated target text, never base text",
);
console.log("✅ PASS: Beginner player speaks only translated target text.");

const subtitleRowPath = path.resolve(rootDir, "src/components/SubtitleRow.tsx");
const subtitleRowContent = fs.readFileSync(subtitleRowPath, "utf8");
assert(
  subtitleRowContent.includes("l.code !== baseLanguage"),
  "Advanced subtitle cells must not offer TTS for the default/base column",
);
console.log("✅ PASS: Advanced table hides TTS controls on the default/base column.");

// Test 5: Validate package.json script
console.log("--> [Test 5] Auditing package.json script registration...");
const packageJsonPath = path.resolve(rootDir, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
assert(
  packageJson.scripts["test:exclude-default-subtitles-tts"],
  "package.json must contain 'test:exclude-default-subtitles-tts' script",
);
console.log("✅ PASS: package.json script registered.");

// Test 6: Validate docs/files.md registration
console.log("--> [Test 6] Auditing docs/files.md registration...");
const filesMdPath = path.resolve(rootDir, "docs/files.md");
const filesMdContent = fs.readFileSync(filesMdPath, "utf8");
assert(
  filesMdContent.includes("verify-exclude-default-subtitles-tts.ts"),
  "docs/files.md must inventory scripts/verify-exclude-default-subtitles-tts.ts",
);
console.log("✅ PASS: docs/files.md inventories verify-exclude-default-subtitles-tts.ts.");

console.log("=========================================================================");
console.log("🎉 ALL DEFAULT SUBTITLES EXCLUSION FROM TTS VERIFICATIONS PASSED (100%)!");
console.log("=========================================================================");
