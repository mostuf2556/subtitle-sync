import assert from "node:assert";
import fs from "node:fs";
import { buildLangReplacedCaptionUrl, buildTranslatedCaptionUrl } from "../src/lib/native-captions";
import { subtitleRequestModeOrder } from "../src/lib/playback-preferences";

const base = "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=srv3";

// 2a. lang replacement
const a = new URL(buildLangReplacedCaptionUrl(base, "he"));
assert.strictEqual(a.searchParams.get("lang"), "he");
assert.strictEqual(a.searchParams.get("tlang"), null);
assert.strictEqual(a.searchParams.get("fmt"), "json3");
// 2b. tlang addition
const b = new URL(buildTranslatedCaptionUrl(base, "he"));
assert.strictEqual(b.searchParams.get("lang"), "en");
assert.strictEqual(b.searchParams.get("tlang"), "he");
// fallback order
assert.deepStrictEqual(subtitleRequestModeOrder("tlang"), ["tlang", "lang"]);
assert.deepStrictEqual(subtitleRequestModeOrder("lang"), ["lang", "tlang"]);
console.log("✅ PASS: lang/tlang request types and fallback order");

const prefs = fs.readFileSync("src/lib/playback-preferences.ts", "utf8");
assert(prefs.includes("localStorage"), "preferences are stored on the device");

const index = fs.readFileSync("src/routes/index.tsx", "utf8");
assert(
  index.includes("subtitleRequestModeOrder(requestModeRef.current)"),
  "fetch uses saved order",
);
assert(index.includes('st.current.sectionOrder === "tts-first"'), "speech-first section order");
assert(index.includes('data-testid="section-order-select"'), "section order setting");
assert(!index.includes("createIframePlayer"), "iframe player option removed");
assert(!fs.existsSync("src/lib/iframe-player.ts"), "iframe player module removed");

console.log("✅ PASS: section order, player kind and iframe control");

const net = fs.readFileSync("src/components/NetworkRequestsInspector.tsx", "utf8");
assert(
  net.includes('data-testid="network-back-to-list"'),
  "mobile network panel has list/detail navigation",
);
assert(net.includes("h-[100dvh]"), "network panel is full-screen on phones");
console.log("✅ PASS: network panel mobile layout");
