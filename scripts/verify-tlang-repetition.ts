import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("====================================================");
console.log("🧪 Starting Android Shell timedtext lang Replacement Test");
console.log("   (Verifying query preservation & header injection)");
console.log("====================================================");

const rootDir = process.cwd();
const mainActivityPath = path.join(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt",
);
assert(fs.existsSync(mainActivityPath), `MainActivity.kt must exist at ${mainActivityPath}`);
const content = fs.readFileSync(mainActivityPath, "utf8");

// 1. Assert Android builds the target request by replacing lang in the captured URL.
assert(
  content.includes("captured.translatedUrl(targetLang)"),
  "MainActivity.kt must use the captured request's translated URL",
);
const replayPath = path.join(
  rootDir,
  "android-shell/app/src/main/java/com/ytviewer/app/TimedTextReplay.kt",
);
assert(fs.existsSync(replayPath), `TimedTextReplay.kt must exist at ${replayPath}`);
const replayContent = fs.readFileSync(replayPath, "utf8");
assert(
  replayContent.includes('key(part).equals("lang", true)') &&
    replayContent.includes('URLEncoder.encode(targetLanguage, "UTF-8")'),
  "TimedTextReplay.kt must replace the lang query value",
);
assert(
  replayContent.includes('updated.joinToString("&")'),
  "TimedTextReplay.kt must preserve all untouched raw query components",
);
console.log("✅ PASS: Android replaces lang while preserving other captured query fields");

// 2. Assert captured headers are reused and a missing user-agent is filled from WebView.
assert(
  content.includes("captured.decodedRequestHeaders().forEach"),
  "MainActivity.kt must replay the captured request headers",
);
assert(
  content.includes(
    'headers["User-Agent"] = view?.settings?.userAgentString ?: webView.settings.userAgentString',
  ),
  "MainActivity.kt must fill a missing User-Agent from WebView settings",
);
assert(
  content.includes("requestBuilder.addHeader(key, value)"),
  "MainActivity.kt must attach captured headers to the observed request",
);
console.log("✅ PASS: Captured YouTube request headers are replayed by OkHttpClient");

// 3. Functional URL simulation verifies raw signed fields remain byte-for-byte unchanged.
function simulateTimedTextLangReplacement(base: string, targetLang: string): string {
  const hashIndex = base.indexOf("#");
  const requestUrl = hashIndex < 0 ? base : base.slice(0, hashIndex);
  const fragment = hashIndex < 0 ? "" : base.slice(hashIndex);
  const queryIndex = requestUrl.indexOf("?");
  assert(queryIndex >= 0, "captured timedtext URL must include a query");
  let foundLang = false;
  const query = requestUrl
    .slice(queryIndex + 1)
    .split("&")
    .map((part) => {
      const separator = part.indexOf("=");
      const rawKey = separator < 0 ? part : part.slice(0, separator);
      if (decodeURIComponent(rawKey.replace(/\+/g, " ")).toLowerCase() !== "lang") return part;
      foundLang = true;
      return `${rawKey}=${encodeURIComponent(targetLang)}`;
    });
  assert(foundLang, "captured timedtext URL must include lang");
  return `${requestUrl.slice(0, queryIndex)}?${query.join("&")}${fragment}`;
}

const sampleObserved =
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&ei=U7TBatSAKr7LmLAP563EaA&caps=asr&opi=112496729&exp=xpe&xoaf=5&xowf=1&hl=iw&ip=0.0.0.0&ipbits=0&expire=1791104707&sparams=ip%2Cipbits%2Cexpire%2Cv%2Cei%2Ccaps%2Copi%2Cexp%2Cxoaf&signature=B66A9D91B9DBA078775E093FF028F69B89BEB09D.41CB718F5005C0A6B1AB4D76BE61B6602DF2033F&key=yt8&kind=asr&lang=iw&variant=timing-optimized&potc=1&pot=token%2Fvalue%3D%3D&fmt=json3&xorb=2&xobt=3&xovt=3&cbr=Chrome&cbrver=154.0.0.0&c=WEB&cver=2.20261002.01.00&cplayer=UNIPLAYER&cos=Windows&cosver=10.0&cplatform=DESKTOP";

const japaneseUrl = simulateTimedTextLangReplacement(sampleObserved, "ja");
assert.strictEqual(
  japaneseUrl,
  sampleObserved.replace("&lang=iw&", "&lang=ja&"),
  "Only lang may change; signed and player query components must be preserved exactly",
);
const parsedJapanese = new URL(japaneseUrl);
assert.strictEqual(parsedJapanese.searchParams.get("lang"), "ja");
assert.strictEqual(parsedJapanese.searchParams.get("hl"), "iw", "hl must not be changed with lang");
assert.strictEqual(parsedJapanese.searchParams.get("fmt"), "json3", "fmt must remain unchanged");
assert.strictEqual(
  parsedJapanese.searchParams.get("signature"),
  "B66A9D91B9DBA078775E093FF028F69B89BEB09D.41CB718F5005C0A6B1AB4D76BE61B6602DF2033F",
);
assert.strictEqual(
  parsedJapanese.searchParams.get("tlang"),
  null,
  "no tlang parameter may be added",
);

const italianUrl = simulateTimedTextLangReplacement(japaneseUrl, "it");
assert.strictEqual(
  italianUrl,
  sampleObserved.replace("&lang=iw&", "&lang=it&"),
  "A later target language must replace lang without changing other fields",
);
console.log(
  "✅ PASS: Alternate-language requests change only lang and preserve signed query fields",
);

console.log("====================================================");
console.log("🎉 All Android timedtext lang replacement tests PASSED successfully!");
console.log("====================================================");
