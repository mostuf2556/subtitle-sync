import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Verify Task 441: One-Click Responsive Stage Fullscreen Toggle ===");

const src = fs.readFileSync(path.resolve("src/components/AccordionSection.tsx"), "utf8");
assert.ok(
  src.includes("data-testid={`accordion-fullscreen-${id}`}"),
  "AccordionSection must render a fullscreen toggle button per stage",
);
assert.ok(
  src.includes('data-fullscreen={isFullscreen ? "true" : "false"}'),
  "AccordionSection must expose data-fullscreen attribute",
);
assert.ok(
  src.includes('e.key === "Escape"'),
  "AccordionSection fullscreen mode must support Escape key to exit",
);
assert.ok(
  src.includes("fixed inset-0 z-50") && src.includes("h-dvh w-screen"),
  "AccordionSection fullscreen mode must use responsive full-viewport classes",
);
assert.ok(
  src.includes("overflow-y-auto overscroll-contain") && src.includes("max-w-7xl"),
  "AccordionSection fullscreen content must adapt cleanly with responsive scroll and container width",
);

console.log("PASS: Task 441 responsive stage fullscreen toggle verified.");
