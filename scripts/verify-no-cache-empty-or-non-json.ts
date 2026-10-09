import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  isValidJsonSubtitleResponse,
  saveCachedRawJson3,
  saveCachedSubtitles,
  saveCachedTargetSubtitles,
  getCachedSubtitles,
  getCachedTargetSubtitles,
  clearSubtitleCache,
} from "../src/utils/subtitleCache";
import type { CaptionCue } from "../src/types";

console.log("====================================================");
console.log("🧪 Test: App Shouldn't Cache Empty Response or Non-JSON Response");
console.log("====================================================");

const rootDir = process.cwd();

// Setup mock localStorage environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
  length: 0,
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
};
Object.defineProperty(mockLocalStorage, "length", {
  get: () => Object.keys(mockStorage).length,
});

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = {
  localStorage: mockLocalStorage,
};

// ============================================================================
// PART 1: Validator (isValidJsonSubtitleResponse) Contract on Empty & Non-JSON
// ============================================================================
console.log("\n--- [1] Testing Validation Rejection for Empty & Non-JSON Responses ---");

const emptyAndNonJsonTestCases: { label: string; payload: unknown }[] = [
  // Empty responses
  { label: "empty string", payload: "" },
  { label: "blank whitespace string", payload: "    \n\r\t   " },
  { label: "null value", payload: null },
  { label: "undefined value", payload: undefined },
  { label: "empty array", payload: [] },
  { label: "empty object string", payload: "{}" },
  { label: "empty object", payload: {} },

  // Non-JSON responses
  {
    label: "HTML 404 error document",
    payload: "<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>",
  },
  {
    label: "HTML 500 internal server error page",
    payload: "<html><body><h1>500 Internal Server Error</h1><p>Timedtext service unavailable</p></body></html>",
  },
  {
    label: "Plaintext error string",
    payload: "Error: No captions available for requested video or parameters",
  },
  {
    label: "Plaintext YouTube quota message",
    payload: "Too Many Requests. IP address temporarily rate limited.",
  },
  {
    label: "XML error response",
    payload: "<?xml version=\"1.0\" encoding=\"UTF-8\"?><error><code>403</code><message>Forbidden</message></error>",
  },
  {
    label: "Malformed broken JSON string",
    payload: '{"events": [{"tStartMs": 100, "segs": [{"utf8": "broken',
  },

  // Valid JSON syntax but NOT valid subtitle format
  {
    label: "Arbitrary JSON API response",
    payload: '{"status": 200, "message": "success", "data": [1, 2, 3]}',
  },
  {
    label: "JSON with empty events list",
    payload: '{"wireMagic": "pb3", "events": []}',
  },
  {
    label: "JSON with null events field",
    payload: '{"events": null}',
  },
  {
    label: "JSON with events containing no segs",
    payload: '{"events": [{"tStartMs": 0, "dDurationMs": 1000}]}',
  },
  {
    label: "JSON with events containing empty segs array",
    payload: '{"events": [{"tStartMs": 0, "dDurationMs": 1000, "segs": []}]}',
  },
  {
    label: "JSON with events containing whitespace-only utf8 segment",
    payload: '{"events": [{"tStartMs": 0, "dDurationMs": 1000, "segs": [{"utf8": "   \t\n  "}]}]}',
  },
  {
    label: "Array of invalid cue objects with empty text",
    payload: [{ id: "cue-1", start: 0, duration: 2, text: "" }],
  },
  {
    label: "Array of invalid cue objects with whitespace text",
    payload: [{ id: "cue-1", start: 0, duration: 2, text: "    " }],
  },
];

for (const tc of emptyAndNonJsonTestCases) {
  const isValid = isValidJsonSubtitleResponse(tc.payload);
  assert.strictEqual(
    isValid,
    false,
    `Validation MUST return false for ${tc.label}, but got true`,
  );
  console.log(`✅ PASS: Correctly rejected ${tc.label}`);
}

// Valid YouTube JSON3 string for baseline comparison
const sampleValidJson3 = JSON.stringify({
  wireMagic: "pb3",
  events: [
    {
      tStartMs: 1200,
      dDurationMs: 3400,
      segs: [{ utf8: "Authentic YouTube subtitle dialogue text" }],
    },
  ],
});
assert.strictEqual(
  isValidJsonSubtitleResponse(sampleValidJson3),
  true,
  "Validation MUST accept authentic YouTube JSON3 with text segs",
);
console.log("✅ PASS: Correctly accepted authentic YouTube JSON3 format");

// ============================================================================
// PART 2: Cache Functions Refuse to Cache Empty or Non-JSON Responses
// ============================================================================
console.log("\n--- [2] Testing Storage Refusal on Empty & Non-JSON Responses ---");
clearSubtitleCache();

