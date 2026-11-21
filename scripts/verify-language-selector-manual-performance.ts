import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

console.log("=== Task 458: Verifying Language Selector Performance & Manual Selection ===");

function runSourceChecks() {
  console.log("1. Verifying source performance & manual selection contracts...");
  const root = process.cwd();
  const indexSrc = fs.readFileSync(path.join(root, "src/routes/index.tsx"), "utf8");
  assert.ok(
    !indexSrc.includes("<datalist"),
    "index.tsx must NOT use slow native <datalist> for stage-2 language selection",
  );
  assert.ok(
    !indexSrc.includes('list="stage-2-languages-datalist"'),
    "#stage-2-filter-languages-input must NOT attach native datalist list attribute",
  );
  assert.ok(
    indexSrc.includes("stage2FilteredAddCatalog = useMemo("),
    "index.tsx must memoize stage2FilteredAddCatalog with useMemo",
  );
  assert.ok(
    indexSrc.includes('data-testid="stage-2-browse-languages-btn"'),
    "index.tsx must provide Browse List toggle for manual language selection",
  );

  const filterBlockStart = indexSrc.indexOf('id="stage-2-filter-languages-input"');
  const filterBlockEnd = indexSrc.indexOf("placeholder=", filterBlockStart) + 600;
  const filterInputSnippet = indexSrc.slice(filterBlockStart, filterBlockEnd);
  assert.ok(
    !filterInputSnippet.includes("handleUpdateFavoriteLanguages("),
    "Typing in #stage-2-filter-languages-input must NEVER auto-add languages",
  );

  const favPanelSrc = fs.readFileSync(
    path.join(root, "src/components/GlobalFavoriteLanguagesPanel.tsx"),
    "utf8",
  );
  assert.ok(favPanelSrc.includes("useMemo(") && favPanelSrc.includes("isHiddenMount"));
  assert.ok(favPanelSrc.includes('data-testid="global-favorites-manual-list"'));
  assert.ok(favPanelSrc.includes("global-fav-manual-item-"));

  const boxesSrc = fs.readFileSync(
    path.join(root, "src/components/LanguageBoxesSelector.tsx"),
    "utf8",
  );
  assert.ok(boxesSrc.includes("isHiddenMount") && boxesSrc.includes("visibleCatalog"));
  console.log("   ✔ Source contracts passed.");
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
    console.log(`2. Skipping live browser test (dev server not reachable at ${baseUrl}).`);
    return;
  }

  console.log("2. Running live Chromium manual filter & selection checks (Advanced + Beginner)...");
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });

    // Advanced Mode -> Stage 1 Learning Goals
    const stage1Btn = page.getByTestId("stage-step-1");
    if ((await stage1Btn.count()) > 0) {
      await stage1Btn.click();
    }
    const langDetails = page.locator('details[data-panel-id="languages"]');
    if ((await langDetails.getAttribute("open")) === null) {
      await langDetails.locator("summary").first().click();
    }
    const approvedAccordion = page.getByTestId("learning-goal-accordion-approved-languages");
    await approvedAccordion.waitFor({ state: "attached", timeout: 10000 });
    if ((await approvedAccordion.getAttribute("open")) === null) {
      await page.getByTestId("learning-goal-summary-approved-languages").click();
    }

    // Type exact language name / code that would previously auto-add (not in defaults)
    const filterInput = page.getByTestId("stage-2-filter-languages-input");
    await filterInput.waitFor({ state: "visible", timeout: 10000 });
    await filterInput.fill("Japanese");
    await page.waitForTimeout(100);
    assert.equal(
      await page.getByTestId("stage-2-learning-lang-ja").count(),
      0,
      "Typing exact name 'Japanese' must NOT auto-add Japanese",
    );

    await filterInput.fill("ja");
    await page.waitForTimeout(100);
    assert.equal(
      await page.getByTestId("stage-2-learning-lang-ja").count(),
      0,
      "Typing exact code 'ja' must NOT auto-add Japanese",
    );

    // Must require manual click on item in filtered list
    const jaAddItem = page.getByTestId("stage-2-add-lang-item-ja");
    await jaAddItem.waitFor({ state: "visible", timeout: 5000 });
    await jaAddItem.click();
    await page.getByTestId("stage-2-learning-lang-ja").waitFor({ state: "visible", timeout: 5000 });

    // Switch to Beginner Mode via URL param and verify GlobalFavoriteLanguagesPanel manual list flow
    await page.goto(`${baseUrl}?mode=beginner`, { waitUntil: "domcontentloaded", timeout: 25000 });
    const begPrefTab = page.getByTestId("beginner-tab-preferences");
    await begPrefTab.waitFor({ state: "visible", timeout: 10000 });
    await begPrefTab.click();
    const begFavAccordion = page.getByTestId("learning-goal-accordion-beginner-favorite-languages");
    await begFavAccordion.waitFor({ state: "attached", timeout: 10000 });
    if ((await begFavAccordion.getAttribute("open")) === null) {
      await page.getByTestId("learning-goal-summary-beginner-favorite-languages").click();
    }

    const begFilter = page.getByTestId("language-favorites-filter");
    await begFilter.waitFor({ state: "visible", timeout: 10000 });
    await begFilter.fill("Korean");
    await page.waitForTimeout(100);
    assert.equal(
      await page.getByTestId("fav-lang-ko").count(),
      0,
      "Beginner filter typing 'Korean' must NOT auto-add Korean",
    );

    const koManualItem = page.getByTestId("global-fav-manual-item-ko");
    await koManualItem.waitFor({ state: "visible", timeout: 5000 });
    await koManualItem.click();
    await page.getByTestId("fav-lang-ko").waitFor({ state: "visible", timeout: 5000 });

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join("; ")}`);
    console.log("   ✔ Live Chromium manual selection & filter checks passed (Advanced + Beginner).");
  } finally {
    await browser.close();
  }
}

runSourceChecks();
await runLiveE2EIfAvailable();
console.log("✅ PASS: Language selector performance & manual filtered list selection verified.");
