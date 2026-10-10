import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { execSync } from "node:child_process";
import jsYaml from "js-yaml";

console.log("====================================================");
console.log("🧪 Starting Fork README & Report Staging Test (Subtask 47.1)");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify static emulator report fallback in public/
const staticReportPath = path.resolve(rootDir, "public", "android-emulator-report.html");
assert(
  fs.existsSync(staticReportPath),
  "public/android-emulator-report.html must exist to guarantee 0 404s on GitHub Pages",
);
const reportHtml = fs.readFileSync(staticReportPath, "utf8");
assert(
  reportHtml.includes("Android Emulator E2E Test Report"),
  "public/android-emulator-report.html must contain proper report title",
);
assert(
  reportHtml.includes("screenshots/android-emulator-screenshot.png"),
  "public/android-emulator-report.html must reference screenshot path",
);
console.log("✅ PASS: Static public/android-emulator-report.html fallback is present and valid");

// 2. Verify authentic screenshot asset in public/screenshots/
const staticScreenshotPath = path.resolve(
  rootDir,
  "public",
  "screenshots",
  "android-emulator-screenshot.png",
);
assert(
  fs.existsSync(staticScreenshotPath),
  "public/screenshots/android-emulator-screenshot.png must exist",
);
assert(
  fs.statSync(staticScreenshotPath).size > 1000,
  "public/screenshots/android-emulator-screenshot.png must be a non-trivial PNG image",
);
console.log("✅ PASS: Authentic public/screenshots/android-emulator-screenshot.png is present");

// 3. Verify .gitignore does NOT ignore public report or public screenshot
const gitignoreContent = fs.readFileSync(path.resolve(rootDir, ".gitignore"), "utf8");
assert(
  gitignoreContent.includes("!public/android-emulator-report.html"),
  ".gitignore must explicitly unignore !public/android-emulator-report.html",
);
assert(
  gitignoreContent.includes("!public/screenshots/"),
  ".gitignore must explicitly unignore !public/screenshots/",
);
console.log("✅ PASS: .gitignore permits tracking public reports and screenshots");

// 4. Verify update-readme.yml triggers on any push to main/master without path filters
const updateWorkflowPath = path.resolve(rootDir, ".github/workflows/update-readme.yml");
assert(fs.existsSync(updateWorkflowPath), ".github/workflows/update-readme.yml must exist");
const updateWorkflowContent = fs.readFileSync(updateWorkflowPath, "utf8");
const parsedWorkflow = jsYaml.load(updateWorkflowContent) as any;
assert(parsedWorkflow && parsedWorkflow.on, "update-readme.yml must define valid triggers");
assert(
  parsedWorkflow.on.push && parsedWorkflow.on.push.branches,
  "update-readme.yml must trigger on push to branches",
);
assert(
  !parsedWorkflow.on.push.paths,
  "update-readme.yml push trigger must not restrict paths so any commit on a fork syncs README",
);
console.log("✅ PASS: update-readme.yml configured to trigger universally on fork push");

// 5. Test scripts/update-readme.mjs fork transformation
const readmePath = path.resolve(rootDir, "README.md");
const originalReadme = fs.readFileSync(readmePath, "utf8");

try {
  // Simulate fork: owner "test-fork-user", repo "subtitle-sync"
  execSync("node scripts/update-readme.mjs test-fork-user subtitle-sync", {
    cwd: rootDir,
    stdio: "pipe",
  });
  const forkedReadme = fs.readFileSync(readmePath, "utf8");
  assert(
    forkedReadme.includes("https://github.com/test-fork-user/subtitle-sync/"),
    "Fork update must update github.com repository links",
  );
  assert(
    forkedReadme.includes("https://test-fork-user.github.io/subtitle-sync/"),
    "Fork update must update github.io GitHub Pages links",
  );
  assert(
    forkedReadme.includes("raw.githubusercontent.com/test-fork-user/subtitle-sync/"),
    "Fork update must update raw.githubusercontent.com curl script URLs",
  );
  console.log("✅ PASS: scripts/update-readme.mjs cleanly synchronizes forked repository identities");
} finally {
  // Restore original repository identity
  fs.writeFileSync(readmePath, originalReadme, "utf8");
}

console.log("====================================================");
console.log("🎉 Fork README & Report Staging Test PASSED!");
console.log("====================================================");
