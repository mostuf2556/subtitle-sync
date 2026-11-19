import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ACCENT_PALETTE_OPTIONS,
  clampAccentBgOpacity,
} from "../src/components/AccentPaletteSelector.tsx";

console.log("=== Verify Task 437 & 438: Colorful Accent Palettes & Background Opacity ===");

const ids = ACCENT_PALETTE_OPTIONS.map((o) => o.id);
assert.deepEqual(ids, ["default", "rainbow", "duolingo", "ocean", "emerald", "sunset", "violet", "rose"]);
assert.equal(clampAccentBgOpacity(-10), 0);
assert.equal(clampAccentBgOpacity(150), 100);
assert.equal(clampAccentBgOpacity(45), 45);

const css = fs.readFileSync(path.resolve("src/styles.css"), "utf8");
for (const accent of ["rainbow", "duolingo", "ocean", "emerald", "sunset", "violet", "rose"]) {
  assert.ok(
    css.includes(`:root[data-accent="${accent}"]`),
    `src/styles.css must define light-mode palette for ${accent}`,
  );
  assert.ok(
    css.includes(`.dark[data-accent="${accent}"]`),
    `src/styles.css must define dark-mode palette for ${accent}`,
  );
  assert.ok(
    css.includes(`.dark-blue[data-accent="${accent}"]`),
    `src/styles.css must define midnight-mode palette for ${accent}`,
  );
  assert.ok(
    css.includes(`:root[data-accent="${accent}"] [data-testid="app-root-container"]`),
    `src/styles.css must apply observable background gradient to app-root-container for ${accent}`,
  );
}
assert.ok(
  css.includes("--accent-bg-opacity-alpha"),
  "src/styles.css must use --accent-bg-opacity-alpha for observable background tint opacity",
);

const selectorSrc = fs.readFileSync(
  path.resolve("src/components/AccentPaletteSelector.tsx"),
  "utf8",
);
assert.ok(
  selectorSrc.includes('data-testid="accent-bg-opacity-slider"'),
  "AccentPaletteSelector must render accent-bg-opacity-slider",
);

const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
assert.ok(
  indexSrc.includes("<AccentPaletteSelector"),
  "src/routes/index.tsx must render AccentPaletteSelector next to theme selector",
);
assert.ok(
  indexSrc.includes("applyAccentBgOpacity"),
  "src/routes/index.tsx must apply accent background opacity",
);

console.log("PASS: Task 437 & 438 colorful accent palettes and background opacity verified.");
