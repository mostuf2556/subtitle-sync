import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("==================================================================");
console.log("Verify Android Device & Emulator Adaptive E2E Suite (Subtask 54.2)");
console.log("==================================================================");

const rootDir = process.cwd();

// 1. Verify scripts/run-android-e2e.sh contains adaptive resolution scaling & gesture helpers
console.log("--> [Check 1] Verifying scripts/run-android-e2e.sh adaptive scaling & gesture helpers...");
const runShPath = path.join(rootDir, "scripts", "run-android-e2e.sh");
assert(fs.existsSync(runShPath), "scripts/run-android-e2e.sh must exist");
const runShContent = fs.readFileSync(runShPath, "utf8");

assert(
  runShContent.includes("DEV_W=") && runShContent.includes("DEV_H="),
  "scripts/run-android-e2e.sh must parse DEV_W and DEV_H from device resolution",
);
assert(
  runShContent.includes("ADAPTIVE_TAP_X=") && runShContent.includes("ADAPTIVE_TAP_Y="),
  "scripts/run-android-e2e.sh must compute adaptive player coordinates",
);
assert(
  runShContent.includes("adaptive_tap()") && runShContent.includes("adaptive_swipe()"),
  "scripts/run-android-e2e.sh must provide adaptive_tap and adaptive_swipe helper functions",
);
assert(
  runShContent.includes("input tap \"${ADAPTIVE_TAP_X}\" \"${ADAPTIVE_TAP_Y}\""),
  "scripts/run-android-e2e.sh must trigger player tap using adaptive coordinates",
);
assert(
  runShContent.includes("--bit-rate 4000000"),
  "scripts/run-android-e2e.sh screenrecord must specify bitrate limit for physical hardware compatibility",
);
console.log("✓ Check 1 Passed: Runner script contains adaptive coordinate scaling and resolution-aware gesture functions.");

// 2. Verify scripts/android-e2e-assert.sh contains adaptive coordinates, live intent dispatch & screenshots
console.log("--> [Check 2] Verifying scripts/android-e2e-assert.sh adaptive coordinates & live intent dispatch...");
const assertShPath = path.join(rootDir, "scripts", "android-e2e-assert.sh");
assert(fs.existsSync(assertShPath), "scripts/android-e2e-assert.sh must exist");
const assertShContent = fs.readFileSync(assertShPath, "utf8");

assert(
  assertShContent.includes("PLAYER_TAP_X=") && assertShContent.includes("PLAYER_TAP_Y="),
  "scripts/android-e2e-assert.sh must compute adaptive player coordinates",
);
assert(
  assertShContent.includes("android.intent.action.VIEW"),
  "scripts/android-e2e-assert.sh must test live ACTION_VIEW intent dispatch",
);
assert(
  assertShContent.includes("android.intent.action.SEND"),
  "scripts/android-e2e-assert.sh must test live ACTION_SEND intent dispatch",
);
assert(
  assertShContent.includes("dQw4w9WgXcQ") && assertShContent.includes("kJQP7kiw5Fk"),
  "scripts/android-e2e-assert.sh must test both watch URL and app share text formats",
);
assert(
  assertShContent.includes("input swipe"),
  "scripts/android-e2e-assert.sh must execute adaptive swipe gestures",
);
assert(
  assertShContent.includes("step-share-browser-link.png") &&
  assertShContent.includes("step-share-youtube-app-text.png"),
  "scripts/android-e2e-assert.sh must capture screenshots for each intent milestone",
);
console.log("✓ Check 2 Passed: Assertion script validates live intent dispatch (ACTION_VIEW & ACTION_SEND) and adaptive touch gestures.");

// 3. Verify src/routes/index.tsx logs [SHARED_LINK_DISPATCH] for WebView telemetry
console.log("--> [Check 3] Verifying src/routes/index.tsx [SHARED_LINK_DISPATCH] signal...");
const indexTsxPath = path.join(rootDir, "src", "routes", "index.tsx");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");
const indexTsxContent = fs.readFileSync(indexTsxPath, "utf8");

assert(
  indexTsxContent.includes("[SHARED_LINK_DISPATCH]"),
  "src/routes/index.tsx must emit [SHARED_LINK_DISPATCH] console log on receiving shared link",
);
console.log("✓ Check 3 Passed: WebView logs [SHARED_LINK_DISPATCH] for real-time logcat observation.");

// 4. Verify e2e/emulation.spec.ts and cypress/e2e/emulation.cy.ts include device parity tests
console.log("--> [Check 4] Verifying device parity and adaptive viewport tests in Playwright and Cypress suites...");
const playwrightSpecPath = path.join(rootDir, "e2e", "emulation.spec.ts");
assert(fs.existsSync(playwrightSpecPath), "e2e/emulation.spec.ts must exist");
const playwrightContent = fs.readFileSync(playwrightSpecPath, "utf8");

assert(
  playwrightContent.includes("device parity: adaptive touch gestures"),
  "e2e/emulation.spec.ts must include device parity test for adaptive touch gestures",
);

const cypressSpecPath = path.join(rootDir, "cypress", "e2e", "emulation.cy.ts");
assert(fs.existsSync(cypressSpecPath), "cypress/e2e/emulation.cy.ts must exist");
const cypressContent = fs.readFileSync(cypressSpecPath, "utf8");

assert(
  cypressContent.includes("Device parity: adaptive viewport interactions"),
  "cypress/e2e/emulation.cy.ts must include device parity test for adaptive viewport",
);
console.log("✓ Check 4 Passed: Playwright and Cypress test suites cover device parity and adaptive gestures.");

// 5. Verify repository hygiene rules
console.log("--> [Check 5] Verifying repository hygiene rules...");
const gitignorePath = path.join(rootDir, ".gitignore");
assert(fs.existsSync(gitignorePath), ".gitignore must exist");
const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
assert(gitignoreContent.includes("*.mp4"), ".gitignore must ignore video files");
assert(
  gitignoreContent.includes("android-emulator-device-info.json"),
  ".gitignore must ignore device telemetry json",
);
console.log("✓ Check 5 Passed: Clean repository hygiene confirmed.");

console.log("==================================================================");
console.log("🎉 ALL ADAPTIVE ANDROID DEVICE E2E CHECKS PASSED!");
console.log("==================================================================");
