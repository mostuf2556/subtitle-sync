import assert from "node:assert/strict";
import {
  splitCuesIntoSentences,
  isInsidePairedWrapper,
  DEFAULT_SIMPLE_PARSER_CONFIG,
} from "../src/utils/newSubtitlesParser";

console.log("=========================================================================");
console.log("🧪 Verifying Punctuation-Based Splitting with Paired Quote/Paren Wrapping");
console.log("=========================================================================");

// Test 1: Helper isInsidePairedWrapper detection
console.log("\n[Test 1] Testing isInsidePairedWrapper helper...");
const sampleText1 = 'He said, "Hello, world!" and then left.';
// Indices:
// " is at 9
// , after Hello is at 15 -> inside quotes
// ! after world is at 22 -> inside quotes
// " closing is at 23 -> closing
// . after left is at 38 -> outside quotes
assert.equal(isInsidePairedWrapper(sampleText1, 7), false, "Comma after said is outside quotes");
assert.equal(isInsidePairedWrapper(sampleText1, 15), true, "Comma inside 'Hello, world!' is inside quotes");
assert.equal(isInsidePairedWrapper(sampleText1, 22), true, "Exclamation inside quotes is inside quotes");
assert.equal(isInsidePairedWrapper(sampleText1, 23), false, "Closing quote is closed");
assert.equal(isInsidePairedWrapper(sampleText1, 38), false, "Final period is outside quotes");
console.log("✅ PASS: isInsidePairedWrapper correctly tracks quotation boundaries");

// Test 2: Double quotes wrapping with internal commas and question marks
console.log("\n[Test 2] Testing splitCuesIntoSentences with double quotes...");
const cue1 = {
  start: 0,
  end: 10000,
  text: 'He asked, "Where are you going, my friend?", and smiled.',
};

const segments1 = splitCuesIntoSentences([cue1], DEFAULT_SIMPLE_PARSER_CONFIG);
console.log("Segments 1:", segments1.map((s) => s.text));
// Must NOT split between "Where are you going" and "my friend?"
// Segments should be:
// 1. He asked
// 2. "Where are you going, my friend?"
// 3. and smiled
assert.ok(segments1.length >= 2, "Expected sentence to split into outer clauses");
const quotedSegment = segments1.find((s) => s.text.includes("Where are you going, my friend?"));
assert.ok(quotedSegment, "Quoted text with internal comma must remain wrapped together in a single segment");
console.log("✅ PASS: Quoted text with internal punctuation remains wrapped together");

// Test 3: Parentheses wrapping with internal punctuation
console.log("\n[Test 3] Testing splitCuesIntoSentences with parentheses...");
const cue2 = {
  start: 0,
  end: 10000,
  text: "The result (which was sudden, unexpected, and huge!) amazed everyone.",
};
const segments2 = splitCuesIntoSentences([cue2], DEFAULT_SIMPLE_PARSER_CONFIG);
console.log("Segments 2:", segments2.map((s) => s.text));
const parenSegment = segments2.find((s) => s.text.includes("(which was sudden, unexpected, and huge!)"));
assert.ok(
  parenSegment,
  "Parenthesized clause with internal commas and exclamation must remain wrapped together",
);
console.log("✅ PASS: Parentheses text with internal punctuation remains wrapped together");

// Test 4: Default splitting on ., ,, ?, ! when outside paired wrappers
console.log("\n[Test 4] Testing default splitting on ., ,, ?, ! outside wrappers...");
const cue3 = {
  start: 0,
  end: 10000,
  text: "First part. Second part, third part! Is this fourth?",
};
const segments3 = splitCuesIntoSentences([cue3], DEFAULT_SIMPLE_PARSER_CONFIG);
console.log("Segments 3:", segments3.map((s) => s.text));
assert.equal(segments3.length, 4, "Should split on dot, comma, exclamation, and question mark by default");
console.log("✅ PASS: Default splitting covers ., ,, ?, ! outside wrappers");

// Test 5: Verify DEFAULT_SIMPLE_PARSER_CONFIG defaults
console.log("\n[Test 5] Checking default configuration values...");
assert.equal(DEFAULT_SIMPLE_PARSER_CONFIG.splitOnDot, true, "splitOnDot must be true by default");
assert.equal(DEFAULT_SIMPLE_PARSER_CONFIG.splitOnComma, true, "splitOnComma must be true by default");
assert.equal(DEFAULT_SIMPLE_PARSER_CONFIG.splitOnQuestion, true, "splitOnQuestion must be true by default");
assert.equal(DEFAULT_SIMPLE_PARSER_CONFIG.splitOnExclamation, true, "splitOnExclamation must be true by default");
assert.equal(DEFAULT_SIMPLE_PARSER_CONFIG.wrapCoupledPunctuation, true, "wrapCoupledPunctuation must be true by default");
console.log("✅ PASS: Default simple parser configuration has all required punctuation and wrapping enabled");

console.log("\n=========================================================================");
console.log("🎉 ALL PUNCTUATION PAIRED WRAPPING TESTS PASSED (100%)!");
console.log("=========================================================================");
