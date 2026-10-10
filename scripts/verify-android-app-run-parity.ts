import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("==================================================================");
console.log("🧪 Running Android App Run Parity & Asset Sync Verification");
console.log("==================================================================");

const rootDir = process.cwd();

// 1. Verify build output and android assets synchronization
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(rootDir, "android-shell/app/src/main/assets");

assert(fs.existsSync(distDir), "dist/ directory must exist");
assert(fs.existsSync(assetsDir), "android-shell assets directory must exist");

const distIndex = path.join(distDir, "index.html");
const assetsIndex = path.join(assetsDir, "index.html");

assert(fs.existsSync(distIndex), "dist/index.html must exist");
assert(fs.existsSync(assetsIndex), "android-shell/app/src/main/assets/index.html must exist");

const distHtml = fs.readFileSync(distIndex, "utf8");
const assetsHtml = fs.readFileSync(assetsIndex, "utf8");

// Extract referenced scripts and stylesheets
const distScripts = Array.from(distHtml.matchAll(/src="(\.\/assets\/[^"]+)"/g)).map((m) => m[1]);
const assetsScripts = Array.from(assetsHtml.matchAll(/src="(\.\/assets\/[^"]+)"/g)).map((m) => m[1]);
const distStyles = Array.from(distHtml.matchAll(/href="(\.\/assets\/[^"]+)"/g)).map((m) => m[1]);
const assetsStyles = Array.from(assetsHtml.matchAll(/href="(\.\/assets\/[^"]+)"/g)).map((m) => m[1]);

assert(distScripts.length > 0, "dist/index.html must reference at least one script chunk");
assert.deepStrictEqual(
  assetsScripts,
  distScripts,
  `Android bundled assets index.html scripts (${assetsScripts}) must match production build (${distScripts})`,
);
console.log("✅ PASS: Bundled JavaScript chunks are perfectly synchronized with production build");

assert.deepStrictEqual(
  assetsStyles,
  distStyles,
  `Android bundled assets index.html styles (${assetsStyles}) must match production build (${distStyles})`,
);
console.log("✅ PASS: Bundled CSS chunks are perfectly synchronized with production build");

// Verify referenced files physically exist in android assets directory
for (const script of assetsScripts) {
  const filePath = path.join(assetsDir, script.replace(/^\.\//, ""));
  assert(fs.existsSync(filePath), `Bundled script must exist on disk: ${filePath}`);
}
for (const style of assetsStyles) {
  const filePath = path.join(assetsDir, style.replace(/^\.\//, ""));
  assert(fs.existsSync(filePath), `Bundled stylesheet must exist on disk: ${filePath}`);
}
console.log("✅ PASS: All script and stylesheet assets physically exist in android assets folder");

// 2. Verify MainActivity.kt structure & resilience
const mainActivityPath = path.join(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), "MainActivity.kt must exist");
const activityContent = fs.readFileSync(mainActivityPath, "utf8");

// Check Kotlin syntax safety
assert(!activityContent.includes("catch (_:"), "No illegal catch (_: Exception) in MainActivity.kt");
assert(activityContent.includes("LOCAL_ASSET_DOMAIN"), "LOCAL_ASSET_DOMAIN must be defined");
assert(activityContent.includes('LOCAL_ASSET_DOMAIN = "appassets.androidplatform.net"'), "LOCAL_ASSET_DOMAIN must be appassets.androidplatform.net");
assert(activityContent.includes("fun buildQuerySuffix"), "buildQuerySuffix helper must exist");
assert(activityContent.includes("fun extractYouTubeVideoId"), "extractYouTubeVideoId helper must exist");
assert(activityContent.includes("override fun onNewIntent"), "onNewIntent must be implemented");
assert(activityContent.includes("override fun shouldInterceptRequest"), "shouldInterceptRequest must be implemented");
assert(activityContent.includes("override fun shouldOverrideUrlLoading"), "shouldOverrideUrlLoading must be implemented");

console.log("✅ PASS: MainActivity.kt implements all required native shell lifecycle & interception hooks");

// 3. Verify build.gradle.kts integrates asset build on preBuild
const gradlePath = path.join(rootDir, "android-shell/app/build.gradle.kts");
assert(fs.existsSync(gradlePath), "build.gradle.kts must exist");
const gradleContent = fs.readFileSync(gradlePath, "utf8");
assert(
  gradleContent.includes("prepareWebAssets") && gradleContent.includes("build:android-assets"),
  "build.gradle.kts must wire prepareWebAssets to build:android-assets",
);
console.log("✅ PASS: build.gradle.kts asset preparation task correctly configured");

// 4. Verify client runtime signals in src/client.tsx
const clientPath = path.join(rootDir, "src/client.tsx");
assert(fs.existsSync(clientPath), "src/client.tsx must exist");
const clientContent = fs.readFileSync(clientPath, "utf8");
assert(clientContent.includes("[APP_READY]"), "src/client.tsx must emit [APP_READY]");
assert(clientContent.includes("[APP_BOOT_ERROR]"), "src/client.tsx must handle [APP_BOOT_ERROR]");
console.log("✅ PASS: Client startup signals correctly registered");

console.log("==================================================================");
console.log("🎉 ALL ANDROID APP RUN PARITY CHECKS PASSED SUCCESSFULLY!");
console.log("==================================================================");
