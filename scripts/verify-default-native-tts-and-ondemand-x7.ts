import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  clearAlternativeTtsAudioCache,
  DEFAULT_TTS_FALLBACK_ORDER,
  getTtsFallbackOrder,
  isTtsServiceActivelyUsed,
  markTtsServiceSessionActive,
  requestTtsServiceOnDemandBatch,
  setAlternativeTtsMode,
  setTtsFallbackOrder,
  setUseAlternativeTts,
  TTS_SERVICE_ON_DEMAND_AHEAD_COUNT,
} from "../src/lib/alternative-tts";
import { DEFAULT_APP_SETTINGS } from "../src/utils/appSettings";

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

const silentWavBuffer = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  "base64",
);

async function runUnitChecks() {
  console.log("1. Verifying defaults & TTS-service on-demand X=7 unit contracts...");
  assert.equal(
    DEFAULT_TTS_FALLBACK_ORDER,
    "native_tts3",
    "DEFAULT_TTS_FALLBACK_ORDER must be 'native_tts3' so native TTS runs first by default",
  );
  assert.equal(
    TTS_SERVICE_ON_DEMAND_AHEAD_COUNT,
    7,
    "TTS_SERVICE_ON_DEMAND_AHEAD_COUNT must be 7",
  );
  assert.equal(
    DEFAULT_APP_SETTINGS.ttsOnDemandAheadCount,
    7,
    "DEFAULT_APP_SETTINGS.ttsOnDemandAheadCount must be 7",
  );

  const origWindow = (globalThis as { window?: unknown }).window;
  const origFetch = globalThis.fetch;

  try {
    (globalThis as { window?: unknown }).window = {};
    clearAlternativeTtsAudioCache();
    setTtsFallbackOrder(DEFAULT_TTS_FALLBACK_ORDER);
    setUseAlternativeTts(false);
    setAlternativeTtsMode("fallback_only");

    assert.equal(getTtsFallbackOrder(), "native_tts3");
    assert.equal(
      isTtsServiceActivelyUsed(),
      false,
      "Fresh default configuration must NOT mark external TTS service as actively used",
    );

    // Dynamic fallback triggers active TTS service for session unless native_only
    markTtsServiceSessionActive(true);
    assert.equal(
      isTtsServiceActivelyUsed(),
      true,
      "Session fallback must enable active TTS service tracking under native_tts3",
    );

    setTtsFallbackOrder("native_only");
    assert.equal(
      isTtsServiceActivelyUsed(),
      false,
      "native_only must strictly suppress external TTS service even if session fallback was flagged",
    );

    // Restore explicit TTS service usage
    markTtsServiceSessionActive(false);
    setTtsFallbackOrder("tts3_native");
    assert.equal(isTtsServiceActivelyUsed(), true);

    // Concurrency-bounded on-demand X=7 batch test with 10 candidate items
    let activeFetches = 0;
    let maxConcurrentFetches = 0;
    const requestedTexts: string[] = [];

    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      activeFetches += 1;
      maxConcurrentFetches = Math.max(maxConcurrentFetches, activeFetches);
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        requestedTexts.push(String(body.text || ""));
        await new Promise((r) => setTimeout(r, 15));
        return new Response(
          JSON.stringify({
            audio: Buffer.from("mock-mp3").toString("base64"),
            mime: "audio/mpeg",
            provider: "google",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json", "x-tts-provider": "google" },
          },
        );
      } finally {
        activeFetches -= 1;
      }
    }) as typeof fetch;

    const tenItems = Array.from({ length: 10 }, (_, idx) => ({
      text: `Sentence number ${idx + 1} for on-demand batching.`,
      lang: "es-ES",
      options: { provider: "google" as const, format: "json" as const, method: "post" as const },
    }));

    const batchRes = await requestTtsServiceOnDemandBatch(tenItems);
    assert.equal(
      batchRes.requestedCount,
      7,
      `On-demand batch must request exactly X=7 items out of 10 (got ${batchRes.requestedCount})`,
    );
    assert.equal(
      batchRes.succeededCount,
      7,
      `All X=7 on-demand items must succeed without dropping items 3..7 (got ${batchRes.succeededCount})`,
    );
    assert.equal(requestedTexts.length, 7, "Exactly 7 network requests should fire for X=7 batch");
    assert.ok(
      maxConcurrentFetches <= 2 && maxConcurrentFetches >= 1,
      `On-demand worker pool must bound concurrency to <=2 (observed max=${maxConcurrentFetches})`,
    );

    // Repeating same 7 items hits cache with 0 extra fetches
    const repeatRes = await requestTtsServiceOnDemandBatch(tenItems.slice(0, 7));
    assert.equal(repeatRes.requestedCount, 0, "Cached X=7 window must execute 0 extra fetches");
    assert.equal(requestedTexts.length, 7, "Total fetch count must stay at 7 on cached repeat");

    const routesSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf-8");
    assert.ok(
      routesSrc.includes("prefetchTtsServiceOnDemandAhead") &&
        routesSrc.includes("TTS_SERVICE_ON_DEMAND_AHEAD_COUNT") &&
        routesSrc.includes("ttsOnDemandAheadCount: TTS_SERVICE_ON_DEMAND_AHEAD_COUNT"),
      "src/routes/index.tsx must wire prefetchTtsServiceOnDemandAhead with TTS_SERVICE_ON_DEMAND_AHEAD_COUNT and expose ttsOnDemandAheadCount",
    );

    clearAlternativeTtsAudioCache();
    console.log("✔ Unit & source contracts passed (native_tts3 default + X=7 bounded batch).");
  } finally {
    globalThis.fetch = origFetch;
    if (origWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = origWindow;
    }
  }
}

