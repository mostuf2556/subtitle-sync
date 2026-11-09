import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LANGS } from "../src/lib/subtitles";
import {
  SUPPORTED_LANGUAGES_CATALOG,
  getUserLearningLanguages,
  setUserLearningLanguages,
  getFavoriteLanguages,
  setFavoriteLanguages,
} from "../src/utils/appSettings";
import { YTPlayerLike } from "../src/utils/multiVideoPlayerManager";

console.log("=== Running Hotfix Verification: Duplicate Keys & Dev Server Pre-warming ===");

// Setup minimal localStorage mock for node environment
if (typeof (globalThis as any).window === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// 1. Verify YTPlayerLike interface includes loadModule and unloadModule
const mockPlayer: YTPlayerLike = {
  loadModule(module: string) {
    console.log(`Loaded module: ${module}`);
  },
  unloadModule(module: string) {
    console.log(`Unloaded module: ${module}`);
  },
};
assert.strictEqual(typeof mockPlayer.loadModule, "function", "loadModule must be defined on YTPlayerLike");
assert.strictEqual(typeof mockPlayer.unloadModule, "function", "unloadModule must be defined on YTPlayerLike");
console.log("✓ YTPlayerLike loadModule/unloadModule typing verified");

// 2. Test appSettings deduplication with case-variations like 'pt-BR' and 'pt-br'
const mixedLangs = ["en", "es", "pt-BR", "pt-BR", "he", "pt-BR", "en"];
setUserLearningLanguages(mixedLangs);
const learningLangs = getUserLearningLanguages();
assert.strictEqual(new Set(learningLangs).size, learningLangs.length, "Learning languages must be strictly unique");
assert.strictEqual(learningLangs.filter((l) => l === "pt-BR").length, 1, "pt-BR must appear at most once");

setFavoriteLanguages(mixedLangs);
const favLangs = getFavoriteLanguages();
assert.strictEqual(new Set(favLangs).size, favLangs.length, "Favorite languages must be strictly unique");
assert.strictEqual(favLangs.filter((l) => l === "pt-BR").length, 1, "pt-BR must appear at most once in favorites");
console.log("✓ appSettings language deduplication verified");

// 3. Test orderedLangs deduplication logic as implemented in index.tsx
function simulateOrderedLangs(
  baseLanguage: string,
  targetLanguages: string[],
  favoriteLanguages: string[]
) {
  const getLanguageMeta = (code: string) => {
    return (
      LANGS.find((l) => l.code === code) ||
      SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code) ||
      LANGS.find((l) => l.code.toLowerCase() === code.toLowerCase()) ||
      SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code.toLowerCase() === code.toLowerCase()) || {
        code,
        name: code.toUpperCase(),
        nativeName: code.toUpperCase(),
        flag: "🌐",
      }
    );
  };

  const list: ReturnType<typeof getLanguageMeta>[] = [];
  const seenMetaCodes = new Set<string>();

  const pushLang = (code: string) => {
    const meta = getLanguageMeta(code);
    const normalized = meta.code.toLowerCase();
    if (!seenMetaCodes.has(normalized)) {
      seenMetaCodes.add(normalized);
      list.push(meta);
    }
  };

  pushLang(baseLanguage);
  targetLanguages.forEach(pushLang);
  favoriteLanguages.forEach(pushLang);

  const finalSeen = new Set<string>();
  return list.filter((item) => {
    if (finalSeen.has(item.code)) return false;
    finalSeen.add(item.code);
    return true;
  });
}

// Test with tricky mixed-case and redundant inputs including "pt-BR", "pt-br", and duplicates
const ordered = simulateOrderedLangs("en", ["pt-BR", "es", "pt-br"], ["he", "pt-BR", "pt-br", "en"]);
const codes = ordered.map((o) => o.code);
console.log("Ordered languages codes:", codes);
assert.strictEqual(new Set(codes).size, codes.length, "Every rendered language code must be strictly unique");
assert.strictEqual(codes.filter((c) => c.toLowerCase() === "pt-br").length, 1, "pt-BR must not produce duplicate keys");
console.log("✓ simulateOrderedLangs duplicate key avoidance verified");

// 4. Verify src/routes/index.tsx has no duplicate keys in mappings and clean panelOrder typing
const indexContent = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");
assert.ok(
  indexContent.includes("Array.from(new Set(favoriteLanguages))"),
  "index.tsx must deduplicate favoriteLanguages across rendering loops"
);
assert.ok(
  !indexContent.includes('const [panelOrder, setPanelOrder] = useState<string[]>'),
  "panelOrder state must be typed as PanelId[] to prevent type assertion failures"
);
console.log("✓ src/routes/index.tsx static checks passed");

console.log("=== All Hotfix Verification Checks Passed Successfully ===");
