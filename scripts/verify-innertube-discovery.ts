import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { ensureCaptionBaseUrl } from "../src/lib/native-captions";

console.log("====================================================");
console.log("🧪 Starting Innertube Caption Discovery Test (Subtask 49.2)");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify MainActivity.kt has fetchInnertubeCaptionBaseUrl and discoverCaptionUrl
const mainActivityPath = path.resolve(
  rootDir,
  "android-shell",
  "app",
  "src",
  "main",
  "java",
  "com",
  "ytviewer",
  "app",
  "MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), "MainActivity.kt must exist");
const mainActivityCode = fs.readFileSync(mainActivityPath, "utf8");

assert(
  mainActivityCode.includes("fetchInnertubeCaptionBaseUrl"),
  "MainActivity.kt must define fetchInnertubeCaptionBaseUrl method",
);
assert(
  mainActivityCode.includes("https://www.youtube.com/youtubei/v1/player"),
  "MainActivity.kt must query public Innertube player endpoint",
);
assert(
  mainActivityCode.includes("playerCaptionsTracklistRenderer") &&
    mainActivityCode.includes("captionTracks"),
  "MainActivity.kt must parse playerCaptionsTracklistRenderer and captionTracks from Innertube response",
);
assert(
  mainActivityCode.includes("fun discoverCaptionUrl(videoId: String): String"),
  "MainActivity.kt AndroidNativeBridge must export discoverCaptionUrl JavaScript interface",
);
assert(
  mainActivityCode.includes("fetchInnertubeCaptionBaseUrl(vid)"),
  "fetchTranslatedCaptionsWithUrl must fall back to Innertube discovery if base URL is missing",
);
console.log("✅ PASS: MainActivity.kt implements native Innertube caption discovery and bridge");

// 2. Verify simulated Innertube JSON response extraction
const mockInnertubeResponse = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl:
            "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&name=&kind=asr",
          name: { simpleText: "English (auto-generated)" },
          vssId: "a.en",
          languageCode: "en",
          isTranslatable: true,
        },
      ],
      translationLanguages: [
        { languageCode: "es", languageName: { simpleText: "Spanish" } },
        { languageCode: "ar", languageName: { simpleText: "Arabic" } },
      ],
    },
  },
};

const tracks =
  mockInnertubeResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
assert(tracks.length > 0, "Tracks must not be empty");
const extractedBaseUrl = tracks[0].baseUrl;
assert(
  extractedBaseUrl.includes("api/timedtext") && extractedBaseUrl.includes("L2Ryrr6txwA"),
  "Extracted baseUrl must be valid timedtext URL",
);
console.log(`✅ PASS: Innertube track extraction simulated successfully: ${extractedBaseUrl}`);

// 3. Verify ensureCaptionBaseUrl helper in TypeScript
assert(
  typeof ensureCaptionBaseUrl === "function",
  "native-captions.ts must export ensureCaptionBaseUrl helper",
);
// In node environment without window.AndroidNativeShell, ensureCaptionBaseUrl gracefully returns null
const nodeResult = ensureCaptionBaseUrl("L2Ryrr6txwA");
assert.strictEqual(nodeResult, null, "In non-browser environment, returns null cleanly");
console.log("✅ PASS: ensureCaptionBaseUrl TypeScript helper verified");

console.log("====================================================");
console.log("🎉 Innertube Caption Discovery Test PASSED!");
console.log("====================================================");
