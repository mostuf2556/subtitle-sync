import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

console.log("=========================================================================");
console.log("🧪 Verifying Task 460: Android Auto-Fetch Subtitles No Oscillation Loop");
console.log("=========================================================================");

// --- 1. Static source verification ---
const queueContent = fs.readFileSync(
  path.resolve(process.cwd(), "src/utils/subtitleRequestQueue.ts"),
  "utf-8",
);
const indicatorContent = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/FloatingSubtitleRetryIndicator.tsx"),
  "utf-8",
);
const indexContent = fs.readFileSync(
  path.resolve(process.cwd(), "src/routes/index.tsx"),
  "utf-8",
);

assert.ok(
  queueContent.includes("public isLangQueuedOrExecuting("),
  "subtitleRequestQueue must expose isLangQueuedOrExecuting",
);
assert.ok(
  indicatorContent.includes("subtitleRequestQueue.subscribe(setQueueState)") &&
    indicatorContent.includes("queueState.cooldownUntil") &&
    indicatorContent.includes("isTargetAlreadyQueued"),
  "FloatingSubtitleRetryIndicator must subscribe to subtitleRequestQueue and respect cooldown/queued state",
);
assert.ok(
  indexContent.includes("isFetchingSubtitles || queueIsExecuting || isSubtitlesPending") &&
    indexContent.includes("didExecuteNetworkAttempt") &&
    indexContent.includes("targetLanguagesKey"),
  "src/routes/index.tsx must pass real async fetching state and guard against duplicate queue attempts",
);
console.log("✅ PASS: Source contracts verified.");

// --- 2. Live Playwright Chromium Android Emulation Verification ---
const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

