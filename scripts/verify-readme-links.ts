import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const rootDir = process.cwd();

console.log("====================================================");
console.log("🧪 Starting README Links & Workflow Integrity Test");
console.log("====================================================");

const readmePath = path.resolve(rootDir, "README.md");
assert(fs.existsSync(readmePath), "README.md must exist in the repository root");

const readmeContent = fs.readFileSync(readmePath, "utf8");
const lines = readmeContent.split("\n");

// 1. Verify all relative links point to existing files
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let relativeLinksCount = 0;

lines.forEach((line, index) => {
  let match: RegExpExecArray | null;
  linkRegex.lastIndex = 0;

  while ((match = linkRegex.exec(line)) !== null) {
    const target = match[2].trim();
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    relativeLinksCount++;
    const cleanTarget = target.split("#")[0];
    const resolved = path.resolve(rootDir, cleanTarget);
    assert(
      fs.existsSync(resolved),
      `Broken relative link at README.md:${index + 1}: "${target}" (resolved: ${resolved})`,
    );
    console.log(`✅ PASS: Relative link "${target}" resolves to ${cleanTarget}`);
  }
});

assert(
  relativeLinksCount >= 10,
  `Expected at least 10 relative links in README.md, found ${relativeLinksCount}`,
);

// 2. Verify all workflow badge links and target workflow files
const workflowBadges = ["release-apk.yml", "web.yml", "emulation.yml", "deploy-demo.yml"];

for (const wf of workflowBadges) {
  const badgeRef = `actions/workflows/${wf}`;
  assert(readmeContent.includes(badgeRef), `README.md must contain badge for workflow: ${wf}`);

  const workflowPath = path.resolve(rootDir, ".github", "workflows", wf);
  assert(
    fs.existsSync(workflowPath),
    `Target workflow file for badge must exist: .github/workflows/${wf}`,
  );
  console.log(`✅ PASS: Workflow badge ${wf} exists and points to valid .github/workflows/${wf}`);
}

// 3. Verify curl install script reference points to update.apk.sh
assert(
  readmeContent.includes("update.apk.sh"),
  "README.md must reference update.apk.sh in CLI install instructions",
);
const updateApkPath = path.resolve(rootDir, "update.apk.sh");
assert(fs.existsSync(updateApkPath), "update.apk.sh must exist in repository root");
console.log("✅ PASS: update.apk.sh exists and is referenced in README.md");

// 4. Verify GitHub Pages links in README table and static assets
assert(
  /https:\/\/[a-zA-Z0-9_\-.]+\.github\.io\/(?:subtitle-sync|Youtubenet6)\//.test(
    readmeContent,
  ),
  "README.md must contain valid GitHub Pages demo URL for subtitle-sync",
);
assert(
  readmeContent.includes("mochawesome.html"),
  "README.md must contain Mochawesome E2E test report link",
);
assert(
  readmeContent.includes("playwright"),
  "README.md must contain Playwright E2E test report link",
);
assert(
  readmeContent.includes("android-emulator-report.html"),
  "README.md must contain Android Emulator E2E test report link",
);
assert(
  readmeContent.includes("android-emulator-screenshot.png"),
  "README.md must contain emulator screenshot reference",
);
console.log(
  "✅ PASS: All E2E test report links (Mochawesome, Playwright, Android Emulator) verified in README.md",
);

assert(
  /https:\/\/github\.com\/[a-zA-Z0-9_\-.]+\/subtitle-sync\/releases/.test(
    readmeContent,
  ),
  "README.md must contain link to all releases page",
);
console.log("✅ PASS: All Releases page link verified in README.md");

const screenshotAsset = path.resolve(
  rootDir,
  "public",
  "screenshots",
  "android-emulator-screenshot.png",
);
assert(
  fs.existsSync(screenshotAsset),
  "public/screenshots/android-emulator-screenshot.png asset must exist",
);
const assetScreenshot = path.resolve(
  rootDir,
  "public",
  "assets",
  "android-emulator-screenshot.png",
);
assert(
  fs.existsSync(assetScreenshot),
  "public/assets/android-emulator-screenshot.png asset must exist",
);
console.log("✅ PASS: Authentic emulator screenshot static assets present in public/");
console.log("✅ PASS: GitHub Pages demo and screenshot URLs present in README.md");

console.log("====================================================");
console.log(
  `📊 README LINKS TEST: All ${relativeLinksCount} relative links and workflow badges verified!`,
);
console.log("====================================================");
