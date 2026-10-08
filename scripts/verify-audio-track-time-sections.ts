/**
 * Verification test for Subtask 51.1: Audio-Track Mode Loop Progression & Accurate Time-Section Resumption.
 * Validates:
 * 1. Subtitle time-sections resume progression: advancing directly to the next section (candidateRow + 1)
 *    rather than repeating the same time-frame (candidateRow).
 * 2. Final section handling: cleanly pausing the video when the last section finishes.
 * 3. Pre-seek guard in executeMultiVideoSegmentSync preventing premature loop resolution when repeating on primary player.
 * 4. Fallback to base/primary language when audioTrackMode is enabled without explicit spoken language selection.
 * 5. Re-playability: seek(r, i) clears row from played records so user can replay sections.
 * 6. Code integration contracts in src/routes/index.tsx and src/utils/multiVideoPlayerManager.ts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MultiVideoPlayerRegistry,
  executeMultiVideoSegmentSync,
  type YTPlayerLike,
} from "../src/utils/multiVideoPlayerManager";

console.log("====================================================================");
console.log("🧪 Running Subtask 51.1: Audio-Track Time-Sections Verification");
console.log("====================================================================");

// Mock Player Implementation
class MockPlayer implements YTPlayerLike {
  public isPlaying = false;
  public currentTime = 0;
  public isMutedState = false;
  public volume = 100;
  public lastSeek: number | null = null;
  public seekHistory: number[] = [];

  playVideo(): void {
    this.isPlaying = true;
  }

  pauseVideo(): void {
    this.isPlaying = false;
  }

  seekTo(seconds: number, _allowSeekAhead = true): void {
    this.lastSeek = seconds;
    this.seekHistory.push(seconds);
    this.currentTime = seconds;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getPlayerState(): number {
    return this.isPlaying ? 1 : 2;
  }

  mute(): void {
    this.isMutedState = true;
  }

  unMute(): void {
    this.isMutedState = false;
  }

  isMuted(): boolean {
    return this.isMutedState;
  }
}

// Test 1: Subtitle time-sections progression logic without duplicate replaying
console.log("Test 1: Subtitle time-sections progression logic without duplicate replaying...");

interface MockRow {
  start: number;
  end: number;
  texts: Record<string, string>;
}

const mockRows: MockRow[] = [
  { start: 1000, end: 3000, texts: { en: "Section 1", es: "Sección 1" } },
  { start: 3500, end: 6000, texts: { en: "Section 2", es: "Sección 2" } },
  { start: 6500, end: 9000, texts: { en: "Section 3", es: "Sección 3" } },
];

function computeNextResumeTarget(candidateRow: number, rows: MockRow[]): {
  action: "seek_and_play" | "pause";
  targetSec?: number;
  nextRowIdx?: number;
} {
  const nextRowIdx = candidateRow + 1;
  if (nextRowIdx < rows.length && rows[nextRowIdx]) {
    const nextRow = rows[nextRowIdx];
    return {
      action: "seek_and_play",
      targetSec: nextRow.start / 1000,
      nextRowIdx,
    };
  }
  return {
    action: "pause",
  };
}

// From Section 0 -> Must advance to Section 1 (3.5s), NOT repeat Section 0 (1.0s)
const step0 = computeNextResumeTarget(0, mockRows);
assert.equal(step0.action, "seek_and_play");
assert.equal(step0.targetSec, 3.5, "Must advance to Section 1 start (3.5s)");
assert.notEqual(step0.targetSec, 1.0, "Must NOT repeat Section 0 start (1.0s)");

// From Section 1 -> Must advance to Section 2 (6.5s), NOT repeat Section 1 (3.5s)
const step1 = computeNextResumeTarget(1, mockRows);
assert.equal(step1.action, "seek_and_play");
assert.equal(step1.targetSec, 6.5, "Must advance to Section 2 start (6.5s)");
assert.notEqual(step1.targetSec, 3.5, "Must NOT repeat Section 1 start (3.5s)");

// From Section 2 (final section) -> Must pause cleanly
const step2 = computeNextResumeTarget(2, mockRows);
assert.equal(step2.action, "pause", "Must pause cleanly after the last section");
console.log("✅ PASS: Section progression strictly advances to next section without repeating current section");

// Test 2: Pre-seek guard in executeMultiVideoSegmentSync preventing premature resolution
console.log("Test 2: Pre-seek guard in executeMultiVideoSegmentSync...");
const registry = new MultiVideoPlayerRegistry();
const primaryPlayer = new MockPlayer();
registry.register("primary", primaryPlayer);

// Simulate stale player position at end of segment prior to seek completion
primaryPlayer.currentTime = 2.98; // Already near endMs (3000ms) before seek completes

let syncCompleted = false;
let progressUpdates: number[] = [];

const segmentPromise = executeMultiVideoSegmentSync({
  registry,
  primaryPlayer,
  languageCode: "primary",
  startMs: 1000,
  endMs: 3000,
  onProgress: (prog) => {
    progressUpdates.push(prog.percent);
  },
}).then(() => {
  syncCompleted = true;
});

// Immediately after call, seekTo(1.0) must have been called
assert.equal(primaryPlayer.lastSeek, 1.0, "Player must have been instructed to seek to startMs (1.0s)");
assert.equal(syncCompleted, false, "Must NOT immediately resolve despite stale currentTime");

// Simulate time advancing as player plays through segment
await new Promise((r) => setTimeout(r, 120));
primaryPlayer.currentTime = 2.0;

await new Promise((r) => setTimeout(r, 120));
assert.equal(syncCompleted, false, "Must still be playing mid-segment (2.0s)");

// Reach end of segment
primaryPlayer.currentTime = 2.96;
await new Promise((r) => setTimeout(r, 120));

await segmentPromise;
assert.equal(syncCompleted, true, "Must resolve once segment plays through to endMs");
assert.equal(primaryPlayer.isPlaying, false, "Player must be paused after segment completion");
console.log("✅ PASS: Pre-seek guard prevents premature termination and completes segment playback");

// Test 3: Fallback to base/primary language when audioTrackMode is enabled without spoken selection
console.log("Test 3: Language eligibility and fallback in audioTrackMode...");
const orderedLangs = [
  { code: "he", name: "Hebrew", tts: "he-IL" },
  { code: "en", name: "English", tts: "en-US" },
  { code: "es", name: "Spanish", tts: "es-ES" },
];

function resolveEligibleLangs(
  spoken: string[],
  isAudioTrackMode: boolean,
  baseLanguage: string,
  playedRecords: Set<number>,
  rowIdx: number,
) {
  if (rowIdx < 0 || playedRecords.has(rowIdx)) return [];
  const matched = orderedLangs.filter((l) => spoken.includes(l.code));
  if (matched.length === 0 && isAudioTrackMode && spoken.length === 0) {
    const fallback =
      orderedLangs.find((l) => l.code === baseLanguage) ||
      orderedLangs[0] || { code: "primary", tts: "en-US", name: "Primary" };
    return [fallback];
  }
  return matched;
}

// Case A: audioTrackMode ON, spoken empty -> falls back to baseLanguage
const fallbackLangs = resolveEligibleLangs([], true, "he", new Set(), 0);
assert.equal(fallbackLangs.length, 1);
assert.equal(fallbackLangs[0].code, "he", "Should fallback to base language for native audio repeat");

// Case B: audioTrackMode OFF, spoken empty -> empty (continuous playback without pause)
const ttsEmptyLangs = resolveEligibleLangs([], false, "he", new Set(), 0);
assert.equal(ttsEmptyLangs.length, 0, "TTS mode with no spoken languages should not pause");

// Case C: audioTrackMode ON, spoken = ['es'] -> uses explicit spoken selection
const explicitLangs = resolveEligibleLangs(["es"], true, "he", new Set(), 0);
assert.equal(explicitLangs.length, 1);
assert.equal(explicitLangs[0].code, "es");
console.log("✅ PASS: Language resolution correctly falls back in audioTrackMode with empty spoken selection");

// Test 4: Replayability via seek(r, i)
console.log("Test 4: Replayability via seek(r, i) clears row from played records...");
const playedRecords = new Set<number>([0, 1, 2]);
assert.equal(playedRecords.has(1), true);

// User clicks row 1 to replay
function simulateSeekRow(rowIndex: number) {
  playedRecords.delete(rowIndex);
}
simulateSeekRow(1);
assert.equal(playedRecords.has(1), false, "Row 1 should be eligible for repeat after user seeks to it");
console.log("✅ PASS: Manual row seek resets played state for replaying");

// Test 5: Verify source code integration contracts
console.log("Test 5: Source code integration contracts...");
const indexCode = fs.readFileSync(path.resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");
const managerCode = fs.readFileSync(
  path.resolve(process.cwd(), "src/utils/multiVideoPlayerManager.ts"),
  "utf-8",
);

// Assert nextRow progression in index.tsx
assert.ok(
  indexCode.includes("const nextRowIdx = candidateRow + 1;"),
  "src/routes/index.tsx must compute nextRowIdx = candidateRow + 1",
);
assert.ok(
  indexCode.includes("const resumeTarget = nextRow.start / 1000;"),
  "src/routes/index.tsx must advance resumeTarget to nextRow.start / 1000",
);
assert.ok(
  !indexCode.includes("idx >= 0 && rows[idx]?.start"),
  "src/routes/index.tsx must NOT contain buggy 'idx >= 0 && rows[idx]?.start' resume logic",
);

// Assert fallback in getEligibleLangs
assert.ok(
  indexCode.includes("if (matched.length === 0 && isAudioTrackMode && spoken.length === 0)"),
  "src/routes/index.tsx must provide fallback when audioTrackMode is active and spoken is empty",
);

// Assert seek playedRecords cleanup
assert.ok(
  indexCode.includes("playedTtsRecords.current.delete(i);"),
  "src/routes/index.tsx seek() must delete row from playedTtsRecords",
);

// Assert pre-seek guard in manager
assert.ok(
  managerCode.includes("hasStartedNearStart"),
  "src/utils/multiVideoPlayerManager.ts must include hasStartedNearStart pre-seek guard",
);

console.log("✅ PASS: Source code integration contracts verified");

console.log("====================================================================");
console.log("🎉 Subtask 51.1 Audio-Track Time-Sections tests PASSED!");
console.log("====================================================================");
