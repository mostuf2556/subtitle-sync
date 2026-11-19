import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Verify Task 439: Video Flickering Fix ===");

const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
assert.ok(
  indexSrc.includes("activePlayerVideoIdRef") && indexSrc.includes("activePlayerHostElRef"),
  "src/routes/index.tsx must guard init() with activePlayerVideoIdRef and activePlayerHostElRef",
);
assert.ok(
  indexSrc.includes("setPlayerContainerNode((prev) => (prev === el ? prev : el))"),
  "handlePlayerRef must avoid redundant setPlayerContainerNode updates",
);

const css = fs.readFileSync(path.resolve("src/styles.css"), "utf8");
assert.ok(
  css.includes('iframe[src*="youtube.com"]') && css.includes("backface-visibility: hidden"),
  "src/styles.css must include GPU compositing stability rule for YouTube iframes",
);

console.log("PASS: Task 439 video flickering fix verified.");
