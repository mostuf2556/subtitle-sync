import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const knownHeadlessPath =
    "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
  const executablePath = fs.existsSync(knownHeadlessPath) ? knownHeadlessPath : undefined;

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("TTS") || text.includes("speak") || text.includes("State Machine")) {
      console.log(`[C] ${text}`);
    }
  });

  page.on("pageerror", (err) => console.log(`[E] ${err.message}`));

  await page.route("**/youtube.com/iframe_api*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* mocked youtube iframe_api */",
    });
  });

  await page.addInitScript(`(() => {
    if (!window.sessionStorage.getItem("__seeded_once")) {
      window.sessionStorage.setItem("__seeded_once", "1");
      window.localStorage.clear();
    }
    window.localStorage.setItem("app_workflow_mode", JSON.stringify("expert"));

    var mockSynth = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: function () {
        return [
          { name: "Google US English", lang: "en-US", voiceURI: "Google US English", localService: false, default: true },
          { name: "Hebrew Voice", lang: "he-IL", voiceURI: "Hebrew Voice", localService: false, default: false },
          { name: "Italian Voice", lang: "it-IT", voiceURI: "Italian Voice", localService: false, default: false },
          { name: "Spanish Voice", lang: "es-ES", voiceURI: "Spanish Voice", localService: false, default: false },
          { name: "Russian Voice", lang: "ru-RU", voiceURI: "Russian Voice", localService: false, default: false },
          { name: "Arabic Voice", lang: "ar-SA", voiceURI: "Arabic Voice", localService: false, default: false },
        ];
      },
      speak: function (u) {
        mockSynth.speaking = true;
        console.log("[MOCK SYNTH SPEAK] text=" + u.text + " lang=" + u.lang);
        setTimeout(function () {
          if (u && typeof u.onstart === "function") u.onstart();
        }, 10);
        setTimeout(function () {
          mockSynth.speaking = false;
          if (u && typeof u.onend === "function") u.onend();
        }, 60);
      },
      cancel: function () { mockSynth.speaking = false; },
      pause: function () {},
      resume: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
    };
    try {
      Object.defineProperty(window, "speechSynthesis", { value: mockSynth, configurable: true });
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
        this.lang = "en-US";
        this.rate = 1;
        this.volume = 1;
      };
    } catch {}

    var state = { currentTime: 0, duration: 300, playerState: 2, playbackRate: 1, lastTickAt: Date.now() };
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
      try {
        if (_el && typeof _el.appendChild === "function" && !_el.querySelector("iframe")) {
          var iframeEl = document.createElement("iframe");
          iframeEl.style.display = "none";
          _el.appendChild(iframeEl);
        }
      } catch {}
      setTimeout(function () {
        if (opts && opts.events && opts.events.onReady) opts.events.onReady();
      }, 30);
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
    window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
  })()`);

  await page.goto("http://localhost:3000/?v=L2Ryrr6txwA&mode=expert&stage=2", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const diag = await page.evaluate(() => {
    const rows = document.querySelectorAll("#subtitles-table-panel [data-row]");
    const cols = Array.from(document.querySelectorAll('[data-testid^="table-header-col-"]')).map((el) =>
      el.getAttribute("data-testid")?.replace("table-header-col-", "")
    );
    return {
      rowCount: rows.length,
      columnsInTable: cols,
      spoken: localStorage.getItem("yt_spoken_languages_v1"),
      shown: localStorage.getItem("yt_shown_languages_v1"),
    };
  });

  console.log("Full Mocked Diag:", JSON.stringify(diag, null, 2));

  await browser.close();
}

main().catch(console.error);
