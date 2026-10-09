import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("Verify Emulator Screencast Video Recording & GitHub Pages Report");
console.log("==================================================================");

const rootDir = process.cwd();

// 1. Verify .gitignore ignores MP4s and specifically android-emulator-video.mp4
console.log("--> [Check 1] Verifying repository hygiene in .gitignore...");
const gitignorePath = path.join(rootDir, ".gitignore");
assert(fs.existsSync(gitignorePath), ".gitignore must exist");
const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
assert(gitignoreContent.includes("*.mp4"), ".gitignore must contain '*.mp4' to ignore media build artifacts");
assert(
  gitignoreContent.includes("android-emulator-video.mp4"),
  ".gitignore must explicitly list 'android-emulator-video.mp4'",
);
assert(
  gitignoreContent.includes("screenshots/"),
  ".gitignore must ignore ephemeral screenshots/ directory on main branch",
);
console.log("✓ Check 1 Passed: Repository hygiene verified — video and ephemeral screenshots ignored on main.");

// 2. Verify run-android-e2e.sh includes screenrecord lifecycle and video pull
console.log("--> [Check 2] Verifying emulator runner screenrecord lifecycle in scripts/run-android-e2e.sh...");
const runShPath = path.join(rootDir, "scripts", "run-android-e2e.sh");
assert(fs.existsSync(runShPath), "scripts/run-android-e2e.sh must exist");
const runShContent = fs.readFileSync(runShPath, "utf8");
assert(
  runShContent.includes("screenrecord"),
  "scripts/run-android-e2e.sh must invoke 'adb shell screenrecord'",
);
assert(
  (runShContent.includes("adb pull") || runShContent.includes("adb_cmd pull")) && runShContent.includes("android-emulator-video.mp4"),
  "scripts/run-android-e2e.sh must pull android-emulator-video.mp4 from emulator",
);
assert(
  runShContent.includes("pkill -2") || runShContent.includes("kill -2") || runShContent.includes("SIGINT"),
  "scripts/run-android-e2e.sh must stop screenrecord gracefully with SIGINT to finalize MP4 file",
);
console.log("✓ Check 2 Passed: Runner script includes screenrecord start, graceful signal termination, and adb pull.");

// 3. Verify .github/workflows/emulation.yml records screencast and stages artifact
console.log("--> [Check 3] Verifying .github/workflows/emulation.yml video recording & staging...");
const emulationYmlPath = path.join(rootDir, ".github", "workflows", "emulation.yml");
assert(fs.existsSync(emulationYmlPath), ".github/workflows/emulation.yml must exist");
const emulationYmlContent = fs.readFileSync(emulationYmlPath, "utf8");
assert(
  emulationYmlContent.includes("screenrecord"),
  ".github/workflows/emulation.yml must launch screenrecord on emulator",
);
assert(
  emulationYmlContent.includes("android-emulator-video.mp4"),
  ".github/workflows/emulation.yml must reference android-emulator-video.mp4",
);
assert(
  emulationYmlContent.includes("name: android-emulator-artifacts"),
  ".github/workflows/emulation.yml must upload android-emulator-artifacts",
);
assert(
  emulationYmlContent.includes("gh-pages-staging/screenshots/android-emulator-video.mp4"),
  ".github/workflows/emulation.yml must stage video to gh-pages-staging/screenshots/",
);
console.log("✓ Check 3 Passed: Emulation workflow starts screenrecord, pulls video, uploads workflow artifact, and stages to gh-pages.");

// 4. Verify public/android-emulator-report.html embeds video player
console.log("--> [Check 4] Verifying video player presentation in public/android-emulator-report.html...");
const reportHtmlPath = path.join(rootDir, "public", "android-emulator-report.html");
assert(fs.existsSync(reportHtmlPath), "public/android-emulator-report.html must exist");
const reportHtmlContent = fs.readFileSync(reportHtmlPath, "utf8");
assert(
  reportHtmlContent.includes("<video"),
  "public/android-emulator-report.html must embed a <video> element",
);
assert(
  reportHtmlContent.includes("android-emulator-video.mp4"),
  "public/android-emulator-report.html must point video source to android-emulator-video.mp4",
);
assert(
  reportHtmlContent.includes("controls") && reportHtmlContent.includes("autoplay") && reportHtmlContent.includes("muted"),
  "public/android-emulator-report.html video must include standard controls, autoplay, and muted attributes",
);
assert(
  reportHtmlContent.includes("step1-default-subtitles-detected.png") &&
  reportHtmlContent.includes("step2-favorite-languages-fetch.png") &&
  reportHtmlContent.includes("step3-youtube-api-tlang-lang-fallback.png") &&
  reportHtmlContent.includes("step4-network-panel-inspection.png") &&
  reportHtmlContent.includes("step5-subtitles-view-inspection.png"),
  "public/android-emulator-report.html must maintain all 5 step screenshots",
);
console.log("✓ Check 4 Passed: Report embeds video presentation player alongside step-by-step images and logcat.");

// 5. Verify deploy-demo.yml preserves screenshots and reports across deployments
console.log("--> [Check 5] Verifying report & video preservation in .github/workflows/deploy-demo.yml...");
const deployDemoPath = path.join(rootDir, ".github", "workflows", "deploy-demo.yml");
assert(fs.existsSync(deployDemoPath), ".github/workflows/deploy-demo.yml must exist");
const deployDemoContent = fs.readFileSync(deployDemoPath, "utf8");
assert(
  deployDemoContent.includes("android-emulator-report.html") && deployDemoContent.includes("screenshots"),
  "deploy-demo.yml must preserve android-emulator-report.html and screenshots directory from gh-pages branch",
);
console.log("✓ Check 5 Passed: deploy-demo preserves android-emulator-report.html and screenshots folder.");

console.log("==================================================================");
console.log("✅ All 5 Verification Checks Passed Cleanly!");
console.log("==================================================================");
