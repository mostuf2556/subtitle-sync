import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

async function run() {
  console.log("=========================================================================");
  console.log("🧪 Verifying Task 431: OpenRouter Option in Listening Game Words Section");
  console.log("=========================================================================");

  const root = process.cwd();
  const panelSrc = fs.readFileSync(
    path.join(root, "src/components/ListeningGamePanel.tsx"),
    "utf8",
  );
  const learningViewSrc = fs.readFileSync(
    path.join(root, "src/components/WordBalloonLearningView.tsx"),
    "utf8",
  );
  const storySrc = fs.readFileSync(
    path.join(root, "src/components/ListeningGamePanel.stories.tsx"),
    "utf8",
  );

  // 1. Source & Storybook contracts
  assert.ok(
    !panelSrc.includes("truncate") && !panelSrc.includes("line-clamp-"),
    "ListeningGamePanel must preserve zero truncation rule",
  );
  assert.ok(
    panelSrc.includes('data-testid="listening-words-openrouter-section"') &&
      panelSrc.includes('data-testid="listening-words-openrouter-btn"') &&
      panelSrc.includes("onCreateSentencesWithOpenRouter"),
    "ListeningGamePanel must render OpenRouter option inside listening-words-section",
  );
  assert.ok(
    learningViewSrc.includes(
      "onCreateSentencesWithOpenRouter={handleCreateSentencesWithOpenRouterFromWords}",
    ) && learningViewSrc.includes("targetWords={effectiveAiTargetWords}"),
    "WordBalloonLearningView must wire Listening Words OpenRouter action to OpenRouterSentenceGamePanel",
  );
  assert.ok(
    storySrc.includes("onCreateSentencesWithOpenRouter"),
    "ListeningGamePanel.stories.tsx must showcase OpenRouter option callback",
  );
  console.log("✅ PASS: Source & Storybook contracts verified.");

  // 2. Live Chromium E2E across Advanced & Beginner modes
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  async function enterListeningGameInActiveView(isBeginner: boolean) {
    if (isBeginner) {
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=beginner`, {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      });
      await page.getByTestId("beginner-tab-video").waitFor({ state: "visible", timeout: 15000 });
      await page.getByTestId("beginner-tab-video").click();
      const begToggle = page
        .getByTestId("beginner-flow-container")
        .getByTestId("toggle-word-balloon-learning-btn");
      await begToggle.waitFor({ state: "visible", timeout: 15000 });
      await begToggle.click();
    } else {
      const stageLearningBtn = page.getByTestId("stage-step-learning");
      if ((await stageLearningBtn.count()) > 0) {
        await stageLearningBtn.click();
      }
    }

    const scope = isBeginner ? page.getByTestId("beginner-flow-container") : page;
    await scope
      .locator("#word-balloon-learning-view")
      .waitFor({ state: "visible", timeout: 15000 });
    const quickStartBtn = scope.getByTestId("wizard-quick-start-btn");
    const loadFixtureBtn = scope.getByTestId("game-load-sample-fixture-btn");
    const backToMenuBtn = scope.getByTestId("game-back-to-menu-btn");

    await quickStartBtn
      .or(loadFixtureBtn)
      .or(backToMenuBtn)
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    if (await loadFixtureBtn.isVisible().catch(() => false)) {
      await loadFixtureBtn.click({ timeout: 5000 }).catch(() => {});
    }
    if (await backToMenuBtn.isVisible().catch(() => false)) {
      await backToMenuBtn.click();
    }
    await scope
      .getByTestId("wizard-card-listening-game")
      .waitFor({ state: "visible", timeout: 10000 });
    await scope.getByTestId("wizard-card-listening-game").click();
    await scope
      .getByTestId("listening-words-section")
      .waitFor({ state: "visible", timeout: 10000 });
  }

  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });

    // --- Advanced Mode ---
    await enterListeningGameInActiveView(false);
    const wordsSection = page.getByTestId("listening-words-section");
    const openRouterInWords = wordsSection.getByTestId("listening-words-openrouter-section");
    const openRouterBtn = wordsSection.getByTestId("listening-words-openrouter-btn");
    await openRouterInWords.waitFor({ state: "visible", timeout: 5000 });
    await openRouterBtn.waitFor({ state: "visible", timeout: 5000 });

    const firstListeningWord = (
      (await wordsSection.getByTestId("listening-word-item-0").getAttribute("data-word-item")) || ""
    ).trim();
    assert.ok(firstListeningWord.length > 0, "First word in Listening Words section must exist");

    await openRouterBtn.click();
    await page
      .getByTestId("openrouter-sentence-game-panel")
      .waitFor({ state: "visible", timeout: 8000 });
    const aiWordsText = await page.getByTestId("ai-game-target-words-list").innerText();
    assert.ok(
      aiWordsText.toLowerCase().includes(firstListeningWord.toLowerCase()),
      `Expected OpenRouter target words list to contain "${firstListeningWord}", got: ${aiWordsText}`,
    );
    console.log(
      `✅ PASS: Advanced Mode Listening Words OpenRouter option launched OpenRouter panel with "${firstListeningWord}".`,
    );

    // --- Beginner Mode parity ---
    await enterListeningGameInActiveView(true);
    const begScope = page.getByTestId("beginner-flow-container");
    const begWordsSection = begScope.getByTestId("listening-words-section");
    const begOpenRouterBtn = begWordsSection.getByTestId("listening-words-openrouter-btn");
    await begOpenRouterBtn.waitFor({ state: "visible", timeout: 5000 });
    await begOpenRouterBtn.click();
    await begScope
      .getByTestId("openrouter-sentence-game-panel")
      .waitFor({ state: "visible", timeout: 8000 });
    const begAiWordsText = await begScope.getByTestId("ai-game-target-words-list").innerText();
    assert.ok(
      begAiWordsText.toLowerCase().includes(firstListeningWord.toLowerCase()),
      `Expected Beginner Mode OpenRouter target words list to contain "${firstListeningWord}", got: ${begAiWordsText}`,
    );
    console.log("✅ PASS: Beginner Mode Listening Words OpenRouter option verified.");

    assert.strictEqual(
      consoleErrors.length,
      0,
      `Unexpected page errors: ${consoleErrors.join("; ")}`,
    );
  } finally {
    await browser.close();
  }

  console.log("=========================================================================");
  console.log("🎉 Task 431 OpenRouter Option in Words Section Verification PASSED!");
  console.log("=========================================================================");
}

run().catch((err) => {
  console.error("❌ FAIL:", err);
  process.exit(1);
});
