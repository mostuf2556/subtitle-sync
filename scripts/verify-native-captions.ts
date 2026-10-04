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
console.log("🧪 Starting Native Captions & lang Replacement Test");
console.log("====================================================");

// 1. Verify the URL keeps the existing language when it already matches.
const baseEnUrl = "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
const sameLangResult = buildTranslatedCaptionUrl(baseEnUrl, "en");
const parsedSame = new URL(sameLangResult);

assert.strictEqual(
  parsedSame.searchParams.get("tlang"),
  null,
  "The new request format must not add tlang",
);
assert.strictEqual(
  parsedSame.searchParams.get("lang"),
  "en",
  "lang must remain en when the target is en",
);
assert.strictEqual(parsedSame.searchParams.get("fmt"), "json3", "Format parameter must be json3");
console.log("✅ PASS: Matching target language does not add or alter query parameters");

// 2. Verify URL building changes lang for alternate target languages.
const translatedHebrew = buildTranslatedCaptionUrl(baseEnUrl, "he");
const parsedHe = new URL(translatedHebrew);

assert.strictEqual(parsedHe.searchParams.get("lang"), "he", "Target language he must replace lang");
assert.strictEqual(parsedHe.searchParams.get("tlang"), null, "tlang must not be added");
assert.strictEqual(
  parsedHe.searchParams.get("v"),
  "L2Ryrr6txwA",
  "Video ID must be preserved in translated URL",
);
console.log("✅ PASS: Translated target language replaces lang correctly (he)");

const translatedSpanish = buildTranslatedCaptionUrl(baseEnUrl, "es");
const parsedEs = new URL(translatedSpanish);

assert.strictEqual(parsedEs.searchParams.get("lang"), "es", "Target language es must replace lang");
console.log("✅ PASS: Translated target language replaces lang correctly (es)");

const preservedFormatUrl = new URL(buildTranslatedCaptionUrl(baseEnUrl, "fr", "srv3"));
assert.strictEqual(
  preservedFormatUrl.searchParams.get("fmt"),
  "json3",
  "The requested output format must not overwrite the captured fmt parameter",
);
console.log("✅ PASS: Existing fmt is preserved even when the bridge receives a format hint");

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

// 5. Verify MainActivity.kt delegates to the captured-query transformer and emits telemetry.
const mainActivityPath = path.join(
  process.cwd(),
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
const mainActivityContent = fs.readFileSync(mainActivityPath, "utf8");
assert(
  mainActivityContent.includes("captured.translatedUrl(targetLang)"),
  "MainActivity.kt must use the captured request's translated URL",
);
assert(
  mainActivityContent.includes("SUBTITLE_FETCH kind="),
  "MainActivity.kt must emit SUBTITLE_FETCH telemetry",
);
const replayPath = path.join(
  process.cwd(),
  "android-shell/app/src/main/java/com/ytviewer/app/TimedTextReplay.kt",
);
const replayContent = fs.readFileSync(replayPath, "utf8");
assert(
  replayContent.includes('key(part).equals("lang", true)') &&
    replayContent.includes('URLEncoder.encode(targetLanguage, "UTF-8")') &&
    replayContent.includes('updated.joinToString("&")'),
  "TimedTextReplay.kt must replace only lang and preserve raw query components",
);
console.log("✅ PASS: MainActivity.kt and TimedTextReplay.kt native bridge behavior verified");

// 5b. Validate that signed query fields stay unchanged when the target language changes.
const signedBase =
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=iw&fmt=json3&sparams=ip%2Cexpire&signature=xyz%2F123&key=yt8";
const signedJapanese = buildTranslatedCaptionUrl(signedBase, "ja");
assert.strictEqual(
  signedJapanese,
  signedBase.replace("lang=iw", "lang=ja"),
  "Changing language must not serialize or alter the other signed query fields",
);
const signedItalian = buildTranslatedCaptionUrl(signedJapanese, "it");
assert.strictEqual(
  signedItalian,
  signedBase.replace("lang=iw", "lang=it"),
  "Changing target language again must replace lang without duplicating parameters",
);
console.log("✅ PASS: Signed query fields remain unchanged across target-language changes");

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
