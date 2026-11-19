import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearAlternativeTtsAudioCache,
  executeTtsFallbackSequence,
  prefetchAlternativeTtsAudio,
  synthesizeLovableTtsAudio,
} from "../src/lib/alternative-tts.js";

async function runTests() {
  console.log("=========================================================================");
  console.log("Running Verification: TTS-Play Latency & Floating Play/Pause Single-Press");
  console.log("=========================================================================");

  // Ensure window exists for prefetch/cache paths in Node
  const origWindow = (globalThis as { window?: unknown }).window;
  const origFetch = globalThis.fetch;
  const origURL = globalThis.URL;

  try {
    clearAlternativeTtsAudioCache();

    let fetchCount = 0;
    let shouldStallFetch = false;

    const fakeWindow: Record<string, unknown> = {
      location: { href: "http://localhost:3000/" },
      speechSynthesis: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [{ lang: "en-US", name: "Mock English", voiceURI: "mock-en" }],
        cancel: () => {},
        // Intentionally never fires onstart/onend to simulate stalled native TTS
        speak: () => {},
      },
    };
    (globalThis as { window?: unknown }).window = fakeWindow;

    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
      fetchCount++;
      if (shouldStallFetch) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }
      return new Response(
        JSON.stringify({
          audio: Buffer.from("fake-mp3-audio").toString("base64"),
          mime: "audio/mpeg",
          provider: "google",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json", "x-tts-provider": "google" },
        },
      );
    }) as typeof fetch;

    // 1. Test prefetch + cache hit (0 extra network calls on playback)
    console.log("Test 1: Prefetch populates cache and playback hits cache with 0 network latency...");
    const prefetched = await prefetchAlternativeTtsAudio("Hola mundo", "es-ES", {
      provider: "google",
      format: "json",
      method: "post",
    });
    assert.equal(prefetched, true, "prefetchAlternativeTtsAudio should resolve true on success");
    assert.equal(fetchCount, 1, "Prefetch should execute 1 network fetch");

    const cachedRes = await synthesizeLovableTtsAudio(
      "Hola mundo",
      "es-ES",
      { provider: "google", format: "json", method: "post" },
      "playback",
    );
    assert.ok(cachedRes?.url?.startsWith("data:audio/mpeg;base64,"), "Playback must receive cached data URL");
    assert.equal(fetchCount, 1, "Cached playback must NOT trigger a second network fetch");

    // 2. Test in-flight deduplication
    console.log("Test 2: Concurrent prefetch + playback deduplicates to 1 network request...");
    clearAlternativeTtsAudioCache();
    fetchCount = 0;
    const [p1, p2] = await Promise.all([
      prefetchAlternativeTtsAudio("Buenos días", "es-ES", {
        provider: "google",
        format: "json",
        method: "post",
      }),
      synthesizeLovableTtsAudio(
        "Buenos días",
        "es-ES",
        { provider: "google", format: "json", method: "post" },
        "playback",
      ),
    ]);
    assert.equal(p1, true);
    assert.ok(p2?.url);
    assert.equal(fetchCount, 1, "In-flight prefetch and playback must share 1 fetch");

    // 3. Test AbortController timeout on stalled remote TTS fetch
    console.log("Test 3: Stalled remote TTS fetch aborts promptly via timeoutMs...");
    clearAlternativeTtsAudioCache();
    shouldStallFetch = true;
    const startAbort = Date.now();
    const stalledRes = await synthesizeLovableTtsAudio(
      "Stalled sentence",
      "en-US",
      { provider: "google", format: "json", method: "post", timeoutMs: 120 },
      "playback",
    );
    const elapsedAbort = Date.now() - startAbort;
    assert.equal(stalledRes, null, "Timed out synthesis must resolve null cleanly");
    assert.ok(elapsedAbort < 1500, `Aborted synthesis must resolve quickly, took ${elapsedAbort}ms`);
    shouldStallFetch = false;

    // 4. Test executeTtsFallbackSequence native start watchdog (must not stall 12s)
    console.log("Test 4: Native speech stall triggers fast watchdog (<2.5s) instead of 12s hang...");
    const startWatchdog = Date.now();
    const outcome = await executeTtsFallbackSequence("Test watchdog", "en-US", 1.0, "native_tts3");
    const elapsedWatchdog = Date.now() - startWatchdog;
    assert.equal(outcome, "none", "In Node without HTMLAudioElement, stalled native falls through cleanly");
    assert.ok(
      elapsedWatchdog < 2500,
      `Native stall watchdog must abort well below 12s (took ${elapsedWatchdog}ms)`,
    );

    // 5. Source verification for Task 449 & Task 450
    console.log("Test 5: Verifying FloatingDraggablePauseButton.tsx & src/routes/index.tsx contracts...");
    const floatBtnPath = path.resolve(process.cwd(), "src/components/FloatingDraggablePauseButton.tsx");
    const floatBtnSrc = fs.readFileSync(floatBtnPath, "utf-8");
    assert.ok(
      floatBtnSrc.includes("if (hasMovedRef.current)"),
      "FloatingDraggablePauseButton must only update position after exceeding drag threshold",
    );
    assert.ok(
      floatBtnSrc.includes("onTouchCancel={handleTouchEnd}") &&
        floatBtnSrc.includes('window.addEventListener("blur", handleMouseUp)'),
      "FloatingDraggablePauseButton must clean up drag state on touchcancel and window blur",
    );

    const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
    const indexSrc = fs.readFileSync(indexPath, "utf-8");
    assert.ok(
      indexSrc.includes("isPrimaryPlayerReadyRef") &&
        indexSrc.includes("pendingPlayRequestedRef.current && isPrimaryPlayerReadyRef.current"),
      "index.tsx must not consume pendingPlayRequestedRef before player onReady",
    );
    assert.ok(
      indexSrc.includes("lastPlayRequestAtRef") &&
        indexSrc.includes("clearPlayKickTimers") &&
        indexSrc.includes("!userExplicitlyPausedRef.current"),
      "index.tsx must preserve startup playing state and guard/cancel play kick timers on pause",
    );
    assert.ok(
      indexSrc.includes("prefetchRowTtsAudio") &&
        indexSrc.includes("prefetchAlternativeTtsAudio") &&
        indexSrc.includes('auditSource: "playback"'),
      "index.tsx must prefetch upcoming TTS rows and route playback calls through the audio cache",
    );

    console.log("PASS: All TTS-play latency and floating play/pause single-press checks passed.");
  } finally {
    (globalThis as { window?: unknown }).window = origWindow;
    globalThis.fetch = origFetch;
    globalThis.URL = origURL;
  }
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
