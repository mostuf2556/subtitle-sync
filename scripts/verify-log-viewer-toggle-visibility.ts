import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

function runContractChecks() {
  console.log("1. Verifying source contracts for BottomLogViewer visibility on toggle...");
  const viewerSrc = fs.readFileSync(
    path.resolve("src/components/BottomLogViewer.tsx"),
    "utf-8",
  );
  const routesSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf-8");

  assert.ok(
    viewerSrc.includes("dockToViewport") &&
      viewerSrc.includes("fixed bottom-0 left-0 right-0 z-40"),
    "BottomLogViewer must support fixed viewport bottom docking",
  );
  assert.ok(
    viewerSrc.includes("if (isVisible && !prevVisibleRef.current)") &&
      viewerSrc.includes("setIsExpanded(true)"),
    "BottomLogViewer must auto-expand when toggled visible",
  );
  assert.ok(
    routesSrc.includes("dockToViewport={true}") &&
      routesSrc.includes('data-testid="bottom-log-viewer-container"'),
    "src/routes/index.tsx must enable dockToViewport={true} on BottomLogViewer",
  );
  console.log("   PASS: Source contracts verified.");
}

async function runLiveE2EChecks() {
  console.log("2. Running live Chromium E2E checks across Expert, Beginner, and Android...");
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const scenarios = [
      { label: "expert-desktop", url: `${APP_URL}/`, viewport: { width: 1280, height: 720 } },
      {
        label: "beginner-desktop",
        url: `${APP_URL}/?mode=beginner`,
        viewport: { width: 1280, height: 720 },
      },
      {
        label: "android-mobile",
        url: `${APP_URL}/?android=true`,
        viewport: { width: 390, height: 844 },
      },
    ] as const;

    for (const s of scenarios) {
      const context = await browser.newContext({ viewport: s.viewport });
      const page = await context.newPage();

      await page.route("**/*", (route) => {
        const u = route.request().url();
        if (u.startsWith(APP_URL) || u.startsWith("data:") || u.startsWith("blob:")) {
          return route.continue();
        }
        return route.abort();
      });

      await page.goto(s.url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#header-toggle-log-button", { timeout: 25000 });
      await page.waitForTimeout(400);

      // Initially hidden on cold load
      assert.equal(
        await page.locator("#bottom-log-viewer").isVisible(),
        false,
        `${s.label}: #bottom-log-viewer should be hidden before clicking Log View`,
      );

      // Click Log View toggle button
      await page.locator("#header-toggle-log-button").click();
      await page.waitForTimeout(250);

      assert.equal(
        await page.locator("#bottom-log-viewer").isVisible(),
        true,
        `${s.label}: #bottom-log-viewer must become visible after clicking Log View`,
      );
      assert.equal(
        await page.locator("#bottom-log-content").isVisible(),
        true,
        `${s.label}: #bottom-log-content must auto-expand and be visible`,
      );

      const layout = await page.evaluate(() => {
        const viewer = document.getElementById("bottom-log-viewer");
        const content = document.getElementById("bottom-log-content");
        const vr = viewer?.getBoundingClientRect();
        const cr = content?.getBoundingClientRect();
        return {
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
          viewerTop: vr?.top ?? -1,
          viewerBottom: vr?.bottom ?? -1,
          viewerHeight: vr?.height ?? 0,
          contentHeight: cr?.height ?? 0,
        };
      });

      assert.ok(
        layout.viewerTop >= 0 &&
          layout.viewerBottom <= layout.innerHeight + 2 &&
          layout.viewerHeight > 80 &&
          layout.contentHeight > 30,
        `${s.label}: log viewer must be visibly docked within viewport (got ${JSON.stringify(layout)})`,
      );

      // Close via close button inside viewer
      await page.locator('[data-testid="bottom-log-close-btn"]').click();
      await page.waitForTimeout(200);
      assert.equal(
        await page.locator("#bottom-log-viewer").isVisible(),
        false,
        `${s.label}: #bottom-log-viewer should hide after clicking close button`,
      );

      // Toggle back on via header button and off again via header button
      await page.locator("#header-toggle-log-button").click();
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#bottom-log-viewer").isVisible(), true);
      await page.locator("#header-toggle-log-button").click();
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#bottom-log-viewer").isVisible(), false);

      console.log(`   PASS: ${s.label} log viewer toggle & viewport visibility verified.`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  runContractChecks();
  await runLiveE2EChecks();
  console.log("ALL LOG VIEWER TOGGLE VISIBILITY CHECKS PASSED.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
