import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

console.log("=========================================================================");
console.log("🧪 Verifying Task 461: TTS-Play Execution & Floating Button Enable (Android)");
console.log("=========================================================================");

// --- 1. Static source contracts ---
const floatingBtnSrc = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/FloatingDraggablePauseButton.tsx"),
  "utf-8",
);
const indexSrc = fs.readFileSync(path.resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");

assert.ok(
  floatingBtnSrc.includes('data-testid="floating-menu-toggle-btn"') &&
    floatingBtnSrc.includes("onPointerDown={(e) => e.stopPropagation()}") &&
    floatingBtnSrc.includes("onTouchStart={(e) => e.stopPropagation()}") &&
    floatingBtnSrc.includes("onTouchEnd={(e) => e.stopPropagation()}") &&
    floatingBtnSrc.includes('role="menuitem"') &&
    floatingBtnSrc.includes('touchAction: "manipulation"'),
  "FloatingDraggablePauseButton.tsx must isolate touch/pointer events and set role='menuitem' + touchAction='manipulation'",
);

assert.ok(
  indexSrc.includes("onNativeSpeak:") &&
    indexSrc.includes("speakAndroidNativeStep") &&
    indexSrc.includes("triggerImmediateCurrentRowTtsRef"),
  "src/routes/index.tsx must wire onNativeSpeak into executeTtsFallbackSequence and trigger immediate speech on enabling TTS-Play",
);
console.log("✅ PASS [Static Contracts]: FloatingDraggablePauseButton & index.tsx contracts verified.");

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const silentWavBuffer = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  "base64",
);

