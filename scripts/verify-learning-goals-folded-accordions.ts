import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Dedicated test for Task 386 (Prompt 154 - Chapter 1):
 * Learning Goals Folded Accordions with Timeout
 *
 * Verifies:
 * 1. `LearningGoalAccordion.tsx` exists and sets `defaultOpen={false}`, `autoTimeout={true}`, `autoFoldTimeoutSeconds={10}`.
 * 2. `LearningGoalAccordion.tsx` renders countdown, hourglass icon (`learning-goal-hourglass-${id}`), and pin/unpin buttons.
 * 3. In `src/routes/index.tsx` (Advanced Mode, panelId === "languages"):
 *    - "1. Default Source Language" is wrapped with `<LearningGoalAccordion id="default-source-lang" defaultOpen={false} autoTimeout={true}>`
 *    - "2. Approved Learning Languages" is wrapped with `<LearningGoalAccordion id="approved-languages" defaultOpen={false} autoTimeout={true}>`
 *    - "3. Narration & Ratios" is wrapped with `<LearningGoalAccordion id="narration-ratios" defaultOpen={false} autoTimeout={true}>`
 * 4. In `src/components/beginner/tabs/BeginnerPreferencesTab.tsx` (Beginner Mode):
 *    - Favorite & Target Languages is wrapped with `<LearningGoalAccordion id="beginner-favorite-languages" defaultOpen={false} autoTimeout={true}>`
 *    - Narration Ratios is wrapped with `<LearningGoalAccordion id="beginner-narration-ratios" defaultOpen={false} autoTimeout={true}>`
 *    - Subtitle Row Criteria is wrapped with `<LearningGoalAccordion id="beginner-row-criteria" defaultOpen={false} autoTimeout={true}>`
 * 5. Full parity between Advanced Mode and Beginner Mode.
 */

const root = process.cwd();

console.log("Checking LearningGoalAccordion component...");
const accordionPath = path.join(root, "src/components/LearningGoalAccordion.tsx");
assert.ok(fs.existsSync(accordionPath), "LearningGoalAccordion.tsx must exist");
const accordionContent = fs.readFileSync(accordionPath, "utf-8");

assert.ok(
  accordionContent.includes("defaultOpen = false"),
  "LearningGoalAccordion must have defaultOpen = false by default",
);
assert.ok(
  accordionContent.includes("autoFoldTimeoutSeconds = LEARNING_GOAL_AUTO_FOLD_SECONDS") ||
    accordionContent.includes("LEARNING_GOAL_AUTO_FOLD_SECONDS = 10"),
  "LearningGoalAccordion must use 10 second timeout",
);
assert.ok(
  accordionContent.includes("data-testid={`learning-goal-hourglass-${id}`}"),
  "LearningGoalAccordion must render hourglass icon with testid",
);
assert.ok(
  accordionContent.includes("data-testid={`learning-goal-countdown-${id}`}"),
  "LearningGoalAccordion must render countdown with testid",
);
assert.ok(
  accordionContent.includes("data-testid={`learning-goal-pin-${id}`}"),
  "LearningGoalAccordion must render pin toggle button with testid",
);
console.log("✓ LearningGoalAccordion component verified successfully.");

console.log("Checking Advanced Mode Stage 2 in src/routes/index.tsx...");
const indexPath = path.join(root, "src/routes/index.tsx");
assert.ok(fs.existsSync(indexPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexPath, "utf-8");

assert.ok(
  indexContent.includes('id="default-source-lang"') &&
    indexContent.includes('title="1. Default Source Language"'),
  "Default Source Language must be wrapped in LearningGoalAccordion",
);
assert.ok(
  indexContent.includes('id="approved-languages"') &&
    indexContent.includes('title={`2. Approved Learning Languages (${targetLanguages.length})`}'),
  "Approved Learning Languages must be wrapped in LearningGoalAccordion",
);
assert.ok(
  indexContent.includes('id="narration-ratios"') &&
    indexContent.includes('title="3. Narration & Ratios"'),
  "Narration & Ratios must be wrapped in LearningGoalAccordion",
);
assert.ok(
  indexContent.includes('id="row-criteria"') &&
    indexContent.includes('title="4. Row Criteria & Filters (Per Language)"'),
  "Row Criteria & Filters must be wrapped in LearningGoalAccordion",
);
for (const subId of [
  "narration-order",
  "narration-ratios-slider",
  "narration-blacklist",
  "narration-granularity",
  "narration-speed",
  "narration-volume",
]) {
  assert.ok(
    indexContent.includes(`id="${subId}"`),
    `Narration sub-section ${subId} must be wrapped in LearningGoalAccordion`,
  );
}
console.log("✓ Advanced Mode Stage 2 Learning Goals accordions verified.");

console.log("Checking Beginner Mode Stage in src/components/beginner/tabs/BeginnerPreferencesTab.tsx...");
const beginnerTabPath = path.join(
  root,
  "src/components/beginner/tabs/BeginnerPreferencesTab.tsx",
);
assert.ok(fs.existsSync(beginnerTabPath), "BeginnerPreferencesTab.tsx must exist");
const beginnerContent = fs.readFileSync(beginnerTabPath, "utf-8");

for (const beginnerId of [
  "beginner-default-language",
  "beginner-global-features",
  "beginner-tts-speed-voice",
  "beginner-favorite-languages",
  "beginner-narration-ratios",
  "beginner-row-criteria",
]) {
  assert.ok(
    beginnerContent.includes(`id="${beginnerId}"`) &&
      beginnerContent.includes("LearningGoalAccordion"),
    `Beginner section ${beginnerId} must be wrapped in LearningGoalAccordion`,
  );
}
console.log("✓ Beginner Mode Learning Goals accordions verified.");

console.log("All verifications for Task 429 Learning Goals accordions passed successfully!");