const testVideoId = "n9qwEOsqsoo";
const testLang = "he";

// 2.1 Test saveCachedRawJson3 refusal on empty responses
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, ""),
  false,
  "saveCachedRawJson3 MUST return false on empty string",
);
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, "   \n\t "),
  false,
  "saveCachedRawJson3 MUST return false on whitespace string",
);
assert.strictEqual(
  Object.keys(mockStorage).length,
  0,
  "localStorage MUST remain empty after rejected empty string calls",
);
console.log("✅ PASS: saveCachedRawJson3 refused empty responses; storage untouched");

// 2.2 Test saveCachedRawJson3 refusal on non-JSON responses
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, "<html><body>404 Not Found</body></html>"),
  false,
  "saveCachedRawJson3 MUST return false on HTML error page",
);
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, "Error: Service Unavailable"),
  false,
  "saveCachedRawJson3 MUST return false on plaintext error",
);
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, "<xml><error>blocked</error></xml>"),
  false,
  "saveCachedRawJson3 MUST return false on XML payload",
);
assert.strictEqual(
  saveCachedRawJson3(testVideoId, testLang, "{ malformed json"),
  false,
  "saveCachedRawJson3 MUST return false on malformed JSON",
);
assert.strictEqual(
  Object.keys(mockStorage).length,
  0,
  "localStorage MUST remain empty after rejected non-JSON calls",
);
console.log("✅ PASS: saveCachedRawJson3 refused non-JSON responses; storage untouched");

// 2.3 Test saveCachedSubtitles refusal on empty cues & cues with non-text
saveCachedSubtitles(testVideoId, []);
assert.strictEqual(
  getCachedSubtitles(testVideoId),
  null,
  "saveCachedSubtitles MUST NOT cache empty cue array",
);

saveCachedSubtitles(testVideoId, [{ id: "bad", start: 0, duration: 1, text: "   " }]);
assert.strictEqual(
  getCachedSubtitles(testVideoId),
  null,
  "saveCachedSubtitles MUST NOT cache cues with blank text",
);
console.log("✅ PASS: saveCachedSubtitles refused empty and blank cues");

// 2.4 Test saveCachedTargetSubtitles refusal on empty cues & cues with non-text
saveCachedTargetSubtitles(testVideoId, "it", []);
assert.strictEqual(
  getCachedTargetSubtitles(testVideoId, "it"),
  null,
  "saveCachedTargetSubtitles MUST NOT cache empty cue array",
);

saveCachedTargetSubtitles(testVideoId, "it", [{ id: "bad", start: 0, duration: 1, text: "" }]);
assert.strictEqual(
  getCachedTargetSubtitles(testVideoId, "it"),
  null,
  "saveCachedTargetSubtitles MUST NOT cache cues with empty text",
);
console.log("✅ PASS: saveCachedTargetSubtitles refused empty and blank cues");

// ============================================================================
// PART 3: Existing Valid Cache is Protected from Overwrites by Bad Responses
// ============================================================================
console.log("\n--- [3] Testing Existing Valid Cache Protection Against Bad Responses ---");
clearSubtitleCache();

// Step A: Store authentic valid subtitles first
const validCues: CaptionCue[] = [
  { id: "cue-01", start: 1.0, duration: 2.5, text: "Authentic dialogue line 1" },
  { id: "cue-02", start: 3.5, duration: 2.0, text: "Authentic dialogue line 2" },
];

saveCachedSubtitles(testVideoId, validCues);
const initialCached = getCachedSubtitles(testVideoId);
assert(initialCached !== null, "Initial valid subtitles must be cached successfully");
assert.strictEqual(initialCached.length, 2, "Must contain 2 cached cues");
assert.strictEqual(initialCached[0].text, "Authentic dialogue line 1");

saveCachedTargetSubtitles(testVideoId, "es", validCues);
const initialTargetCached = getCachedTargetSubtitles(testVideoId, "es");
assert(initialTargetCached !== null, "Initial target subtitles must be cached");
assert.strictEqual(initialTargetCached.length, 2);

const rawSaveSuccess = saveCachedRawJson3(testVideoId, "es", sampleValidJson3);
assert.strictEqual(rawSaveSuccess, true, "saveCachedRawJson3 must succeed with valid JSON3");

// Step B: Attempt to overwrite valid cache with empty response
saveCachedSubtitles(testVideoId, []);
const afterEmptySubtitles = getCachedSubtitles(testVideoId);
assert.deepStrictEqual(
  afterEmptySubtitles,
  initialCached,
  "Existing valid subtitles cache MUST NOT be overwritten or wiped by empty response",
);

