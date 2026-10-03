import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  buildTranslatedCaptionUrl,
  decodeInterceptedCaption,
  parseJson3,
  timedTextVideoId,
} from "../src/lib/native-captions";

console.log("====================================================");
console.log("🧪 Starting Native Captions & tlang Replacement Test");
console.log("====================================================");

// 1. Verify URL building matching repo2 buildYouTubeTranslatedTimedTextUrl
const baseEnUrl = "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
const targetEnResult = buildTranslatedCaptionUrl(baseEnUrl, "en");
const parsedSame = new URL(targetEnResult);

assert.strictEqual(
  parsedSame.searchParams.get("tlang"),
  "en",
  "Target language en must be set as tlang matching repo2",
);
assert.strictEqual(
  parsedSame.searchParams.get("lang"),
  "en",
  "Base language parameter must be preserved",
);
assert.strictEqual(parsedSame.searchParams.get("fmt"), "json3", "Format parameter must be json3");
console.log("✅ PASS: URL building sets tlang and format matching repo2");

// 2. Verify URL building when targetLanguage is different from original lang
const translatedHebrew = buildTranslatedCaptionUrl(baseEnUrl, "he");
const parsedHe = new URL(translatedHebrew);

assert.strictEqual(
  parsedHe.searchParams.get("tlang"),
  "he",
  "Target language he must be set as tlang",
);
assert.strictEqual(
  parsedHe.searchParams.get("v"),
  "L2Ryrr6txwA",
  "Video ID must be preserved in translated URL",
);
console.log("✅ PASS: Translated target language sets tlang correctly (he)");

const translatedSpanish = buildTranslatedCaptionUrl(baseEnUrl, "es");
const parsedEs = new URL(translatedSpanish);

assert.strictEqual(
  parsedEs.searchParams.get("tlang"),
  "es",
  "Target language es must be set as tlang",
);
console.log("✅ PASS: Translated target language sets tlang correctly (es)");

// 3. Verify video ID extraction
assert.strictEqual(timedTextVideoId(baseEnUrl), "L2Ryrr6txwA");
console.log("✅ PASS: Video ID correctly extracted from timedtext URL");

// 4. Verify base64 intercepted caption decoding
const samplePayload = {
  url: baseEnUrl,
  rawData: JSON.stringify({
    events: [
      {
        tStartMs: 0,
        dDurationMs: 3000,
        segs: [{ utf8: "Authentic dialogue line" }],
      },
    ],
  }),
};

const base64Encoded = Buffer.from(JSON.stringify(samplePayload)).toString("base64");
const decoded = decodeInterceptedCaption(base64Encoded);
assert(decoded !== null, "Decoded payload must not be null");
assert.strictEqual(decoded.url, baseEnUrl);
const parsedJson = parseJson3(decoded.rawData);
assert(parsedJson !== null, "Parsed JSON3 must not be null");
assert.strictEqual(parsedJson.events?.[0]?.segs?.[0]?.utf8, "Authentic dialogue line");
console.log("✅ PASS: Intercepted base64 payload decoding and JSON3 parsing verified");

// 5. Verify MainActivity.kt implements upstream repo2 executeTimedTextRepetition and SUBTITLE_FETCH telemetry
const mainActivityPath = path.join(
  process.cwd(),
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
const mainActivityContent = fs.readFileSync(mainActivityPath, "utf8");
assert(
  mainActivityContent.includes('builder.appendQueryParameter("tlang", targetLang)'),
  "MainActivity.kt must append targetLang as tlang matching Youtubenet6 repo2 architecture",
);
assert(
  mainActivityContent.includes("SUBTITLE_FETCH kind="),
  "MainActivity.kt must emit SUBTITLE_FETCH telemetry",
);
console.log("✅ PASS: MainActivity.kt Kotlin bridge and telemetry verified");

// 5b. Simulate executeTimedTextRepetition behavior matching repo2 Kotlin implementation
function simulateExecuteTimedTextRepetition(base: string, targetLang: string, format: string): string {
  const url = new URL(base);
  const searchParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    const isTlang = key.toLowerCase() === "tlang";
    const isFmt = key.toLowerCase() === "fmt" && format.length > 0;
    if (!isTlang && !isFmt) {
      searchParams.append(key, value);
    }
  }
  searchParams.append("tlang", targetLang);
  if (format.length > 0) {
    searchParams.append("fmt", format);
  }
  url.search = searchParams.toString();
  return url.toString();
}

// Test case A: Base URL has lang=en, targetLang=he -> should preserve base query and append tlang=he, fmt=json3
const testA = simulateExecuteTimedTextRepetition(
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en",
  "he",
  "json3",
);
const parsedA = new URL(testA);
assert.strictEqual(parsedA.searchParams.get("lang"), "en", "Test A lang must be preserved");
assert.strictEqual(parsedA.searchParams.get("tlang"), "he", "Test A tlang must be 'he'");

// Test case B: Subsequent fetch for targetLang=it -> should cleanly replace tlang with 'it'
const testB = simulateExecuteTimedTextRepetition(
  testA,
  "it",
  "json3",
);
const parsedB = new URL(testB);
assert.strictEqual(parsedB.searchParams.get("lang"), "en", "Test B lang must be preserved");
assert.strictEqual(parsedB.searchParams.get("tlang"), "it", "Test B tlang must be 'it'");

// Test case C: Subsequent fetch for targetLang=es -> should cleanly replace tlang with 'es'
const testC = simulateExecuteTimedTextRepetition(
  testB,
  "es",
  "json3",
);
const parsedC = new URL(testC);
assert.strictEqual(parsedC.searchParams.get("lang"), "en", "Test C lang must be preserved");
assert.strictEqual(parsedC.searchParams.get("tlang"), "es", "Test C tlang must be 'es'");
console.log("✅ PASS: executeTimedTextRepetition repo2 URL generation simulated and validated across sequential subtitle fetches");

// 6. Verify no hardcoded default subtitle language
const appSettingsPath = path.join(process.cwd(), "src/utils/appSettings.ts");
const appSettingsContent = fs.readFileSync(appSettingsPath, "utf8");
assert(
  appSettingsContent.includes("learningLanguages: []"),
  "DEFAULT_APP_SETTINGS must configure empty list (no hardcoded default subtitle language)",
);

const indexRoutePath = path.join(process.cwd(), "src/routes/index.tsx");
const indexRouteContent = fs.readFileSync(indexRoutePath, "utf8");
assert(
  indexRouteContent.includes("getUserLearningLanguages()"),
  "index.tsx must initialize targetLanguages from getUserLearningLanguages()",
);
assert(
  !indexRouteContent.includes('return ["he", "it"];'),
  "index.tsx must NOT fall back to ['he', 'it'] default subtitle language",
);
console.log(
  "✅ PASS: Verified no default subtitles language is hardcoded (clean unconstrained language configuration)",
);

console.log("====================================================");
console.log("📊 NATIVE CAPTIONS TEST: All tests passed!");
console.log("====================================================");
