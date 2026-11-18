import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildColumnSplittingExplanation } from "../src/utils/subtitleSplittingExplainer.ts";
import { DEFAULT_SIMPLE_PARSER_CONFIG } from "../src/utils/newSubtitlesParser.ts";

console.log("=== Verify Task 435: Subtitles Table Column Splitting Explanation ===");

const cols = [
  { code: "en", name: "English", isYouTubeOrJson: true },
  { code: "es", name: "Spanish", isYouTubeTranslated: true },
  { code: "he", name: "Hebrew", isOnDemandTranslation: true },
];

// 1. Index column explanation
const indexExp = buildColumnSplittingExplanation({
  columnKey: "index",
  cols,
  baseLanguage: "en",
  parserConfig: { ...DEFAULT_SIMPLE_PARSER_CONFIG, maxWordsPerSentence: 12, skipIncompleteSentences: true },
  criteriaMatchAction: "filter",
  totalRows: 50,
  visibleRows: 30,
});
assert.ok(indexExp.title.includes("#"));
assert.ok(indexExp.summary.includes("English"));
assert.ok(indexExp.factors.some((f) => f.value.includes("12")));
assert.ok(indexExp.factors.some((f) => f.detail.includes("30 of 50")));

// 2. Time column explanation
const timeExp = buildColumnSplittingExplanation({
  columnKey: "time",
  cols,
  baseLanguage: "en",
  parserConfig: DEFAULT_SIMPLE_PARSER_CONFIG,
  criteriaMatchAction: "highlight",
  totalRows: 50,
  visibleRows: 50,
});
assert.ok(timeExp.title.includes("Time"));
assert.ok(timeExp.summary.includes("English"));
assert.ok(timeExp.factors.some((f) => f.label.includes("Punctuation splitting")));

// 3. Default language column explanation
const enExp = buildColumnSplittingExplanation({
  columnKey: "lang:en",
  cols,
  baseLanguage: "en",
  parserConfig: DEFAULT_SIMPLE_PARSER_CONFIG,
  criteriaMatchAction: "filter",
  totalRows: 50,
  visibleRows: 50,
});
assert.ok(enExp.title.includes("English"));
assert.ok(enExp.factors.some((f) => f.value.includes("Default")));

// 4. Target language column with language-specific maxWords override
const heExp = buildColumnSplittingExplanation({
  columnKey: "lang:he",
  cols,
  baseLanguage: "en",
  parserConfig: DEFAULT_SIMPLE_PARSER_CONFIG,
  criteriaMatchAction: "filter",
  languageMaxWords: { he: 8 },
  totalRows: 50,
  visibleRows: 20,
});
assert.ok(heExp.title.includes("Hebrew"));
assert.ok(heExp.summary.includes("aligned to the split boundaries of English"));
assert.ok(heExp.factors.some((f) => f.value.includes("8 words (language override)")));
assert.ok(heExp.factors.some((f) => f.value.includes("On-demand translation")));

// 5. Verify SubtitlesTablePanel wires click handlers on #, Time, and language columns
const tableSrc = fs.readFileSync(path.resolve("src/components/SubtitlesTablePanel.tsx"), "utf8");
assert.ok(tableSrc.includes('toggleColumnExplanation("index")'), "Index column must be clickable");
assert.ok(tableSrc.includes('toggleColumnExplanation("time")'), "Time column must be clickable");
assert.ok(tableSrc.includes("toggleColumnExplanation(`lang:${l.code}`)"), "Language columns must be clickable");
assert.ok(
  tableSrc.includes('data-testid="subtitles-column-splitting-explanation"'),
  "Explanation panel must render with testid",
);

console.log("PASS: Task 435 subtitles table column splitting explanation verified.");