saveCachedTargetSubtitles(testVideoId, "es", []);
const afterEmptyTarget = getCachedTargetSubtitles(testVideoId, "es");
assert.deepStrictEqual(
  afterEmptyTarget,
  initialTargetCached,
  "Existing valid target subtitles cache MUST NOT be overwritten by empty response",
);

const emptyRawResult = saveCachedRawJson3(testVideoId, "es", "");
assert.strictEqual(emptyRawResult, false, "saveCachedRawJson3 must return false on empty string");
const rawKey = `yt_subtitles_raw_${testVideoId}_es`;
assert.strictEqual(
  mockStorage[rawKey],
  sampleValidJson3,
  "Existing valid raw JSON3 cache MUST NOT be overwritten by empty string",
);
console.log("✅ PASS: Existing valid cache protected against empty response overwrites");

// Step C: Attempt to overwrite valid cache with non-JSON response
saveCachedSubtitles(testVideoId, [{ id: "bad", start: 0, duration: 1, text: "  " }]);
assert.deepStrictEqual(
  getCachedSubtitles(testVideoId),
  initialCached,
  "Existing valid subtitles MUST NOT be overwritten by non-valid cue response",
);

const htmlRawResult = saveCachedRawJson3(
  testVideoId,
  "es",
  "<!DOCTYPE html><html><body>Error 404</body></html>",
);
assert.strictEqual(htmlRawResult, false, "saveCachedRawJson3 must return false on HTML error page");
assert.strictEqual(
  mockStorage[rawKey],
  sampleValidJson3,
  "Existing valid raw JSON3 MUST NOT be overwritten by HTML error page",
);
console.log("✅ PASS: Existing valid cache protected against non-JSON response overwrites");

// ============================================================================
// PART 4: Android Native Shell (MainActivity.kt) Contract Verification
// ============================================================================
console.log("\n--- [4] Verifying Android Native Shell Cache Guard Contracts ---");

const mainActivityPath = path.resolve(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), `MainActivity.kt must exist at ${mainActivityPath}`);
const mainActivitySrc = fs.readFileSync(mainActivityPath, "utf8");

// Assert isValidJsonSubtitle definition
assert(
  mainActivitySrc.includes("fun isValidJsonSubtitle(body: String): Boolean"),
  "MainActivity.kt must define isValidJsonSubtitle validator method",
);
assert(
  mainActivitySrc.includes("if (body.isBlank()) return false"),
  "MainActivity.kt isValidJsonSubtitle must reject blank/empty body",
);
assert(
  mainActivitySrc.includes('!trimmed.startsWith("{")') &&
    mainActivitySrc.includes('!trimmed.endsWith("}")'),
  "MainActivity.kt isValidJsonSubtitle must reject non-JSON body envelopes",
);
assert(
  mainActivitySrc.includes('optJSONArray("events")'),
  "MainActivity.kt isValidJsonSubtitle must require events JSON array",
);
assert(
  mainActivitySrc.includes("if (events.length() == 0) return false"),
  "MainActivity.kt isValidJsonSubtitle must reject empty events array",
);
console.log("✅ PASS: Android Native Shell isValidJsonSubtitle enforces non-empty JSON3 schema");

// Assert saveCaptionToFile guards against empty/non-JSON response
assert(
  mainActivitySrc.includes("if (!isValidJsonSubtitle(bodyString))"),
  "MainActivity.kt saveCaptionToFile must guard disk write with isValidJsonSubtitle",
);
assert(
  mainActivitySrc.includes("Not caching caption because response is not valid JSON with subtitle cues"),
  "MainActivity.kt must log warning and abort caching on invalid or empty response",
);
console.log("✅ PASS: Android Native Shell saveCaptionToFile blocks empty/non-JSON from disk");

// Assert WebView interceptor checks validity before calling saveCaptionToFile
assert(
  mainActivitySrc.includes("if (isValidJsonSubtitle(rawBodyString))") &&
    mainActivitySrc.includes("saveCaptionToFile(url, rawBodyBytes)"),
  "MainActivity.kt interception loop must verify isValidJsonSubtitle before saving caption file",
);
console.log("✅ PASS: Android Native Shell interceptor checks JSON validity before saveCaptionToFile");

// Assert executeTimedTextRepetition rejects empty/non-JSON and falls back
assert(
  mainActivitySrc.includes("if (isValidJsonSubtitle(bodyString))") &&
    mainActivitySrc.includes("was invalid JSON") &&
    mainActivitySrc.includes("Falling back to alternative option"),
  "MainActivity.kt executeTimedTextRepetition must reject invalid JSON and trigger fallback",
);
console.log("✅ PASS: Android Native Shell executeTimedTextRepetition rejects invalid JSON & triggers fallback");

console.log("\n====================================================");
console.log("🎉 ALL TESTS PASSED: The app strictly does NOT cache empty response or non-JSON response!");
console.log("====================================================");
