import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting APK Updater Robustness & Version Code Test (Subtask 48.1)");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify package.json contains valid semantic version
const pkgPath = path.resolve(rootDir, "package.json");
assert(fs.existsSync(pkgPath), "package.json must exist");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
assert(pkg.version, "package.json must specify a version field");
assert(
  /^\d+\.\d+\.\d+/.test(pkg.version),
  `package.json version "${pkg.version}" must be valid semantic versioning`,
);
console.log(`✅ PASS: package.json defines valid version: ${pkg.version}`);

// 2. Verify android-shell/app/build.gradle.kts versionCode and versionName properties
const buildGradlePath = path.resolve(rootDir, "android-shell", "app", "build.gradle.kts");
assert(fs.existsSync(buildGradlePath), "build.gradle.kts must exist");
const buildGradle = fs.readFileSync(buildGradlePath, "utf8");
assert(
  buildGradle.includes("versionCode =") && buildGradle.includes("appVersionCode"),
  "build.gradle.kts must configure versionCode accepting appVersionCode property",
);
assert(
  buildGradle.includes("versionName =") && buildGradle.includes("appVersionName"),
  "build.gradle.kts must configure versionName accepting appVersionName property",
);
console.log("✅ PASS: build.gradle.kts configures dynamic appVersionCode and appVersionName");

// 3. Verify .github/workflows/release-apk.yml version propagation
const releaseApkPath = path.resolve(rootDir, ".github", "workflows", "release-apk.yml");
assert(fs.existsSync(releaseApkPath), "release-apk.yml must exist");
const releaseApk = fs.readFileSync(releaseApkPath, "utf8");
assert(
  releaseApk.includes("package.json") && releaseApk.includes("GITHUB_RUN_NUMBER"),
  "release-apk.yml must compute app version from package.json and GITHUB_RUN_NUMBER",
);
assert(
  releaseApk.includes("-PappVersionCode=") && releaseApk.includes("-PappVersionName="),
  "release-apk.yml must pass appVersionCode and appVersionName to gradlew assembleDebug",
);
console.log("✅ PASS: release-apk.yml properly computes and propagates version to Gradle");

// 4. Verify update.apk.sh robust collision recovery and multi-user purge
const updateScriptPath = path.resolve(rootDir, "update.apk.sh");
assert(fs.existsSync(updateScriptPath), "update.apk.sh must exist");
const updateScript = fs.readFileSync(updateScriptPath, "utf8");

// Multi-user uninstall in Section 5
assert(
  updateScript.includes("pm uninstall --user 0") && updateScript.includes("pm clear"),
  "update.apk.sh must perform multi-user purge (--user 0, pm clear) to eliminate stale package collision",
);
console.log("✅ PASS: update.apk.sh performs comprehensive multi-user purge prior to installation");

// Collision detection in Section 6
assert(
  updateScript.includes("INSTALL_FAILED_UPDATE_INCOMPATIBLE") &&
    updateScript.includes("INSTALL_FAILED_VERSION_DOWNGRADE"),
  "update.apk.sh must explicitly detect signature collision and version downgrade errors",
);
assert(
  updateScript.includes("Retrying install after collision purge") ||
    updateScript.includes("collision purge"),
  "update.apk.sh must purge and retry installation when collision is encountered",
);
console.log("✅ PASS: update.apk.sh contains automated package collision recovery pipeline");

// 5. Verify README.md links to all releases page
const readmePath = path.resolve(rootDir, "README.md");
const readme = fs.readFileSync(readmePath, "utf8");
assert(
  readme.includes("/releases") && readme.includes("All Releases"),
  "README.md must link to All Releases page in the APK installation section",
);
console.log("✅ PASS: README.md references All Releases page");

console.log("====================================================");
console.log("🎉 APK Updater Robustness & Version Code Test PASSED!");
console.log("====================================================");
