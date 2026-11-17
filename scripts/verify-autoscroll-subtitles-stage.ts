import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  getAutoScrollSetting,
  setAutoScrollSetting,
  AUTO_SCROLL_STORAGE_KEY,
} from "../src/utils/appSettings";

console.log("=========================================================================");
console.log("🧪 Verifying Task 415 (Prompt 204 Ch. 2): Auto-Scroll on Subtitles Stage");
console.log("=========================================================================");

// --- 1. Unit verification of getAutoScrollSetting / setAutoScrollSetting ---
{
  const storage = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, val: string) => storage.set(key, val),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  };

  assert.equal(getAutoScrollSetting(), false, "Default auto-scroll setting must be false");
  setAutoScrollSetting(true);
  assert.equal(storage.get(AUTO_SCROLL_STORAGE_KEY), "true");
  assert.equal(
    getAutoScrollSetting(),
    true,
    "getAutoScrollSetting() must return true when persisted as 'true'",
  );
  setAutoScrollSetting(false);
  assert.equal(getAutoScrollSetting(), false, "getAutoScrollSetting() must return false when disabled");
  console.log("✅ Step 1 PASS: Auto-scroll persistence getter/setter unit checks passed.");
}

// --- 2. Source contract checks ---
const root = process.cwd();
const appSettingsSrc = fs.readFileSync(path.join(root, "src/utils/appSettings.ts"), "utf8");
const indexSrc = fs.readFileSync(path.join(root, "src/routes/index.tsx"), "utf8");
const beginnerFlowSrc = fs.readFileSync(
  path.join(root, "src/components/beginner/BeginnerFlowContainer.tsx"),
  "utf8",
);

assert.ok(
  !appSettingsSrc.includes('return val === "true" ? false : false'),
  "appSettings.ts must not force getAutoScrollSetting() to false",
);
assert.ok(
  indexSrc.includes("autoScrollToggleBypassUntilRef") &&
    indexSrc.includes("resetUserInteractionTimestamp();"),
  "onAutoFocusChange(true) must clear user-interaction cooldown and bypass bubbling toggle events",
);
assert.ok(
  indexSrc.includes('[data-testid="floating-draggable-pause-container"]'),
  "onUserInteraction must ignore clicks/pointer events inside floating-draggable-pause-container",
);
const interactionBlockMatch = indexSrc.match(
  /const events = \[\s*([\s\S]*?)\]\s*as const;/,
);
assert.ok(interactionBlockMatch, "Expected window interaction events array in src/routes/index.tsx");
assert.ok(
  !interactionBlockMatch[1].includes('"mousemove"'),
  "Passive mousemove must NOT continuously trigger the 5s auto-scroll cooldown",
);
assert.ok(
  indexSrc.includes("isFormInputFocused") &&
    indexSrc.includes("isInSetupOrSettingsFocus") &&
    indexSrc.includes("scrollPanelToTargetRow") &&
    indexSrc.includes("AUTO_SCROLL_COOLDOWN_MS - elapsed"),
  "Auto-scroll effect must scope focus guard, use inner panel scroll, and schedule post-cooldown retry",
);
assert.ok(
  beginnerFlowSrc.includes("disableScrolling={disableScrolling}") &&
    indexSrc.includes("onDisableScrollingChange={onDisableScrollingChange}"),
  "BeginnerFlowContainer must forward disableScrolling and disableAutoFocus state for full parity",
);
console.log("✅ Step 2 PASS: Source contracts verified.");

// --- 3. Live Playwright Chromium E2E Verification ---
const APP_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const knownHeadlessPath =
  "/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell";
const altHeadlessPath = "/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell";
const executablePath = fs.existsSync(knownHeadlessPath)
  ? knownHeadlessPath
  : fs.existsSync(altHeadlessPath)
    ? altHeadlessPath
    : undefined;

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

const silentWavBuffer = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  "base64",
);

const mockPlayerInitScript = (initialMode: "expert" | "beginner") => `(() => {
  if (!window.sessionStorage.getItem("__seeded_once")) {
    window.sessionStorage.setItem("__seeded_once", "1");
    window.localStorage.clear();
  }
  window.localStorage.setItem("app_workflow_mode", ${JSON.stringify(initialMode)});

  var mockSynth = {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: function () {
      return [
        { name: "Google US English", lang: "en-US", voiceURI: "Google US English", localService: false, default: true }
      ];
    },
    speak: function (u) {
      mockSynth.speaking = true;
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
})();`;

