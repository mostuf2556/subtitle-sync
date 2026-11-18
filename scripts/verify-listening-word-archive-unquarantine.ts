import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  archiveListeningWord,
  clearArchivedListeningWords,
  extractListeningWords,
  filterArchivedListeningWords,
  filterArchivedWordStrings,
  unquarantineListeningWord,
} from "../src/utils/listeningGame";

function runUnitChecks() {
  console.log("1. Verifying unit logic for listening word archive & unquarantine...");
  const rows = [
    {
      texts: {
        en: "Immersion builds fluent listening skills daily.",
        es: "La inmersión desarrolla habilidades auditivas fluidas.",
      },
    },
  ];
  const words = extractListeningWords(rows, {
    baseLanguage: "en",
    targetLanguage: "es",
    minLetters: 5,
  });
  assert.ok(words.length >= 4, `Expected >= 4 words, got ${words.length}`);

  let archived = archiveListeningWord([], "Immersion");
  archived = archiveListeningWord(archived, "builds");
  archived = archiveListeningWord(archived, "IMMERSION"); // duplicate normalized key ignored
  assert.equal(archived.length, 2, "Should store unique normalized archived words");

  const filtered = filterArchivedListeningWords(words, archived);
  assert.ok(
    !filtered.some((w) => w.normalized === "immersion" || w.normalized === "builds"),
    "Archived words must be filtered out from Listening Game word items",
  );
  assert.equal(filtered.length, words.length - 2);

  const filteredStrings = filterArchivedWordStrings(
    ["Immersion", "fluent", "builds", "daily"],
    archived,
  );
  assert.deepEqual(filteredStrings, ["fluent", "daily"]);

  archived = unquarantineListeningWord(archived, "immersion");
  assert.equal(archived.length, 1);
  const afterUnquarantine = filterArchivedListeningWords(words, archived);
  assert.ok(
    afterUnquarantine.some((w) => w.normalized === "immersion"),
    "Unquarantined word must return to word items",
  );

  archived = clearArchivedListeningWords();
  assert.equal(archived.length, 0);
  assert.equal(filterArchivedListeningWords(words, archived).length, words.length);
  console.log("   ✔ Unit checks PASSED.");
}

async function swipeElementHorizontally(
  page: import("playwright").Page,
  selector: string,
  deltaX: number,
) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  assert.ok(box, `Expected bounding box for ${selector}`);
  const startX = box.x + box.width * 0.45;
  const startY = box.y + box.height * 0.5;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (deltaX * i) / steps, startY);
  }
  await page.mouse.up();
}

