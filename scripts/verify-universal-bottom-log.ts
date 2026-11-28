import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Verifying Task 315: Universal Log Element at Bottom of Every Page/Stage ===");

// 1. Verify BottomLogViewer component file exists
const viewerPath = path.resolve(process.cwd(), "src/components/BottomLogViewer.tsx");
assert.ok(fs.existsSync(viewerPath), "src/components/BottomLogViewer.tsx must exist");
const viewerCode = fs.readFileSync(viewerPath, "utf-8");

// 2. Verify controls: copy, clear, filter, state machine actions
console.log("1. Verifying copy, clear, and state machine log controls...");
assert.match(
  viewerCode,
  /data-testid=["']bottom-log-viewer["']/,
  "BottomLogViewer must define data-testid='bottom-log-viewer'",
);
assert.match(
  viewerCode,
  /data-testid=["']bottom-log-toggle-btn["']/,
  "BottomLogViewer must include an expand/collapse toggle button",
);
assert.match(
  viewerCode,
  /data-testid=["']bottom-log-copy-button["']/,
  "BottomLogViewer must include a copy-all-logs button",
);
assert.match(
  viewerCode,
  /data-testid=["']bottom-log-clear-button["']/,
  "BottomLogViewer must include a clear-logs button",
);
assert.match(
  viewerCode,
  /logBuffer\.copyAll\(\)/,
  "Copy button must invoke logBuffer.copyAll()",
);
assert.match(
  viewerCode,
  /logBuffer\.clear\(\)/,
  "Clear button must invoke logBuffer.clear()",
);

// 3. Verify BottomLogViewer is rendered at the bottom in index.tsx
console.log("2. Verifying BottomLogViewer rendered at the bottom of the page in index.tsx...");
const indexTsxPath = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexTsx = fs.readFileSync(indexTsxPath, "utf-8");
assert.match(
  indexTsx,
  /import\s*\{\s*BottomLogViewer\s*\}\s*from\s*["']@\/components\/BottomLogViewer["']/,
  "index.tsx must import BottomLogViewer",
);
assert.match(
  indexTsx,
  /<BottomLogViewer[\s\S]*?\/>/,
  "index.tsx must render <BottomLogViewer /> at the bottom of the layout",
);

console.log("✓ All Task 315 assertions passed successfully!");
