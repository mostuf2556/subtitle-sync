import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { buildTranslatedCaptionUrl, parseJson3 } from "../src/lib/native-captions";

console.log("====================================================");
console.log("🧪 Starting Dynamic Favorite Language Subtitle Fetch Test");
console.log("====================================================");

// 1. Verify index.tsx logic for dynamic favorite language addition
const indexRoutePath = path.join(process.cwd(), "src/routes/index.tsx");
const indexRouteContent = fs.readFileSync(indexRoutePath, "utf8");

assert(
  indexRouteContent.includes("const newlyAdded = newTargetLangs.filter"),
  "handleTargetLanguagesChange must identify newly added favorite languages",
);
assert(
  indexRouteContent.includes("fetchFavoriteLanguageSubtitles(newlyAdded)"),
  "handleTargetLanguagesChange must invoke fetchFavoriteLanguageSubtitles for newly added languages",
);
assert(
  indexRouteContent.includes('buildTranslatedCaptionUrl(activeUrl, code, "json3")'),
  "fetchFavoriteLanguageSubtitles must build translated caption URL for each language",
);
assert(
  indexRouteContent.includes("shell.fetchTranslatedCaptionsWithUrl"),
  "fetchFavoriteLanguageSubtitles must request subtitles through the native bridge",
);
console.log("✅ PASS: Source code implements dynamic fetching for newly added favorite languages");

// 2. Simulate dynamic language addition with native shell mock
const baseObservedUrl =
  "https://www.youtube.com/api/timedtext?v=n9qwEOsqsoo&lang=en&fmt=json3&sparams=ip%2Cexpire&signature=xyz%2F123&key=yt8";
const requestedUrls: { url: string; lang: string; format: string }[] = [];

const mockNativeShell = {
  isNativeShell: () => true,
  getLastObservedTimedTextUrl: () => baseObservedUrl,
  fetchTranslatedCaptionsWithUrl: (targetUrl: string, language: string, format: string) => {
    requestedUrls.push({ url: targetUrl, lang: language, format });
    return JSON.stringify({
      events: [
        {
          tStartMs: 0,
          dDurationMs: 4000,
          segs: [{ utf8: `[${language.toUpperCase()}] Dynamically fetched subtitle` }],
        },
      ],
    });
  },
};

// Initial favorite languages: he, it
const initialLanguages = ["he", "it"];
const tracks: Record<string, any> = {};

for (const code of initialLanguages) {
  const url = buildTranslatedCaptionUrl(baseObservedUrl, code, "json3");
  const raw = mockNativeShell.fetchTranslatedCaptionsWithUrl(url, code, "json3");
  const parsed = parseJson3(raw);
  assert(parsed !== null, `Initial track for ${code} must parse successfully`);
  tracks[code] = parsed;
}

assert.strictEqual(requestedUrls.length, 2, "Expected 2 initial requests (he, it)");
assert.strictEqual(requestedUrls[0].lang, "he");
assert.strictEqual(requestedUrls[1].lang, "it");
console.log("✅ PASS: Initial favorite languages (he, it) fetched in order");

// User adds next favorite language: "es" (Spanish)
const updatedLanguages = ["he", "it", "es"];
const newlyAdded = updatedLanguages.filter((lang) => !initialLanguages.includes(lang));
assert.deepStrictEqual(newlyAdded, ["es"], "Newly added language must be detected as ['es']");

for (const code of newlyAdded) {
  assert(!tracks[code], `Track for ${code} should not exist before fetching`);
  const translatedUrl = buildTranslatedCaptionUrl(baseObservedUrl, code, "json3");
  const parsedUrl = new URL(translatedUrl);
  assert.strictEqual(parsedUrl.searchParams.get("lang"), "es", "lang param must equal 'es'");
  assert.strictEqual(parsedUrl.searchParams.get("tlang"), null, "tlang must not be added");
  assert.strictEqual(parsedUrl.searchParams.get("fmt"), "json3", "fmt param must equal 'json3'");
  assert.strictEqual(
    parsedUrl.searchParams.get("signature"),
    "xyz/123",
    "signature must be preserved",
  );

  const raw = mockNativeShell.fetchTranslatedCaptionsWithUrl(translatedUrl, code, "json3");
  const json = parseJson3(raw);
  assert(json !== null, "Dynamically fetched JSON3 must not be null");
  tracks[code] = json;
}

assert.strictEqual(requestedUrls.length, 3, "Expected 3 total requests after adding es");
assert.strictEqual(requestedUrls[2].lang, "es");
assert.strictEqual(
  tracks.es.events[0].segs[0].utf8,
  "[ES] Dynamically fetched subtitle",
  "Tracks state must contain newly added language cues",
);
console.log("✅ PASS: Dynamically added language 'es' fetched via lang and merged into tracks");

// User adds next favorite language: "fr" (French)
const nextLanguages = ["he", "it", "es", "fr"];
const nextNewlyAdded = nextLanguages.filter((lang) => !updatedLanguages.includes(lang));
assert.deepStrictEqual(nextNewlyAdded, ["fr"]);

for (const code of nextNewlyAdded) {
  const translatedUrl = buildTranslatedCaptionUrl(baseObservedUrl, code, "json3");
  const parsedUrl = new URL(translatedUrl);
  assert.strictEqual(parsedUrl.searchParams.get("lang"), "fr");
  assert.strictEqual(parsedUrl.searchParams.get("tlang"), null);
  assert.strictEqual(parsedUrl.searchParams.get("signature"), "xyz/123");
  const raw = mockNativeShell.fetchTranslatedCaptionsWithUrl(translatedUrl, code, "json3");
  tracks[code] = parseJson3(raw);
}

assert.strictEqual(requestedUrls.length, 4, "Expected 4 total requests after adding fr");
assert.strictEqual(requestedUrls[3].lang, "fr");
assert(tracks.fr !== undefined, "Tracks must include French");
console.log("✅ PASS: Dynamically added language 'fr' fetched via lang and merged into tracks");

console.log("====================================================");
console.log("📊 DYNAMIC FAVORITE LANGUAGE FETCH: All tests passed!");
console.log("====================================================");
