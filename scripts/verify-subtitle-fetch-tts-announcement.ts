import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildSubtitleFetchAnnouncement,
  describeSubtitleFetchMethod,
} from "../src/utils/subtitleFetchAnnouncement.ts";

console.log("=== Verify Task 433: TTS Announcement on Subtitle Fetch Success ===");

// 1. Unit tests for helper
assert.equal(describeSubtitleFetchMethod("server"), "via server");
assert.equal(describeSubtitleFetchMethod("anon"), "anonymously");
assert.equal(describeSubtitleFetchMethod("session"), "with session");
assert.equal(describeSubtitleFetchMethod("cache"), "from cache");
assert.equal(describeSubtitleFetchMethod("direct"), "directly");
assert.equal(describeSubtitleFetchMethod("interception"), "from video captions");
assert.equal(describeSubtitleFetchMethod(undefined), "");

assert.equal(
  buildSubtitleFetchAnnouncement({ languageName: "Spanish (Español)", method: "server" }),
  "Spanish subtitles fetched via server",
);
assert.equal(
  buildSubtitleFetchAnnouncement({ languageName: "Hebrew (עברית)", method: "anon" }),
  "Hebrew subtitles fetched anonymously",
);
assert.equal(
  buildSubtitleFetchAnnouncement({ languageName: "Arabic", method: "session" }),
  "Arabic subtitles fetched with session",
);
assert.equal(
  buildSubtitleFetchAnnouncement({ languageName: "English", method: "cache" }),
  "English subtitles fetched from cache",
);
assert.equal(
  buildSubtitleFetchAnnouncement({ languageName: "Russian" }),
  "Russian subtitles fetched",
);

// 2. Integration wiring checks in src/routes/index.tsx
const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
assert.ok(
  indexSrc.includes("buildSubtitleFetchAnnouncement"),
  "src/routes/index.tsx must import and use buildSubtitleFetchAnnouncement",
);
assert.ok(
  indexSrc.includes('method: "server"'),
  "src/routes/index.tsx must announce server fetch method",
);
assert.ok(
  indexSrc.includes('result.winner.send === "session" ? "session" : "anon"'),
  "src/routes/index.tsx must distinguish session vs anonymous fetch method",
);
assert.ok(
  indexSrc.includes('method: "cache"'),
  "src/routes/index.tsx must announce cache fetch method",
);
assert.ok(
  indexSrc.includes('method: "interception"'),
  "src/routes/index.tsx must announce interception fetch method",
);

console.log("PASS: Task 433 TTS announcement on subtitle fetch success verified.");
