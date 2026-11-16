import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

console.log("=========================================================================");
console.log("🧪 Verifying Task 427: Floating Menu TTS-Play Active During Video Playback");
console.log("=========================================================================");

// --- 1. Static source contracts ---
const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexContent = fs.readFileSync(indexPath, "utf-8");
const floatingBtnPath = path.resolve(
  process.cwd(),
  "src/components/FloatingDraggablePauseButton.tsx",
);
const floatingBtnContent = fs.readFileSync(floatingBtnPath, "utf-8");

assert.ok(
  indexContent.includes("const hasMatchedLanguageVoice = Boolean(") &&
    indexContent.includes('!hasMatchedLanguageVoice && canFallbackToTts3 && fallbackOrder === "tts3_native"'),
  "executeSingleSpeech must fall back directly to TTS3 when voices > 0 lacks a matching language voice under tts3_native",
);
assert.ok(
  indexContent.includes('void done(true, "native-start-timeout");') &&
    indexContent.includes('done(!hasStarted && canFallbackToTts3, !hasStarted ? "native-timeout" : undefined)'),
  "executeSingleSpeech must include startup watchdog and timeout recovery for stalled Web Speech",
);
assert.ok(
  floatingBtnContent.includes("unlockTtsAudioPlayback();") &&
    indexContent.includes("unlockTtsAudioPlayback();"),
  "Play and TTS-Play enable gestures must synchronously unlock TTS audio playback",
);
assert.ok(
  indexContent.includes("setupPauseActivatedAtRef") &&
    indexContent.includes("setPauseMode(checked);\n                                        onTtsPlayEnabledChange(checked);"),
  "src/routes/index.tsx must synchronize setup-pause clearance on play and pauseMode <-> isTtsPlayEnabled",
);
console.log("✅ PASS: Source contracts verified.");

// --- 2. Live Playwright Chromium E2E Verification ---
const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

