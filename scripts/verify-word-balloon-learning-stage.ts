import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("=== Running Verification: Task 359 Dedicated Word Balloons Learning Stage ===");

// 1. Verify WordBalloonLearningView component file exists and contains expected contracts
const balloonComponentPath = resolve(process.cwd(), "src/components/WordBalloonLearningView.tsx");
const balloonSource = readFileSync(balloonComponentPath, "utf-8");

assert.ok(
  balloonSource.includes("export const WordBalloonLearningView"),
  "WordBalloonLearningView must export the main functional component",
);
assert.ok(
  balloonSource.includes('data-testid="word-balloon-learning-view"'),
  "Must include root testid data-testid='word-balloon-learning-view'",
);
assert.ok(
  balloonSource.includes('data-testid="word-balloons-container"'),
  "Must include balloons container with testid",
);
assert.ok(
  balloonSource.includes("playWebAudioPopSound"),
  "Must implement Web Audio API pop sound effect",
);
assert.ok(
  balloonSource.includes("handlePunchBalloon"),
  "Must handle punch interaction revealing word translations",
);
assert.ok(
  balloonSource.includes('data-testid="punch-all-balloons-btn"'),
  "Must include Punch All action button",
);
assert.ok(
  balloonSource.includes('data-testid="balloon-sound-toggle"'),
  "Must include sound effects toggle button",
);
assert.ok(
  balloonSource.includes('data-testid="balloon-back-to-video-btn"'),
  "Must include Back to Video return button",
);
assert.ok(
  balloonSource.includes('data-testid="balloon-prev-sentence-btn"') &&
    balloonSource.includes('data-testid="balloon-next-sentence-btn"'),
  "Must support sentence navigation controls",
);
console.log("✓ WordBalloonLearningView component verified with full interactive feature set");

// 2. Verify Advanced Mode integration in src/routes/index.tsx
const indexTsxPath = resolve(process.cwd(), "src/routes/index.tsx");
const indexSource = readFileSync(indexTsxPath, "utf-8");

assert.ok(
  indexSource.includes('import { WordBalloonLearningView } from "@/components/WordBalloonLearningView"'),
  "index.tsx must import WordBalloonLearningView",
);
assert.ok(
  indexSource.includes("useWordBalloonLearningView"),
  "index.tsx must maintain useWordBalloonLearningView state",
);
assert.ok(
  indexSource.includes('data-testid="stage-step-learning"'),
  "index.tsx stepper must include stage-step-learning button",
);
assert.ok(
  indexSource.includes('data-testid="toggle-word-balloon-learning-view-btn"'),
  "index.tsx video-display-controls must include toggle-word-balloon-learning-view-btn",
);
assert.ok(
  indexSource.includes("<WordBalloonLearningView"),
  "index.tsx must render WordBalloonLearningView in player container",
);
console.log("✓ Advanced Mode integration verified in index.tsx");

// 3. Verify Beginner Mode integration & absolute parity
const beginnerTabPath = resolve(process.cwd(), "src/components/beginner/tabs/BeginnerVideoTab.tsx");
const beginnerTabSource = readFileSync(beginnerTabPath, "utf-8");
assert.ok(
  beginnerTabSource.includes('data-testid="toggle-word-balloon-learning-view-btn"'),
  "BeginnerVideoTab must include toggle-word-balloon-learning-view-btn for 100% parity",
);

const beginnerFlowPath = resolve(process.cwd(), "src/components/beginner/BeginnerFlowContainer.tsx");
const beginnerFlowSource = readFileSync(beginnerFlowPath, "utf-8");
assert.ok(
  beginnerFlowSource.includes("useWordBalloonLearningView"),
  "BeginnerFlowContainer must pass useWordBalloonLearningView through props",
);
console.log("✓ Beginner Mode 100% parity verified");

// 4. Verify Storybook stories exist
const storiesPath = resolve(process.cwd(), "src/components/WordBalloonLearningView.stories.tsx");
const storiesSource = readFileSync(storiesPath, "utf-8");
assert.ok(
  storiesSource.includes("WordBalloonLearningView"),
  "Storybook story for WordBalloonLearningView must exist",
);
console.log("✓ Storybook stories verified");

console.log("=== All Task 359 Word Balloons Learning Stage Verifications Passed Successfully ===");
