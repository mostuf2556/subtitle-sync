import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EXPERIMENTAL_AUTOMATE_SUBTITLE_LANGUAGES } from "../src/components/ExperimentalAutomateSubtitlesBar.tsx";

console.log("=== Verify Task 434: [Experimental] automate_clicking_on_subtitles ===");

// 1. Verify exact 5 languages: russian, spanish, arabic, hebrew, english
const codes = EXPERIMENTAL_AUTOMATE_SUBTITLE_LANGUAGES.map((l) => l.code);
const labels = EXPERIMENTAL_AUTOMATE_SUBTITLE_LANGUAGES.map((l) => l.label.toLowerCase());
assert.deepEqual(codes, ["ru", "es", "ar", "he", "en"]);
assert.deepEqual(labels, ["russian", "spanish", "arabic", "hebrew", "english"]);

// 2. Verify standalone component has test-id and [Experimental] tag
const compSrc = fs.readFileSync(
  path.resolve("src/components/ExperimentalAutomateSubtitlesBar.tsx"),
  "utf8",
);
assert.ok(
  compSrc.includes('data-testid="automate_clicking_on_subtitles"'),
  "Component must include data-testid='automate_clicking_on_subtitles'",
);
assert.ok(
  compSrc.includes("[Experimental]"),
  "Component must display [Experimental] tag",
);
assert.ok(
  compSrc.includes('data-control-category="experimental"'),
  "Component must mark data-control-category='experimental'",
);

// 3. Verify Storybook story exists
assert.ok(
  fs.existsSync(path.resolve("src/components/ExperimentalAutomateSubtitlesBar.stories.tsx")),
  "Storybook story must exist for ExperimentalAutomateSubtitlesBar",
);

// 4. Verify isolated mount in src/routes/index.tsx
const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
assert.ok(
  indexSrc.includes("ExperimentalAutomateSubtitlesBar"),
  "src/routes/index.tsx must mount ExperimentalAutomateSubtitlesBar",
);

console.log("PASS: Task 434 [Experimental] automate_clicking_on_subtitles verified.");
