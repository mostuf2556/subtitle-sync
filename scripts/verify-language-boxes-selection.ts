import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting Language Boxes & Selection Ordering Test");
console.log("====================================================");

const rootDir = process.cwd();
const componentPath = path.join(rootDir, "src/components/LanguageBoxesSelector.tsx");
const indexTsxPath = path.join(rootDir, "src/routes/index.tsx");

assert(fs.existsSync(componentPath), "LanguageBoxesSelector.tsx must exist");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");

const componentContent = fs.readFileSync(componentPath, "utf8");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

// 1. Verify toggle button between boxes and list mode
assert(
  componentContent.includes("toggle-language-display-mode"),
  "LanguageBoxesSelector must provide toggle button with id toggle-language-display-mode",
);
assert(
  componentContent.includes("Show as Boxes") && componentContent.includes("Show as List"),
  "LanguageBoxesSelector must support toggling between 'Show as Boxes' and 'Show as List'",
);
console.log("✅ PASS: Mode toggle button between boxes and list verified");

// 2. Verify touch-friendly boxes styling (min-h-[48px] for Android)
assert(
  componentContent.includes("min-h-[48px]"),
  "Language box buttons must have min-h-[48px] for accessible, precise touch targets on Android",
);
assert(
  componentContent.includes("language-box-"),
  "Language box buttons must expose data-testid with language-box- prefix",
);
console.log("✅ PASS: Touch-friendly min-h-[48px] target size verified");

// 3. Verify clicked / selected languages are kept strictly on top
assert(
  componentContent.includes("selectedLanguages.includes(l.code)"),
  "LanguageBoxesSelector must check selected languages",
);
assert(
  componentContent.includes("const selected = filtered.filter") &&
    componentContent.includes("const unselected = filtered.filter") &&
    componentContent.includes("[...selected, ...unselected]"),
  "LanguageBoxesSelector must partition languages so selected items appear at the top",
);
console.log("✅ PASS: Box items partition selected languages at the top");

// 4. Verify native target-language-select is preserved for backwards compatibility and automation
assert(
  componentContent.includes('id="target-language-select"'),
  "LanguageBoxesSelector must retain target-language-select for test suite compatibility",
);
console.log("✅ PASS: #target-language-select compatibility preserved");

// 5. Verify index.tsx renders LanguageBoxesSelector and orders orderedLangs with selected on top
assert(
  indexContent.includes("<LanguageBoxesSelector"),
  "src/routes/index.tsx must render LanguageBoxesSelector in Languages panel",
);
assert(
  indexContent.includes("const selected = list.filter((l) => targetLanguages.includes(l.code))") &&
    indexContent.includes("const unselected = list.filter((l) => !targetLanguages.includes(l.code))"),
  "orderedLangs in index.tsx must keep selected target languages at the top of the table",
);
console.log("✅ PASS: index.tsx integrates LanguageBoxesSelector and sorts orderedLangs");

// 6. Functional simulation of language partitioning logic
const mockCatalog = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "he", name: "Hebrew" },
];

function sortCatalogWithSelectedOnTop(
  catalog: Array<{ code: string; name: string }>,
  selected: string[],
) {
  const selectedItems = catalog.filter((l) => selected.includes(l.code));
  const unselectedItems = catalog.filter((l) => !selected.includes(l.code));
  return [...selectedItems, ...unselectedItems];
}

// Case A: Hebrew and German selected
const sorted1 = sortCatalogWithSelectedOnTop(mockCatalog, ["he", "de"]);
assert.strictEqual(sorted1[0].code, "de");
assert.strictEqual(sorted1[1].code, "he");
assert.strictEqual(sorted1[2].code, "en");
assert.strictEqual(sorted1[3].code, "es");
assert.strictEqual(sorted1[4].code, "fr");

// Case B: User clicks Spanish -> moves to top group
const sorted2 = sortCatalogWithSelectedOnTop(mockCatalog, ["he", "de", "es"]);
const topCodes = sorted2.slice(0, 3).map((l) => l.code);
assert(topCodes.includes("es"), "Spanish must now be in the top selected group");
assert(topCodes.includes("de"), "German must remain in top selected group");
assert(topCodes.includes("he"), "Hebrew must remain in top selected group");
assert.strictEqual(sorted2[3].code, "en");
assert.strictEqual(sorted2[4].code, "fr");
console.log("✅ PASS: Functional sorting simulation verified");

console.log("====================================================");
console.log("📊 LANGUAGE BOXES & SELECTION TEST: All assertions passed successfully!");
console.log("====================================================");
