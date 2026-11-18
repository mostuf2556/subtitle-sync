import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

console.log("=========================================================================");
console.log("🧪 Verifying Task 414 (Prompt 204 Ch. 1): Learning Goals No Unintended Auto-Scroll");
console.log("=========================================================================");

const root = process.cwd();

// --- Step 1: Source Contracts ---
const indexSource = fs.readFileSync(path.join(root, "src/routes/index.tsx"), "utf8");
const langBoxesSource = fs.readFileSync(
  path.join(root, "src/components/LanguageBoxesSelector.tsx"),
  "utf8",
);
const fetchedPanelSource = fs.readFileSync(
  path.join(root, "src/components/FetchedSubtitlesStagePanel.tsx"),
  "utf8",
);
const filtersPanelSource = fs.readFileSync(
  path.join(root, "src/components/shared/LearningGoalsFiltersPanel.tsx"),
  "utf8",
);
const beginnerPrefsSource = fs.readFileSync(
  path.join(root, "src/components/beginner/tabs/BeginnerPreferencesTab.tsx"),
  "utf8",
);

assert.ok(
  indexSource.includes('autoTimeout={panelId === "library" ? videoLibraryTimeoutEnabled : false}'),
  "Stage 1 (languages) accordion must NOT have autoTimeout enabled",
);
assert.ok(
  !indexSource.includes('panelId === "languages" ? true'),
  "Legacy languages autoTimeout={true} must be removed from src/routes/index.tsx",
);
assert.ok(
  langBoxesSource.includes("pendingGridScrollTopRef") &&
    langBoxesSource.includes("pendingWindowScrollRef") &&
    langBoxesSource.includes("useLayoutEffect") &&
    langBoxesSource.includes("[overflow-anchor:none]"),
  "LanguageBoxesSelector must preserve container + window scroll across selection reorders",
);
assert.ok(
  langBoxesSource.includes("key={`${lang.code}-${idx}`}"),
  "LanguageBoxesSelector must preserve unique language key pattern",
);
assert.ok(
  !fetchedPanelSource.includes(".scrollIntoView(") &&
    fetchedPanelSource.includes("terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight"),
  "FetchedSubtitlesStagePanel must use container-local scrollTop instead of scrollIntoView",
);
assert.ok(
  filtersPanelSource.includes("[overflow-anchor:none]") &&
    beginnerPrefsSource.includes("[overflow-anchor:none]"),
  "LearningGoalsFiltersPanel and BeginnerPreferencesTab must include [overflow-anchor:none]",
);

console.log("✅ Step 1 PASS: Source contracts verified.");

// --- Step 2: Live Headless Chromium Checks ---
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const knownHeadlessPath =
  "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
