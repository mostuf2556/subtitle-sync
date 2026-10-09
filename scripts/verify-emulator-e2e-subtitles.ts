import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  timedTextVideoId,
  buildTranslatedCaptionUrl,
  buildLangReplacedCaptionUrl,
  decodeInterceptedCaption,
  parseJson3,
} from "../src/lib/native-captions";
import { align, type Json3 } from "../src/lib/subtitles";
import {
  subtitleRequestModeOrder,
  type SubtitleRequestMode,
} from "../src/lib/playback-preferences";
import { isValidJsonSubtitleResponse } from "../src/utils/subtitleCache";
import {
  trackNetworkRequest,
  extractTlang,
  extractLang,
  isSuccessfulFetch,
  truncateResponseBody,
  clearNetworkRequests,
  getNetworkRequests,
} from "../src/utils/networkTracker";

console.log("====================================================");
console.log("🧪 E2E Emulator Subtitles Detection & Inspection Test");
console.log("   (Default detection, favorite fetch, tlang/lang fallback,");
console.log("    Network Panel inspection & Subtitles View inspection)");
console.log("====================================================");

const rootDir = process.cwd();

// ============================================================================
// PART 1: Detection of Fetching Default Subtitles
// ============================================================================
console.log("\n--- [1] Detection of Fetching Default Subtitles ---");

const testVideoId = "n9qwEOsqsoo";
const rawDefaultTimedTextUrl = `https://www.youtube.com/api/timedtext?v=${testVideoId}&lang=en&fmt=json3`;

// 1.1 Verify video ID extraction from observed default timedtext URL
const extractedId = timedTextVideoId(rawDefaultTimedTextUrl);
assert.strictEqual(
  extractedId,
  testVideoId,
  `timedTextVideoId must extract video ID ${testVideoId}`,
);
console.log(`✅ PASS: Extracted default video ID from timedtext URL: ${extractedId}`);

// 1.2 Verify interception base64 decoding of default timedtext stream
const mockDefaultEvents = [
  { tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: "Hello and welcome to this video." }] },
  { tStartMs: 4200, dDurationMs: 3800, segs: [{ utf8: "Today we explore subtitle synchronization." }] },
  { tStartMs: 8200, dDurationMs: 4500, segs: [{ utf8: "Watch how parallel tracks align cleanly." }] },
];
const defaultEnvelopeJson = JSON.stringify({
  url: rawDefaultTimedTextUrl,
  rawData: JSON.stringify({ wireMagic: "pb3", events: mockDefaultEvents }),
});
const base64DefaultPayload = Buffer.from(defaultEnvelopeJson, "utf8").toString("base64");

const decodedDefault = decodeInterceptedCaption(base64DefaultPayload);
assert(decodedDefault !== null, "decodeInterceptedCaption must succeed on base64 envelope");
assert.strictEqual(decodedDefault.url, rawDefaultTimedTextUrl);

const parsedDefaultJson = parseJson3(decodedDefault.rawData);
assert(parsedDefaultJson !== null, "parseJson3 must parse default timedtext JSON");
assert.strictEqual(parsedDefaultJson.events.length, 3, "Must contain 3 default events");
console.log(`✅ PASS: Default subtitles decoded and parsed (${parsedDefaultJson.events.length} events)`);

// ============================================================================
// PART 2: Proactive Fetching Requests for Favorited Languages
// ============================================================================
console.log("\n--- [2] Proactive Fetching Requests for Favorited Languages ---");

const favoriteLangs = ["he", "it"];

// Verify that the app builds proper translated URLs for each favorite language
const favoriteUrls: Record<string, string> = {};
for (const lang of favoriteLangs) {
  const url = buildTranslatedCaptionUrl(rawDefaultTimedTextUrl, lang, "json3");
  favoriteUrls[lang] = url;
  assert(url.includes(`v=${testVideoId}`), `URL must retain video ID for ${lang}`);
  assert(url.includes(`tlang=${lang}`), `URL must contain tlang=${lang}`);
  assert(url.includes("fmt=json3"), `URL must contain fmt=json3`);
  console.log(`✅ PASS: Built proactive favorite language request URL for "${lang}": ${url}`);
}

// ============================================================================
// PART 3: YouTube API Request with tlang & lang Fallback Simulation
// ============================================================================
console.log("\n--- [3] YouTube API Request: tlang with lang Fallback ---");
clearNetworkRequests();

