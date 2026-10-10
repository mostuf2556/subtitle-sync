import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import {
  parseJson3,
  buildTranslatedCaptionUrl,
  buildLangReplacedCaptionUrl,
  SUPPORTED_CAPTION_FORMATS,
} from "../src/lib/native-captions";

console.log("====================================================");
console.log("🧪 Starting Native Captions Discovery & Formats Test (Subtask 49.1)");
console.log("====================================================");

const rootDir = process.cwd();

// 1. Verify iframe-player.ts auto-captions configuration
const iframePlayerPath = path.resolve(rootDir, "src", "lib", "iframe-player.ts");
assert(fs.existsSync(iframePlayerPath), "src/lib/iframe-player.ts must exist");
const iframePlayerCode = fs.readFileSync(iframePlayerPath, "utf8");
assert(
  iframePlayerCode.includes('cc_load_policy: "1"'),
  "iframe-player.ts must set cc_load_policy=1 to force YouTube player to request captions automatically",
);
assert(
  iframePlayerCode.includes('post("loadModule", ["captions"])'),
  "iframe-player.ts must call post('loadModule', ['captions']) to activate iframe captions module",
);
assert(
  iframePlayerCode.includes("cc_lang_pref"),
  "iframe-player.ts must support cc_lang_pref for preferred language track",
);
console.log("✅ PASS: iframe-player.ts configured with automatic cc_load_policy and captions module activation");

// 2. Verify parseJson3 on JSON3 format
const sampleJson3 = JSON.stringify({
  events: [
    { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: "Hello from JSON3" }] },
  ],
});
const parsedJson3 = parseJson3(sampleJson3);
assert(parsedJson3 && parsedJson3.events.length === 1, "Must parse standard JSON3");
assert.strictEqual(parsedJson3.events[0].segs?.[0]?.utf8, "Hello from JSON3");
console.log("✅ PASS: parseJson3 correctly parses JSON3 formatted captions");

// 3. Verify parseJson3 on XML srv1 format (<text start="1.5" dur="2.0">Hello XML</text>)
const sampleXmlSrv1 = `<transcript><text start="1.5" dur="2.0">Hello XML &amp; World</text></transcript>`;
const parsedXmlSrv1 = parseJson3(sampleXmlSrv1);
assert(parsedXmlSrv1 && parsedXmlSrv1.events.length === 1, "Must parse XML srv1 format");
assert.strictEqual(parsedXmlSrv1.events[0].tStartMs, 1500);
assert.strictEqual(parsedXmlSrv1.events[0].dDurationMs, 2000);
assert.strictEqual(parsedXmlSrv1.events[0].segs?.[0]?.utf8, "Hello XML & World");
console.log("✅ PASS: parseJson3 correctly parses XML srv1 captions with entity decoding");

// 4. Verify parseJson3 on XML srv3 format (<p t="3000" d="1500"><s>Format 3</s></p>)
const sampleXmlSrv3 = `<timedtext><p t="3000" d="1500"><s>Format 3 Content</s></p></timedtext>`;
const parsedXmlSrv3 = parseJson3(sampleXmlSrv3);
assert(parsedXmlSrv3 && parsedXmlSrv3.events.length === 1, "Must parse XML srv3 format");
assert.strictEqual(parsedXmlSrv3.events[0].tStartMs, 3000);
assert.strictEqual(parsedXmlSrv3.events[0].dDurationMs, 1500);
assert.strictEqual(parsedXmlSrv3.events[0].segs?.[0]?.utf8, "Format 3 Content");
console.log("✅ PASS: parseJson3 correctly parses XML srv3 timedtext captions");

// 5. Verify parseJson3 on WebVTT format (WEBVTT\n00:00:02.500 --> 00:00:05.000\nWebVTT subtitle)
const sampleVtt = `WEBVTT
Kind: captions
Language: en

00:00:02.500 --> 00:00:05.000
WebVTT Subtitle Line

00:01:10.200 --> 00:01:12.700
Second WebVTT Subtitle Line
`;
const parsedVtt = parseJson3(sampleVtt);
assert(parsedVtt && parsedVtt.events.length === 2, "Must parse WebVTT format into events");
assert.strictEqual(parsedVtt.events[0].tStartMs, 2500);
assert.strictEqual(parsedVtt.events[0].dDurationMs, 2500);
assert.strictEqual(parsedVtt.events[0].segs?.[0]?.utf8, "WebVTT Subtitle Line");
assert.strictEqual(parsedVtt.events[1].tStartMs, 70200);
assert.strictEqual(parsedVtt.events[1].dDurationMs, 2500);
assert.strictEqual(parsedVtt.events[1].segs?.[0]?.utf8, "Second WebVTT Subtitle Line");
console.log("✅ PASS: parseJson3 correctly parses WebVTT format captions into unified events");

// 6. Verify SUPPORTED_CAPTION_FORMATS & URL Builders
assert(
  SUPPORTED_CAPTION_FORMATS.includes("json3") &&
    SUPPORTED_CAPTION_FORMATS.includes("srv3") &&
    SUPPORTED_CAPTION_FORMATS.includes("srv1") &&
    SUPPORTED_CAPTION_FORMATS.includes("vtt"),
  "SUPPORTED_CAPTION_FORMATS must include json3, srv3, srv1, and vtt",
);
const testBase = "https://www.youtube.com/api/timedtext?v=test&lang=en";
const vttUrl = buildTranslatedCaptionUrl(testBase, "es", "vtt");
assert(vttUrl.includes("fmt=vtt") && vttUrl.includes("tlang=es"), "Must build vtt format URL");
const srv3Url = buildLangReplacedCaptionUrl(testBase, "fr", "srv3");
assert(srv3Url.includes("fmt=srv3") && srv3Url.includes("lang=fr"), "Must build srv3 format URL");
console.log("✅ PASS: Multi-format URL generation and format negotiation verified");

console.log("====================================================");
console.log("🎉 Native Captions Discovery & Formats Test PASSED!");
console.log("====================================================");
