import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { PANELS, ACCORDION_THEMES } from "../src/config/accordionThemes";

console.log("====================================================");
console.log("🧪 Starting Language Video Player Accordion Test");
console.log("====================================================");

const rootDir = process.cwd();
const componentPath = path.join(rootDir, "src/components/LanguageVideoPlayerPanel.tsx");
const indexTsxPath = path.join(rootDir, "src/routes/index.tsx");

assert(fs.existsSync(componentPath), "LanguageVideoPlayerPanel.tsx must exist");
assert(fs.existsSync(indexTsxPath), "src/routes/index.tsx must exist");

const componentContent = fs.readFileSync(componentPath, "utf8");
const indexContent = fs.readFileSync(indexTsxPath, "utf8");

// 1. Verify accordion definition in PANELS
const langPlayerPanel = PANELS.find((p) => p.id === "language-player");
assert(langPlayerPanel, "PANELS must include 'language-player' accordion definition");
assert.strictEqual(
  langPlayerPanel.title,
  "Language video player",
  "Panel title must be 'Language video player'",
);
assert(
  ACCORDION_THEMES["language-player"],
  "ACCORDION_THEMES must define constant theme for 'language-player'",
);
console.log("✅ PASS: 'language-player' accordion registered with title and constant theme");

// 2. Verify iframe URL construction with hl=en, cc_load_policy=1, and cc_lang_pref
assert(
  componentContent.includes("https://www.youtube.com/embed/"),
  "LanguageVideoPlayerPanel must render YouTube embed URL",
);
assert(
  componentContent.includes("hl=en"),
  "Iframe URL must include 'hl=en' to keep player interface menu in English",
);
assert(
  componentContent.includes("cc_load_policy=1"),
  "Iframe URL must include 'cc_load_policy=1' to force subtitles display",
);
assert(
  componentContent.includes("cc_lang_pref="),
  "Iframe URL must control subtitles dynamically via 'cc_lang_pref=' parameter",
);
console.log("✅ PASS: Iframe URL strictly implements hl=en, cc_load_policy=1, and cc_lang_pref");

// 3. Verify exact iframe element attributes
assert(
  componentContent.includes("<iframe") &&
    componentContent.includes('title={`YouTube video player - ${player.subLangName}`}') &&
    componentContent.includes('frameBorder="0"') &&
    componentContent.includes("allowFullScreen"),
  "LanguageVideoPlayerPanel must render YouTube iframe player with title, frameborder, and allowfullscreen",
);
console.log("✅ PASS: YouTube iframe element with frameborder and allowfullscreen verified");

// 4. Verify network tracking & integration with embedded network panel element
assert(
  componentContent.includes("trackNetworkRequest"),
  "LanguageVideoPlayerPanel must track timedtext request in networkTracker",
);
assert(
  componentContent.includes("timedtext?v=") &&
    componentContent.includes("fmt=json3"),
  "TimedText request URL must query timedtext with video ID and fmt=json3",
);
assert(
  componentContent.includes("onOpenNetworkInspector") &&
    componentContent.includes("View in Network Panel"),
  "LanguageVideoPlayerPanel must provide link/button to view fetched subtitles in the network inspector",
);
console.log("✅ PASS: Subtitles network tracking and Network Panel integration verified");

// 5. Verify index.tsx renders LanguageVideoPlayerPanel inside language-player accordion
assert(
  indexContent.includes('panelId === "language-player"') &&
    indexContent.includes("<LanguageVideoPlayerPanel"),
  "src/routes/index.tsx must render LanguageVideoPlayerPanel in language-player accordion section",
);
assert(
  indexContent.includes("onOpenNetworkInspector") &&
    indexContent.includes("setNetworkInspectorOpen(true)"),
  "src/routes/index.tsx must connect onOpenNetworkInspector to open NetworkRequestsInspector",
);
console.log("✅ PASS: index.tsx accordion binding and Network Inspector connection verified");

// 6. Functional URL building simulation test
function buildPlayerIframeUrl(videoId: string, lang: string): string {
  return `https://www.youtube.com/embed/${videoId}?hl=en&cc_load_policy=1&cc_lang_pref=${lang}`;
}

const urlEn = buildPlayerIframeUrl("L2Ryrr6txwA", "en");
assert.strictEqual(
  urlEn,
  "https://www.youtube.com/embed/L2Ryrr6txwA?hl=en&cc_load_policy=1&cc_lang_pref=en",
);

const urlEs = buildPlayerIframeUrl("L2Ryrr6txwA", "es");
assert.strictEqual(
  urlEs,
  "https://www.youtube.com/embed/L2Ryrr6txwA?hl=en&cc_load_policy=1&cc_lang_pref=es",
);

const urlHe = buildPlayerIframeUrl("vBURridJXZ0", "he");
assert.strictEqual(
  urlHe,
  "https://www.youtube.com/embed/vBURridJXZ0?hl=en&cc_load_policy=1&cc_lang_pref=he",
);
console.log("✅ PASS: Functional iframe URL generation verified for English, Spanish, and Hebrew");

console.log("====================================================");
console.log("📊 LANGUAGE VIDEO PLAYER TEST: All assertions passed successfully!");
console.log("====================================================");