const altHeadlessPath = "/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell";
const executablePath = fs.existsSync(knownHeadlessPath)
  ? knownHeadlessPath
  : fs.existsSync(altHeadlessPath)
    ? altHeadlessPath
    : undefined;

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  // 2A. Advanced Stage 1 (Learning Goals): no 10s collapse snap & no scroll jumps on control clicks
  await page.goto(`${baseUrl}/robots.txt`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("app_workflow_mode", "expert");
  });

  await page.goto(`${baseUrl}/?mode=expert&stage=1`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("stage-2-learning-goals-card").waitFor({ state: "visible", timeout: 25000 });

  assert.equal(
    await page.getByTestId("accordion-timeout-container-languages").count(),
    0,
    "Stage 1 (languages) must NOT render an auto-collapse countdown hourglass",
  );

  // Scroll window down and wait 10.6s (past legacy 10s autoTimeout) to verify zero snap-to-top
  const maxScrollAdv = await page.evaluate(() => {
    const docMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(350, docMax);
    window.scrollTo(0, target);
    return window.scrollY;
  });

  await page.waitForTimeout(10600);
  const afterTimeoutScrollY = await page.evaluate(() => window.scrollY);
  assert.ok(
    await page.getByTestId("stage-2-learning-goals-card").isVisible(),
    "Stage 1 Learning Goals must remain open after 10.6s idle",
  );
  assert.ok(
    Math.abs(afterTimeoutScrollY - maxScrollAdv) <= 2,
    `Stage 1 idle must not snap window scroll (before=${maxScrollAdv}, after=${afterTimeoutScrollY})`,
  );

  // Unfold Learning Goals accordions needed for control interaction
  const rowCriteriaAcc = page.getByTestId("learning-goal-accordion-row-criteria");
  if ((await rowCriteriaAcc.count()) > 0) {
    const isOpen = await rowCriteriaAcc.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!isOpen) {
      await page.getByTestId("learning-goal-summary-row-criteria").click();
    }
  }
  const approvedLangsAcc = page.getByTestId("learning-goal-accordion-approved-languages");
  if ((await approvedLangsAcc.count()) > 0) {
    const isOpen = await approvedLangsAcc.evaluate((el) => (el as HTMLDetailsElement).open);
    if (!isOpen) {
      await page.getByTestId("learning-goal-summary-approved-languages").click();
    }
  }

  // Interact with Learning Goals filter & language controls without resetting window.scrollY
  const beforeFilterClickY = await page.evaluate(() => {
    const docMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(280, docMax);
    window.scrollTo(0, target);
    return window.scrollY;
  });

  await page.getByTestId("learning-goals-increment-btn").evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(150);
  await page.getByTestId("learning-goals-decrement-btn").evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(150);

  const stage2LangBtns = page.locator('[data-testid^="stage-2-learning-lang-"]');
  if ((await stage2LangBtns.count()) > 0) {
    await stage2LangBtns.first().evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(150);
  }

  const afterFilterClickY = await page.evaluate(() => window.scrollY);
  assert.ok(
    Math.abs(afterFilterClickY - beforeFilterClickY) <= 5,
    `Interacting with Advanced Stage 1 Learning Goals controls must not auto-scroll window (before=${beforeFilterClickY}, after=${afterFilterClickY})`,
  );

  console.log("✅ Step 2A PASS: Advanced Stage 1 stays open & preserves scroll position.");

  // 2B. Beginner Preferences tab: clicking Learning Goals filters preserves window.scrollY
  await page.goto(`${baseUrl}/?mode=beginner`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("beginner-preferences-tab").waitFor({ state: "visible", timeout: 25000 });
  const beginnerRowCriteriaAcc = page.getByTestId("learning-goal-accordion-beginner-row-criteria");
  await beginnerRowCriteriaAcc.waitFor({ state: "visible", timeout: 15000 });
  const beginnerAccOpen = await beginnerRowCriteriaAcc.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!beginnerAccOpen) {
    await page.getByTestId("learning-goal-summary-beginner-row-criteria").click();
  }
  const beginnerFiltersContainer = page.getByTestId("beginner-learning-goals-filters-container");
  await beginnerFiltersContainer
    .getByTestId("learning-goals-filters-panel")
    .waitFor({ state: "visible", timeout: 15000 });

  const prefBeforeY = await page.evaluate(() => {
    const docMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(320, docMax);
    window.scrollTo(0, target);
    return window.scrollY;
  });

  await beginnerFiltersContainer
    .getByTestId("learning-goals-increment-btn")
    .evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(150);
  await beginnerFiltersContainer
    .getByTestId("learning-goals-decrement-btn")
    .evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(150);

  const prefAfterY = await page.evaluate(() => window.scrollY);
  assert.ok(
    Math.abs(prefAfterY - prefBeforeY) <= 5,
    `Beginner Preferences filter clicks must not auto-scroll window (before=${prefBeforeY}, after=${prefAfterY})`,
  );

  console.log("✅ Step 2B PASS: Beginner Preferences Learning Goals preserves window scroll.");

  // 2C. Beginner Video tab #language-boxes-grid: selecting an unselected language preserves both grid.scrollTop and window.scrollY
  await page.getByTestId("beginner-tab-video").click();
  await page.getByTestId("language-boxes-grid").waitFor({ state: "visible", timeout: 15000 });

  const showAllBtn = page.getByTestId("toggle-show-all-languages");
  if ((await showAllBtn.count()) > 0 && (await showAllBtn.isVisible())) {
    const label = ((await showAllBtn.textContent()) || "").trim();
    if (label.startsWith("All")) {
      await showAllBtn.click();
      await page.waitForTimeout(200);
    }
  }

  const scrollSetup = await page.evaluate(() => {
    const grid = document.getElementById("language-boxes-grid");
    if (!grid) return { found: false, gridTop: 0, winY: 0 };
    grid.scrollTop = 200;
    const docMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetWinY = Math.min(250, docMax);
    window.scrollTo(0, targetWinY);
    return {
      found: true,
      gridTop: grid.scrollTop,
      winY: window.scrollY,
    };
  });
  assert.ok(scrollSetup.found, "#language-boxes-grid must exist in DOM");
  assert.ok(scrollSetup.gridTop >= 150, `Expected grid scrolled down, got scrollTop=${scrollSetup.gridTop}`);

  const nlBox = page.getByTestId("language-box-nl");
  const targetBox =
    (await nlBox.count()) > 0
      ? nlBox
      : page.locator('[data-testid^="language-box-"][data-selected="false"]').first();
  await targetBox.evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(200);

  const afterBoxClick = await page.evaluate(() => {
    const grid = document.getElementById("language-boxes-grid");
    return {
      gridTop: grid ? grid.scrollTop : -1,
      winY: window.scrollY,
    };
  });

  assert.ok(
    Math.abs(afterBoxClick.gridTop - scrollSetup.gridTop) <= 2,
    `Selecting a language box must NOT snap #language-boxes-grid scrollTop (before=${scrollSetup.gridTop}, after=${afterBoxClick.gridTop})`,
  );
  assert.ok(
    Math.abs(afterBoxClick.winY - scrollSetup.winY) <= 2,
    `Selecting a language box must NOT auto-scroll window (before=${scrollSetup.winY}, after=${afterBoxClick.winY})`,
  );

  assert.equal(pageErrors.length, 0, `Expected 0 pageerrors, got: ${pageErrors.join("; ")}`);
  console.log("✅ Step 2C PASS: #language-boxes-grid & window scroll preserved on language selection.");
} finally {
  await browser.close();
}

console.log("=========================================================================");
console.log("🎉 ALL TASK 414 LEARNING GOALS NO-AUTOSCROLL CHECKS PASSED!");
console.log("=========================================================================");
