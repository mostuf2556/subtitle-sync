import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

const silentWavBuffer = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  "base64",
);

async function installYouTubeAndSpeechMocks(
  page: Page,
  options: {
    mode: "expert" | "beginner";
    useAndroidShell?: boolean;
    altMode?: "always" | "fallback_only";
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
    var mode = opts.mode;
    var useAndroidShell = Boolean(opts.useAndroidShell);
    var altMode = opts.altMode;

    window.localStorage.setItem("app_workflow_mode", mode);
    if (altMode) {
      window.localStorage.setItem("yt_alternative_tts_mode_v1", altMode);
    }

    var capturedMediaHandlers = {};
    window.__capturedMediaHandlers = capturedMediaHandlers;

    var mediaSessionStub = {
      metadata: null,
      playbackState: "none",
      setPositionState: function () {},
      setActionHandler: function (action, handler) {
        capturedMediaHandlers[action] = handler;
      },
    };
    try {
      Object.defineProperty(navigator, "mediaSession", {
        value: mediaSessionStub,
        configurable: true,
      });
    } catch (_err) {
      // Fallback if read-only in some environments
    }

    var mockSynth = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: function () {
        return [
          {
            name: "Google US English",
            lang: "en-US",
            voiceURI: "Google US English",
            localService: false,
            default: true,
          },
        ];
      },
      speak: function () {},
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

    if (useAndroidShell) {
      window.__nativeSpeakCount = 0;
      window.__nativeStopCount = 0;
      window.AndroidNativeShell = {
        speak: function () {
          window.__nativeSpeakCount = Number(window.__nativeSpeakCount || 0) + 1;
          // Intentionally omit window.onNativeTTSStart / onNativeTTSDone to test stall watchdog
          return true;
        },
        stopSpeaking: function () {
          window.__nativeStopCount = Number(window.__nativeStopCount || 0) + 1;
        },
        setBackgroundAudioEnabled: function () { return true; },
        updateMediaMetadata: function () {},
      };
    }

    var state = {
      currentTime: 0,
      duration: 180,
      playerState: 2,
      playbackRate: 1,
      playCalls: 0,
      pauseCalls: 0,
      lastTickAt: Date.now(),
    };
    window.__mockYtState = state;

    function advanceTime() {
      var t = Date.now();
      if (state.playerState === 1) {
        state.currentTime = Math.min(
          state.duration,
          state.currentTime + ((t - state.lastTickAt) / 1000) * state.playbackRate,
        );
      }
      state.lastTickAt = t;
    }

    function MockYTPlayer(_el, playerOpts) {
      this.onStateChange = playerOpts && playerOpts.events && playerOpts.events.onStateChange;
      window.__mockYtPlayer = this;
      setTimeout(function () {
        if (playerOpts && playerOpts.events && playerOpts.events.onReady) {
          playerOpts.events.onReady();
        }
      }, 40);
    }
    MockYTPlayer.prototype.playVideo = function () {
      advanceTime();
      state.playCalls += 1;
      state.playerState = 1;
      state.lastTickAt = Date.now();
      if (this.onStateChange) this.onStateChange({ data: 1 });
    };
    MockYTPlayer.prototype.pauseVideo = function () {
      advanceTime();
      state.pauseCalls += 1;
      state.playerState = 2;
      state.lastTickAt = Date.now();
      if (this.onStateChange) this.onStateChange({ data: 2 });
    };
    MockYTPlayer.prototype.stopVideo = function () {
      state.playerState = 0;
      state.currentTime = 0;
    };
    MockYTPlayer.prototype.seekTo = function (sec) {
      state.currentTime = sec;
      state.lastTickAt = Date.now();
    };
    MockYTPlayer.prototype.getCurrentTime = function () {
      advanceTime();
      return state.currentTime;
    };
    MockYTPlayer.prototype.getDuration = function () { return state.duration; };
    MockYTPlayer.prototype.getPlayerState = function () { return state.playerState; };
    MockYTPlayer.prototype.getPlaybackRate = function () { return state.playbackRate; };
    MockYTPlayer.prototype.setPlaybackRate = function (r) { state.playbackRate = r; };
    MockYTPlayer.prototype.getVideoData = function () { return { title: "E2E Delay & Pause Test Video" }; };
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

async function copyTroubleshootingReport(page: Page): Promise<string> {
  const openBtn = page.getByTestId("open-state-machine-action-logs-button");
  await openBtn.waitFor({ state: "visible", timeout: 10000 });
  await openBtn.click();
  const dialog = page.getByRole("dialog", { name: "State Machine Actions" });
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByTestId("copy-all-action-logs-button").click();
  await page.waitForTimeout(150);
  const report = await page.evaluate(() => navigator.clipboard.readText());
  await dialog.getByRole("button", { name: "Close action logs" }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  return report;
}

async function createAuthedContext(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  return context;
}

async function runLiveE2E() {
  console.log("=========================================================================");
  console.log("🧪 Starting Live E2E: TTS-Play Delay Diagnostics & Spurious Pause Prevention");
  console.log("=========================================================================");

  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    // =========================================================================
    // Scenario 1: Slow TTS3 (>1500ms) emits reproducible TTS_UNJUSTIFIED_DELAY
    //             & ttsConfig snapshot in copied troubleshooting prompt
    // =========================================================================
    {
      const context = await createAuthedContext(browser);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let ttsHits = 0;
      await page.route("**/tts3.lovable.app/**", async (route) => {
        ttsHits += 1;
        // Inject an artificial 1750ms synthesis delay to exceed TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS
        await new Promise((r) => setTimeout(r, 1750));
        await route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: silentWavBuffer,
        });
      });

      await installYouTubeAndSpeechMocks(page, { mode: "expert" });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(700);

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(200);

      for (let step = 0; step < 12; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.85;
        });
        await page.waitForTimeout(200);
        if (ttsHits > 0) break;
      }
      assert.ok(ttsHits >= 1, "Scenario 1: Expected slow TTS3 request to fire");

      // Wait for delayed TTS3 response (~1750ms) to resolve & emit telemetry
      await page.waitForTimeout(2200);

      const report = await copyTroubleshootingReport(page);
      assert.ok(
        report.includes("## 0.5 TTS-Play Delay & Unexpected Pause Diagnostics"),
        "Scenario 1: Copied log must contain promoted Section 0.5",
      );
      assert.ok(
        report.includes("TTS_UNJUSTIFIED_DELAY"),
        "Scenario 1: Copied log must flag TTS_UNJUSTIFIED_DELAY for slow TTS3 latency",
      );
      assert.ok(
        report.includes("TTS_STEP_STARTED") && report.includes("TTS_STEP_FINISHED"),
        "Scenario 1: Copied log must include TTS_STEP_STARTED and TTS_STEP_FINISHED",
      );
      assert.ok(
        report.includes('"ttsConfig"') && report.includes('"lastTtsAttempt"'),
        "Scenario 1: Live App State Snapshot must include reproducible ttsConfig & lastTtsAttempt",
      );
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log(
        "✅ PASS [Scenario 1]: Slow TTS3 emits reproducible TTS_UNJUSTIFIED_DELAY & ttsConfig snapshot.",
      );
    }

    // =========================================================================
    // Scenario 2: Android Native TTS stall (no onNativeTTSStart) -> 1800ms watchdog
    //             stops native speech & falls back to TTS3 + logs delay reason
    // =========================================================================
    {
      const context = await createAuthedContext(browser);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let fallbackTts3Hits = 0;
      await page.route("**/tts3.lovable.app/**", (route) => {
        fallbackTts3Hits += 1;
        route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: silentWavBuffer,
        });
      });

      await installYouTubeAndSpeechMocks(page, {
        mode: "expert",
        useAndroidShell: true,
        altMode: "fallback_only",
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(700);

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(200);

      for (let step = 0; step < 12; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.85;
        });
        await page.waitForTimeout(200);
        const speakCount = await page.evaluate(
          () => (window as unknown as { __nativeSpeakCount: number }).__nativeSpeakCount || 0,
        );
        if (speakCount > 0) break;
      }

      const nativeAttempted = await page.evaluate(
        () => (window as unknown as { __nativeSpeakCount: number }).__nativeSpeakCount || 0,
      );
      assert.ok(nativeAttempted >= 1, "Scenario 2: Expected AndroidNativeShell.speak invocation");

      // Wait ~2.3s for the 1800ms native startup stall watchdog + TTS3 fallback
      await page.waitForTimeout(2400);

      const stopCount = await page.evaluate(
        () => (window as unknown as { __nativeStopCount: number }).__nativeStopCount || 0,
      );
      assert.ok(
        stopCount >= 1,
        `Scenario 2: Watchdog must call AndroidNativeShell.stopSpeaking() (got ${stopCount})`,
      );
      assert.ok(
        fallbackTts3Hits >= 1,
        `Scenario 2: Watchdog must fall back to TTS3 after Android native stall (hits=${fallbackTts3Hits})`,
      );

      const report = await copyTroubleshootingReport(page);
      assert.ok(
        report.includes("android-native-start-timeout") && report.includes("TTS_UNJUSTIFIED_DELAY"),
        "Scenario 2: Diagnostic report must document android-native-start-timeout delay cause",
      );
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log(
        "✅ PASS [Scenario 2]: Android native TTS stall watchdog recovers via TTS3 and logs cause.",
      );
    }

    // =========================================================================
    // Scenario 3 & 4: Spurious web_media_session & YT event=2 bounce protection
    //                 (Expert & Beginner parity) + Explicit native pause works
    // =========================================================================
    {
      const context = await createAuthedContext(browser);
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      await page.route("**/tts3.lovable.app/**", (route) => {
        route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
      });

      await installYouTubeAndSpeechMocks(page, { mode: "expert", useAndroidShell: true });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(700);

      // Turn off TTS-Play briefly so TTS sections don't intentionally pause the video while testing focus bounces
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.getByTestId("menu-option-tts-play").click();
      await page.getByTestId("floating-menu-toggle-btn").click();

      // Start playback cleanly
      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(300);

      // Scenario 4: Simulate an immediate YouTube iframe pause bounce (event.data === 2) 300ms after play
      const playCallsBeforeBounce = await page.evaluate(() => {
        const win = window as unknown as {
          __mockYtPlayer: { onStateChange?: (e: { data: number }) => void };
          __mockYtState: { playerState: number; playCalls: number };
        };
        const before = win.__mockYtState.playCalls;
        win.__mockYtState.playerState = 2;
        win.__mockYtPlayer.onStateChange?.({ data: 2 });
        return before;
      });
      await page.waitForTimeout(250);

      const afterBounce = await page.evaluate(() => {
        const win = window as unknown as {
          __mockYtState: { playerState: number; playCalls: number };
        };
        return win.__mockYtState;
      });
      assert.equal(
        afterBounce.playerState,
        1,
        "Scenario 4: Immediate post-play event=2 bounce must auto-recover back to playing (state 1)",
      );
      assert.ok(
        afterBounce.playCalls > playCallsBeforeBounce,
        "Scenario 4: Auto-recovery must re-invoke player.playVideo()",
      );

      // Scenario 3a: Trigger spurious web_media_session pause (Chromium Android internal AudioFocus loss)
      await page.waitForTimeout(1600);
      await page.evaluate(() => {
        const handlers = (
          window as unknown as {
            __capturedMediaHandlers: Record<string, (() => void) | undefined>;
          }
        ).__capturedMediaHandlers;
        handlers.pause?.();
      });
      await page.waitForTimeout(250);

      const afterSpuriousWebPause = await page.evaluate(() => ({
        playerState: (window as unknown as { __mockYtState: { playerState: number } }).__mockYtState
          .playerState,
        bannerText:
          document.querySelector('[data-testid="video-pause-reason-banner"]')?.textContent || "",
      }));
      assert.equal(
        afterSpuriousWebPause.playerState,
        1,
        "Scenario 3a: Spurious Android web_media_session pause must NOT pause playing video",
      );
      assert.ok(
        !afterSpuriousWebPause.bannerText.includes("Paused via system media controls"),
        "Scenario 3a: Spurious web_media_session pause must NOT show 'Paused via system media controls'",
      );

      const diagReport = await copyTroubleshootingReport(page);
      assert.ok(
        diagReport.includes("SPURIOUS_MEDIA_PAUSE_IGNORED"),
        "Scenario 3a: Copied log must record SPURIOUS_MEDIA_PAUSE_IGNORED",
      );
      assert.ok(
        diagReport.includes("UNEXPECTED_PLAYER_PAUSE") &&
          diagReport.includes('"autoRecovered": true'),
        "Scenario 4: Copied log must record UNEXPECTED_PLAYER_PAUSE with autoRecovered: true",
      );

      // Scenario 3b: Trigger genuine explicit native pause command (Android Notification Pause button)
      await page.evaluate(() => {
        window.onNativeMediaCommand?.("pause");
      });
      await page.waitForTimeout(250);

      const afterExplicitPause = await page.evaluate(() => ({
        playerState: (window as unknown as { __mockYtState: { playerState: number } }).__mockYtState
          .playerState,
        bannerText:
          document.querySelector('[data-testid="video-pause-reason-banner"]')?.textContent || "",
      }));
      assert.equal(
        afterExplicitPause.playerState,
        2,
        "Scenario 3b: Explicit native notification pause command MUST pause playback",
      );
      assert.ok(
        afterExplicitPause.bannerText.includes("Paused via system media controls"),
        `Scenario 3b: Explicit pause must show 'Paused via system media controls', got: ${afterExplicitPause.bannerText}`,
      );

      // Scenario 3c: Beginner Mode parity for spurious web_media_session pause suppression
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=beginner&android=true&debug=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 15000 });
      await page.getByTestId("beginner-tab-video").click();
      await page.waitForTimeout(600);

      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.getByTestId("menu-option-tts-play").click();
      await page.getByTestId("floating-menu-toggle-btn").click();

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(450);

      await page.evaluate(() => {
        const handlers = (
          window as unknown as {
            __capturedMediaHandlers: Record<string, (() => void) | undefined>;
          }
        ).__capturedMediaHandlers;
        handlers.pause?.();
      });
      await page.waitForTimeout(250);

      const beginnerState = await page.evaluate(
        () => (window as unknown as { __mockYtState: { playerState: number } }).__mockYtState,
      );
      assert.equal(
        beginnerState.playerState,
        1,
        "Scenario 3c (Beginner parity): Spurious web_media_session pause must NOT pause Beginner playback",
      );

      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
      console.log(
        "✅ PASS [Scenarios 3 & 4]: Spurious pauses ignored (Expert & Beginner), explicit pause works, bounce auto-recovers.",
      );
    }

    console.log("=========================================================================");
    console.log("🎉 ALL LIVE E2E DELAY DIAGNOSTICS & SPURIOUS PAUSE CHECKS PASSED!");
    console.log("=========================================================================");
  } finally {
    await browser.close();
  }
}

runLiveE2E().catch((err) => {
  console.error("❌ Live E2E test failed:", err);
  process.exit(1);
});