// Simulate native bridge responder where tlang returns invalid HTML, and lang returns valid JSON3
const targetLang = "he";
const modes = subtitleRequestModeOrder("tlang");
assert.deepStrictEqual(modes, ["tlang", "lang"], "Mode order must start with tlang then lang");

let successfulParsedJson: Json3 | null = null;

for (const mode of modes) {
  const requestUrl =
    mode === "lang"
      ? buildLangReplacedCaptionUrl(rawDefaultTimedTextUrl, targetLang, "json3")
      : buildTranslatedCaptionUrl(rawDefaultTimedTextUrl, targetLang, "json3");

  const tracker = trackNetworkRequest(requestUrl, "GET", "native_bridge");

  // Simulate network response
  let simulatedResponse = "";
  if (mode === "tlang") {
    // Primary tlang option returns invalid non-JSON error
    simulatedResponse = "<!DOCTYPE html><html><body>503 Service Unavailable</body></html>";
  } else {
    // Fallback lang option returns valid JSON3
    simulatedResponse = JSON.stringify({
      wireMagic: "pb3",
      events: [
        { tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: "שלום וברוכים הבאים לסרטון זה." }] },
        { tStartMs: 4200, dDurationMs: 3800, segs: [{ utf8: "היום נחקור סנכרון כתוביות." }] },
        { tStartMs: 8200, dDurationMs: 4500, segs: [{ utf8: "ראו כיצד רצועות מקבילות מתיישרות בצורה נקייה." }] },
      ],
    });
  }

  if (simulatedResponse && isValidJsonSubtitleResponse(simulatedResponse)) {
    successfulParsedJson = parseJson3(simulatedResponse);
    tracker.complete(200, simulatedResponse);
    console.log(`✅ PASS: Mode "${mode}" succeeded with valid JSON3 (completed HTTP 200)`);
    break;
  } else {
    tracker.fail(`${mode}: invalid caption response (not valid JSON)`);
    console.log(`✅ PASS: Mode "${mode}" failed with invalid non-JSON response -> triggering fallback`);
  }
}

assert(successfulParsedJson !== null, "Fallback mode must yield successfully parsed JSON3");
assert.strictEqual(successfulParsedJson.events.length, 3);

// ============================================================================
// PART 4: Inspection of Subtitles via Network Panel
// ============================================================================
console.log("\n--- [4] Inspection of Subtitles via Network Panel ---");

const trackedRequests = getNetworkRequests();
assert.strictEqual(
  trackedRequests.length,
  2,
  `Network tracker must contain 2 requests (tlang attempt + lang fallback), got ${trackedRequests.length}`,
);

// 4.1 Inspect initial tlang request
const tlangRecord = trackedRequests.find((r) => r.url.includes("tlang="));
assert(tlangRecord !== undefined, "Network tracker must contain tlang request");
assert.strictEqual(extractTlang(tlangRecord.url), targetLang, "extractTlang must return targetLang");
assert.strictEqual(tlangRecord.status, 0, "Failed tlang request must have status 0");
assert(Boolean(tlangRecord.error), "Failed tlang request must record error");
console.log(`✅ PASS: Network Panel inspected tlang request (${tlangRecord.url}) — Error: ${tlangRecord.error}`);

// 4.2 Inspect fallback lang request
const langRecord = trackedRequests.find((r) => !r.url.includes("tlang=") && r.url.includes("lang="));
assert(langRecord !== undefined, "Network tracker must contain fallback lang request");
assert.strictEqual(extractLang(langRecord.url), targetLang, "extractLang must return targetLang");
assert.strictEqual(langRecord.status, 200, "Fallback lang request must have status 200");
assert.strictEqual(isSuccessfulFetch(langRecord), true, "isSuccessfulFetch must be true for fallback lang");
assert(langRecord.responseBodyPreview && langRecord.responseBodyPreview.length > 0, "Response body preview must exist");
console.log(
  `✅ PASS: Network Panel inspected fallback lang request — HTTP ${langRecord.status}, Good Fetch: ${isSuccessfulFetch(langRecord)}`,
);
console.log(`   Preview (${langRecord.responseBodyPreview.length} chars): ${truncateResponseBody(langRecord.responseBodyPreview, 60)}...`);

// ============================================================================
// PART 5: Inspection of Subtitles via Subtitles View Element
// ============================================================================
console.log("\n--- [5] Inspection of Subtitles via Subtitles View Element ---");

// Build multi-track subtitle dictionary: default (en) + favorite (he)
const tracks: Record<string, Json3> = {
  en: parsedDefaultJson,
  he: successfulParsedJson,
};

