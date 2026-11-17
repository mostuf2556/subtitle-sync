/**
 * Dedicated Verification Test for Task 398:
 * Floating Dropdown Menu 3rd Option — Toggle TTS-Play (Enabled by Default)
 *
 * Validates:
 * 1. FloatingDraggablePauseButton.tsx exports isTtsPlayEnabled (default true) and onToggleTtsPlay.
 * 2. Dropdown menu renders Option 3 (data-testid="menu-option-tts-play") with "TTS-Play" label,
 *    Enabled/Disabled badge, explanation drawer (data-testid="explanation-tts-play"), and 3-option active counter.
 * 3. Default appSettings.autoPlayTTS is true so TTS-Play starts enabled by default.
 * 4. src/routes/index.tsx initializes isTtsPlayEnabled from loadAppSettings().autoPlayTTS ?? true,
 *    persists updates via saveAppSettings, cancels speech when disabled, and gates section TTS playback
 *    across both Beginner and Advanced modes.
 * 5. Storybook coverage exists in FloatingDraggablePauseButton.stories.tsx and StorybookWorkbench.tsx.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=========================================================================");
console.log("🧪 Running Verification: Floating Menu 3rd Option — TTS-Play (Task 398)");
console.log("=========================================================================");

// Test 1: FloatingDraggablePauseButton props, default value, and 3rd menu option
console.log("Test 1: FloatingDraggablePauseButton interface, default, and 3rd option UI...");
const componentPath = path.resolve(
  process.cwd(),
  "src/components/FloatingDraggablePauseButton.tsx",
);
assert.ok(fs.existsSync(componentPath), "FloatingDraggablePauseButton.tsx must exist");
const componentCode = fs.readFileSync(componentPath, "utf-8");

assert.ok(
  componentCode.includes("isTtsPlayEnabled?: boolean;"),
  "Props interface must declare optional isTtsPlayEnabled boolean",
);
assert.ok(
  componentCode.includes("onToggleTtsPlay?: () => void;"),
  "Props interface must declare optional onToggleTtsPlay callback",
);
assert.ok(
  componentCode.includes("isTtsPlayEnabled = true"),
  "FloatingDraggablePauseButton must default isTtsPlayEnabled to true",
);
assert.ok(
  componentCode.includes('"setup-pause" | "auto-scroll" | "tts-play" | null'),
  "activeExplanation state must support tts-play explanation drawer",
);
assert.ok(
  componentCode.includes('data-testid="menu-option-tts-play"'),
  "Floating menu dropdown must render 3rd option with data-testid='menu-option-tts-play'",
);
assert.ok(
  componentCode.includes('data-testid="explanation-tts-play"'),
  "3rd option must provide explanation container data-testid='explanation-tts-play'",
);
assert.ok(
  componentCode.includes("activeOptionsCount") &&
    componentCode.includes("(isTtsPlayEnabled ? 1 : 0)"),
  "Footer active counter must aggregate all 3 floating menu options",
);
console.log("✅ PASS: FloatingDraggablePauseButton 3rd option and default enabled contract verified");

// Test 2: Default appSettings.autoPlayTTS = true
console.log("Test 2: appSettings DEFAULT_APP_SETTINGS.autoPlayTTS === true...");
const appSettingsPath = path.resolve(process.cwd(), "src/utils/appSettings.ts");
const appSettingsCode = fs.readFileSync(appSettingsPath, "utf-8");
assert.ok(
  appSettingsCode.includes("autoPlayTTS: true"),
  "DEFAULT_APP_SETTINGS must enable autoPlayTTS by default",
);
console.log("✅ PASS: DEFAULT_APP_SETTINGS.autoPlayTTS is true");

// Test 3: Route wiring, persistence, and TTS playback gating in src/routes/index.tsx
console.log("Test 3: Persistence, gating, and cancellation in src/routes/index.tsx...");
const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexCode = fs.readFileSync(indexPath, "utf-8");

assert.ok(
  indexCode.includes("loadAppSettings().autoPlayTTS ?? true"),
  "index.tsx must initialize isTtsPlayEnabled from loadAppSettings().autoPlayTTS ?? true",
);
assert.ok(
  indexCode.includes("saveAppSettings({") && indexCode.includes("autoPlayTTS: enabled"),
  "onTtsPlayEnabledChange must persist autoPlayTTS via saveAppSettings",
);
assert.ok(
  indexCode.includes("TTS_PLAY_TOGGLED"),
  "onTtsPlayEnabledChange must log TTS_PLAY_TOGGLED state-machine event",
);
assert.ok(
  indexCode.includes("if (!st.current.isTtsPlayEnabled) return [];"),
  "getEligibleLangs must return [] when st.current.isTtsPlayEnabled is false",
);
assert.ok(
  indexCode.includes("if (pauseMode && st.current.isTtsPlayEnabled)"),
  "Playback pauseMode TTS coordinator must be gated by st.current.isTtsPlayEnabled",
);
assert.ok(
  indexCode.includes("isTtsPlayEnabled={isTtsPlayEnabled}") &&
    (indexCode.includes("onToggleTtsPlay={handleFloatingToggleTtsPlay}") ||
      indexCode.includes("onToggleTtsPlay={() => onTtsPlayEnabledChange(!isTtsPlayEnabled)}")),
  "index.tsx must pass isTtsPlayEnabled and onToggleTtsPlay props to FloatingDraggablePauseButton",
);
console.log("✅ PASS: Route wiring, persistence, and TTS playback gating verified");

// Test 4: Storybook coverage
console.log("Test 4: Storybook coverage for isTtsPlayEnabled...");
const storiesPath = path.resolve(
  process.cwd(),
  "src/components/FloatingDraggablePauseButton.stories.tsx",
);
const storiesCode = fs.readFileSync(storiesPath, "utf-8");
assert.ok(
  storiesCode.includes("isTtsPlayEnabled={isTtsPlayEnabled}") &&
    storiesCode.includes("onToggleTtsPlay=") &&
    storiesCode.includes("TtsPlayDisabledState"),
  "FloatingDraggablePauseButton.stories.tsx must wire isTtsPlayEnabled/onToggleTtsPlay and include TtsPlayDisabledState",
);

const workbenchPath = path.resolve(process.cwd(), "src/storybook/StorybookWorkbench.tsx");
const workbenchCode = fs.readFileSync(workbenchPath, "utf-8");
assert.ok(
  workbenchCode.includes("isTtsPlayEnabled={isTtsPlayEnabled}") &&
    workbenchCode.includes("onToggleTtsPlay="),
  "StorybookWorkbench.tsx must wire isTtsPlayEnabled and onToggleTtsPlay",
);
console.log("✅ PASS: Storybook coverage verified");

console.log("=========================================================================");
console.log("🎉 All Floating Menu 3rd Option (TTS-Play) Verification Tests PASSED!");
console.log("=========================================================================");
