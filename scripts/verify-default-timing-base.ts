import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { align, Json3 } from "../src/lib/subtitles.js";

console.log("====================================================");
console.log("🧪 Starting Default Timing Base & UI Verification");
console.log("====================================================");

const rootDir = process.cwd();
const indexFile = path.resolve(rootDir, "src", "routes", "index.tsx");
assert(fs.existsSync(indexFile), "src/routes/index.tsx must exist");

const indexContent = fs.readFileSync(indexFile, "utf8");

// 1. Verify "Timing from" manual select is removed from UI
assert(
  !indexContent.includes("Timing from"),
  'src/routes/index.tsx must NOT contain "Timing from" label or selector',
);
assert(
  !indexContent.includes("setPivot"),
  "src/routes/index.tsx must NOT manage pivot state via setPivot",
);
console.log('✅ PASS: Manual "Timing from" select and setPivot state are removed from UI');

// 2. Verify automatic baseLanguage derivation logic is present
assert(
  indexContent.includes("const baseLanguage = useMemo("),
  "src/routes/index.tsx must derive baseLanguage automatically",
);
assert(
  indexContent.includes("align(tracks, baseLanguage"),
  "src/routes/index.tsx must pass derived baseLanguage into align()",
);
console.log("✅ PASS: Automatic baseLanguage derivation and align() integration verified");

// 3. Verify alignment logic using baseLanguage with genuine fixtures
const heFixturePath = path.resolve(rootDir, "public", "fixtures", "L2Ryrr6txwA", "he.json");
const enFixturePath = path.resolve(rootDir, "public", "fixtures", "L2Ryrr6txwA", "en.json");
assert(fs.existsSync(heFixturePath), "he.json fixture must exist");
assert(fs.existsSync(enFixturePath), "en.json fixture must exist");

const heTrack: Json3 = JSON.parse(fs.readFileSync(heFixturePath, "utf8"));
const enTrack: Json3 = JSON.parse(fs.readFileSync(enFixturePath, "utf8"));

const tracks: Record<string, Json3> = {
  he: heTrack,
  en: enTrack,
};

// Alignment using default baseLanguage "he"
const rowsHe = align(tracks, "he", "sentence");
assert(rowsHe.length > 0, 'Alignment with default baseLanguage "he" must produce rows');
assert(
  typeof rowsHe[0].texts.he === "string",
  'Aligned rows must contain text for base language "he"',
);
assert(
  typeof rowsHe[0].texts.en === "string",
  'Aligned rows must contain text for target language "en"',
);
console.log(
  `✅ PASS: Alignment using default baseLanguage "he" produced ${rowsHe.length} synchronized rows`,
);

// Alignment when base language is dynamic (e.g., from Android URL lang=en)
const rowsEn = align(tracks, "en", "sentence");
assert(rowsEn.length > 0, 'Alignment with dynamic baseLanguage "en" must produce rows');
assert(
  typeof rowsEn[0].texts.en === "string",
  'Aligned rows must contain text for base language "en"',
);
console.log(
  `✅ PASS: Alignment using dynamic baseLanguage "en" produced ${rowsEn.length} synchronized rows`,
);

console.log("====================================================");
console.log("🎉 Default Timing Base Verification PASSED successfully!");
console.log("====================================================");
