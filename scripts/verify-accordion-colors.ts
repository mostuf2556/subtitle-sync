import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { ACCORDION_THEMES, PANELS } from "../src/config/accordionThemes";

console.log("====================================================");
console.log("🧪 Starting Constant Accordion Bar Colors Verification Test");
console.log("====================================================");

const rootDir = process.cwd();
const themesPath = path.join(rootDir, "src/config/accordionThemes.ts");
const indexTsxPath = path.join(rootDir, "src/routes/index.tsx");

assert(fs.existsSync(themesPath), "src/config/accordionThemes.ts must exist");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");

const indexContent = fs.readFileSync(indexTsxPath, "utf8");

// 1. Verify every panel in PANELS has a distinct constant color theme
const panelIds = PANELS.map((p) => p.id);
console.log(`Checking ${panelIds.length} accordion panel types:`, panelIds.join(", "));

const expectedTypes = [
  "player",
  "playback",
  "parser",
  "languages",
  "language-player",
  "subtitles",
  "library",
];

for (const type of expectedTypes) {
  assert(
    panelIds.includes(type as any),
    `PANELS must include panel type: "${type}"`,
  );
  const theme = ACCORDION_THEMES[type as keyof typeof ACCORDION_THEMES];
  assert(theme, `ACCORDION_THEMES must define constant theme for "${type}"`);
  assert(
    theme.borderLeft.includes("border-l-4"),
    `Theme for "${type}" must have constant border-l-4 accent`,
  );
  assert(
    theme.summaryBg.length > 0,
    `Theme for "${type}" must have constant summaryBg header bar styling`,
  );
  assert(
    theme.badgeBg.length > 0,
    `Theme for "${type}" must have badgeBg styling`,
  );
  assert(
    theme.tagColor.length > 0,
    `Theme for "${type}" must have constant tagColor defined`,
  );
  console.log(`✅ PASS: Constant color for panel "${type}": tag="${theme.tagColor}", border="${theme.borderLeft}"`);
}

// Ensure constant colors are distinct per type
const tagColors = expectedTypes.map((t) => ACCORDION_THEMES[t as keyof typeof ACCORDION_THEMES].tagColor);
const uniqueTagColors = new Set(tagColors);
assert.strictEqual(
  uniqueTagColors.size,
  expectedTypes.length,
  "Each accordion panel type must have a distinct constant color",
);
console.log("✅ PASS: All accordion types use distinct, dedicated constant colors");

// 2. Verify AccordionSection in src/routes/index.tsx sets data attributes and theme classes
assert(
  indexContent.includes('data-accordion-type={id}'),
  "AccordionSection must set data-accordion-type attribute",
);
assert(
  indexContent.includes('data-accordion-color={theme.tagColor}'),
  "AccordionSection must set data-accordion-color attribute",
);
assert(
  indexContent.includes('data-testid={`accordion-bar-${id}`}'),
  "AccordionSection must expose accordion-bar testid",
);
assert(
  indexContent.includes('data-testid={`accordion-color-badge-${id}`}'),
  "AccordionSection must expose accordion-color-badge testid",
);
// Assert that textual color names (e.g. "{theme.tagColor}") are NOT rendered in header
assert(
  !indexContent.includes('>{theme.tagColor}<'),
  "Textual color names must NOT be rendered in accordion headers",
);
console.log("✅ PASS: Textual color names are removed from accordion bar headers");
console.log("✅ PASS: AccordionSection component binds constant color theme, attributes, and testids");

console.log("====================================================");
console.log("📊 ACCORDION COLORS TEST: All assertions passed successfully!");
console.log("====================================================");
