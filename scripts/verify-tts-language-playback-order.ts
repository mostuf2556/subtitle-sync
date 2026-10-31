import assert from "node:assert/strict";
import {
  getSectionOrder,
  setSectionOrder,
  getTtsLanguageOrdersPreference,
  partitionTtsLanguagesByOrder,
  setTtsLanguageOrderPreference,
} from "../src/lib/playback-preferences";
import fs from "node:fs";

console.log("=========================================================================");
console.log("🧪 Verifying Video & TTS Playback Sequence (Before, After, In Between)");
console.log("=========================================================================");

const values = new Map<string, string>([
  ["yt_tts_language_orders_v1", JSON.stringify({ it: "tts-first", fr: "invalid", " ": "video-first" })],
]);
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  },
});

// Test 1: Preferences & overrides
console.log("\n[Test 1] Testing preference persistence and validation...");
assert.deepEqual(getTtsLanguageOrdersPreference(), { it: "tts-first" });
setTtsLanguageOrderPreference("es", "video-first");
assert.deepEqual(getTtsLanguageOrdersPreference(), { it: "tts-first", es: "video-first" });

setSectionOrder("video-middle");
assert.equal(getSectionOrder(), "video-middle");
console.log("✅ PASS: Order preferences and video-middle setting validated");

// Test 2: Partitioning: video-first, tts-first, and video-middle (in between)
console.log("\n[Test 2] Testing partitionTtsLanguagesByOrder with 3 sequence modes...");
const languages = [{ code: "he" }, { code: "it" }, { code: "es" }];
const overrides = getTtsLanguageOrdersPreference();

// When video-first (default): it is tts-first, others are video-first
assert.deepEqual(
  partitionTtsLanguagesByOrder(languages, overrides, "video-first"),
  {
    ttsFirst: [{ code: "it" }],
    videoFirst: [{ code: "he" }, { code: "es" }],
  },
);

// When tts-first: all without override are tts-first
assert.deepEqual(
  partitionTtsLanguagesByOrder(languages, {}, "tts-first"),
  { ttsFirst: languages, videoFirst: [] },
);

// When video-middle: video is played in between TTS groups (Group 1 before, Group 2 after)
const middlePartition = partitionTtsLanguagesByOrder(languages, {}, "video-middle");
assert.ok(middlePartition.ttsFirst.length > 0, "Group 1 (before video) must not be empty");
assert.ok(middlePartition.videoFirst.length > 0, "Group 2 (after video) must not be empty");
assert.equal(
  middlePartition.ttsFirst.length + middlePartition.videoFirst.length,
  languages.length,
  "All languages must be partitioned into before/after groups around video",
);
console.log("✅ PASS: All 3 playback modes partitioned cleanly around video");

// Test 3: UI selectors parity in Advanced and Beginner modes
console.log("\n[Test 3] Verifying UI controls in Advanced and Beginner modes...");
const route = fs.readFileSync("src/routes/index.tsx", "utf8");
const beginnerPreferences = fs.readFileSync(
  "src/components/beginner/PerLanguageTtsPreferences.tsx",
  "utf8",
);
assert.match(route, /getEligibleLangs\(idx, "tts-first"\)/);
assert.match(route, /getEligibleLangs\(candidateRow, "video-first"\)/);
assert.match(route, /playedTtsLanguageRecords/);
assert.match(route, /<LanguageTtsOrderSelect/);
assert.match(route, /data-testid="section-order-select"/);
assert.match(route, /value="video-middle"/);

assert.match(beginnerPreferences, /<LanguageTtsOrderSelect/);
assert.match(beginnerPreferences, /data-testid="beginner-section-order-select"/);
assert.match(beginnerPreferences, /value="video-middle"/);
console.log("✅ PASS: Playback sequence controls verified with full parity in both modes");

console.log("\n=========================================================================");
console.log("🎉 ALL PLAYBACK ORDER AND IN-BETWEEN TESTS PASSED (100%)!");
console.log("=========================================================================");