async function runLiveE2E() {
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  // Minimal valid silent WAV (base64 encoded ~0.1s PCM 8kHz mono)
  const silentWavBuffer = Buffer.from(
    "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    "base64",
  );

  try {
    // =========================================================================
    // Scenario A & C & D: Voices > 0 without matching target language voice,
    // toggle OFF/ON during playback, setup-pause recovery, Beginner parity
    // =========================================================================
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();

      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const tts3Requests: string[] = [];
      await page.route("**/youtube.com/iframe_api*", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "/* mocked youtube iframe_api */",
        });
      });
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Requests.push(route.request().url());
        route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: silentWavBuffer,
        });
      });

      await page.addInitScript(`(() => {
        window.localStorage.setItem("app_workflow_mode", "expert");
        window.__nativeSpeakCount = 0;

        // Browser has 1 English voice ONLY (voices.length === 1 > 0) - typical real Chrome without he/es/it packs
        var mockSynth = {
          speaking: false,
          paused: false,
          pending: false,
          getVoices: function () {
            return [
              { name: "Google US English", lang: "en-US", voiceURI: "Google US English", localService: false, default: true }
            ];
          },
          speak: function () {
            // Simulate Chrome hanging when asked to speak an unavailable language voice
            window.__nativeSpeakCount = Number(window.__nativeSpeakCount || 0) + 1;
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
        function MockYTPlayer(_el, opts) {
          this.onStateChange = opts && opts.events && opts.events.onStateChange;
          window.__mockYtPlayer = this;
          setTimeout(function () {
            if (opts && opts.events && opts.events.onReady) opts.events.onReady();
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
        MockYTPlayer.prototype.getVideoData = function () { return { title: "Demo Video" }; };
        MockYTPlayer.prototype.getOption = function () { return undefined; };
        MockYTPlayer.prototype.setOption = function () {};
        MockYTPlayer.prototype.loadModule = function () {};
        MockYTPlayer.prototype.mute = function () {};
        MockYTPlayer.prototype.unMute = function () {};
        MockYTPlayer.prototype.isMuted = function () { return false; };
        MockYTPlayer.prototype.destroy = function () {};
        window.YT = { Player: MockYTPlayer };
      })();`);

      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(800);

      const advanceSmoothlyUntilTts = async (prevCount: number, maxSteps = 16) => {
        for (let step = 0; step < maxSteps; step++) {
          await page.evaluate(() => {
            const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
            s.currentTime += 0.85;
          });
          await page.waitForTimeout(220);
          if (tts3Requests.length > prevCount) return true;
        }
        await page.waitForTimeout(500);
        return tts3Requests.length > prevCount;
      };

      // Verify menu option 3 displays Enabled
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.waitForSelector('[data-testid="menu-option-tts-play"]', { timeout: 5000 });
      const optText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(optText.includes("Enabled"), `Expected menu-option-tts-play to show Enabled, got: ${optText}`);
      // Close menu
      await page.getByTestId("floating-menu-toggle-btn").click();

      // Start playback using Floating Play button
      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(250);

      // Advance video smoothly across first subtitle cue boundary
      await advanceSmoothlyUntilTts(0, 14);

      assert.ok(
        tts3Requests.length >= 1,
        `Scenario A: Expected immediate TTS3 playback with voices>0 missing target voice (tts3Requests=${tts3Requests.length})`,
      );
      console.log(`✅ PASS [Scenario A]: Voices > 0 missing target voice triggered TTS3 immediately (${tts3Requests.length} requests).`);

      // Wait for TTS playback completion & resume
      await page.waitForTimeout(1000);
      const afterSpeakState = await page.evaluate(() => ({
        playerState: (window as unknown as { __mockYtState: { playerState: number } }).__mockYtState.playerState,
        nativeSpeakCount: (window as unknown as { __nativeSpeakCount: number }).__nativeSpeakCount,
      }));
      assert.strictEqual(
        afterSpeakState.nativeSpeakCount,
        0,
        "Scenario A: Must route directly to TTS3 without stalling on native Web Speech when matching voice is absent",
      );

      // Scenario C: Toggle TTS-Play OFF -> advance cues -> verify NO new TTS3 requests -> toggle ON -> verify TTS fires again
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.getByTestId("menu-option-tts-play").click();
      const disabledText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(disabledText.includes("Disabled"), "Expected Disabled after toggle OFF");
      await page.getByTestId("floating-menu-toggle-btn").click();

      const countBeforeDisabledPlay = tts3Requests.length;
      await page.evaluate(() => {
        const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } }).__mockYtPlayer;
        p.seekTo(12.0);
        p.playVideo();
      });
      await page.waitForTimeout(250);
      for (let step = 0; step < 6; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.85;
        });
        await page.waitForTimeout(180);
      }
      assert.strictEqual(
        tts3Requests.length,
        countBeforeDisabledPlay,
        "Scenario C: While TTS-Play is Disabled, video must play without triggering TTS",
      );

      // Re-enable TTS-Play via menu while video is playing
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.getByTestId("menu-option-tts-play").click();
      const reEnabledText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(reEnabledText.includes("Enabled"), "Expected Enabled after toggle ON");
      await page.getByTestId("floating-menu-toggle-btn").click();

      // Advance smoothly across cue boundary while playing
      await advanceSmoothlyUntilTts(countBeforeDisabledPlay, 14);

      assert.ok(
        tts3Requests.length > countBeforeDisabledPlay,
        `Scenario C: Expected TTS-Play to resume triggering after re-enabling on floating menu (before=${countBeforeDisabledPlay}, after=${tts3Requests.length})`,
      );
      console.log("✅ PASS [Scenario C]: Re-enabling menu-option-tts-play while video is playing reactivates TTS-Play.");

      // Scenario D1: Enable Pause for Setup -> wait 500ms -> click YT player directly -> TTS-Play still activates
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.getByTestId("menu-option-setup-pause").click();
      await page.getByTestId("floating-menu-toggle-btn").click();
      await page.waitForTimeout(500);

      const countBeforeDirectPlay = tts3Requests.length;
      await page.evaluate(() => {
        const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } }).__mockYtPlayer;
        p.seekTo(34.0);
        p.playVideo();
      });
      await page.waitForTimeout(250);
      await advanceSmoothlyUntilTts(countBeforeDirectPlay, 14);
      assert.ok(
        tts3Requests.length > countBeforeDirectPlay,
        `Scenario D1: Direct player play after Pause for Setup must clear setup pause so TTS-Play activates (before=${countBeforeDirectPlay}, after=${tts3Requests.length})`,
      );
      console.log("✅ PASS [Scenario D1]: Direct video play clears stale setup pause and activates TTS-Play.");

      // Scenario D2: Beginner Mode parity
      await page.evaluate(() => {
        window.localStorage.setItem("app_workflow_mode", "beginner");
      });
      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=beginner`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 15000 });
      await page.getByTestId("beginner-tab-video").click();
      await page.waitForTimeout(600);

      const begLoadSample = page.getByTestId("btn-load-sample-subs");
      if ((await begLoadSample.count()) > 0 && (await begLoadSample.isVisible())) {
        await begLoadSample.click();
        await page.waitForTimeout(400);
      }

      await page.getByTestId("floating-menu-toggle-btn").click();
      const begOptText = (await page.getByTestId("menu-option-tts-play").textContent()) || "";
      assert.ok(begOptText.includes("Enabled"), "Beginner Mode menu-option-tts-play must display Enabled");
      await page.getByTestId("floating-menu-toggle-btn").click();

      const countBeforeBeginner = tts3Requests.length;
      await page.evaluate(() => {
        const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } }).__mockYtPlayer;
        p.seekTo(45.0);
        p.playVideo();
      });
      await page.waitForTimeout(250);
      await advanceSmoothlyUntilTts(countBeforeBeginner, 14);
      assert.ok(
        tts3Requests.length > countBeforeBeginner,
        `Scenario D2 (Beginner Parity): Expected TTS-Play active during Beginner playback (before=${countBeforeBeginner}, after=${tts3Requests.length})`,
      );
      console.log("✅ PASS [Scenario D2]: Beginner Mode parity confirmed.");

      assert.strictEqual(await page.getByTestId("floating-error-button").count(), 0, "Zero floating errors expected");
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
    }

    // =========================================================================
    // Scenario B: Matching native voice exists in getVoices(), but Chrome hangs
    // without calling onstart/onend -> startup watchdog recovers via TTS3 (~2.2s)
    // =========================================================================
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();

      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const tts3WatchdogHits: string[] = [];
      await page.route("**/youtube.com/iframe_api*", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "/* mocked youtube iframe_api */",
        });
      });
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3WatchdogHits.push(route.request().url());
        route.fulfill({
          status: 200,
          contentType: "audio/wav",
          body: silentWavBuffer,
        });
      });

      await page.addInitScript(`(() => {
        window.localStorage.setItem("app_workflow_mode", "expert");
        window.__nativeSpeakAttempted = 0;

        var mockSynth = {
          speaking: false,
          paused: false,
          pending: false,
          getVoices: function () {
            return [
              { name: "Broken Hebrew Voice", lang: "he-IL", voiceURI: "broken-he", localService: true, default: false },
              { name: "Broken Italian Voice", lang: "it-IT", voiceURI: "broken-it", localService: true, default: false },
              { name: "Broken Spanish Voice", lang: "es-ES", voiceURI: "broken-es", localService: true, default: false }
            ];
          },
          speak: function () {
            window.__nativeSpeakAttempted = Number(window.__nativeSpeakAttempted || 0) + 1;
            // Intentionally NEVER calls onstart or onend to simulate Chrome speech daemon hang!
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
          this.lang = "he-IL";
          this.rate = 1;
          this.volume = 1;
        };

        var state = { currentTime: 0, duration: 180, playerState: 2, playbackRate: 1, lastTickAt: Date.now() };
        window.__mockYtState = state;
        function MockYTPlayer(_el, opts) {
          this.onStateChange = opts && opts.events && opts.events.onStateChange;
          window.__mockYtPlayer = this;
          setTimeout(function () {
            if (opts && opts.events && opts.events.onReady) opts.events.onReady();
          }, 40);
        }
        MockYTPlayer.prototype.playVideo = function () { state.playerState = 1; if (this.onStateChange) this.onStateChange({ data: 1 }); };
        MockYTPlayer.prototype.pauseVideo = function () { state.playerState = 2; if (this.onStateChange) this.onStateChange({ data: 2 }); };
        MockYTPlayer.prototype.seekTo = function (sec) { state.currentTime = sec; };
        MockYTPlayer.prototype.getCurrentTime = function () { return state.currentTime; };
        MockYTPlayer.prototype.getDuration = function () { return state.duration; };
        MockYTPlayer.prototype.getPlayerState = function () { return state.playerState; };
        MockYTPlayer.prototype.getPlaybackRate = function () { return state.playbackRate; };
        MockYTPlayer.prototype.getVideoData = function () { return { title: "Watchdog Test" }; };
        MockYTPlayer.prototype.getOption = function () { return undefined; };
        MockYTPlayer.prototype.setOption = function () {};
        MockYTPlayer.prototype.loadModule = function () {};
        MockYTPlayer.prototype.mute = function () {};
        MockYTPlayer.prototype.unMute = function () {};
        MockYTPlayer.prototype.isMuted = function () { return false; };
        MockYTPlayer.prototype.destroy = function () {};
        window.YT = { Player: MockYTPlayer };
      })();`);

      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(800);

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(250);
      for (let step = 0; step < 12; step++) {
        await page.evaluate(() => {
          const s = (window as unknown as { __mockYtState: { currentTime: number } }).__mockYtState;
          s.currentTime += 0.85;
        });
        await page.waitForTimeout(220);
        const attempted = await page.evaluate(
          () => (window as unknown as { __nativeSpeakAttempted: number }).__nativeSpeakAttempted,
        );
        if (attempted >= 1) break;
      }

      // Wait ~2.8s for startup watchdog (2.2s) -> TTS3 fallback recovery (well under old 16s stall!)
      await page.waitForTimeout(3000);

      const watchdogStats = await page.evaluate(() => ({
        nativeAttempted: (window as unknown as { __nativeSpeakAttempted: number }).__nativeSpeakAttempted,
      }));
      assert.ok(watchdogStats.nativeAttempted >= 1, "Expected native voice attempt when matching voice exists");
      assert.ok(
        tts3WatchdogHits.length >= 1,
        `Scenario B: Startup watchdog must recover hanging native voice via TTS3 within ~2.2s (hits=${tts3WatchdogHits.length})`,
      );
      console.log(`✅ PASS [Scenario B]: Hanging native voice recovered seamlessly via startup watchdog -> TTS3 (${tts3WatchdogHits.length} fallback calls).`);

      assert.strictEqual(await page.getByTestId("floating-error-button").count(), 0, "Zero floating errors expected");
      assert.deepEqual(pageErrors, [], `Unexpected pageerror: ${pageErrors.join("; ")}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await runLiveE2E();
console.log("=========================================================================");
console.log("🎉 ALL TASK 427 FLOATING TTS-PLAY ACTIVE DURING VIDEO CHECKS PASSED!");
console.log("=========================================================================");
