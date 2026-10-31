import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const navigation = read("src/components/beginner/BeginnerTabNav.tsx");
const flow = read("src/components/beginner/BeginnerFlowContainer.tsx");
const dailyVideo = read("src/components/beginner/tabs/BeginnerVideoTab.tsx");
const languageBoxes = read("src/components/LanguageBoxesSelector.tsx");
const table = read("src/components/SubtitlesTablePanel.tsx");
const route = read("src/routes/index.tsx");

assert.equal((navigation.match(/id: "(?:preferences|video)"/g) ?? []).length, 2);
assert.match(navigation, /title: "General Preferences"/);
assert.match(navigation, /id: "video"/);
assert.doesNotMatch(navigation, /id: "(?:parsing|player)"/);
assert.match(flow, /settings\.beginnerActiveTab === "video" \? "video" : "preferences"/);
assert.match(flow, /<div hidden=\{activeTab !== "video"\}>[\s\S]*?<BeginnerVideoTab/);
assert.match(flow, /<div hidden=\{activeTab !== "preferences"\}>[\s\S]*?<BeginnerPreferencesTab/);
assert.match(flow, /favoriteLanguages: string\[\]/);
assert.match(flow, /baseLanguage: string/);
assert.match(flow, /baseLanguage=\{baseLanguage\}/);
assert.doesNotMatch(flow, /selectedBaseLang/);
assert.doesNotMatch(flow, /settings\.beginnerFavoriteLangs/);
assert.match(route, /favoriteLanguages=\{favoriteLanguages\}/);
assert.match(route, /baseLanguage=\{baseLanguage\}/);
assert.doesNotMatch(flow, /Accordion/);
assert.match(dailyVideo, /<LanguageBoxesSelector/);
assert.match(dailyVideo, /import \{ LanguageBoxesSelector \} from "@\/components\/LanguageBoxesSelector"/);
assert.match(dailyVideo, /favoriteLanguages=\{favoriteLanguages\}/);
assert.match(dailyVideo, /selectedLanguages=\{selectedTargetLanguages\}/);
assert.match(dailyVideo, /isAndroid=\{isAndroid\}/);
assert.doesNotMatch(dailyVideo, /BeginnerFavoriteLanguageSelector/);
assert.match(languageBoxes, /data-testid="language-boxes-selector-wrapper"/);
assert.match(dailyVideo, /charsRemovalSlot/);
assert.match(dailyVideo, /data-testid="subtitle-overlay-size-decrease"/);
assert.match(dailyVideo, /data-testid="subtitle-overlay-size-increase"/);
assert.match(dailyVideo, /data-testid="video-subtitles-overlay-toggle"/);
assert.match(dailyVideo, /data-testid="beginner-parallel-subtitles"/);
assert.ok(
  table.indexOf("<NewSubtitlesParserBar") < table.indexOf("<table "),
  "Parser controls must render before the parallel subtitle table",
);
assert.match(route, /onToggleVideoSubtitles=\{handleToggleVideoSubtitles\}/);

console.log("PASS: Beginner mode contains two flows and the daily video/table layout.");