async function getRowTiming(page: import("playwright").Page, rowIndex: number): Promise<number> {
  return page.evaluate((idx) => {
    const row = document.querySelector(`#subtitles-table-panel [data-row="${idx}"]`);
    if (!row) return -1;
    const tsEl = row.querySelector('[data-testid="cue-row-timestamp"]');
    const txt = tsEl?.textContent || "";
    const match = txt.match(/(\d+):(\d{2})/);
    if (!match) return -1;
    return Number(match[1]) * 60 + Number(match[2]) + 0.5;
  }, rowIndex);
}

try {
  // =========================================================================
  // 3A. Advanced Mode (Stage 2: Subtitles Table)
  // =========================================================================
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.route("**/youtube.com/iframe_api*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* mocked youtube iframe_api */",
      });
    });
    await page.route("**/tts3.lovable.app/**", (route) => {
      route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
    });
    await page.route("**/*translate*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([[["translated"]]]),
      });
    });
    await page.route("**/tts3.lovable.app/**", (route) => {
      route.fulfill({ status: 200, contentType: "audio/wav", body: silentWavBuffer });
    });
    await page.route("**/*translate*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([[["translated"]]]) });
    });

    console.log("--> [3A] Navigating to Advanced Stage 2...");
    await page.addInitScript(mockPlayerInitScript("expert"));
    await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=expert&stage=2`, {
      waitUntil: "domcontentloaded",
    });

    console.log("--> [3A] Waiting for #subtitles-table-panel [data-row='20']...");
    await page.waitForSelector("#subtitles-table-panel [data-row='20']", { timeout: 25000 });
    await page.waitForTimeout(300);

    const initialMetrics = await page.evaluate(() => {
      const panel = document.getElementById("subtitles-table-panel")!;
      return {
        scrollTop: panel.scrollTop,
        clientHeight: panel.clientHeight,
        scrollHeight: panel.scrollHeight,
        rowCount: panel.querySelectorAll("[data-row]").length,
      };
    });
    console.log("--> [3A] Initial metrics:", initialMetrics);
    assert.ok(
      initialMetrics.scrollHeight > initialMetrics.clientHeight + 200,
      `Expected scrollable subtitles table (clientHeight=${initialMetrics.clientHeight}, scrollHeight=${initialMetrics.scrollHeight})`,
    );
    assert.equal(initialMetrics.scrollTop, 0, "Panel must start at scrollTop 0 when auto-scroll is disabled");

    // Start video and jump to row 18 while Auto-Scroll Subtitles is DISABLED -> must NOT auto-scroll
    const row18Sec = await getRowTiming(page, 18);
    assert.ok(row18Sec > 0, "Row 18 timestamp must be parseable");

    console.log(`--> [3A] Seeking to row 18 (${row18Sec}s) & playing while Auto-Scroll is DISABLED...`);
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } })
        .__mockYtPlayer;
      p.seekTo(sec);
      p.playVideo();
    }, row18Sec);
    await page.waitForTimeout(450);

    const scrollWhileDisabled = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.equal(
      scrollWhileDisabled,
      0,
      "Panel must remain at scrollTop 0 while Auto-Scroll Subtitles is Disabled",
    );

    // Enable Auto-Scroll Subtitles via Floating Menu
    console.log("--> [3A] Opening floating menu...");
    await page.getByTestId("floating-menu-toggle-btn").click();
    await page.waitForSelector('[data-testid="menu-option-auto-scroll"]', { timeout: 15000 });
    const beforeLabel = (await page.getByTestId("menu-option-auto-scroll").textContent()) || "";
    assert.ok(beforeLabel.includes("Disabled"), `Expected Disabled initially, got: ${beforeLabel}`);

    console.log("--> [3A] Clicking menu-option-auto-scroll...");
    await page.getByTestId("menu-option-auto-scroll").click();
    const afterLabel = (await page.getByTestId("menu-option-auto-scroll").textContent()) || "";
    assert.ok(afterLabel.includes("Enabled"), `Expected Enabled after click, got: ${afterLabel}`);

    // Close menu and check auto-scroll
    await page.getByTestId("floating-menu-toggle-btn").click();
    await page.waitForTimeout(350);

    const afterEnableState = await page.evaluate(() => {
      const panel = document.getElementById("subtitles-table-panel")!;
      const row18 = panel.querySelector('[data-row="18"]') as HTMLElement | null;
      const panelRect = panel.getBoundingClientRect();
      const rowRect = row18?.getBoundingClientRect();
      return {
        scrollTop: panel.scrollTop,
        autoScrollStorage: window.localStorage.getItem("yt_auto_scroll"),
        rowCentered: Boolean(
          rowRect && rowRect.top >= panelRect.top - 40 && rowRect.bottom <= panelRect.bottom + 40,
        ),
      };
    });
    assert.equal(afterEnableState.autoScrollStorage, "true", "localStorage yt_auto_scroll must be 'true'");
    assert.ok(
      afterEnableState.scrollTop > 100,
      `Enabling Auto-Scroll Subtitles must scroll #subtitles-table-panel to active row (scrollTop=${afterEnableState.scrollTop})`,
    );
    assert.ok(
      afterEnableState.rowCentered,
      "Row 18 must be scrolled into visible bounds of #subtitles-table-panel",
    );
    console.log(`✅ Step 3A.1 PASS: Enabling menu-option-auto-scroll scrolled Advanced table to row 18 (scrollTop=${Math.round(afterEnableState.scrollTop)}).`);

    // Move mouse over the table (previously mousemove blocked auto-scroll!) and seek to row 32
    const row32Sec = await getRowTiming(page, 32);
    assert.ok(row32Sec > row18Sec, "Row 32 timestamp must follow row 18");
    await page.mouse.move(640, 420);
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { seekTo: (s: number) => void } }).__mockYtPlayer;
      p.seekTo(sec);
    }, row32Sec);
    await page.waitForTimeout(450);

    const row32State = await page.evaluate(() => {
      const panel = document.getElementById("subtitles-table-panel")!;
      const row32 = panel.querySelector('[data-row="32"]') as HTMLElement | null;
      const panelRect = panel.getBoundingClientRect();
      const rowRect = row32?.getBoundingClientRect();
      return {
        scrollTop: panel.scrollTop,
        rowVisible: Boolean(
          rowRect && rowRect.top >= panelRect.top - 40 && rowRect.bottom <= panelRect.bottom + 40,
        ),
      };
    });
    assert.ok(
      row32State.scrollTop > afterEnableState.scrollTop,
      `Auto-scroll must advance further when active row moves to 32 even after mousemove (prev=${afterEnableState.scrollTop}, now=${row32State.scrollTop})`,
    );
    assert.ok(row32State.rowVisible, "Row 32 must be scrolled into view inside #subtitles-table-panel");
    console.log(`✅ Step 3A.2 PASS: Auto-scroll tracked playback to row 32 despite mouse movement (scrollTop=${Math.round(row32State.scrollTop)}).`);

    // Reload persistence check: yt_auto_scroll="true" must survive page reload
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#subtitles-table-panel [data-row='24']", { timeout: 25000 });
    await page.waitForTimeout(300);

    await page.getByTestId("floating-menu-toggle-btn").click();
    const persistedLabel = (await page.getByTestId("menu-option-auto-scroll").textContent()) || "";
    assert.ok(
      persistedLabel.includes("Enabled"),
      `Auto-Scroll Subtitles must remain Enabled after reload, got: ${persistedLabel}`,
    );
    await page.getByTestId("floating-menu-toggle-btn").click();

    const row24Sec = await getRowTiming(page, 24);
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } })
        .__mockYtPlayer;
      p.seekTo(sec);
      p.playVideo();
    }, row24Sec);
    await page.waitForTimeout(450);

    const scrollAfterReload = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.ok(
      scrollAfterReload > 150,
      `Auto-scroll must work immediately after reload when persisted as Enabled (scrollTop=${scrollAfterReload})`,
    );
    console.log(`✅ Step 3A.3 PASS: Reload preserved Enabled state and auto-scrolled to row 24 (scrollTop=${Math.round(scrollAfterReload)}).`);

    // 5s user-interaction cooldown & automatic post-cooldown resume check
    await page.evaluate(() => {
      const panel = document.getElementById("subtitles-table-panel")!;
      panel.scrollTop = 0;
      panel.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true }));
    });
    const row28Sec = await getRowTiming(page, 28);
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { seekTo: (s: number) => void } }).__mockYtPlayer;
      p.seekTo(sec);
    }, row28Sec);
    await page.waitForTimeout(300);

    const scrollDuringCooldown = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.equal(
      scrollDuringCooldown,
      0,
      "Auto-scroll must hold during the 5s user-interaction cooldown window",
    );

    await page.waitForTimeout(5100);
    const scrollAfterCooldown = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.ok(
      scrollAfterCooldown > 150,
      `Auto-scroll must automatically resume after 5s cooldown expires (scrollTop=${scrollAfterCooldown})`,
    );
    console.log(`✅ Step 3A.4 PASS: 5s cooldown held manual scroll=0 and resumed automatically (scrollTop=${Math.round(scrollAfterCooldown)}).`);

    assert.equal(pageErrors.length, 0, `Expected 0 pageerrors in Advanced mode, got: ${pageErrors.join("; ")}`);
    assert.equal(
      await page.getByTestId("floating-error-button").count(),
      0,
      "Expected zero floating error buttons in Advanced mode",
    );

    await context.close();
  }

  // =========================================================================
  // 3B. Beginner Mode Parity (Video Tab & Preferences Tab sync)
  // =========================================================================
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.route("**/youtube.com/iframe_api*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* mocked youtube iframe_api */",
      });
    });

    await page.addInitScript(mockPlayerInitScript("beginner"));
    await page.goto(`${APP_URL}/?v=L2Ryrr6txwA&mode=beginner`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="beginner-tab-video"]', { timeout: 25000 });
    await page.getByTestId("beginner-tab-video").click();
    await page.waitForSelector("#subtitles-table-panel [data-row='24']", { timeout: 25000 });
    await page.waitForTimeout(300);

    const begRow16Sec = await getRowTiming(page, 16);
    assert.ok(begRow16Sec > 0, "Beginner row 16 timestamp must be parseable");

    // Start playback while Disabled -> must stay at scrollTop 0
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { playVideo: () => void; seekTo: (s: number) => void } })
        .__mockYtPlayer;
      p.seekTo(sec);
      p.playVideo();
    }, begRow16Sec);
    await page.waitForTimeout(350);
    assert.equal(
      await page.evaluate(() => document.getElementById("subtitles-table-panel")!.scrollTop),
      0,
      "Beginner mode table must stay at scrollTop 0 before enabling Auto-Scroll Subtitles",
    );

    // Enable Auto-Scroll Subtitles via Floating Menu in Beginner Mode
    await page.getByTestId("floating-menu-toggle-btn").click();
    await page.getByTestId("menu-option-auto-scroll").click();
    const begEnabledLabel = (await page.getByTestId("menu-option-auto-scroll").textContent()) || "";
    assert.ok(begEnabledLabel.includes("Enabled"), "Beginner menu-option-auto-scroll must show Enabled");
    await page.getByTestId("floating-menu-toggle-btn").click();
    await page.waitForTimeout(400);

    const begScrollAfterEnable = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.ok(
      begScrollAfterEnable > 100,
      `Beginner Mode enabling Auto-Scroll Subtitles must scroll #subtitles-table-panel to row 16 (scrollTop=${begScrollAfterEnable})`,
    );

    // Advance to row 30 -> scrollTop must advance further
    const begRow30Sec = await getRowTiming(page, 30);
    await page.evaluate((sec) => {
      const p = (window as unknown as { __mockYtPlayer: { seekTo: (s: number) => void } }).__mockYtPlayer;
      p.seekTo(sec);
    }, begRow30Sec);
    await page.waitForTimeout(400);

    const begScrollRow30 = await page.evaluate(
      () => document.getElementById("subtitles-table-panel")!.scrollTop,
    );
    assert.ok(
      begScrollRow30 > begScrollAfterEnable,
      `Beginner Mode auto-scroll must continue tracking row 30 (prev=${begScrollAfterEnable}, now=${begScrollRow30})`,
    );

    // Verify Beginner Preferences tab Disable Scrolling checkbox synced cleanly
    await page.getByTestId("beginner-tab-preferences").click();
    await page.waitForSelector('[data-testid="beginner-disable-scrolling-toggle"]', { timeout: 10000 });
    const disableScrollingChecked = await page
      .getByTestId("beginner-disable-scrolling-toggle")
      .isChecked();
    assert.equal(
      disableScrollingChecked,
      false,
      "Beginner Preferences Disable scrolling toggle must reflect Enabled auto-scroll state (false)",
    );

    assert.equal(pageErrors.length, 0, `Expected 0 pageerrors in Beginner mode, got: ${pageErrors.join("; ")}`);
    assert.equal(
      await page.getByTestId("floating-error-button").count(),
      0,
      "Expected zero floating error buttons in Beginner mode",
    );

    console.log(`✅ Step 3B PASS: Beginner Mode auto-scrolled on row 16 (${Math.round(begScrollAfterEnable)}) -> row 30 (${Math.round(begScrollRow30)}) with synced preferences parity.`);
    await context.close();
  }
} finally {
  await browser.close();
}

console.log("=========================================================================");
console.log("🎉 ALL TASK 415 AUTO-SCROLL VERIFICATIONS PASSED (100%)!");
console.log("=========================================================================");
