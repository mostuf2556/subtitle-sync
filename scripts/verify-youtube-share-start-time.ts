import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractSharedStartSeconds } from "../src/utils/youtube.ts";

console.log("=== Verify Task 436: Shared YouTube Video Time Parameter ===");

// 1. Direct YouTube share URLs with t= or start=
assert.equal(extractSharedStartSeconds("https://youtu.be/L2Ryrr6txwA?t=102"), 102);
assert.equal(extractSharedStartSeconds("https://www.youtube.com/watch?v=L2Ryrr6txwA&t=1m42s"), 102);
assert.equal(extractSharedStartSeconds("https://www.youtube.com/watch?v=L2Ryrr6txwA&start=75"), 75);
assert.equal(extractSharedStartSeconds("https://www.youtube.com/watch?v=L2Ryrr6txwA&t=1h2m3s"), 3723);

// 2. App query string forms
assert.equal(extractSharedStartSeconds("?v=L2Ryrr6txwA&t=90"), 90);
assert.equal(extractSharedStartSeconds("?v=L2Ryrr6txwA&start=45"), 45);
assert.equal(
  extractSharedStartSeconds("?url=https%3A%2F%2Fyoutu.be%2FL2Ryrr6txwA%3Ft%3D120"),
  120,
);
assert.equal(extractSharedStartSeconds("?v=L2Ryrr6txwA"), undefined);
assert.equal(extractSharedStartSeconds(""), undefined);

// 3. Verify wiring in src/routes/index.tsx
const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
assert.ok(
  indexSrc.includes("extractSharedStartSeconds"),
  "src/routes/index.tsx must import and use extractSharedStartSeconds",
);
assert.ok(
  indexSrc.includes("pendingStartSecondsRef"),
  "src/routes/index.tsx must track pendingStartSecondsRef",
);
assert.ok(
  indexSrc.includes("startSeconds: Math.floor("),
  "src/routes/index.tsx must pass startSeconds to loadVideoById",
);

console.log("PASS: Task 436 shared YouTube video time parameter verified.");