async function installAndroidMocks(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  opts: {
    mode: "expert" | "beginner";
    useAltAlways?: boolean;
    stallNativeStart?: boolean;
    initialAutoPlayTts?: boolean;
    onlyBaseSpoken?: boolean;
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
    window.localStorage.setItem("yt_tts_fallback_order_v1", "native_tts3");
    if (opts.useAltAlways) {
      window.localStorage.setItem("yt_use_alternative_tts_v1", "true");
      window.localStorage.setItem("yt_alternative_tts_mode_v1", "always");
    } else {
      window.localStorage.removeItem("yt_use_alternative_tts_v1");
      window.localStorage.removeItem("yt_alternative_tts_mode_v1");
    }
    if (opts.initialAutoPlayTts === false) {
      window.localStorage.setItem(
        "yt_app_settings_v4",
        JSON.stringify({
          autoPlayTTS: false,
          ...(opts.onlyBaseSpoken ? { spoken: ["en"], targetLanguages: ["es"], shown: ["en", "es"] } : {}),
        }),
      );
    }
    if (opts.onlyBaseSpoken) {
      window.localStorage.setItem("yt_auto_speak_on_fetch", "false");
      window.localStorage.setItem("yt_spoken_languages_v1", JSON.stringify(["en"]));
      window.localStorage.setItem("yt_target_languages", JSON.stringify(["es"]));
      window.localStorage.setItem("subtitle_sync_favorite_languages", JSON.stringify(["es"]));
    } else {
      window.localStorage.setItem("yt_spoken_languages_v1", JSON.stringify(["es"]));
      window.localStorage.setItem("yt_target_languages", JSON.stringify(["es"]));
      window.localStorage.setItem("subtitle_sync_favorite_languages", JSON.stringify(["es"]));
    }

    var spanishJson3 = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 4400, segs: [{ utf8: "Hola mundo desde Android." }] },
        { tStartMs: 4600, dDurationMs: 4400, segs: [{ utf8: "Probando reproduccion de voz ahora." }] },
        { tStartMs: 9200, dDurationMs: 4400, segs: [{ utf8: "Siguiente frase sincronizada." }] },
        { tStartMs: 13800, dDurationMs: 4400, segs: [{ utf8: "Continuando con los subtitulos." }] },
        { tStartMs: 18400, dDurationMs: 4400, segs: [{ utf8: "Verificando el reproductor movil." }] },
        { tStartMs: 23000, dDurationMs: 4500, segs: [{ utf8: "Ultima frase de prueba." }] }
      ]
    });
    var englishJson3 = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 4400, segs: [{ utf8: "Hello world from Android." }] },
        { tStartMs: 4600, dDurationMs: 4400, segs: [{ utf8: "Testing speech playback now." }] },
        { tStartMs: 9200, dDurationMs: 4400, segs: [{ utf8: "Next synchronized sentence." }] },
        { tStartMs: 13800, dDurationMs: 4400, segs: [{ utf8: "Continuing with subtitles." }] },
        { tStartMs: 18400, dDurationMs: 4400, segs: [{ utf8: "Verifying mobile player." }] },
        { tStartMs: 23000, dDurationMs: 4500, segs: [{ utf8: "Final test sentence." }] }
      ]
    });
    window.__androidTestCaptions = { en: englishJson3, es: spanishJson3 };

    window.__androidSpeakCalls = [];
    window.__androidStopCalls = 0;
    window.AndroidNativeShell = {
      isNativeShell: function () {
        return true;
      },
      getLastObservedTimedTextUrl: function () {
        return "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
      },
      fetchTranslatedCaptionsWithUrl: function () {
        return spanishJson3;
      },
      speak: function (text, lang, rate, utteranceId) {
        window.__androidSpeakCalls.push({ text: text, lang: lang, rate: rate, utteranceId: utteranceId });
        if (!opts.stallNativeStart) {
          setTimeout(function () {
            if (window.onNativeTTSStart) window.onNativeTTSStart(utteranceId);
          }, 15);
          setTimeout(function () {
            if (window.onNativeTTSDone) window.onNativeTTSDone(utteranceId);
          }, 65);
        }
        return true;
      },
      stopSpeaking: function () {
        window.__androidStopCalls = (window.__androidStopCalls || 0) + 1;
      },
      fetchTimedTextExactAsync: function (requestId, url, withSession) {
        setTimeout(function () {
          if (typeof window.__onNativeFetchTimedTextResult === "function") {
            var isEn = String(url || "").includes("lang=en") && !String(url || "").includes("tlang=");
            window.__onNativeFetchTimedTextResult(
              requestId,
              JSON.stringify({
                status: 200,
                body: isEn ? englishJson3 : spanishJson3,
                sentUrl: url,
                send: withSession ? "session" : "anon",
              }),
            );
          }
        }, 25);
        return true;
      },
      saveLocalStorageBackup: function () {},
      loadLocalStorageBackup: function () { return ""; },
    };

    var state = { currentTime: 1.5, duration: 180, playerState: 2, playbackRate: 1, lastTickAt: Date.now() };
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
    MockYTPlayer.prototype.getVideoData = function () { return { title: "Android TTS-Play Test" }; };
    MockYTPlayer.prototype.getOption = function () { return undefined; };
    MockYTPlayer.prototype.setOption = function () {};
    MockYTPlayer.prototype.loadModule = function () {};
    MockYTPlayer.prototype.mute = function () {};
    MockYTPlayer.prototype.unMute = function () {};
    MockYTPlayer.prototype.isMuted = function () { return false; };
    MockYTPlayer.prototype.destroy = function () {};
    window.YT = { Player: MockYTPlayer };
  })(${JSON.stringify(opts)});`);
}

async function deliverAndroidInterceptedCaptions(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
) {
  await page.evaluate(() => {
    const captions = (window as unknown as { __androidTestCaptions?: { en: string; es: string } })
      .__androidTestCaptions;
    if (!captions || typeof window.onNativeCaptionsInterceptedBase64 !== "function") return;
    const enPayload = {
      url: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
      rawData: captions.en,
    };
    const esPayload = {
      url: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&tlang=es&fmt=json3",
      rawData: captions.es,
    };
    window.onNativeCaptionsInterceptedBase64(btoa(JSON.stringify(enPayload)));
    window.onNativeCaptionsInterceptedBase64(btoa(JSON.stringify(esPayload)));
  });
  await page.waitForTimeout(450);
}

async function readTroubleshootingReport(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
): Promise<string> {
  const openBtn = page.getByTestId("open-state-machine-action-logs-button");
  await openBtn.waitFor({ state: "visible", timeout: 10000 });
  await openBtn.tap();
  const dialog = page.getByRole("dialog", { name: "State Machine Actions" });
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByTestId("copy-all-action-logs-button").tap();
  await page.waitForTimeout(150);
  const report = await page.evaluate(() => navigator.clipboard.readText());
  await dialog.getByRole("button", { name: "Close action logs" }).tap();
  await dialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  return report;
}

async function runLiveE2E() {
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    // =========================================================================
    // Scenario 1: AndroidNativeShell.speak executes under altTtsMode === "always" & native_tts3
    // =========================================================================
    {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let tts3Hits = 0;
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Hits += 1;
        route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
      });

      await installAndroidMocks(page, {
        mode: "expert",
        useAltAlways: true,
        stallNativeStart: false,
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Deliver authentic Android intercepted EN + ES timedtext captions
      await deliverAndroidInterceptedCaptions(page);
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
        s.currentTime = 0.4;
      });

      // Trigger Play via touch tap
      await page.getByTestId("floating-pause-button").tap();
      await page.waitForTimeout(250);

      for (let step = 0; step < 30; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime = s.currentTime >= 22 ? 0.5 : s.currentTime + 0.85;
        });
        await page.waitForTimeout(220);
        const count = await page.evaluate(
          () =>
            ((window as unknown as { __androidSpeakCalls?: Array<{ utteranceId?: string }> })
              .__androidSpeakCalls || []
            ).filter((c) => /^row-\d+/.test(c.utteranceId || "")).length,
        );
        if (count >= 1) break;
      }

      await page.waitForTimeout(350);
      const allSpeakCalls = await page.evaluate(() => ({
        speakCalls: (
          window as unknown as {
            __androidSpeakCalls?: Array<{ utteranceId?: string; text?: string; lang?: string }>;
          }
        ).__androidSpeakCalls,
        ytState: (window as unknown as { __mockYtState?: unknown }).__mockYtState,
      }));
      const nativeCalls = (allSpeakCalls.speakCalls || []).filter((c) =>
        /^row-\d+/.test(c.utteranceId || ""),
      ).length;
      const report = await readTroubleshootingReport(page);
      const hasNativeOutcomeLog =
        report.includes("TTS_STEP_FINISHED") &&
        report.includes("alt-always-native") &&
        report.includes("android-native");
      const hasFallbackOrTimeoutLog =
        report.includes("android-native-start-timeout") || report.includes("alt-always-tts3");
      const stateSnapshot =
        report.split("## 1. Live Application State Snapshot")[1]?.split("## 2.")[0]?.trim() || "";
      assert.ok(
        nativeCalls >= 1,
        `Scenario 1: Expected AndroidNativeShell.speak to execute under altTtsMode='always' & native_tts3 (got ${nativeCalls}). AllSpeak=${JSON.stringify(allSpeakCalls.speakCalls)}, YT=${JSON.stringify(allSpeakCalls.ytState)}\nStateSnapshot:\n${stateSnapshot}`,
      );
      assert.ok(
        hasNativeOutcomeLog,
        `Scenario 1: Expected TTS_STEP_FINISHED telemetry with outcome='alt-always-native' & engineUsed='android-native' (tts3PrefetchHits=${tts3Hits})`,
      );
      assert.equal(
        hasFallbackOrTimeoutLog,
        false,
        `Scenario 1: Expected zero startup timeout or fallback to TTS3 when AndroidNativeShell.speak succeeds`,
      );
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log(`✅ PASS [Scenario 1]: AndroidNativeShell.speak executed (${nativeCalls} calls, outcome=alt-always-native) under altTtsMode='always' & native_tts3.`);
    }

    // =========================================================================
    // Scenario 1B: AndroidNativeShell.speak startup stall -> 1800ms watchdog -> TTS3 fallback
    // =========================================================================
    {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      });
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let tts3Hits = 0;
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Hits += 1;
        route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
      });

      await installAndroidMocks(page, {
        mode: "expert",
        useAltAlways: true,
        stallNativeStart: true,
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(500);

      await deliverAndroidInterceptedCaptions(page);
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
        s.currentTime = 0.4;
      });

      await page.getByTestId("floating-pause-button").tap();
      await page.waitForTimeout(200);

      for (let step = 0; step < 30; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime = s.currentTime >= 22 ? 0.5 : s.currentTime + 0.85;
        });
        await page.waitForTimeout(250);
        const count = await page.evaluate(
          () =>
            ((window as unknown as { __androidSpeakCalls?: Array<{ utteranceId?: string }> })
              .__androidSpeakCalls || []
            ).filter((c) => /^row-\d+/.test(c.utteranceId || "")).length,
        );
        if (count >= 1) break;
      }

      await page.waitForTimeout(3200);

      const stopCalls = await page.evaluate(
        () => (window as unknown as { __androidStopCalls?: number }).__androidStopCalls || 0,
      );
      const report1B = await readTroubleshootingReport(page);
      const hasStartTimeoutLog =
        report1B.includes("android-native-start-timeout") ||
        report1B.includes("Android native TTS did not start within 1800ms");
      const hasFallbackOutcomeLog =
        report1B.includes("TTS_STEP_FINISHED") && report1B.includes("alt-always-tts3");
      const ttsDebugLines = report1B
        .split("\n")
        .filter((l) => /TTS|native|timeout|stall|pause/i.test(l))
        .slice(-30)
        .join("\n");
      assert.ok(stopCalls >= 1, `Scenario 1B: Expected stopSpeaking() watchdog call on stalled Android TTS (got ${stopCalls})`);
      assert.ok(
        hasStartTimeoutLog,
        `Scenario 1B: Expected android-native-start-timeout telemetry from 1800ms watchdog.\nTTS lines:\n${ttsDebugLines}`,
      );
      assert.ok(
        hasFallbackOutcomeLog,
        `Scenario 1B: Expected TTS_STEP_FINISHED telemetry with alt-always-tts3 recovery.\nTTS lines:\n${ttsDebugLines}`,
      );
      assert.ok(tts3Hits >= 1, `Scenario 1B: Expected TTS3 fallback after stalled Android TTS (got ${tts3Hits})`);
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log(`✅ PASS [Scenario 1B]: Stalled AndroidNativeShell.speak recovered via 1800ms watchdog -> TTS3 (${tts3Hits} calls).`);
    }

    // =========================================================================
    // Scenario 2: Android Touch on Floating Menu Toggle & menu-option-tts-play
    // clears stale setup pause, recovers empty/base-only spoken list, and speaks immediately
    // =========================================================================
    {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await page.route("**/tts3.lovable.app/**", (route) => {
        route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
      });

      await installAndroidMocks(page, {
        mode: "expert",
        useAltAlways: false,
        stallNativeStart: false,
        initialAutoPlayTts: false,
        onlyBaseSpoken: true,
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-menu-toggle-btn"]', { timeout: 15000 });
      await page.waitForTimeout(500);

      await deliverAndroidInterceptedCaptions(page);

      // Open floating menu via Android touch tap, enable Pause for Setup, verify TTS-Play shows Disabled
      await page.getByTestId("floating-menu-toggle-btn").tap();
      await page.waitForSelector('[data-testid="floating-menu-dropdown"]', { timeout: 5000 });
      await page.getByTestId("menu-option-setup-pause").tap();
      await page.waitForTimeout(150);

      const setupPausedText = (await page.getByTestId("menu-option-setup-pause").textContent()) || "";
      assert.ok(setupPausedText.includes("Paused"), `Expected setup pause active, got: ${setupPausedText}`);

      const disabledTtsText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(disabledTtsText.includes("Disabled"), `Expected TTS-Play initially Disabled, got: ${disabledTtsText}`);

      const callsBeforeEnable = await page.evaluate(
        () =>
          ((window as unknown as { __androidSpeakCalls?: Array<{ utteranceId?: string }> })
            .__androidSpeakCalls || []
          ).filter((c) => /^row-\d+/.test(c.utteranceId || "")).length,
      );

      // Tap menu-option-tts-play via Android touch to enable it!
      await page.getByTestId("menu-option-tts-play").tap();
      await page.waitForTimeout(550);

      const enabledTtsText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(
        enabledTtsText.includes("Enabled"),
        `Scenario 2: Expected menu-option-tts-play to become Enabled after touch tap, got: ${enabledTtsText}`,
      );

      const setupAfterEnableText = (await page.getByTestId("menu-option-setup-pause").textContent()) || "";
      assert.ok(
        setupAfterEnableText.includes("Off"),
        `Scenario 2: Enabling TTS-Play must clear stale Pause for Setup, got: ${setupAfterEnableText}`,
      );

      const callsAfterEnable = await page.evaluate(
        () =>
          ((window as unknown as { __androidSpeakCalls?: Array<{ utteranceId?: string }> })
            .__androidSpeakCalls || []
          ).filter((c) => /^row-\d+/.test(c.utteranceId || "")).length,
      );
      assert.ok(
        callsAfterEnable > callsBeforeEnable,
        `Scenario 2: Tapping menu-option-tts-play must speak subtitle row immediately even from paused/empty-spoken/setup-pause state (before=${callsBeforeEnable}, after=${callsAfterEnable})`,
      );

      // Verify outside touch dismisses the floating menu dropdown cleanly
      await page.touchscreen.tap(20, 20);
      await page.waitForTimeout(200);
      assert.equal(
        await page.getByTestId("floating-menu-dropdown").count(),
        0,
        "Scenario 2: Outside touch must dismiss floating-menu-dropdown",
      );

      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log("✅ PASS [Scenario 2]: Android floating menu touch enablement, setup-pause clearance, spoken recovery & immediate speech verified.");
    }

    // =========================================================================
    // Scenario 3: Beginner Mode Parity on Android Touch
    // =========================================================================
    {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await installAndroidMocks(page, {
        mode: "beginner",
        useAltAlways: false,
        stallNativeStart: false,
        initialAutoPlayTts: false,
        onlyBaseSpoken: true,
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=beginner&android=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 15000 });
      await page.getByTestId("beginner-tab-video").tap();
      await page.waitForTimeout(500);

      await deliverAndroidInterceptedCaptions(page);

      await page.getByTestId("floating-menu-toggle-btn").tap();
      await page.waitForSelector('[data-testid="menu-option-tts-play"]', { timeout: 5000 });
      const beforeText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(beforeText.includes("Disabled"), `Beginner Scenario 3: Expected Disabled initially, got: ${beforeText}`);

      await page.getByTestId("menu-option-tts-play").tap();
      await page.waitForTimeout(550);

      const afterText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(afterText.includes("Enabled"), `Beginner Scenario 3: Expected Enabled after tap, got: ${afterText}`);

      const calls = await page.evaluate(
        () =>
          ((window as unknown as { __androidSpeakCalls?: Array<{ utteranceId?: string }> })
            .__androidSpeakCalls || []
          ).filter((c) => /^row-\d+/.test(c.utteranceId || "")).length,
      );
      assert.ok(calls >= 1, `Beginner Scenario 3: Expected immediate subtitle row TTS speech after floating menu enable (got ${calls})`);
      assert.deepEqual(pageErrors, [], `Unexpected pageerror (beginner): ${pageErrors.join("; ")}`);
      await context.close();
      console.log("✅ PASS [Scenario 3]: Beginner Mode Android touch floating enablement & immediate speech parity confirmed.");
    }
  } finally {
    await browser.close();
  }
}

await runLiveE2E();
console.log("=========================================================================");
console.log("🎉 ALL TASK 461 TTS-PLAY & FLOATING BUTTON ANDROID CHECKS PASSED!");
console.log("=========================================================================");