async function setupPageMocks(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  options: {
    mode: "expert" | "beginner";
    enableTtsService?: boolean;
  },
) {
  await page.route("**/youtube.com/iframe_api*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* mocked youtube iframe_api */",
    });
  });

  await page.addInitScript(`((opts) => {
    window.localStorage.setItem("app_workflow_mode", opts.mode);
    if (opts.enableTtsService) {
      window.localStorage.setItem("yt_use_alternative_tts_v1", "true");
      window.localStorage.setItem("yt_alternative_tts_mode_v1", "always");
      window.localStorage.setItem("yt_tts_fallback_order_v1", "tts3_native");
    } else {
      window.localStorage.removeItem("yt_use_alternative_tts_v1");
      window.localStorage.removeItem("yt_alternative_tts_mode_v1");
      window.localStorage.removeItem("yt_tts_fallback_order_v1");
    }

    window.__nativeSpeakTexts = [];
    var mockSynth = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: function () {
        return [
          { name: "Hebrew Native", lang: "he-IL", voiceURI: "he-native", localService: true, default: false },
          { name: "Spanish Native", lang: "es-ES", voiceURI: "es-native", localService: true, default: false },
          { name: "Italian Native", lang: "it-IT", voiceURI: "it-native", localService: true, default: false },
          { name: "Arabic Native", lang: "ar-SA", voiceURI: "ar-native", localService: true, default: false },
          { name: "Russian Native", lang: "ru-RU", voiceURI: "ru-native", localService: true, default: false },
          { name: "Portuguese Native", lang: "pt-BR", voiceURI: "pt-native", localService: true, default: false },
          { name: "English Native", lang: "en-US", voiceURI: "en-native", localService: true, default: true }
        ];
      },
      speak: function (utterance) {
        window.__nativeSpeakTexts.push(String((utterance && utterance.text) || ""));
        setTimeout(function () {
          if (utterance && typeof utterance.onstart === "function") utterance.onstart();
        }, 10);
        setTimeout(function () {
          if (utterance && typeof utterance.onend === "function") utterance.onend();
        }, 45);
      },
      cancel: function () {},
      pause: function () {},
      resume: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: mockSynth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) {
      this.text = text;
      this.lang = "en-US";
      this.rate = 1;
      this.volume = 1;
    };

    var state = { currentTime: 0, duration: 180, playerState: 2, playbackRate: 1, lastTickAt: Date.now() };
    window.__mockYtState = state;
    function advanceTime() {
      var t = Date.now();
      if (state.playerState === 1) {
        state.currentTime = Math.min(state.duration, state.currentTime + ((t - state.lastTickAt) / 1000) * state.playbackRate);
      }
      state.lastTickAt = t;
    }
    function MockYTPlayer(_el, playerOpts) {
      this.onStateChange = playerOpts && playerOpts.events && playerOpts.events.onStateChange;
      window.__mockYtPlayer = this;
      setTimeout(function () {
        if (playerOpts && playerOpts.events && playerOpts.events.onReady) playerOpts.events.onReady();
      }, 40);
    }
    MockYTPlayer.prototype.playVideo = function () {
      advanceTime();
      state.playerState = 1;
      state.lastTickAt = Date.now();
      if (this.onStateChange) this.onStateChange({ data: 1 });
    };
    MockYTPlayer.prototype.pauseVideo = function () {
      advanceTime();
      state.playerState = 2;
      state.lastTickAt = Date.now();
      if (this.onStateChange) this.onStateChange({ data: 2 });
    };
    MockYTPlayer.prototype.stopVideo = function () { state.playerState = 0; state.currentTime = 0; };
    MockYTPlayer.prototype.seekTo = function (sec) { state.currentTime = sec; state.lastTickAt = Date.now(); };
    MockYTPlayer.prototype.getCurrentTime = function () { advanceTime(); return state.currentTime; };
    MockYTPlayer.prototype.getDuration = function () { return state.duration; };
    MockYTPlayer.prototype.getPlayerState = function () { return state.playerState; };
    MockYTPlayer.prototype.getPlaybackRate = function () { return state.playbackRate; };
    MockYTPlayer.prototype.setPlaybackRate = function (r) { state.playbackRate = r; };
    MockYTPlayer.prototype.getVideoData = function () { return { title: "Default Native & X=7 Test" }; };
    MockYTPlayer.prototype.getOption = function () { return undefined; };
    MockYTPlayer.prototype.setOption = function () {};
    MockYTPlayer.prototype.loadModule = function () {};
    MockYTPlayer.prototype.mute = function () {};
    MockYTPlayer.prototype.unMute = function () {};
    MockYTPlayer.prototype.isMuted = function () { return false; };
    MockYTPlayer.prototype.destroy = function () {};
    window.YT = { Player: MockYTPlayer };
  })(${JSON.stringify(options)});`);
}

