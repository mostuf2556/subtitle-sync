import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  executeTtsFallbackSequence,
  getUseAlternativeTts,
  playAlternativeTtsAudio,
  unlockTtsAudioPlayback,
} from "../src/lib/alternative-tts";

async function runUnitAndStaticChecks() {
  console.log("=== Verifying Hotfix (Prompt 195) & Task 404: Game View Words TTS-Play & App Errors ===");

  // 1. Verify playAlternativeTtsAudio returns boolean without throwing/rejecting
  let threw = false;
  let result = true;
  try {
    result = await playAlternativeTtsAudio("Hello", "en", 1.0, undefined, "lovable");
  } catch {
    threw = true;
  }
  assert.equal(threw, false, "playAlternativeTtsAudio must never reject or throw");
  assert.equal(
    result,
    false,
    "playAlternativeTtsAudio must resolve false when audio playback cannot run in Node",
  );

  // 2. Verify unlockTtsAudioPlayback is safe in non-browser SSR/Node runtimes
  unlockTtsAudioPlayback();

  // 3. Verify getUseAlternativeTts default contract remains false
  assert.equal(
    getUseAlternativeTts(),
    false,
    "getUseAlternativeTts() must remain false by default",
  );

  // 4. Verify executeTtsFallbackSequence falls through tts3 -> native when tts3 cannot play
  let nativeCalled = false;
  const outcomeRecovered = await executeTtsFallbackSequence(
    "Hello",
    "en",
    1.0,
    "tts3_native",
    undefined,
    {
      onNativeSpeak: async () => {
        nativeCalled = true;
        return true;
      },
    },
  );
  assert.equal(nativeCalled, true, "Fallback sequence must invoke native step when tts3 returns false");
  assert.equal(outcomeRecovered, "native", "Fallback sequence must return 'native' when native succeeds");

  const outcomeNone = await executeTtsFallbackSequence("Hello", "en", 1.0, "tts3_native", undefined, {
    onNativeSpeak: async () => false,
  });
  assert.equal(outcomeNone, "none", "Fallback sequence must return 'none' when both tts3 and native fail");
  console.log("✔ Runtime TTS fallback contract verified (boolean resolution & fallthrough).");

  // 5. Verify static source guards across index.tsx, alternative-tts.ts, ListeningGamePanel.tsx, FloatingErrorButton.tsx, WordBalloonLearningView.tsx
  const indexSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf-8");
  assert.ok(
    indexSrc.includes('const canFallbackToTts3 = useAltTts || fallbackOrder !== "native_only";'),
    "executeSingleSpeech must enable TTS3 fallback whenever fallbackOrder !== 'native_only'",
  );
  assert.ok(
    indexSrc.includes("if (voices.length === 0 && canFallbackToTts3 && fallbackOrder === \"tts3_native\")"),
    "executeSingleSpeech must skip guaranteed-failing Web Speech when 0 local voices exist under tts3_native",
  );
  assert.ok(
    indexSrc.includes("const recovered = await fallbackToAlternative(") &&
      indexSrc.includes("if (recovered) {\n              return;\n            }"),
    "executeSingleSpeech must run fallbackToAlternative() BEFORE logging 'Native speech synthesis failed'",
  );
  assert.ok(
    indexSrc.includes("unlockTtsAudioPlayback();"),
    "src/routes/index.tsx must invoke unlockTtsAudioPlayback() inside game/learning speech trigger",
  );

  const altTtsSrc = fs.readFileSync(path.resolve("src/lib/alternative-tts.ts"), "utf-8");
  assert.ok(
    altTtsSrc.includes("skipInternalWebSpeechFallback?: boolean;") &&
      altTtsSrc.includes("activeAudioCancel"),
    "alternative-tts.ts must support skipInternalWebSpeechFallback and clean activeAudioCancel cleanup",
  );

  const listeningPanelSrc = fs.readFileSync(
    path.resolve("src/components/ListeningGamePanel.tsx"),
    "utf-8",
  );
  assert.ok(
    (listeningPanelSrc.match(/unlockTtsAudioPlayback\(\);/g) || []).length >= 4,
    "ListeningGamePanel must call unlockTtsAudioPlayback() synchronously in word, sentence, all-words, and all-sentences click handlers",
  );

  const floatingErrorSrc = fs.readFileSync(
    path.resolve("src/components/FloatingErrorButton.tsx"),
    "utf-8",
  );
  assert.ok(
    floatingErrorSrc.includes("positionRef") && floatingErrorSrc.includes("}, []);"),
    "FloatingErrorButton drag window listener effect must use positionRef and an empty dependency array",
  );

  const wordBalloonSrc = fs.readFileSync(
    path.resolve("src/components/WordBalloonLearningView.tsx"),
    "utf-8",
  );
  assert.ok(
    wordBalloonSrc.includes("return shuffleArray(matchPairs);\n  }, [matchPairs]);"),
    "WordBalloonLearningView shuffledTargetPairs must only depend on [matchPairs]",
  );
  console.log("✔ Source-level invariants across all 5 modified modules verified.");
}

