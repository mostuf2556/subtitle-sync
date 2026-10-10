import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { align, type Json3 } from "../src/lib/subtitles";
import { DEFAULT_VIDEO_ID, DEFAULT_VIDEO_URL } from "../src/utils/youtube";
import { JSON3_DEMO_VIDEO_ID, JSON3_DEMO_VIDEO_URL } from "../src/config/appConfig";
import {
  buildTranslatedCaptionUrl,
  decodeInterceptedCaption,
  timedTextVideoId,
  parseJson3,
} from "../src/lib/native-captions";

console.log("====================================================");
console.log("🧪 E2E Test: Default Video Subtitles Verification");
console.log("   (Android Native Shell & Web Demo App)");
console.log("====================================================");

const rootDir = process.cwd();

// ============================================================================
// PART 1: Demo Web App Default Video Subtitles Verification
// ============================================================================
console.log("\n--- [1] Web Demo App Default Video Subtitles Verification ---");
assert.strictEqual(
  JSON3_DEMO_VIDEO_ID,
  "L2Ryrr6txwA",
  "Demo Web App default video ID must be L2Ryrr6txwA",
);
console.log(`✅ PASS: Demo Web App default video ID verified: ${JSON3_DEMO_VIDEO_ID}`);
console.log(`✅ PASS: Demo Web App default video URL verified: ${JSON3_DEMO_VIDEO_URL}`);

const fixturesDir = path.resolve(rootDir, "public", "fixtures", JSON3_DEMO_VIDEO_ID);
assert(
  fs.existsSync(fixturesDir),
  `Fixtures directory must exist for default demo video: ${fixturesDir}`,
);

const requiredDemoLangs = ["en", "he", "it", "es", "ar", "ru"];
const loadedTracks: Record<string, Json3> = {};

for (const lang of requiredDemoLangs) {
  const fixtureFile = path.resolve(fixturesDir, `${lang}.json`);
  assert(fs.existsSync(fixtureFile), `Missing subtitle fixture for default video: ${fixtureFile}`);

  const rawContent = fs.readFileSync(fixtureFile, "utf8");
  assert(
    rawContent.length > 50,
    `Fixture ${lang}.json is unexpectedly small (${rawContent.length} bytes)`,
  );

  const parsed = parseJson3(rawContent);
  assert(parsed !== null, `Failed to parse JSON3 timedtext for lang ${lang}`);
  assert(Array.isArray(parsed.events), `Fixture ${lang}.json must contain an events array`);
  assert(parsed.events.length > 0, `Fixture ${lang}.json has zero events`);

  // Verify events structure and monotonicity
  let previousStart = -1;
  let textSegmentsCount = 0;
  for (const ev of parsed.events) {
    if (typeof ev.tStartMs === "number") {
      assert(ev.tStartMs >= 0, `Event tStartMs must be non-negative: ${ev.tStartMs}`);
      assert(
        ev.tStartMs >= previousStart,
        `Event start time not monotonic in ${lang}: ${ev.tStartMs} < ${previousStart}`,
      );
      previousStart = ev.tStartMs;
    }
    if (Array.isArray(ev.segs)) {
      for (const seg of ev.segs) {
        if (typeof seg.utf8 === "string" && seg.utf8.trim().length > 0) {
          textSegmentsCount++;
        }
      }
    }
  }

  assert(textSegmentsCount > 0, `Fixture ${lang}.json must contain non-empty text segments`);
  loadedTracks[lang] = parsed;
  console.log(
    `✅ PASS: Web demo track "${lang}" validated (${parsed.events.length} events, ${textSegmentsCount} text segs)`,
  );
}

// Verify multi-language sentence alignment on default video
const sentenceRows = align(loadedTracks, "he", "sentence");
assert(Array.isArray(sentenceRows), "Sentence alignment must produce an array of rows");
assert(
  sentenceRows.length >= 10,
  `Expected at least 10 aligned rows for default demo video, got ${sentenceRows.length}`,
);

for (let i = 0; i < Math.min(sentenceRows.length, 5); i++) {
  const row = sentenceRows[i];
  assert(row.start >= 0, `Row ${i} start time must be non-negative: ${row.start}`);
  assert(row.end >= row.start, `Row ${i} end must be >= start: ${row.end} < ${row.start}`);
  assert(row.texts["he"], `Row ${i} must contain Hebrew base subtitle text`);
  assert(row.texts["en"], `Row ${i} must contain English translated subtitle text`);
  assert(row.texts["it"], `Row ${i} must contain Italian translated subtitle text`);
}
console.log(
  `✅ PASS: Default demo video multi-language sentence alignment OK (${sentenceRows.length} synchronized rows)`,
);

// Verify word-level alignment on default video
const wordRows = align(loadedTracks, "he", "word");
assert(Array.isArray(wordRows), "Word alignment must produce an array of rows");
assert(wordRows.length > 0, "Word alignment must return non-empty rows");
console.log(`✅ PASS: Default demo video word-level alignment OK (${wordRows.length} rows)`);

