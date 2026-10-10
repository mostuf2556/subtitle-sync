import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("====================================================");
console.log("🧪 Starting AutoSpeak Initialization Order & TDZ Guard Test");
console.log("====================================================");

const rootDir = process.cwd();
const indexTsxPath = path.join(rootDir, "src/routes/index.tsx");

assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

// 1. Locate positions of declarations
const autoSpeakPos = indexContent.indexOf("const [autoSpeakOnFetch, setAutoSpeakOnFetch]");
const ratesPos = indexContent.indexOf("const [rates, setRates]");
const voiceSelectionsPos = indexContent.indexOf("const [voiceSelections, setVoiceSelections]");
const fetchCallbackPos = indexContent.indexOf("const fetchFavoriteLanguageSubtitles = useCallback(");

assert(autoSpeakPos !== -1, "autoSpeakOnFetch state declaration must exist in index.tsx");
assert(ratesPos !== -1, "rates state declaration must exist in index.tsx");
assert(voiceSelectionsPos !== -1, "voiceSelections state declaration must exist in index.tsx");
assert(fetchCallbackPos !== -1, "fetchFavoriteLanguageSubtitles must exist in index.tsx");

// 2. Assert declaration order precedes callback usage
assert(
  autoSpeakPos < fetchCallbackPos,
  `autoSpeakOnFetch (index ${autoSpeakPos}) must be declared BEFORE fetchFavoriteLanguageSubtitles (index ${fetchCallbackPos})`,
);
console.log("✅ PASS: autoSpeakOnFetch is declared before fetchFavoriteLanguageSubtitles");

assert(
  ratesPos < fetchCallbackPos,
  `rates (index ${ratesPos}) must be declared BEFORE fetchFavoriteLanguageSubtitles (index ${fetchCallbackPos})`,
);
console.log("✅ PASS: rates is declared before fetchFavoriteLanguageSubtitles");

assert(
  voiceSelectionsPos < fetchCallbackPos,
  `voiceSelections (index ${voiceSelectionsPos}) must be declared BEFORE fetchFavoriteLanguageSubtitles (index ${fetchCallbackPos})`,
);
console.log("✅ PASS: voiceSelections is declared before fetchFavoriteLanguageSubtitles");

// 3. Ensure no duplicate downstream re-declarations
const secondAutoSpeak = indexContent.indexOf(
  "const [autoSpeakOnFetch, setAutoSpeakOnFetch]",
  autoSpeakPos + 1,
);
assert.strictEqual(
  secondAutoSpeak,
  -1,
  "There must be no duplicate re-declaration of autoSpeakOnFetch",
);

const secondRates = indexContent.indexOf(
  "const [rates, setRates]",
  ratesPos + 1,
);
assert.strictEqual(
  secondRates,
  -1,
  "There must be no duplicate re-declaration of rates",
);

const secondVoiceSelections = indexContent.indexOf(
  "const [voiceSelections, setVoiceSelections]",
  voiceSelectionsPos + 1,
);
assert.strictEqual(
  secondVoiceSelections,
  -1,
  "There must be no duplicate re-declaration of voiceSelections",
);
console.log("✅ PASS: Zero duplicate downstream re-declarations found");

console.log("====================================================");
console.log("📊 AUTOSPEAK INITIALIZATION TEST: All assertions passed successfully!");
console.log("====================================================");
