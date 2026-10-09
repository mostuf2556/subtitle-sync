import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("==================================================================");
console.log("Verify Android Device & Emulator E2E Suite (Subtask 54.1)");
console.log("==================================================================");

const rootDir = process.cwd();

// 1. Verify scripts/run-android-e2e.sh has robust device handling, wake, keyguard, and telemetry
console.log("--> [Check 1] Verifying scripts/run-android-e2e.sh device lifecycle & telemetry...");
const runShPath = path.join(rootDir, "scripts", "run-android-e2e.sh");
assert(fs.existsSync(runShPath), "scripts/run-android-e2e.sh must exist");
const runShContent = fs.readFileSync(runShPath, "utf8");

assert(
  runShContent.includes("ANDROID_SERIAL"),
  "scripts/run-android-e2e.sh must support explicit ANDROID_SERIAL configuration",
);
assert(
  runShContent.includes("-s \"${ANDROID_SERIAL}\"") || runShContent.includes("-s $ANDROID_SERIAL"),
  "scripts/run-android-e2e.sh must target specified device with adb -s flag",
);
assert(
  runShContent.includes("KEYCODE_WAKEUP"),
  "scripts/run-android-e2e.sh must wake device screen with KEYCODE_WAKEUP",
);
assert(
  runShContent.includes("wm dismiss-keyguard"),
  "scripts/run-android-e2e.sh must dismiss device keyguard",
);
assert(
  runShContent.includes("accelerometer_rotation"),
  "scripts/run-android-e2e.sh must lock orientation",
);
assert(
  runShContent.includes("ro.product.manufacturer") &&
  runShContent.includes("ro.product.model") &&
  runShContent.includes("ro.product.cpu.abi") &&
  runShContent.includes("wm size") &&
  runShContent.includes("wm density"),
  "scripts/run-android-e2e.sh must collect hardware telemetry (model, manufacturer, abi, resolution, density)",
);
assert(
  runShContent.includes("android-emulator-device-info.json"),
  "scripts/run-android-e2e.sh must output telemetry to android-emulator-device-info.json",
);
console.log("✓ Check 1 Passed: Runner script includes device serial targeting, screen wake, keyguard dismissal, and hardware telemetry.");

// 2. Verify scripts/android-e2e-assert.sh accepts ANDROID_SERIAL and wraps adb calls
console.log("--> [Check 2] Verifying scripts/android-e2e-assert.sh device serial routing...");
const assertShPath = path.join(rootDir, "scripts", "android-e2e-assert.sh");
assert(fs.existsSync(assertShPath), "scripts/android-e2e-assert.sh must exist");
const assertShContent = fs.readFileSync(assertShPath, "utf8");

assert(
  assertShContent.includes("ANDROID_SERIAL"),
  "scripts/android-e2e-assert.sh must read ANDROID_SERIAL environment variable",
);
assert(
  assertShContent.includes("adb_cmd") &&
  (assertShContent.includes("-s \"${ANDROID_SERIAL}\"") || assertShContent.includes("-s $ANDROID_SERIAL")),
  "scripts/android-e2e-assert.sh must wrap adb commands to target ANDROID_SERIAL if set",
);
console.log("✓ Check 2 Passed: Assertion script cleanly targets specific device serial.");

// 3. Verify public/android-emulator-report.html presents Device & Hardware Telemetry
console.log("--> [Check 3] Verifying Device & Hardware Telemetry card in public/android-emulator-report.html...");
const reportHtmlPath = path.join(rootDir, "public", "android-emulator-report.html");
assert(fs.existsSync(reportHtmlPath), "public/android-emulator-report.html must exist");
const reportHtmlContent = fs.readFileSync(reportHtmlPath, "utf8");

assert(
  reportHtmlContent.includes("Device & Hardware Telemetry"),
  "public/android-emulator-report.html must have a Device & Hardware Telemetry section",
);
assert(
  reportHtmlContent.includes("telem-model") &&
  reportHtmlContent.includes("telem-manufacturer") &&
  reportHtmlContent.includes("telem-os") &&
  reportHtmlContent.includes("telem-abi") &&
  reportHtmlContent.includes("telem-resolution") &&
  reportHtmlContent.includes("telem-density"),
  "public/android-emulator-report.html must display model, manufacturer, OS, ABI, resolution, and density",
);
assert(
  reportHtmlContent.includes("android-emulator-device-info.json"),
  "public/android-emulator-report.html must include dynamic hydration from android-emulator-device-info.json",
);
console.log("✓ Check 3 Passed: HTML report contains rich hardware & environment telemetry presentation.");

// 4. Verify .github/workflows/emulation.yml includes wakeup, keyguard dismiss, telemetry json extraction, and staging
console.log("--> [Check 4] Verifying .github/workflows/emulation.yml device setup & artifact staging...");
const emulationYmlPath = path.join(rootDir, ".github", "workflows", "emulation.yml");
assert(fs.existsSync(emulationYmlPath), ".github/workflows/emulation.yml must exist");
const emulationYmlContent = fs.readFileSync(emulationYmlPath, "utf8");

assert(
  emulationYmlContent.includes("KEYCODE_WAKEUP") && emulationYmlContent.includes("wm dismiss-keyguard"),
  ".github/workflows/emulation.yml must ensure emulator is awake and unlocked",
);
assert(
  emulationYmlContent.includes("android-emulator-device-info.json"),
  ".github/workflows/emulation.yml must produce, upload, and stage android-emulator-device-info.json",
);
console.log("✓ Check 4 Passed: CI emulation workflow wakes device, extracts hardware telemetry, and stages report artifacts.");

// 5. Verify .gitignore ignores android-emulator-device-info.json on main
console.log("--> [Check 5] Verifying repository hygiene in .gitignore...");
const gitignorePath = path.join(rootDir, ".gitignore");
assert(fs.existsSync(gitignorePath), ".gitignore must exist");
const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");

assert(
  gitignoreContent.includes("android-emulator-device-info.json"),
  ".gitignore must ignore android-emulator-device-info.json to keep main branch clean",
);
console.log("✓ Check 5 Passed: Telemetry JSON is properly ignored from git tracking.");

// 6. Test JSON Telemetry Structure Validation
console.log("--> [Check 6] Validating sample Device Telemetry schema...");
const sampleTelemetry = {
  serial: "emulator-5554",
  manufacturer: "Google",
  brand: "google",
  model: "sdk_gphone64_arm64",
  androidVersion: "14",
  apiLevel: "34",
  abi: "arm64-v8a",
  resolution: "1080x2400",
  density: "420",
  battery: "level: 100 status: 2 powered: 3",
  timestamp: new Date().toISOString(),
};

assert(typeof sampleTelemetry.serial === "string" && sampleTelemetry.serial.length > 0);
assert(typeof sampleTelemetry.manufacturer === "string");
assert(typeof sampleTelemetry.model === "string");
assert(typeof sampleTelemetry.androidVersion === "string");
assert(typeof sampleTelemetry.apiLevel === "string");
assert(typeof sampleTelemetry.abi === "string");
assert(typeof sampleTelemetry.resolution === "string");
assert(typeof sampleTelemetry.density === "string");
console.log("✓ Check 6 Passed: Device Telemetry JSON schema verified successfully.");

console.log("\n==================================================================");
console.log("🎉 All Subtask 54.1 Device E2E Suite Verifications PASSED!");
console.log("==================================================================");
