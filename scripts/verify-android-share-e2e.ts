import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { parseVideoId, decodeInterceptedCaption, parseJson3 } from "../src/lib/native-captions";
import { extractYouTubeId } from "../src/utils/youtube";
import { align, type Json3 } from "../src/lib/subtitles";

console.log("====================================================");
console.log("🧪 E2E Test: Android YouTube Video Link Sharing Verification");
console.log("   (Browser ACTION_VIEW & Official YouTube App ACTION_SEND)");
console.log("====================================================");

const rootDir = process.cwd();

// ============================================================================
// PART 1: Browser Sharing Payloads (ACTION_VIEW)
// ============================================================================
console.log("\n--- [1] Browser Sharing Payloads (ACTION_VIEW) ---");

const browserPayloads = [
  {
    label: "Standard browser watch URL",
    input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Browser watch URL with query parameters",
    input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=25s",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Shortened youtu.be link from browser address bar",
    input: "https://youtu.be/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Shortened youtu.be link with tracking si parameter",
    input: "https://youtu.be/dQw4w9WgXcQ?si=abcdef98765",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Mobile browser m.youtube.com link",
    input: "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "YouTube Shorts URL from browser",
    input: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "YouTube Embed URL",
    input: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "YouTube Live broadcast URL",
    input: "https://www.youtube.com/live/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
];

for (const tc of browserPayloads) {
  const extracted = extractYouTubeId(tc.input);
  assert.strictEqual(
    extracted,
    tc.expectedId,
    `Browser extraction failed for ${tc.label}: expected ${tc.expectedId}, got ${extracted}`,
  );
  const parsed = parseVideoId(tc.input);
  assert.strictEqual(parsed, tc.expectedId);
  console.log(`✅ PASS: [Browser] ${tc.label} -> extracted ID: ${extracted}`);
}

// ============================================================================
// PART 2: Official YouTube App Sharing Payloads (ACTION_SEND)
// ============================================================================
console.log("\n--- [2] Official YouTube App Sharing Payloads (ACTION_SEND) ---");

const youtubeAppPayloads = [
  {
    label: "Official YouTube app share with prefix",
    input: "Check out this video on YouTube: https://youtu.be/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Official YouTube app share with localized prefix",
    input: "Watch this on YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Official YouTube app share with video title and newline",
    input: "Never Gonna Give You Up - Official Video\nhttps://youtu.be/dQw4w9WgXcQ",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Official YouTube app share with title, description, and link",
    input: "Amazing Physics Simulation\nCheck it out here:\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "YouTube Shorts share from official app",
    input: "Check out this Short: https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
    expectedId: "dQw4w9WgXcQ",
  },
  {
    label: "Third-party chat forwarded share text (brackets)",
    input: "Hey look at this <https://youtu.be/dQw4w9WgXcQ>",
    expectedId: "dQw4w9WgXcQ",
  },
];

for (const tc of youtubeAppPayloads) {
  const extracted = extractYouTubeId(tc.input);
  assert.strictEqual(
    extracted,
    tc.expectedId,
    `YouTube App extraction failed for ${tc.label}: expected ${tc.expectedId}, got ${extracted}`,
  );
  const parsed = parseVideoId(tc.input);
  assert.strictEqual(parsed, tc.expectedId);
  console.log(`✅ PASS: [YouTube App] ${tc.label} -> extracted ID: ${extracted}`);
}

// ============================================================================
// PART 3: Android Native Shell (MainActivity.kt & Manifest) Contracts
// ============================================================================
console.log("\n--- [3] Verifying Android Native Shell Architecture Contracts ---");

// 3.1 AndroidManifest.xml
const manifestPath = path.resolve(rootDir, "android-shell/app/src/main/AndroidManifest.xml");
assert(fs.existsSync(manifestPath), "AndroidManifest.xml must exist");
const manifestContent = fs.readFileSync(manifestPath, "utf8");

assert(
  manifestContent.includes('android:name="android.intent.action.VIEW"'),
  "AndroidManifest.xml must declare ACTION_VIEW for browser link sharing",
);
assert(
  manifestContent.includes('android:name="android.intent.action.SEND"'),
  "AndroidManifest.xml must declare ACTION_SEND for YouTube app share text",
);
assert(
  manifestContent.includes('android:mimeType="text/plain"'),
  "AndroidManifest.xml must accept text/plain mimeType for shared text",
);
assert(
  manifestContent.includes('android:host="www.youtube.com"') ||
    manifestContent.includes('android:host="youtube.com"'),
  "AndroidManifest.xml must filter youtube.com domain",
);
assert(
  manifestContent.includes('android:host="youtu.be"'),
  "AndroidManifest.xml must filter youtu.be domain",
);
assert(
  manifestContent.includes('android:launchMode="singleTask"'),
  "AndroidManifest.xml must specify singleTask launchMode to reuse active activity",
);
console.log("✅ PASS: AndroidManifest.xml correctly configures singleTask, ACTION_VIEW & ACTION_SEND filters");

// 3.2 MainActivity.kt
const mainActivityPath = path.resolve(rootDir, "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt");
assert(fs.existsSync(mainActivityPath), "MainActivity.kt must exist");
const activityContent = fs.readFileSync(mainActivityPath, "utf8");

assert(
  activityContent.includes("fun extractSharedText(intent: Intent?)"),
  "MainActivity.kt must define extractSharedText for reading Intent extras",
);
assert(
  activityContent.includes("Intent.EXTRA_TEXT"),
  "MainActivity.kt must read Intent.EXTRA_TEXT",
);
assert(
  activityContent.includes("fun extractYouTubeVideoId(input: String?)"),
  "MainActivity.kt must define extractYouTubeVideoId for regex parsing",
);
assert(
  activityContent.includes("override fun onNewIntent(intent: Intent?)"),
  "MainActivity.kt must override onNewIntent to handle incoming shares without restart",
);
assert(
  activityContent.includes("window.onNativeSharedLinkReceived"),
  "MainActivity.kt must call window.onNativeSharedLinkReceived in WebView",
);
console.log("✅ PASS: MainActivity.kt implements onNewIntent, extractSharedText & JS bridge dispatch");

// ============================================================================
// PART 4: React App State Transition & Captions Ingestion for Shared Video
// ============================================================================
console.log("\n--- [4] React App State Transition & Captions Ingestion for Shared Video ---");

const indexTsxPath = path.resolve(rootDir, "src/routes/index.tsx");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

assert(
  indexContent.includes("window.onNativeSharedLinkReceived = openLink"),
  "src/routes/index.tsx must attach window.onNativeSharedLinkReceived",
);
assert(
  indexContent.includes("window.__pendingSharedLink"),
  "src/routes/index.tsx must consume window.__pendingSharedLink on mount",
);
assert(
  indexContent.includes("setTracks(null)") &&
    indexContent.includes("setObservedUrl(\"\")") &&
    indexContent.includes("setDefaultCaptionsLoaded(false)"),
  "src/routes/index.tsx must cleanly reset tracks & captions when shared video ID changes",
);
console.log("✅ PASS: React application cleanly binds onNativeSharedLinkReceived and resets tracks on switch");

// 4.1 Simulate Caption Decoding and Alignment for Newly Shared Video
const sharedVideoId = "dQw4w9WgXcQ";
const mockSharedTimedTextUrl = `https://www.youtube.com/api/timedtext?v=${sharedVideoId}&lang=en&fmt=json3`;

const mockSharedEnvelope = JSON.stringify({
  url: mockSharedTimedTextUrl,
  rawData: JSON.stringify({
    wireMagic: "pb3",
    events: [
      { tStartMs: 1000, dDurationMs: 3000, segs: [{ utf8: "We're no strangers to love." }] },
      { tStartMs: 4500, dDurationMs: 3200, segs: [{ utf8: "You know the rules and so do I." }] },
    ],
  }),
});
const base64Shared = Buffer.from(mockSharedEnvelope, "utf8").toString("base64");
const decodedShared = decodeInterceptedCaption(base64Shared);
assert(decodedShared !== null, "decodeInterceptedCaption must succeed on shared video envelope");
assert.strictEqual(decodedShared.url, mockSharedTimedTextUrl);

const parsedSharedJson = parseJson3(decodedShared.rawData);
assert(parsedSharedJson !== null);
assert.strictEqual(parsedSharedJson.events.length, 2);

const mockTracks: Record<string, Json3> = { en: parsedSharedJson };
const alignedShared = align(mockTracks, "en", "sentence");
assert.strictEqual(alignedShared.length, 2);
assert(alignedShared[0].texts["en"].includes("no strangers to love"));
console.log(`✅ PASS: Shared video subtitle ingestion and alignment verified (${alignedShared.length} rows)`);

console.log("\n====================================================");
console.log("🎉 ALL ANDROID YOUTUBE SHARE INTENT E2E CHECKS PASSED!");
console.log("====================================================");