async function runChromiumE2E() {
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
  let serverUp = false;
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2500) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
  assert.ok(serverUp, `Dev server must be reachable at ${baseUrl}`);

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

    const enterListeningGame = async () => {
      const stageLearningBtn = page.getByTestId("stage-step-learning");
      if ((await stageLearningBtn.count()) > 0) {
        await stageLearningBtn.click();
      }
      await page.waitForSelector("#word-balloon-learning-view", { timeout: 15000 });
      const quickStartBtn = page.getByTestId("wizard-quick-start-btn");
      const loadFixtureBtn = page.getByTestId("game-load-sample-fixture-btn");
      await quickStartBtn.or(loadFixtureBtn).first().waitFor({ state: "visible", timeout: 15000 });
      if (!(await quickStartBtn.isVisible().catch(() => false))) {
        await loadFixtureBtn.click({ timeout: 5000 }).catch(() => {});
      }
      await quickStartBtn.waitFor({ state: "visible", timeout: 15000 });
      await quickStartBtn.click();
      await page.getByTestId("listening-word-item-0").waitFor({ state: "visible", timeout: 15000 });
    };

    await enterListeningGame();

    const initialCountText = await page.getByTestId("listening-words-count").textContent();
    const initialCount = Number(initialCountText?.trim() || "0");
    assert.ok(initialCount >= 5, `Expected >= 5 listening words initially, got ${initialCount}`);

    // 2a. Click Archive button on first word
    const word0 = await page.getByTestId("listening-word-item-0").getAttribute("data-word-item");
    assert.ok(word0, "Expected data-word-item on first card");
    await page.getByTestId("listening-archive-word-0").click();

    await page.waitForFunction(
      (expectedCount) => {
        const el = document.querySelector('[data-testid="listening-words-count"]');
        return Number(el?.textContent?.trim() || "0") === expectedCount;
      },
      initialCount - 1,
      { timeout: 5000 },
    );

    // 2b. Swipe RIGHT on next first word
    const word1 = await page.getByTestId("listening-word-item-0").getAttribute("data-word-item");
    assert.ok(word1 && word1 !== word0, "Expected next word at index 0 after archiving first");
    await swipeElementHorizontally(page, '[data-testid="listening-word-item-0"]', 110);

    await page.waitForFunction(
      (expectedCount) => {
        const el = document.querySelector('[data-testid="listening-words-count"]');
        return Number(el?.textContent?.trim() || "0") === expectedCount;
      },
      initialCount - 2,
      { timeout: 5000 },
    );

    // 2c. Swipe LEFT on next first word
    const word2 = await page.getByTestId("listening-word-item-0").getAttribute("data-word-item");
    assert.ok(word2 && word2 !== word1, "Expected next word at index 0 after swipe right");
    await swipeElementHorizontally(page, '[data-testid="listening-word-item-0"]', -110);

    await page.waitForFunction(
      (expectedCount) => {
        const el = document.querySelector('[data-testid="listening-words-count"]');
        return Number(el?.textContent?.trim() || "0") === expectedCount;
      },
      initialCount - 3,
      { timeout: 5000 },
    );

    const toggleBadgeText = await page.getByTestId("listening-archived-toggle-btn").textContent();
    assert.ok(
      toggleBadgeText?.includes("Archived (3)"),
      `Expected Archived (3) badge, got "${toggleBadgeText}"`,
    );

    // 3. Reload & re-enter Listening Game ("next game"): archived words must stay filtered out
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
    await enterListeningGame();

    const countAfterReload = Number(
      (await page.getByTestId("listening-words-count").textContent())?.trim() || "0",
    );
    assert.equal(
      countAfterReload,
      initialCount - 3,
      "Archived words must remain filtered out on next game after reload",
    );

    const remainingWords = await page
      .locator('[data-testid^="listening-word-item-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-word-item")));
    for (const archivedWord of [word0, word1, word2]) {
      assert.ok(
        !remainingWords.includes(archivedWord),
        `Archived word "${archivedWord}" must NOT appear in next game`,
      );
    }

    // 4. Open archived drawer & Unquarantine one word, then Unquarantine All
    await page.getByTestId("listening-archived-toggle-btn").click();
    await page
      .getByTestId("listening-archived-words-panel")
      .waitFor({ state: "visible", timeout: 5000 });

    const norm0 = word0.trim().toLowerCase();
    await page.getByTestId(`listening-unquarantine-word-${norm0}`).click();

    await page.waitForFunction(
      (expectedCount) => {
        const el = document.querySelector('[data-testid="listening-words-count"]');
        return Number(el?.textContent?.trim() || "0") === expectedCount;
      },
      initialCount - 2,
      { timeout: 5000 },
    );

    await page.getByTestId("listening-unquarantine-all-btn").click();
    await page.waitForFunction(
      (expectedCount) => {
        const el = document.querySelector('[data-testid="listening-words-count"]');
        return Number(el?.textContent?.trim() || "0") === expectedCount;
      },
      initialCount,
      { timeout: 5000 },
    );

    assert.equal(
      await page.getByTestId("listening-archived-toggle-btn").count(),
      0,
      "Archived badge should disappear after unquarantining all words",
    );
    assert.equal(await page.getByTestId("floating-error-button").count(), 0);
    assert.deepEqual(pageErrors, []);
    console.log("   ✔ Chromium E2E click, swipe L/R, next-game persistence & unquarantine PASSED.");
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(
    "=== Verifying Task 430 (Prompt 221 Ch. 1): Listening Word Archive & Unquarantine ===",
  );
  const utilsSrc = fs.readFileSync(path.resolve("src/utils/listeningGame.ts"), "utf-8");
  assert.ok(utilsSrc.includes("filterArchivedListeningWords"));
  runUnitChecks();
  await runChromiumE2E();
  console.log("=== Task 430 Verification PASSED ===");
}

main().catch((err) => {
  console.error("❌ Task 430 verification failed:", err);
  process.exit(1);
});