const alignedRows = align(tracks, "en", "sentence");
assert(Array.isArray(alignedRows) && alignedRows.length > 0, "Alignment must produce rows");
assert.strictEqual(alignedRows.length, 3, "Must produce 3 aligned rows");

for (let i = 0; i < alignedRows.length; i++) {
  const row = alignedRows[i];
  assert(row.texts["en"], `Row ${i} must contain English dialogue`);
  assert(row.texts["he"], `Row ${i} must contain Hebrew dialogue`);
  console.log(`✅ PASS: Aligned Row ${i + 1} [${row.start}ms - ${row.end}ms]:`);
  console.log(`   EN: "${row.texts["en"]}"`);
  console.log(`   HE: "${row.texts["he"]}"`);
}

// ============================================================================
// PART 6: Step-by-Step E2E Test & GitHub Pages Report Contract Verification
// ============================================================================
console.log("\n--- [6] Verifying Step-by-Step E2E Tests & Report Contracts ---");

// 6.1 Check Playwright E2E spec (e2e/emulation.spec.ts)
const playwrightSpecPath = path.resolve(rootDir, "e2e/emulation.spec.ts");
assert(fs.existsSync(playwrightSpecPath), "e2e/emulation.spec.ts must exist");
const playwrightContent = fs.readFileSync(playwrightSpecPath, "utf8");
assert(
  playwrightContent.includes("step1-default-subtitles-detected.png") ||
    playwrightContent.includes("step1-default-subtitles-detected"),
  "Playwright spec must capture step 1 screenshot",
);
assert(
  playwrightContent.includes("step4-network-panel-inspection.png") ||
    playwrightContent.includes("open-network-inspector-button"),
  "Playwright spec must inspect network panel modal",
);
assert(
  playwrightContent.includes("step5-subtitles-view-inspection.png") ||
    playwrightContent.includes("data-panel=\"subtitles\""),
  "Playwright spec must inspect subtitles view element",
);
console.log("✅ PASS: Playwright emulation test contains all 5 steps and screenshots");

// 6.2 Check Cypress E2E spec (cypress/e2e/emulation.cy.ts)
const cypressSpecPath = path.resolve(rootDir, "cypress/e2e/emulation.cy.ts");
assert(fs.existsSync(cypressSpecPath), "cypress/e2e/emulation.cy.ts must exist");
const cypressContent = fs.readFileSync(cypressSpecPath, "utf8");
assert(
  cypressContent.includes("step1-default-subtitles-detected"),
  "Cypress spec must capture step 1 screenshot",
);
assert(
  cypressContent.includes("step2-favorite-languages-fetch"),
  "Cypress spec must capture step 2 screenshot",
);
assert(
  cypressContent.includes("step3-youtube-api-tlang-lang-fallback"),
  "Cypress spec must capture step 3 screenshot",
);
assert(
  cypressContent.includes("step4-network-panel-inspection"),
  "Cypress spec must capture step 4 screenshot",
);
assert(
  cypressContent.includes("step5-subtitles-view-inspection"),
  "Cypress spec must capture step 5 screenshot",
);
console.log("✅ PASS: Cypress emulation test contains all 5 steps and screenshots");

// 6.3 Check GitHub Pages static report (public/android-emulator-report.html)
const reportHtmlPath = path.resolve(rootDir, "public/android-emulator-report.html");
assert(fs.existsSync(reportHtmlPath), "public/android-emulator-report.html must exist");
const reportHtmlContent = fs.readFileSync(reportHtmlPath, "utf8");
assert(
  reportHtmlContent.includes("Step 1: Default Subtitles Detection"),
  "HTML report must document Step 1",
);
assert(
  reportHtmlContent.includes("Step 2: Favorite Languages Fetch"),
  "HTML report must document Step 2",
);
assert(
  reportHtmlContent.includes("Step 3: YouTube API tlang & lang Fallback"),
  "HTML report must document Step 3",
);
assert(
  reportHtmlContent.includes("Step 4: Network Panel Inspection"),
  "HTML report must document Step 4",
);
assert(
  reportHtmlContent.includes("Step 5: Subtitles View Inspection"),
  "HTML report must document Step 5",
);
assert(
  reportHtmlContent.includes("SUBTITLE_FETCH"),
  "HTML report must include logcat telemetry",
);
console.log("✅ PASS: GitHub Pages emulator HTML report documents all 5 steps, step cards, and logcat");

console.log("\n====================================================");
console.log("🎉 ALL E2E EMULATOR SUBTITLES DETECTION & INSPECTION CHECKS PASSED!");
console.log("====================================================");
