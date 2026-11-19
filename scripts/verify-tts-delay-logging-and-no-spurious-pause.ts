import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearAlternativeTtsAudioCache,
  getLastAlternativeTtsAttemptMeta,
  isRemoteTtsPrefetchCooldownActive,
  playAlternativeTtsAudio,
  prefetchAlternativeTtsAudio,
  TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS,
} from "../src/lib/alternative-tts";
import {
  getLastMediaCommandMeta,
  initBackgroundMediaManager,
} from "../src/utils/backgroundMediaManager";
import { logBuffer, logStateMachineAction, logWarn } from "../src/utils/logBuffer";

async function run() {
  console.log("=== Verifying TTS Delay Logging & Spurious Pause Prevention ===");

  const rootDir = process.cwd();
  const routesPath = path.join(rootDir, "src/routes/index.tsx");
  const mediaMgrPath = path.join(rootDir, "src/utils/backgroundMediaManager.ts");
  const bgServicePath = path.join(
    rootDir,
    "android-shell/app/src/main/java/com/ytviewer/app/BackgroundAudioService.kt",
  );
  const altTtsPath = path.join(rootDir, "src/lib/alternative-tts.ts");
  const logBufferPath = path.join(rootDir, "src/utils/logBuffer.ts");

  // ---------------------------------------------------------------------------
  // 1. Runtime test: TTS3 prefetch cooldown & negative cache prevent POST storms
  // ---------------------------------------------------------------------------
  console.log("1. Testing TTS3 prefetch negative cache & cooldown gating...");
  const origWindow = (globalThis as { window?: unknown }).window;
  const origFetch = globalThis.fetch;
  let fetchCalls = 0;

  try {
    (globalThis as { window?: unknown }).window = {};
    logBuffer.clear();
    clearAlternativeTtsAudioCache();

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response("Unauthorized", { status: 401 });
    }) as typeof fetch;

    const ok1 = await prefetchAlternativeTtsAudio("First test sentence.", "en");
    assert.equal(ok1, false, "First failed prefetch must return false");
    assert.equal(fetchCalls, 1, "First unique prefetch executes 1 fetch");

    const ok1Repeat = await prefetchAlternativeTtsAudio("First test sentence.", "en");
    assert.equal(ok1Repeat, false, "Cached failed key must return false immediately");
    assert.equal(fetchCalls, 1, "Repeated prefetch of failed key must NOT hit network");

    const ok2 = await prefetchAlternativeTtsAudio("Second test sentence.", "en");
    assert.equal(ok2, false, "Second failed prefetch must return false");
    assert.equal(fetchCalls, 2, "Second failure triggers endpoint cooldown");
    assert.equal(
      isRemoteTtsPrefetchCooldownActive(),
      true,
      "Cooldown must become active after 2 consecutive remote TTS failures",
    );

    const ok3 = await prefetchAlternativeTtsAudio("Third test sentence.", "en");
    const ok4 = await prefetchAlternativeTtsAudio("Fourth test sentence.", "en");
    assert.equal(ok3, false, "Prefetch during cooldown must return false");
    assert.equal(ok4, false, "Prefetch during cooldown must return false");
    assert.equal(
      fetchCalls,
      2,
      "Endpoint cooldown must block further prefetch network storms completely",
    );

    clearAlternativeTtsAudioCache();
    assert.equal(
      isRemoteTtsPrefetchCooldownActive(),
      false,
      "clearAlternativeTtsAudioCache() must reset endpoint cooldown",
    );
  } finally {
    globalThis.fetch = origFetch;
    if (origWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = origWindow;
    }
  }
  console.log("✔ Runtime TTS3 prefetch negative cache & cooldown verified");

  // ---------------------------------------------------------------------------
  // 2. Runtime test: Slow TTS3 synthesis automatically emits TTS_UNJUSTIFIED_DELAY
  // ---------------------------------------------------------------------------
  console.log("2. Testing runtime TTS_UNJUSTIFIED_DELAY emission on slow remote TTS...");
  const origAudio = (globalThis as { Audio?: unknown }).Audio;
  const origWindowForDelay = (globalThis as { window?: unknown }).window;
  try {
    (globalThis as { window?: unknown }).window = {};
    logBuffer.clear();
    clearAlternativeTtsAudioCache();

    // Mock fetch taking > 1550ms before failing so synthMs > TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS
    globalThis.fetch = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1580));
      return new Response("Slow gateway failure", { status: 503 });
    }) as typeof fetch;

    const played = await playAlternativeTtsAudio("Slow remote synthesis sentence.", "es");
    assert.equal(played, false, "Failed slow synthesis should return false");

    const attemptMeta = getLastAlternativeTtsAttemptMeta();
    assert.ok(attemptMeta, "getLastAlternativeTtsAttemptMeta() must record failed slow attempt");
    assert.ok(
      attemptMeta.synthMs > TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS,
      `Expected synthMs > ${TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS}, got ${attemptMeta.synthMs}`,
    );

    const report = logBuffer.generateTroubleshootingPrompt("slow tts-play");
    assert.ok(
      report.includes("TTS_UNJUSTIFIED_DELAY"),
      "Slow TTS3 synthesis must automatically emit TTS_UNJUSTIFIED_DELAY into logBuffer",
    );
    assert.ok(
      report.includes("## 0.5 TTS-Play Delay & Unexpected Pause Diagnostics"),
      "Promoted diagnostics section must capture runtime slow-synthesis delay",
    );
    clearAlternativeTtsAudioCache();
  } finally {
    globalThis.fetch = origFetch;
    if (origAudio === undefined) {
      delete (globalThis as { Audio?: unknown }).Audio;
    } else {
      (globalThis as { Audio?: unknown }).Audio = origAudio;
    }
    if (origWindowForDelay === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = origWindowForDelay;
    }
  }
  console.log("✔ Runtime slow-TTS automatic TTS_UNJUSTIFIED_DELAY emission verified");

  // ---------------------------------------------------------------------------
  // 3. Runtime test: Troubleshooting report promotes TTS delay & pause logs
  // ---------------------------------------------------------------------------
  console.log("3. Testing logBuffer troubleshooting prompt promotion...");
  logBuffer.clear();
  logBuffer.registerAppStateProvider(() => ({
    videoId: "L2Ryrr6txwA",
    ttsConfig: {
      isTtsPlayEnabled: true,
      pauseMode: true,
      ttsFallbackOrder: "tts3_native",
    },
    lastTtsAttempt: getLastAlternativeTtsAttemptMeta(),
  }));

  logWarn("TTS-Play", "TTS_UNJUSTIFIED_DELAY: excessive startup latency detected", {
    lang: "es",
    totalMs: 4210,
    stallReason: "tts3_and_native_startup_stall",
  });
  logStateMachineAction("TTS_STEP_STARTED", {
    lang: "es",
    rowIndex: 2,
    queueWaitMs: 35,
  });
  logStateMachineAction("SPURIOUS_MEDIA_PAUSE_IGNORED", {
    videoId: "L2Ryrr6txwA",
    source: "web_media_session",
    msSincePlayOrResume: 475,
    reason: "android_webview_self_focus_loss",
  });
  logStateMachineAction("UNEXPECTED_PLAYER_PAUSE", {
    videoId: "L2Ryrr6txwA",
    msSincePlayOrResume: 480,
    autoRecovered: true,
  });

  const prompt = logBuffer.generateTroubleshootingPrompt("tts-play delayed & paused");
  assert.ok(
    prompt.includes("## 0.5 TTS-Play Delay & Unexpected Pause Diagnostics (4 events)"),
    "Troubleshooting prompt must include promoted Section 0.5 with all 4 events",
  );
  assert.ok(
    prompt.includes("TTS_UNJUSTIFIED_DELAY"),
    "Prompt must highlight TTS_UNJUSTIFIED_DELAY in promoted section",
  );
  assert.ok(
    prompt.includes("SPURIOUS_MEDIA_PAUSE_IGNORED"),
    "Prompt must highlight SPURIOUS_MEDIA_PAUSE_IGNORED in promoted section",
  );
  assert.ok(
    prompt.includes("UNEXPECTED_PLAYER_PAUSE"),
    "Prompt must highlight UNEXPECTED_PLAYER_PAUSE in promoted section",
  );
  assert.ok(
    prompt.includes("## 1. Live Application State Snapshot") && prompt.includes('"ttsConfig"'),
    "Prompt must include ttsConfig in Live Application State Snapshot",
  );
  assert.equal(TTS_UNJUSTIFIED_DELAY_THRESHOLD_MS, 1500);
  console.log("✔ Runtime logBuffer Section 0.5 promotion & state snapshot verified");

  // ---------------------------------------------------------------------------
  // 4. Runtime test: backgroundMediaManager native + web_media_session tracking
  // ---------------------------------------------------------------------------
  console.log("4. Testing backgroundMediaManager command source tracking...");
  const origWinForMedia = (globalThis as { window?: Record<string, unknown> }).window;
  const origNav = (globalThis as { navigator?: unknown }).navigator;
  let pauseTriggered = 0;
  const handlers: Record<string, (() => void) | undefined> = {};
  try {
    (globalThis as { window?: Record<string, unknown> }).window = {};
    Object.defineProperty(globalThis, "navigator", {
      value: {
        mediaSession: {
          setActionHandler: (action: string, fn: (() => void) | undefined) => {
            handlers[action] = fn;
          },
        },
      },
      configurable: true,
    });

    const cleanup = initBackgroundMediaManager({
      onPlay: () => {},
      onPause: () => {
        pauseTriggered += 1;
      },
    });
    const winObj = (globalThis as { window?: { onNativeMediaCommand?: (a: string) => void } })
      .window;
    assert.ok(
      typeof winObj?.onNativeMediaCommand === "function",
      "initBackgroundMediaManager must register window.onNativeMediaCommand",
    );
    winObj?.onNativeMediaCommand?.("pause");
    assert.equal(pauseTriggered, 1, "onPause must fire on native pause command");
    const nativeMeta = getLastMediaCommandMeta();
    assert.equal(
      nativeMeta.source,
      "native_media_command",
      "getLastMediaCommandMeta() must identify native_media_command",
    );
    assert.ok(nativeMeta.timestamp > 0, "getLastMediaCommandMeta() must record timestamp");

    assert.ok(
      typeof handlers.pause === "function",
      "initBackgroundMediaManager must register Web MediaSession pause handler",
    );
    handlers.pause?.();
    assert.equal(pauseTriggered, 2, "onPause must fire on web mediaSession pause handler");
    const webMeta = getLastMediaCommandMeta();
    assert.equal(
      webMeta.source,
      "web_media_session",
      "getLastMediaCommandMeta() must identify web_media_session",
    );
    cleanup();
  } finally {
    if (origWinForMedia === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = origWinForMedia;
    }
    if (origNav === undefined) {
      delete (globalThis as { navigator?: unknown }).navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        value: origNav,
        configurable: true,
      });
    }
  }
  console.log("✔ Runtime backgroundMediaManager native & web_media_session tracking verified");

  // ---------------------------------------------------------------------------
  // 5. Static contract assertions: BackgroundAudioService.kt & routes/index.tsx
  // ---------------------------------------------------------------------------
  console.log("5. Verifying Android service & player pause guards...");
  const bgService = fs.readFileSync(bgServicePath, "utf8");
  const focusBlockMatch = bgService.match(
    /audioFocusChangeListener\s*=\s*AudioManager\.OnAudioFocusChangeListener\s*\{([\s\S]*?)private fun requestAudioFocus\(\)/,
  );
  assert.ok(focusBlockMatch, "BackgroundAudioService.kt must define audioFocusChangeListener");
  const focusCodeWithoutComments = focusBlockMatch[1]
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(
    !focusCodeWithoutComments.includes("handlePause(") &&
      !focusCodeWithoutComments.includes("handlePlay("),
    "audioFocusChangeListener must NOT call handlePause() or handlePlay() on self-focus changes",
  );
  assert.ok(
    bgService.includes("requestAudioFocus()") && bgService.includes("abandonAudioFocus()"),
    "BackgroundAudioService.kt must preserve requestAudioFocus()/abandonAudioFocus() contracts",
  );

  const routesContent = fs.readFileSync(routesPath, "utf8");
  const altTtsContent = fs.readFileSync(altTtsPath, "utf8");
  const logBufferContent = fs.readFileSync(logBufferPath, "utf8");
  const mediaMgrContent = fs.readFileSync(mediaMgrPath, "utf8");

  assert.ok(
    routesContent.includes("lastPlayOrResumeStartedAtRef") &&
      routesContent.includes("lastTtsSectionFinishedAtRef"),
    "src/routes/index.tsx must track lastPlayOrResumeStartedAtRef & lastTtsSectionFinishedAtRef",
  );
  assert.ok(
    routesContent.includes("MEDIA_SESSION_PAUSE_RECEIVED") &&
      routesContent.includes("SPURIOUS_MEDIA_PAUSE_IGNORED") &&
      routesContent.includes("UNEXPECTED_PLAYER_PAUSE"),
    "src/routes/index.tsx must log MEDIA_SESSION_PAUSE_RECEIVED, SPURIOUS_MEDIA_PAUSE_IGNORED, and UNEXPECTED_PLAYER_PAUSE",
  );
  assert.ok(
    routesContent.includes("TTS_UNJUSTIFIED_DELAY") &&
      routesContent.includes("TTS_STEP_STARTED") &&
      routesContent.includes("TTS_STEP_FINISHED"),
    "src/routes/index.tsx must instrument TTS step timings and log TTS_UNJUSTIFIED_DELAY",
  );
  assert.ok(
    routesContent.includes("curStateNum === 3") &&
      routesContent.includes("Boolean(speakingLangRef.current) ||") &&
      routesContent.includes("busy.current;"),
    "syncMediaMetadata must keep isPlaying true during buffering (state 3), resume grace, and active TTS",
  );
  assert.ok(
    altTtsContent.includes("TTS_UNJUSTIFIED_DELAY") &&
      altTtsContent.includes("recordRemoteTtsOutcome") &&
      logBufferContent.includes("0.5 TTS-Play Delay & Unexpected Pause Diagnostics") &&
      mediaMgrContent.includes("getLastMediaCommandMeta"),
    "All delay diagnostics and media command metadata modules must be wired together",
  );

  console.log("✔ Static contract checks passed");
  console.log("🎉 All TTS Delay Logging & Spurious Pause Prevention checks PASSED!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