async function runLiveE2E() {
  console.log("2. Running live Chromium E2E checks (Default Native TTS + On-Demand X=7 + Parity)...");

  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    // Scenario 1: Default fresh state uses native TTS first and fires 0 TTS3 requests
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let tts3Hits = 0;
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Hits += 1;
        route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
      });

      await setupPageMocks(page, { mode: "expert", enableTtsService: false });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(700);

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(200);

      for (let step = 0; step < 10; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.9;
        });
        await page.waitForTimeout(200);
        const count = await page.evaluate(
          () => ((window as unknown as { __nativeSpeakTexts?: string[] }).__nativeSpeakTexts || []).length,
        );
        if (count >= 1) break;
      }

      await page.waitForTimeout(400);
      const nativeTexts = await page.evaluate(
        () => (window as unknown as { __nativeSpeakTexts?: string[] }).__nativeSpeakTexts || [],
      );
      assert.ok(
        nativeTexts.length >= 1,
        `Scenario 1: Default state must speak via native TTS (count=${nativeTexts.length})`,
      );
      assert.equal(
        tts3Hits,
        0,
        `Scenario 1: Default native TTS playback must make 0 external TTS3 requests (got ${tts3Hits})`,
      );

      // Verify state snapshot reflects native_tts3 + ttsOnDemandAheadCount: 7
      await page.getByTestId("open-state-machine-action-logs-button").click();
      const dialog = page.getByRole("dialog", { name: "State Machine Actions" });
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      await dialog.getByTestId("copy-all-action-logs-button").click();
      await page.waitForTimeout(150);
      const report = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(
        report.includes('"ttsFallbackOrder": "native_tts3"') ||
          /"ttsFallbackOrder":\s*"native_tts3"/.test(report),
        "Scenario 1: Snapshot must report default ttsFallbackOrder === 'native_tts3'",
      );
      assert.ok(
        /"ttsOnDemandAheadCount":\s*7/.test(report),
        "Scenario 1: Snapshot must expose ttsOnDemandAheadCount === 7",
      );

      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("✅ PASS [Scenario 1]: Fresh default uses native TTS cleanly with 0 TTS3 requests.");
    }

    // Scenario 2: Active TTS3 service issues X=7 on-demand requests (bounded concurrency) in Expert & Beginner
    for (const mode of ["expert", "beginner"] as const) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      const tts3Payloads: string[] = [];
      let inFlight = 0;
      let maxInFlight = 0;
      await page.route("**/tts3.lovable.app/**", async (route) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          const postData = route.request().postData() || "";
          tts3Payloads.push(postData);
          await new Promise((r) => setTimeout(r, 40));
          await route.fulfill({
            status: 200,
            contentType: "audio/wav",
            body: silentWavBuffer,
          });
        } finally {
          inFlight -= 1;
        }
      });

      await setupPageMocks(page, { mode, enableTtsService: true });
      const url =
        mode === "expert"
          ? `${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3`
          : `${APP_URL}/?v=L2Ryrr6txwA&mode=beginner`;
      await page.goto(url, { waitUntil: "domcontentloaded" });

      if (mode === "beginner") {
        await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 15000 });
        await page.getByTestId("beginner-tab-video").click();
        await page.waitForTimeout(500);
        const begLoadSample = page.getByTestId("btn-load-sample-subs");
        if ((await begLoadSample.count()) > 0 && (await begLoadSample.isVisible())) {
          await begLoadSample.click();
          await page.waitForTimeout(400);
        }
      } else {
        await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
        await page.waitForTimeout(700);
      }

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(200);

      for (let step = 0; step < 12; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.9;
        });
        await page.waitForTimeout(200);
        if (tts3Payloads.length >= 7) break;
      }

      // Wait deterministically for remaining queued workers (up to X=7) to finish
      for (let w = 0; w < 15 && tts3Payloads.length < 7; w++) {
        await page.waitForTimeout(150);
      }

      assert.ok(
        tts3Payloads.length >= 7,
        `Scenario 2 (${mode}): Active TTS3 service must trigger >=7 on-demand requests (got ${tts3Payloads.length})`,
      );
      assert.ok(
        maxInFlight <= 2,
        `Scenario 2 (${mode}): Bounded on-demand concurrency must stay <=2 (observed ${maxInFlight})`,
      );
      assert.deepEqual(pageErrors, [], `Unexpected pageerror (${mode}): ${pageErrors.join("; ")}`);
      await context.close();
      console.log(
        `✅ PASS [Scenario 2 - ${mode}]: Active TTS3 issued ${tts3Payloads.length} on-demand requests (max concurrency ${maxInFlight}).`,
      );
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("=========================================================================");
  console.log("🧪 Verifying Default Native TTS & On-Demand X=7 TTS-Service Request Batching");
  console.log("=========================================================================");
  await runUnitChecks();
  await runLiveE2E();
  console.log("=========================================================================");
  console.log("🎉 ALL DEFAULT NATIVE TTS & ON-DEMAND X=7 CHECKS PASSED!");
  console.log("=========================================================================");
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