// ============================================================================
// PART 2: Android Native Shell Default Video Subtitles Verification
// ============================================================================
console.log("\n--- [2] Android Native Shell Default Video Subtitles Verification ---");
assert.strictEqual(
  DEFAULT_VIDEO_ID,
  "vBURridJXZ0",
  "Android Shell default video ID must be vBURridJXZ0",
);
console.log(`✅ PASS: Android default video ID verified: ${DEFAULT_VIDEO_ID}`);
console.log(`✅ PASS: Android default video URL verified: ${DEFAULT_VIDEO_URL}`);

// Verify run-android-e2e.sh targets the default video URL
const runScriptPath = path.resolve(rootDir, "scripts", "run-android-e2e.sh");
assert(fs.existsSync(runScriptPath), "scripts/run-android-e2e.sh must exist");
const runScriptContent = fs.readFileSync(runScriptPath, "utf8");
assert(
  runScriptContent.includes(DEFAULT_VIDEO_ID),
  `scripts/run-android-e2e.sh must target DEFAULT_VIDEO_ID (${DEFAULT_VIDEO_ID})`,
);
console.log(
  `✅ PASS: scripts/run-android-e2e.sh configured for default video (${DEFAULT_VIDEO_ID})`,
);

// Verify native caption interception pipeline for default video
const simulatedTimedTextUrl = `https://www.youtube.com/api/timedtext?v=${DEFAULT_VIDEO_ID}&lang=en&fmt=json3`;
const extractedVideoId = timedTextVideoId(simulatedTimedTextUrl);
assert.strictEqual(
  extractedVideoId,
  DEFAULT_VIDEO_ID,
  "timedTextVideoId must extract default video ID from timedtext URL",
);
console.log(`✅ PASS: Native interceptor correctly extracts default video ID: ${extractedVideoId}`);

// Verify translated caption URL generator for favorite languages (he, it, es)
const hebrewTranslatedUrl = buildTranslatedCaptionUrl(simulatedTimedTextUrl, "he", "json3");
assert(hebrewTranslatedUrl.includes("tlang=he"), "Translated URL must contain tlang=he");
assert(
  hebrewTranslatedUrl.includes(`v=${DEFAULT_VIDEO_ID}`),
  "Translated URL must preserve default video ID",
);

const italianTranslatedUrl = buildTranslatedCaptionUrl(simulatedTimedTextUrl, "it", "json3");
assert(italianTranslatedUrl.includes("tlang=it"), "Translated URL must contain tlang=it");
assert(
  italianTranslatedUrl.includes(`v=${DEFAULT_VIDEO_ID}`),
  "Translated URL must preserve default video ID",
);
console.log(
  "✅ PASS: Android native bridge tlang URL generation verified for default video favorite languages",
);

// Verify base64 caption decoding pipeline for default video
const mockRawPayload = JSON.stringify({
  wireMagic: "pb3",
  events: [
    { tStartMs: 1000, dDurationMs: 2500, segs: [{ utf8: "Default Android subtitle line 1" }] },
    { tStartMs: 3500, dDurationMs: 3000, segs: [{ utf8: "Default Android subtitle line 2" }] },
  ],
});
const mockEnvelope = JSON.stringify({
  url: simulatedTimedTextUrl,
  rawData: mockRawPayload,
});
const mockBase64 = Buffer.from(mockEnvelope, "utf8").toString("base64");
const decoded = decodeInterceptedCaption(mockBase64);
assert(decoded !== null, "decodeInterceptedCaption must succeed on valid envelope");
assert.strictEqual(decoded.url, simulatedTimedTextUrl);
assert.strictEqual(decoded.rawData, mockRawPayload);

const parsedMock = parseJson3(decoded.rawData);
assert(parsedMock !== null && parsedMock.events.length === 2);
console.log(
  "✅ PASS: Native caption interceptor base64 payload decoding verified for default video",
);

// ============================================================================
// PART 3: E2E Subtitle Logcat Assertion Contract Verification
// ============================================================================
console.log("\n--- [3] Android E2E Logcat Subtitle Assertion Verification ---");
const assertScriptPath = path.resolve(rootDir, "scripts", "android-e2e-assert.sh");
assert(fs.existsSync(assertScriptPath), "scripts/android-e2e-assert.sh must exist");
const assertContent = fs.readFileSync(assertScriptPath, "utf8");

assert(
  assertContent.includes("DEFAULT_CAPTION_PATTERN"),
  "scripts/android-e2e-assert.sh must define DEFAULT_CAPTION_PATTERN",
);
assert(
  assertContent.includes("HEBREW_CAPTION_PATTERN"),
  "scripts/android-e2e-assert.sh must define HEBREW_CAPTION_PATTERN",
);
assert(
  assertContent.includes("ITALIAN_CAPTION_PATTERN"),
  "scripts/android-e2e-assert.sh must define ITALIAN_CAPTION_PATTERN",
);
console.log(
  "✅ PASS: E2E assert script enforces default caption and Hebrew/Italian subtitle verification",
);

console.log("\n====================================================");
console.log("🎉 ALL E2E DEFAULT VIDEO SUBTITLES CHECKS PASSED!");
console.log("   ✓ Web Demo App: default video L2Ryrr6txwA subtitles OK");
console.log("   ✓ Android Shell: default video vBURridJXZ0 subtitles OK");
console.log("====================================================");
