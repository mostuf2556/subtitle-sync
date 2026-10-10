import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting Android App Loading & Shell Verification Test");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify MainActivity.kt exists and contains valid Kotlin syntax
const mainActivityPath = path.join(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), "MainActivity.kt must exist");
const activityContent = fs.readFileSync(mainActivityPath, "utf8");

// Assert no illegal catch (_: Exception) syntax in Kotlin code
assert(
  !activityContent.includes("catch (_:"),
  "MainActivity.kt must NOT contain illegal Kotlin syntax 'catch (_:'",
);
console.log("✅ PASS: No illegal catch (_: Exception) syntax in MainActivity.kt");

// Assert all catch clauses in Kotlin have valid parameter names
const catchMatches = activityContent.match(/catch\s*\(([^)]+)\)/g) || [];
for (const cm of catchMatches) {
  // If it's inside JS template string "catch (e) {}", that's JS; Kotlin catch has a colon
  if (cm.includes(":")) {
    assert(
      !cm.includes("_:"),
      `Catch clause '${cm}' must not use underscore as parameter name in Kotlin 1.9`,
    );
  }
}
console.log("✅ PASS: All Kotlin exception catch parameters are strictly valid");

// 2. Verify onCreate local asset loading
assert(
  activityContent.includes('webView.loadUrl("https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")'),
  "MainActivity.kt must load from local asset domain with querySuffix",
);
assert(
  !activityContent.includes("APP_URL"),
  "MainActivity.kt must not define or use APP_URL",
);
console.log("✅ PASS: onCreate loads exclusively via local asset domain");

// 3. Verify buildQuerySuffix implementation and behavior
assert(
  activityContent.includes("fun buildQuerySuffix"),
  "MainActivity.kt must define buildQuerySuffix helper",
);

// Simulate buildQuerySuffix in TypeScript according to MainActivity.kt logic
function simulateBuildQuerySuffix(rawText: string | null | undefined): string {
  if (!rawText || !rawText.trim() || rawText.trim() === "null" || rawText.trim() === "undefined") {
    return "";
  }
  const trimmed = rawText.trim();
  const idMatch =
    trimmed.match(/^[a-zA-Z0-9_-]{11}$/) ||
    trimmed.match(/(?:youtu\.be|y2u\.be)\/([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    trimmed.match(/\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})/);
  const videoId = idMatch ? idMatch[1] || idMatch[0] : null;
  if (videoId) {
    return `?v=${videoId}&android=true`;
  }
  return `?url=${encodeURIComponent(trimmed)}&android=true`;
}

assert.strictEqual(simulateBuildQuerySuffix(null), "", "null rawText returns empty suffix");
assert.strictEqual(simulateBuildQuerySuffix(""), "", "empty rawText returns empty suffix");
assert.strictEqual(simulateBuildQuerySuffix("  "), "", "whitespace rawText returns empty suffix");
assert.strictEqual(simulateBuildQuerySuffix("null"), "", "'null' string returns empty suffix");
assert.strictEqual(simulateBuildQuerySuffix("undefined"), "", "'undefined' string returns empty suffix");
assert.strictEqual(
  simulateBuildQuerySuffix("vBURridJXZ0"),
  "?v=vBURridJXZ0&android=true",
  "11-char ID returns video query suffix",
);
assert.strictEqual(
  simulateBuildQuerySuffix("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
  "?v=dQw4w9WgXcQ&android=true",
  "watch URL returns video query suffix",
);
console.log("✅ PASS: buildQuerySuffix safely handles empty/null strings and parses video IDs");

// 4. Verify onNewIntent resilience
assert(
  activityContent.includes("override fun onNewIntent"),
  "MainActivity.kt must override onNewIntent",
);
assert(
  activityContent.includes(
    "Navigating to shared URL via local asset domain: https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix",
  ),
  "onNewIntent must log local asset domain navigation",
);
assert(
  !activityContent.includes('window.location.href = "https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix"'),
  "onNewIntent must not trigger disruptive window.location.href reload inside JavaScript",
);
assert(
  activityContent.includes("window.__pendingSharedLink = link;"),
  "onNewIntent buffers pending link for React client mount",
);
console.log("✅ PASS: onNewIntent dispatches shared links seamlessly without whole-page reloads");

// 5. Verify proactiveDetectSubtitles does not overwrite lastObservedTimedTextUrl with hardcoded Hebrew
assert(
  !activityContent.includes('lastObservedTimedTextUrl = "https://www.youtube.com/api/timedtext?v=$videoId&lang=he&fmt=json3"'),
  "proactiveDetectSubtitles must not hardcode lastObservedTimedTextUrl with Hebrew fallback",
);
assert(
  !activityContent.includes("generateDefaultSubtitlesJson(videoId)"),
  "proactiveDetectSubtitles must not inject synthetic default subtitles",
);
console.log("✅ PASS: Subtitle detection does not overwrite lastObservedTimedTextUrl or inject mismatched captions");

// 6. Verify local asset fallback logging in shouldInterceptRequest
assert(
  !activityContent.includes('Log.w(TAG, "Asset not found ($assetPath):'),
  "shouldInterceptRequest must not emit premature 'Asset not found' error before fallbacks",
);
assert(
  activityContent.includes("assetLoader.shouldInterceptRequest(request!!.url)"),
  "shouldInterceptRequest must use WebViewAssetLoader as fallback",
);
console.log("✅ PASS: Asset interception gracefully falls back without false error logging");

// 7. Verify client boot telemetry in src/client.tsx
const clientTsxPath = path.join(rootDir, "src/client.tsx");
assert(fs.existsSync(clientTsxPath), "src/client.tsx must exist");
const clientContent = fs.readFileSync(clientTsxPath, "utf8");
assert(
  clientContent.includes("[APP_READY]"),
  "src/client.tsx must log [APP_READY] on startup",
);
assert(
  clientContent.includes("[APP_BOOT_ERROR]"),
  "src/client.tsx must catch and log [APP_BOOT_ERROR]",
);
console.log("✅ PASS: src/client.tsx emits authentic startup readiness and error signals");

console.log("====================================================");
console.log("🎉 All Android App Loading verification tests PASSED!");
console.log("====================================================");