async function runBrowserCheckIfServerAvailable() {
  const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
  let serverUp = false;
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2500) });
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    console.log(
      `ℹ Skipping live Chromium check because dev server at ${baseUrl} is not currently reachable.`,
    );
    return;
  }

  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
  } catch (err) {
    console.log("ℹ Skipping live Chromium check (browser launch unavailable):", err);
    return;
  }

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });

    // Open Learning / Game stage in Advanced Mode (matches accordion stepper layout)
    const stageLearningBtn = page.getByTestId("stage-step-learning");
    if ((await stageLearningBtn.count()) > 0) {
      await stageLearningBtn.click();
    } else {
      const gameToggleBtn = page.getByTestId("toggle-word-balloon-learning-btn");
      if ((await gameToggleBtn.count()) === 0) {
        const videoTabBtn = page.getByTestId("beginner-tab-video");
        if ((await videoTabBtn.count()) > 0) {
          await videoTabBtn.click();
        }
      }
      if ((await gameToggleBtn.count()) > 0) {
        await gameToggleBtn.click();
      }
    }
    await page.waitForSelector("#word-balloon-learning-view", { timeout: 15000 });

    const loadFixtureBtn = page.getByTestId("game-load-sample-fixture-btn");
    if ((await loadFixtureBtn.count()) > 0) {
      await loadFixtureBtn.click();
    }

    await page.getByTestId("wizard-quick-start-btn").waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("wizard-quick-start-btn").click();
    await page.getByTestId("listening-words-section").waitFor({ state: "visible", timeout: 10000 });

    const ttsRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("tts3.lovable.app") || url.includes("/api/public/tts")) {
        ttsRequests.push(url);
      }
    });

    const listenAllWordsBtn = page.getByTestId("listening-play-all-words-btn");
    await listenAllWordsBtn.click();
    await page.waitForTimeout(400);

    const activeLabel = (await listenAllWordsBtn.textContent()) || "";
    assert.ok(
      activeLabel.includes("Stop"),
      `Expected Listen All Words button to switch to active Stop (...) state, got '${activeLabel}'`,
    );

    await page.waitForTimeout(2000);

    assert.ok(
      ttsRequests.length >= 1,
      `Expected at least 1 real TTS synthesis request to tts3.lovable.app when Listen All Words is clicked, got ${ttsRequests.length}`,
    );

    const errorBtnCountAfterListenAll = await page.getByTestId("floating-error-button").count();
    assert.equal(
      errorBtnCountAfterListenAll,
      0,
      "Clicking Listen All Words must NOT trigger floating-error-button",
    );

    // Stop sequential words playback cleanly
    if (((await listenAllWordsBtn.textContent()) || "").includes("Stop")) {
      await listenAllWordsBtn.click();
      await page.waitForTimeout(250);
    }

    // Test single word Listen button and Listen All Sentences
    const firstWordBtn = page.getByTestId("listening-play-word-0");
    if ((await firstWordBtn.count()) > 0) {
      await firstWordBtn.click();
      await page.waitForTimeout(500);
    }

    const listenAllSentencesBtn = page.getByTestId("listening-play-all-sentences-btn");
    if ((await listenAllSentencesBtn.count()) > 0 && (await listenAllSentencesBtn.isEnabled())) {
      await listenAllSentencesBtn.click();
      await page.waitForTimeout(600);
      if (((await listenAllSentencesBtn.textContent()) || "").includes("Stop")) {
        await listenAllSentencesBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Verify Beginner Mode parity when visible
    const beginnerModeBtn = page.getByTestId("btn-mode-beginner");
    if ((await beginnerModeBtn.count()) > 0 && (await beginnerModeBtn.isVisible())) {
      await beginnerModeBtn.click();
      const beginnerVideoTab = page.getByTestId("beginner-tab-video");
      if ((await beginnerVideoTab.count()) > 0 && (await beginnerVideoTab.isVisible())) {
        await beginnerVideoTab.click();
      }
      const beginnerGameToggle = page.getByTestId("toggle-word-balloon-learning-btn");
      if ((await beginnerGameToggle.count()) > 0 && (await beginnerGameToggle.isVisible())) {
        await beginnerGameToggle.click();
        await page.waitForSelector("#word-balloon-learning-view", { timeout: 10000 });
      }
    }

    const finalErrorBtnCount = await page.getByTestId("floating-error-button").count();
    assert.equal(finalErrorBtnCount, 0, "Zero floating errors allowed after Game Listening TTS flow");
    assert.deepEqual(pageErrors, [], `Unexpected pageerror events: ${pageErrors.join("; ")}`);
    const unexpectedConsoleErrors = consoleErrors.filter(
      (msg) => !msg.includes("WebSocket") && !msg.includes("ws://"),
    );
    assert.deepEqual(
      unexpectedConsoleErrors,
      [],
      `Unexpected console.error events: ${unexpectedConsoleErrors.join("; ")}`,
    );

    console.log("✔ Live Chromium Game View Listening TTS verification PASSED with zero errors!");
  } finally {
    await browser.close();
  }
}

async function main() {
  await runUnitAndStaticChecks();
  await runBrowserCheckIfServerAvailable();
  console.log("=== Hotfix (Prompt 195) & Task 404 Verification PASSED ===");
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
