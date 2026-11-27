import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import {
  clearAlternativeTtsAudioCache,
  executeTtsFallbackSequence,
  isTtsServiceActivelyUsed,
  markTtsServiceSessionActive,
  setAlternativeTtsMode,
  setTtsFallbackOrder,
  setUseAlternativeTts,
} from "../src/lib/alternative-tts";

const APP_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

async function runUnitAndContractChecks() {
  console.log("1. Running unit & source contracts for default native TTS cold start...");

  // Source contracts
  const mainActivitySrc = fs.readFileSync(
    path.resolve("android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt"),
    "utf-8",
  );
  assert.ok(
    mainActivitySrc.includes("isTtsInitializing") &&
      mainActivitySrc.includes("pendingSpeakRequest") &&
      mainActivitySrc.includes("executeNativeSpeak") &&
      mainActivitySrc.includes("JSONObject.quote"),
    "MainActivity.kt must queue pre-onInit utterances, extract executeNativeSpeak, and quote JS callback strings safely",
  );

  const routesSrc = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf-8");
  assert.ok(
    routesSrc.includes("waitForAndroidTtsReady") &&
      routesSrc.includes("waitForSpeechSynthesisVoices"),
    "src/routes/index.tsx must await Android readiness and cold Web Speech voiceschanged",
  );

  // Node unit checks for executeTtsFallbackSequence
  const origWindow = (globalThis as { window?: unknown }).window;
  const origUtterance = (globalThis as { SpeechSynthesisUtterance?: unknown })
    .SpeechSynthesisUtterance;
  const origFetch = globalThis.fetch;

  try {
    let cancelCount = 0;
    let spokenVoiceUri = "";
    let voicesLoaded = false;
    const listeners = new Set<() => void>();

    const mockSynth = {
      speaking: false,
      pending: false,
      paused: false,
      getVoices: () =>
        voicesLoaded
          ? [
              {
                name: "Android Legacy Hebrew",
                lang: "iw-IL",
                voiceURI: "android-iw-il",
                localService: true,
                default: false,
              },
            ]
          : [],
      addEventListener: (_evt: string, cb: () => void) => {
        listeners.add(cb);
      },
      removeEventListener: (_evt: string, cb: () => void) => {
        listeners.delete(cb);
      },
      cancel: () => {
        cancelCount += 1;
      },
      resume: () => {},
      speak: (u: {
        voice?: { voiceURI?: string };
        onstart?: () => void;
        onend?: () => void;
      }) => {
        spokenVoiceUri = u.voice?.voiceURI || "";
        // Simulate real browser cold engine: pending=true for 1500ms (> old 1200ms killer) before onstart
        mockSynth.pending = true;
        setTimeout(() => {
          mockSynth.pending = false;
          mockSynth.speaking = true;
          u.onstart?.();
          setTimeout(() => {
            mockSynth.speaking = false;
            u.onend?.();
          }, 80);
        }, 1500);
      },
    };

    class MockUtterance {
      text: string;
      lang = "";
      rate = 1;
      volume = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onboundary: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    (globalThis as { window?: unknown }).window = { speechSynthesis: mockSynth };
    (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
      MockUtterance;
    globalThis.fetch = (async () => {
      throw new Error("Offline TTS3 mock");
    }) as typeof fetch;

    clearAlternativeTtsAudioCache();
    setTtsFallbackOrder("native_tts3");
    setUseAlternativeTts(false);
    setAlternativeTtsMode("fallback_only");
    markTtsServiceSessionActive(false);

    // Fire voiceschanged asynchronously at 120ms (after cold empty initial getVoices())
    setTimeout(() => {
      voicesLoaded = true;
      for (const cb of listeners) cb();
    }, 120);

    const outcome = await executeTtsFallbackSequence(
      "שלום עולם",
      "he",
      1.0,
      "native_tts3",
    );
    assert.equal(
      outcome,
      "native",
      "executeTtsFallbackSequence must complete via native TTS when voices load asynchronously and cold onstart takes 1500ms",
    );
    assert.equal(cancelCount, 0, "Cold native speech must NOT be cancelled at 1200ms");
    assert.equal(
      spokenVoiceUri,
      "android-iw-il",
      "Hebrew target ('he') must match 'iw-IL' voice alias and attach u.voice",
    );
    assert.equal(
      isTtsServiceActivelyUsed(),
      false,
      "Session active flag must remain false when native TTS succeeds",
    );

    console.log("✔ Unit & contract checks passed (voiceschanged + iw/he alias + 1500ms cold start).");
  } finally {
    globalThis.fetch = origFetch;
    if (origWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = origWindow;
    }
    if (origUtterance === undefined) {
      delete (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    } else {
      (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
        origUtterance;
    }
  }
}

async function installWebColdStartMocks(page: Page, mode: "expert" | "beginner") {
  await page.route("**/youtube.com/iframe_api*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* mocked youtube iframe_api */",
    });
  });

  await page.addInitScript(`((modeArg) => {
    window.localStorage.clear();
    if (modeArg === "beginner") {
      window.localStorage.setItem("app_workflow_mode", "beginner");
    }

    var voicesLoaded = false;
    var voicesListeners = [];
    var mockVoices = [
      { name: "Mock Hebrew (iw)", lang: "iw-IL", voiceURI: "mock-iw", localService: true, default: false },
      { name: "Mock Italian", lang: "it-IT", voiceURI: "mock-it", localService: true, default: false },
      { name: "Mock English", lang: "en-US", voiceURI: "mock-en", localService: true, default: true }
    ];

    window.__nativeWebStats = {
      speakCalls: [],
      cancelCalls: 0,
      cancelDuringSpeechCalls: 0,
      cancelStacks: [],
      startedCount: 0,
      endedCount: 0,
      matchedVoicesAttached: 0
    };

    setTimeout(function () {
      voicesLoaded = true;
      voicesListeners.forEach(function (fn) { try { fn(); } catch (_) {} });
      if (typeof mockSynth.onvoiceschanged === "function") {
        try { mockSynth.onvoiceschanged(); } catch (_) {}
      }
    }, 280);

    var mockSynth = {
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      getVoices: function () {
        return voicesLoaded ? mockVoices : [];
      },
      addEventListener: function (ev, fn) {
        if (ev === "voiceschanged" && typeof fn === "function") {
          voicesListeners.push(fn);
        }
      },
      removeEventListener: function (ev, fn) {
        if (ev === "voiceschanged") {
          voicesListeners = voicesListeners.filter(function (f) { return f !== fn; });
        }
      },
      speak: function (utterance) {
        var idx = window.__nativeWebStats.speakCalls.length;
        var coldLatencyMs = idx === 0 ? 1500 : 180;
        var cancelled = false;
        utterance.__markCancelled = function () { cancelled = true; };
        window.__nativeWebStats.__currentUtterance = utterance;
        window.__nativeWebStats.speakCalls.push({
          text: utterance.text,
          lang: utterance.lang,
          voiceURI: utterance.voice ? utterance.voice.voiceURI : ""
        });
        if (utterance.voice && utterance.voice.voiceURI) {
          window.__nativeWebStats.matchedVoicesAttached += 1;
        }
        mockSynth.pending = true;
        setTimeout(function () {
          if (cancelled) return;
          mockSynth.pending = false;
          mockSynth.speaking = true;
          window.__nativeWebStats.startedCount += 1;
          if (typeof utterance.onstart === "function") utterance.onstart();
          setTimeout(function () {
            if (cancelled) return;
            mockSynth.speaking = false;
            window.__nativeWebStats.endedCount += 1;
            if (typeof utterance.onend === "function") utterance.onend();
          }, 90);
        }, coldLatencyMs);
      },
      cancel: function () {
        window.__nativeWebStats.cancelCalls += 1;
        if (mockSynth.pending || mockSynth.speaking) {
          window.__nativeWebStats.cancelDuringSpeechCalls += 1;
          window.__nativeWebStats.cancelStacks.push(String(new Error().stack || "").slice(0, 500));
        }
        if (window.__nativeWebStats.__currentUtterance && window.__nativeWebStats.__currentUtterance.__markCancelled) {
          window.__nativeWebStats.__currentUtterance.__markCancelled();
        }
        mockSynth.pending = false;
        mockSynth.speaking = false;
      },
      pause: function () { mockSynth.paused = true; },
      resume: function () { mockSynth.paused = false; }
    };
    Object.defineProperty(window, "speechSynthesis", { value: mockSynth, configurable: true });
    window.SpeechSynthesisUtterance = function (text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.volume = 1;
      this.voice = null;
    };

    var ytState = { currentTime: 0, duration: 180, playerState: 2, playbackRate: 1, lastTickAt: Date.now() };
    window.__mockYtState = ytState;
    function advanceTime() {
      var now = Date.now();
      if (ytState.playerState === 1) {
        ytState.currentTime = Math.min(ytState.duration, ytState.currentTime + ((now - ytState.lastTickAt) / 1000) * ytState.playbackRate);
      }
      ytState.lastTickAt = now;
    }
    function MockYTPlayer(_el, opts) {
      this.onStateChange = opts && opts.events && opts.events.onStateChange;
      window.__mockYtPlayer = this;
      setTimeout(function () {
        if (opts && opts.events && opts.events.onReady) opts.events.onReady();
      }, 40);
    }
    MockYTPlayer.prototype.playVideo = function () { advanceTime(); ytState.playerState = 1; ytState.lastTickAt = Date.now(); if (this.onStateChange) this.onStateChange({ data: 1 }); };
    MockYTPlayer.prototype.pauseVideo = function () { advanceTime(); ytState.playerState = 2; ytState.lastTickAt = Date.now(); if (this.onStateChange) this.onStateChange({ data: 2 }); };
    MockYTPlayer.prototype.stopVideo = function () { ytState.playerState = 0; ytState.currentTime = 0; };
    MockYTPlayer.prototype.seekTo = function (sec) { ytState.currentTime = sec; ytState.lastTickAt = Date.now(); };
    MockYTPlayer.prototype.getCurrentTime = function () { advanceTime(); return ytState.currentTime; };
    MockYTPlayer.prototype.getDuration = function () { return ytState.duration; };
    MockYTPlayer.prototype.getPlayerState = function () { return ytState.playerState; };
    MockYTPlayer.prototype.getPlaybackRate = function () { return ytState.playbackRate; };
    MockYTPlayer.prototype.setPlaybackRate = function (r) { ytState.playbackRate = r; };
    MockYTPlayer.prototype.getVideoData = function () { return { title: "Cold Native TTS E2E" }; };
    MockYTPlayer.prototype.getOption = function () { return undefined; };
    MockYTPlayer.prototype.setOption = function () {};
    MockYTPlayer.prototype.loadModule = function () {};
    MockYTPlayer.prototype.mute = function () {};
    MockYTPlayer.prototype.unMute = function () {};
    MockYTPlayer.prototype.isMuted = function () { return false; };
    MockYTPlayer.prototype.destroy = function () {};
    window.YT = { Player: MockYTPlayer };
  })(${JSON.stringify(mode)});`);
}

async function runLiveE2EChecks() {
  console.log("2. Running live Chromium cold-start E2E checks (Web Expert, Web Beginner, Android)...");
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    // -------------------------------------------------------------------------
    // Scenario 1A & 1B: Web Clean Default (Expert & Beginner Parity)
    // Delayed voiceschanged (280ms) + Slow cold onstart (1500ms) + Offline TTS3
    // -------------------------------------------------------------------------
    for (const mode of ["expert", "beginner"] as const) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      let tts3Hits = 0;
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Hits += 1;
        route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline"}' });
      });

      await installWebColdStartMocks(page, mode);
      const targetUrl =
        mode === "expert"
          ? `${APP_URL}/?debug=true`
          : `${APP_URL}/?mode=beginner&debug=true`;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

      if (mode === "beginner") {
        await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 15000 });
        await page.getByTestId("beginner-tab-video").click();
      }
      await page.waitForSelector('[data-testid="floating-pause-button"]', { timeout: 15000 });
      await page.waitForTimeout(700);

      await page.getByTestId("floating-pause-button").click();
      await page.waitForTimeout(200);

      for (let step = 0; step < 30; step++) {
        const progress = await page.evaluate(() => {
          const w = window as unknown as {
            __mockYtState: { currentTime: number; playerState: number };
            __nativeWebStats?: { speakCalls: unknown[]; startedCount: number };
          };
          if (w.__mockYtState.playerState === 1 && (w.__nativeWebStats?.speakCalls.length || 0) === 0) {
            w.__mockYtState.currentTime =
              w.__mockYtState.currentTime >= 22 ? 0.5 : w.__mockYtState.currentTime + 0.6;
          }
          return {
            speakCalls: w.__nativeWebStats?.speakCalls.length || 0,
            startedCount: w.__nativeWebStats?.startedCount || 0,
          };
        });
        if (progress.startedCount >= 1) break;
        await page.waitForTimeout(220);
      }

      // Wait briefly for slow 1500ms cold utterance and second language step to finish
      await page.waitForTimeout(2100);

      const stats = await page.evaluate(() => ({
        web: (
          window as unknown as {
            __nativeWebStats: {
              speakCalls: Array<{ text: string; lang: string; voiceURI: string }>;
              cancelCalls: number;
              cancelDuringSpeechCalls: number;
              cancelStacks: string[];
              startedCount: number;
              endedCount: number;
              matchedVoicesAttached: number;
            };
          }
        ).__nativeWebStats,
        sessionActive: window.sessionStorage.getItem("yt_tts_service_session_active_v1"),
      }));

      assert.ok(
        stats.web.speakCalls.length >= 1,
        `[${mode}] Expected native speechSynthesis.speak calls on clean default load`,
      );
      assert.ok(
        stats.web.startedCount >= 1 && stats.web.endedCount >= 1,
        `[${mode}] Expected slow cold (1500ms) native utterance to start & complete cleanly (stats=${JSON.stringify(stats.web)})`,
      );
      assert.equal(
        stats.web.cancelDuringSpeechCalls,
        0,
        `[${mode}] Expected zero premature speechSynthesis.cancel calls during active/pending cold speech (got ${stats.web.cancelDuringSpeechCalls}, stacks=${JSON.stringify(stats.web.cancelStacks)})`,
      );
      assert.ok(
        stats.web.matchedVoicesAttached >= 1,
        `[${mode}] Expected voiceschanged-loaded matched voice (including iw-IL alias for he) to attach on first speech`,
      );
      assert.equal(
        tts3Hits,
        0,
        `[${mode}] Expected 0 external TTS3 requests when cold native TTS succeeds (got ${tts3Hits})`,
      );
      assert.notEqual(
        stats.sessionActive,
        "true",
        `[${mode}] Expected TTS3 session flag to remain unset when offline TTS3 isn't played`,
      );
      assert.deepEqual(pageErrors, [], `[${mode}] Unexpected pageerror: ${pageErrors.join("; ")}`);

      await context.close();
      console.log(
        `✅ PASS [Web Cold Start - ${mode}]: Cold voiceschanged + 1500ms onstart + iw/he alias succeeded natively with 0 cancels & 0 TTS3 hits.`,
      );
    }

    // -------------------------------------------------------------------------
    // Scenario 2: Android Cold TextToSpeech Initialization (isTtsReady false -> true at 900ms)
    // -------------------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));

      const enFixture = fs.readFileSync("public/fixtures/L2Ryrr6txwA/en.json", "utf8");
      const esFixture = fs.readFileSync("public/fixtures/L2Ryrr6txwA/es.json", "utf8");

      let tts3Hits = 0;
      await page.route("**/youtube.com/iframe_api*", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "/* mocked youtube iframe_api */",
        });
      });
      await page.route("**/tts3.lovable.app/**", (route) => {
        tts3Hits += 1;
        route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline"}' });
      });

      await page.addInitScript(`((captions) => {
        window.localStorage.clear();
        window.localStorage.setItem("app_workflow_mode", "expert");

        var ttsReady = false;
        window.__androidColdStats = {
          isTtsReadyPolls: 0,
          speakCalls: [],
          ttsStarted: 0,
          ttsDone: 0
        };
        window.__androidColdCaptions = captions;

        // Simulate Android APK cold TextToSpeech binding taking 900ms before onInit finishes
        setTimeout(function () {
          ttsReady = true;
        }, 900);

        window.AndroidNativeShell = {
          isNativeShell: function () { return true; },
          isTtsReady: function () {
            window.__androidColdStats.isTtsReadyPolls += 1;
            return ttsReady;
          },
          speak: function (text, lang, rate, utteranceId) {
            if (!ttsReady) return false;
            window.__androidColdStats.speakCalls.push({ text: text, lang: lang, utteranceId: utteranceId });
            setTimeout(function () {
              window.__androidColdStats.ttsStarted += 1;
              if (typeof window.onNativeTTSStart === "function") window.onNativeTTSStart(utteranceId);
              setTimeout(function () {
                window.__androidColdStats.ttsDone += 1;
                if (typeof window.onNativeTTSDone === "function") window.onNativeTTSDone(utteranceId);
              }, 80);
            }, 120);
            return true;
          },
          stopSpeaking: function () {},
          getLastObservedTimedTextUrl: function () {
            return "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
          },
          fetchTimedTextExact: function (url) {
            var isEs = String(url || "").includes("lang=es") || String(url || "").includes("tlang=es");
            return JSON.stringify({ status: 200, body: isEs ? captions.es : captions.en, sentUrl: url });
          },
          setBackgroundAudioEnabled: function () { return true; },
          updateMediaMetadata: function () {}
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
        MockYTPlayer.prototype.getVideoData = function () { return { title: "Android Cold Init Test" }; };
        MockYTPlayer.prototype.getOption = function () { return undefined; };
        MockYTPlayer.prototype.setOption = function () {};
        MockYTPlayer.prototype.loadModule = function () {};
        MockYTPlayer.prototype.mute = function () {};
        MockYTPlayer.prototype.unMute = function () {};
        MockYTPlayer.prototype.isMuted = function () { return false; };
        MockYTPlayer.prototype.destroy = function () {};
        window.YT = { Player: MockYTPlayer };
      })(${JSON.stringify({ en: enFixture, es: esFixture })});`);

      await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=3&android=true`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="floating-menu-toggle-btn"]', { timeout: 15000 });

      // Immediately deliver intercepted captions & trigger Play+TTS before 900ms cold init finishes!
      await page.evaluate(() => {
        const captions = (window as unknown as { __androidColdCaptions?: { en: string; es: string } })
          .__androidColdCaptions;
        if (captions && typeof window.onNativeCaptionsInterceptedBase64 === "function") {
          window.onNativeCaptionsInterceptedBase64(
            btoa(
              JSON.stringify({
                url: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
                rawData: captions.en,
              }),
            ),
          );
          window.onNativeCaptionsInterceptedBase64(
            btoa(
              JSON.stringify({
                url: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&tlang=es&fmt=json3",
                rawData: captions.es,
              }),
            ),
          );
        }
      });
      await page.waitForTimeout(150);

      await page.getByTestId("floating-pause-button").tap();
      await page.waitForTimeout(1200);

      const androidStats = await page.evaluate(
        () =>
          (
            window as unknown as {
              __androidColdStats: {
                isTtsReadyPolls: number;
                speakCalls: Array<{ text: string; lang: string }>;
                ttsStarted: number;
                ttsDone: number;
              };
            }
          ).__androidColdStats,
      );

      assert.ok(
        androidStats.isTtsReadyPolls >= 1,
        `Android cold init test must poll isTtsReady() before giving up (polls=${androidStats.isTtsReadyPolls})`,
      );
      assert.ok(
        androidStats.speakCalls.length >= 1 &&
          androidStats.ttsStarted >= 1 &&
          androidStats.ttsDone >= 1,
        `Android native TTS must wait for isTtsReady (900ms) and execute natively (stats=${JSON.stringify(androidStats)})`,
      );
      assert.equal(
        tts3Hits,
        0,
        `Android cold native TTS must not fall back to TTS3 when cold init completes in 900ms (tts3Hits=${tts3Hits})`,
      );
      assert.deepEqual(pageErrors, [], `Unexpected Android pageerror: ${pageErrors.join("; ")}`);

      await context.close();
      console.log(
        `✅ PASS [Android Cold Init]: Awaited 900ms TextToSpeech init (${androidStats.isTtsReadyPolls} polls) and executed ${androidStats.speakCalls.length} native utterances with 0 TTS3 fallbacks.`,
      );
    }
  } finally {
    await browser.close();
  }
}

await runUnitAndContractChecks();
await runLiveE2EChecks();
console.log("=========================================================================");
console.log("🎉 ALL DEFAULT NATIVE TTS COLD-START & READINESS REGRESSION CHECKS PASSED!");
console.log("=========================================================================");