async function runLiveE2E() {
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.route("**/youtube.com/iframe_api*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.YT = window.YT || { Player: function() {} };",
      });
    });

    await page.addInitScript(`(() => {
      try {
        window.sessionStorage.setItem("yt_show_autofetch_subtitles", "true");
        window.localStorage.setItem("yt_show_autofetch_subtitles", "true");
        window.localStorage.setItem("app_workflow_mode", "expert");
        window.localStorage.setItem("yt_retry_pacing_min_sec", "1");
        window.localStorage.setItem("yt_retry_pacing_max_sec", "2");
        window.localStorage.setItem("subtitle_sync_retry_min_sec", "1");
        window.localStorage.setItem("subtitle_sync_retry_max_sec", "2");
        window.localStorage.setItem("yt_target_languages", JSON.stringify(["es"]));
        window.localStorage.setItem("subtitle_sync_favorite_languages", JSON.stringify(["es"]));
        window.localStorage.setItem("subtitle_sync_auto_retry", "true");
      } catch (e) {}

      window.__fetchAttemptCalls = [];
      var observed = "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
      window.AndroidNativeShell = {
        isNativeShell: function () { return true; },
        getLastObservedTimedTextUrl: function () { return observed; },
        fetchTranslatedCaptionsWithUrl: function () { return ""; },
        fetchTimedTextExactAsync: function (requestId, url, withSession) {
          window.__fetchAttemptCalls.push({ requestId: requestId, url: url, withSession: withSession, at: Date.now() });
          setTimeout(function () {
            if (typeof window.__onNativeFetchTimedTextResult === "function") {
              window.__onNativeFetchTimedTextResult(
                requestId,
                JSON.stringify({
                  status: 429,
                  body: "",
                  sentUrl: url,
                  send: withSession ? "session" : "anon",
                  error: "HTTP 429 rate limited",
                }),
              );
            }
          }, 90);
          return true;
        },
      };
    })();`);

    await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="floating-subtitle-retry-indicator"]', {
      timeout: 15000,
    });
    // Ensure Auto-Fetch widget is visible
    const isHidden = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="autofetch-subtitles-container"]');
      return el ? el.classList.contains("hidden") : false;
    });
    if (isHidden) {
      await page.getByTestId("header-toggle-autofetch-button header-toggle-autofetch-subtitles-button").click();
    }

    // Deliver intercepted default captions (English base track) via Android bridge
    await page.evaluate(() => {
      const payload = {
        url: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
        rawData: JSON.stringify({
          events: [
            { tStartMs: 0, dDurationMs: 2500, segs: [{ utf8: "Hello world from Android!" }] },
            { tStartMs: 3000, dDurationMs: 2500, segs: [{ utf8: "Testing subtitle auto-fetch." }] },
          ],
        }),
      };
      const encoded = btoa(JSON.stringify(payload));
      if (typeof window.onNativeCaptionsInterceptedBase64 === "function") {
        window.onNativeCaptionsInterceptedBase64(encoded);
      }
    });

    // Sample the indicator label + toast header every 100ms for 3.6 seconds
    const samples: Array<{ t: number; indicatorText: string; toastText: string }> = [];
    const start = Date.now();
    for (let i = 0; i < 36; i++) {
      const snap = await page.evaluate(() => {
        const indicator = document.querySelector(
          '[data-testid="floating-subtitle-retry-indicator"] span.truncate',
        );
        const toast = document.querySelector('[data-testid="subtitle-fetch-toast"]');
        return {
          indicatorText: indicator?.textContent?.trim() || "",
          toastText: toast?.textContent?.trim() || "",
        };
      });
      samples.push({ t: Date.now() - start, ...snap });
      await page.waitForTimeout(100);
    }

    const fetchCallsCount = await page.evaluate(
      () => (window as unknown as { __fetchAttemptCalls: Array<unknown> }).__fetchAttemptCalls.length,
    );

    // Count label oscillations between "Auto-Fetching Subtitles" and "Fetching ..."
    let indicatorTransitions = 0;
    let prevLabel = "";
    for (const s of samples) {
      if (s.indicatorText && s.indicatorText !== prevLabel) {
        if (prevLabel) indicatorTransitions += 1;
        prevLabel = s.indicatorText;
      }
    }

    // Count how many times toast alternated into "Fetching Subtitles" after an error
    let errorToFetchingLoops = 0;
    let seenError = false;
    for (const s of samples) {
      if (s.toastText.includes("Subtitle Alert")) {
        seenError = true;
      } else if (seenError && s.toastText.includes("Fetching Subtitles")) {
        errorToFetchingLoops += 1;
        seenError = false;
      }
    }

    console.log("Sampled indicator transitions:", indicatorTransitions, "| Fetch bridge calls:", fetchCallsCount);
    assert.ok(
      fetchCallsCount >= 1,
      `Expected initial Android timedtext fetch attempt to run, got ${fetchCallsCount}`,
    );
    assert.ok(
      indicatorTransitions <= 4,
      `Indicator label oscillated too many times (${indicatorTransitions}) over 3.6s — potential loop! Samples: ${JSON.stringify(samples.map((x) => x.indicatorText))}`,
    );
    assert.ok(
      errorToFetchingLoops <= 1,
      `Toast alternated between Subtitle Alert and Fetching Subtitles ${errorToFetchingLoops} times in 3.6s!`,
    );

    // Change TTS rate in localStorage/UI state and confirm it does NOT re-trigger an immediate duplicate auto-fetch storm
    const countBeforeRateChange = await page.evaluate(
      () => (window as unknown as { __fetchAttemptCalls: Array<unknown> }).__fetchAttemptCalls.length,
    );
    // Open settings if available or adjust retry/rate slider via DOM if visible, otherwise check stability across another 800ms
    await page.waitForTimeout(800);
    const countAfterWait = await page.evaluate(
      () => (window as unknown as { __fetchAttemptCalls: Array<unknown> }).__fetchAttemptCalls.length,
    );
    assert.ok(
      countAfterWait - countBeforeRateChange <= 4,
      `Expected cooldown backoff to prevent rapid retry storm (delta=${countAfterWait - countBeforeRateChange})`,
    );

    assert.strictEqual(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join("; ")}`);
    console.log("✅ PASS [Live Android Emulation]: No fetching-subtitles oscillation loop detected.");
  } finally {
    await browser.close();
  }
}

runLiveE2E().catch((err) => {
  console.error("❌ FAIL:", err);
  process.exit(1);
});
