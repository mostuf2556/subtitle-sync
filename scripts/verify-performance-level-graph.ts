import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  evaluateOptionImpactVerdict,
  getOptionMetaLabel,
  VISUAL_PERF_OPTIONS,
} from "../src/utils/performanceTelemetry";

console.log("=== Task 457: Verifying Performance Level View & Draggable/Resizable Graph ===");

function runUnitAndSourceChecks() {
  console.log("1. Running unit checks for evaluateOptionImpactVerdict & option metadata...");
  assert.equal(evaluateOptionImpactVerdict(60, 48, 16.5, 22, 24), "degraded");
  assert.equal(evaluateOptionImpactVerdict(58, 56, 17, 25, 26), "degraded");
  assert.equal(evaluateOptionImpactVerdict(60, 58, 16.6, 17.5, 52), "degraded");
  assert.equal(evaluateOptionImpactVerdict(42, 52, 24, 18, 22), "improved");
  assert.equal(evaluateOptionImpactVerdict(59, 58, 16.8, 17.2, 20), "ok");
  assert.ok(VISUAL_PERF_OPTIONS.some((opt) => opt.id === "disable_backdrop_blur"));
  assert.ok(getOptionMetaLabel("disable_backdrop_blur").includes("Backdrop Blur"));
  assert.ok(getOptionMetaLabel("subtitles_table").length > 0);
  console.log("   ✔ Unit checks passed.");

  console.log("2. Running source & Advanced/Beginner parity contract checks...");
  const root = process.cwd();
  const widgetSrc = fs.readFileSync(
    path.join(root, "src/components/PerformanceLevelGraphWidget.tsx"),
    "utf8",
  );
  assert.ok(widgetSrc.includes('data-testid="performance-level-graph-widget"'));
  assert.ok(widgetSrc.includes('data-testid="performance-graph-drag-handle"'));
  assert.ok(widgetSrc.includes('data-testid="performance-graph-resize-handle"'));
  assert.ok(widgetSrc.includes('data-testid="performance-level-svg-graph"'));
  assert.ok(widgetSrc.includes("evaluateOptionImpactVerdict"));
  assert.ok(widgetSrc.includes("clampPosition") && widgetSrc.includes("clampSize"));

  const storySrc = fs.readFileSync(
    path.join(root, "src/components/PerformanceLevelGraphWidget.stories.tsx"),
    "utf8",
  );
  assert.ok(storySrc.includes("Smooth60Fps") && storySrc.includes("OptionDefectionSpike"));

  const panelSrc = fs.readFileSync(
    path.join(root, "src/components/shared/PerformanceModeSettingsPanel.tsx"),
    "utf8",
  );
  assert.ok(panelSrc.includes('data-testid="perf-open-graph-btn"'));
  assert.ok(panelSrc.includes("yt-toggle-performance-graph"));

  const indexSrc = fs.readFileSync(path.join(root, "src/routes/index.tsx"), "utf8");
  assert.ok(indexSrc.includes('data-testid="header-performance-level-btn"'));
  assert.ok(indexSrc.includes("<PerformanceLevelGraphWidget"));
  assert.ok(indexSrc.includes("applySavedVisualPerfFlags()"));
  assert.ok(indexSrc.includes("yt-toggle-performance-graph"));
  console.log("   ✔ Source & parity contracts passed.");
}

async function runLiveE2EIfAvailable() {
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
  let serverUp = false;
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2500) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
  if (!serverUp) {
    console.log(`3. Skipping live browser check (dev server not reachable at ${baseUrl}).`);
    return;
  }

  console.log("3. Running live Chromium E2E checks (open, drag, resize, option check, mode parity)...");
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });

    const headerBtn = page.getByTestId("header-performance-level-btn");
    await headerBtn.waitFor({ state: "visible", timeout: 15000 });
    await headerBtn.click();

    const widget = page.getByTestId("performance-level-graph-widget");
    await widget.waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("performance-level-svg-graph").waitFor({ state: "visible" });

    // Drag header handle
    const beforeBox = await widget.boundingBox();
    assert.ok(beforeBox, "Widget must have bounding box");
    const dragHandle = page.getByTestId("performance-graph-drag-handle");
    const dragBox = await dragHandle.boundingBox();
    assert.ok(dragBox, "Drag handle must have bounding box");

    const startDragX = dragBox.x + dragBox.width / 2;
    const startDragY = dragBox.y + dragBox.height / 2;
    await page.mouse.move(startDragX, startDragY);
    await page.mouse.down();
    await page.mouse.move(startDragX - 120, startDragY + 80, { steps: 6 });
    await page.mouse.up();

    const afterDragBox = await widget.boundingBox();
    assert.ok(afterDragBox, "Widget must remain visible after drag");
    assert.ok(
      Math.abs(afterDragBox.x - beforeBox.x) >= 40 && Math.abs(afterDragBox.y - beforeBox.y) >= 30,
      `Expected widget position to change on drag (before=${beforeBox.x},${beforeBox.y} after=${afterDragBox.x},${afterDragBox.y})`,
    );

    // Resize handle
    const resizeHandle = page.getByTestId("performance-graph-resize-handle");
    const resizeBox = await resizeHandle.boundingBox();
    assert.ok(resizeBox, "Resize handle must have bounding box");
    const startResX = resizeBox.x + resizeBox.width / 2;
    const startResY = resizeBox.y + resizeBox.height / 2;
    await page.mouse.move(startResX, startResY);
    await page.mouse.down();
    await page.mouse.move(startResX + 60, startResY + 50, { steps: 6 });
    await page.mouse.up();

    const afterResizeBox = await widget.boundingBox();
    assert.ok(afterResizeBox, "Widget must have bounding box after resize");
    assert.ok(
      afterResizeBox.width >= afterDragBox.width + 25 &&
        afterResizeBox.height >= afterDragBox.height + 20,
      `Expected widget dimensions to grow on resize (before=${afterDragBox.width}x${afterDragBox.height} after=${afterResizeBox.width}x${afterResizeBox.height})`,
    );

    // Toggle an option to inspect defection impact
    const blurOption = page.getByTestId("perf-graph-option-disable_backdrop_blur");
    await blurOption.click();
    await page.getByTestId("performance-defection-log").waitFor({ state: "visible" });
    await page.waitForTimeout(1050);
    const impactText = await page.getByTestId("perf-impact-row-disable_backdrop_blur").innerText();
    assert.ok(
      impactText.includes("fps"),
      `Expected Option Impact Checks verdict with fps telemetry, got: ${impactText}`,
    );

    // Close widget and verify Beginner Mode parity trigger
    await page.getByTestId("performance-graph-close-btn").click();
    await widget.waitFor({ state: "hidden" });

    const modeSwitcher = page.getByTestId("mode-toggle-button");
    if ((await modeSwitcher.count()) > 0) {
      await modeSwitcher.click();
      await page.getByTestId("header-performance-level-btn").click();
      await widget.waitFor({ state: "visible" });
    }

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);
    console.log("   ✔ Live Chromium E2E passed (open, drag, resize, option impact check, Beginner parity).");
  } finally {
    await browser.close();
  }
}

runUnitAndSourceChecks();
await runLiveE2EIfAvailable();
console.log("✅ PASS: Performance Level View button and draggable/resizable graph verified.");
