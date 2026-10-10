import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting In-App Version & Releases Links Test (Subtask 48.2)");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify src/config/constants.ts
const constantsPath = path.resolve(rootDir, "src", "config", "constants.ts");
assert(fs.existsSync(constantsPath), "src/config/constants.ts must exist");
const constantsContent = fs.readFileSync(constantsPath, "utf8");
assert(constantsContent.includes("APP_VERSION ="), "constants.ts must export APP_VERSION");
assert(constantsContent.includes("ALL_RELEASES_URL ="), "constants.ts must export ALL_RELEASES_URL");
assert(
  constantsContent.includes("GITHUB_REPOSITORY ="),
  "constants.ts must export GITHUB_REPOSITORY",
);
console.log("✅ PASS: constants.ts defines APP_VERSION, ALL_RELEASES_URL, and GITHUB_REPOSITORY");

// 2. Verify src/utils/apkUpdater.ts
const apkUpdaterPath = path.resolve(rootDir, "src", "utils", "apkUpdater.ts");
assert(fs.existsSync(apkUpdaterPath), "src/utils/apkUpdater.ts must exist");
const apkUpdaterContent = fs.readFileSync(apkUpdaterPath, "utf8");
assert(
  apkUpdaterContent.includes("CURRENT_APK_VERSION ="),
  "apkUpdater.ts must export CURRENT_APK_VERSION",
);
assert(
  apkUpdaterContent.includes("ALL_RELEASES_URL ="),
  "apkUpdater.ts must export ALL_RELEASES_URL",
);
assert(
  apkUpdaterContent.includes('"ofer-shaham"'),
  "apkUpdater.ts REPO_OWNERS must include ofer-shaham",
);
console.log("✅ PASS: apkUpdater.ts defines version constants and includes repo owner");

// 3. Verify src/routes/index.tsx header and footer elements
const indexPath = path.resolve(rootDir, "src", "routes", "index.tsx");
assert(fs.existsSync(indexPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexPath, "utf8");
assert(
  indexContent.includes('data-testid="app-version-badge"'),
  "index.tsx header must contain app-version-badge",
);
assert(
  indexContent.includes('data-testid="footer-all-releases-link"'),
  "index.tsx footer must contain footer-all-releases-link",
);
assert(
  indexContent.includes('data-testid="footer-view-all-releases"'),
  "index.tsx footer must contain footer-view-all-releases link",
);
console.log("✅ PASS: index.tsx renders header version badge and footer all-releases link");

// 4. Verify src/components/ApkReleaseModal.tsx modal elements
const modalPath = path.resolve(rootDir, "src", "components", "ApkReleaseModal.tsx");
assert(fs.existsSync(modalPath), "src/components/ApkReleaseModal.tsx must exist");
const modalContent = fs.readFileSync(modalPath, "utf8");
assert(
  modalContent.includes('data-testid="modal-app-version-link"'),
  "ApkReleaseModal.tsx must contain modal-app-version-link",
);
assert(
  modalContent.includes('data-testid="all-releases-page-link"'),
  "ApkReleaseModal.tsx footer must contain all-releases-page-link",
);
console.log("✅ PASS: ApkReleaseModal.tsx links version to all-releases page and renders modal footer link");

// 5. Verify README.md contains link to all releases
const readmePath = path.resolve(rootDir, "README.md");
const readmeContent = fs.readFileSync(readmePath, "utf8");
assert(
  readmeContent.includes("/releases") && readmeContent.includes("All Releases"),
  "README.md must link to All Releases page",
);
console.log("✅ PASS: README.md references All Releases page");

console.log("====================================================");
console.log("🎉 In-App Version & Releases Links Test PASSED!");
console.log("====================================================");
