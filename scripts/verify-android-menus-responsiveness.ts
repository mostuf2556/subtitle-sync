import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ATTEMPT_ORDER,
  nativeExactFetchAsync,
  runFetchAttemptsAsync,
} from "../src/lib/subtitle-fetch-plan";

async function run() {
  console.log("=== Task 456: Verifying Android Menus Responsiveness & Non-Blocking Bridge ===");

  // 1. Verify MainActivity.kt bounded OkHttp timeouts, background executor, & fetchTimedTextExactAsync
  const mainActivity = fs.readFileSync(
    path.resolve("android-shell/app/src/main/java/com/ytviewer/app/MainActivity.kt"),
    "utf8",
  );
  assert(
    mainActivity.includes(".connectTimeout(5, TimeUnit.SECONDS)") &&
      mainActivity.includes(".readTimeout(7, TimeUnit.SECONDS)") &&
      mainActivity.includes(".callTimeout(10, TimeUnit.SECONDS)"),
    "MainActivity.kt must set bounded OkHttpClient connect/read/call timeouts",
  );
  assert(
    mainActivity.includes("fun fetchTimedTextExactAsync(") &&
      mainActivity.includes("networkExecutor.execute") &&
      mainActivity.includes("window.__onNativeFetchTimedTextResult"),
    "MainActivity.kt must expose non-blocking fetchTimedTextExactAsync via networkExecutor",
  );
  assert(
    mainActivity.includes("fun saveLocalStorageBackup(") &&
      mainActivity.includes("ioExecutor.execute"),
    "MainActivity.kt must offload saveLocalStorageBackup disk I/O to background ioExecutor",
  );

  // 2. Verify async fetch bridge yields cleanly and handles asynchronous callbacks without blocking timers
  const mockWindow = (globalThis as { window?: Record<string, unknown> }).window ?? {};
  (globalThis as { window?: Record<string, unknown> }).window = mockWindow;

  let timerTicksDuringFetch = 0;
  const mockBridge = {
    fetchTimedTextExactAsync: (requestId: string, url: string, withSession: boolean) => {
      setTimeout(() => {
        const cb = mockWindow.__onNativeFetchTimedTextResult as
          | ((id: string, json: string) => void)
          | undefined;
        cb?.(
          requestId,
          JSON.stringify({
            status: url.includes("lang=es") ? 200 : 403,
            body: url.includes("lang=es")
              ? JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Hola" }] }] })
              : "",
            sentUrl: url,
            send: withSession ? "session" : "anon",
          }),
        );
      }, 15);
      return true;
    },
  };

  const ticker = setInterval(() => {
    timerTicksDuringFetch += 1;
  }, 4);

  const attemptRes = await runFetchAttemptsAsync({
    observedUrl: "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
    lang: "es",
    order: DEFAULT_ATTEMPT_ORDER,
    send: (url, withSession) => nativeExactFetchAsync(mockBridge, url, withSession),
    isGood: (body) => body.includes('"events"'),
  });
  clearInterval(ticker);

  assert(attemptRes !== null, "runFetchAttemptsAsync must resolve valid response");
  assert(
    timerTicksDuringFetch > 0,
    "UI event loop must remain unblocked (timers tick) during async Android bridge fetches",
  );

  // 3. Verify src/routes/index.tsx and src/styles.css apply non-blocking fetch & Android touch/blur optimization
  const indexContent = fs.readFileSync(path.resolve("src/routes/index.tsx"), "utf8");
  const stylesContent = fs.readFileSync(path.resolve("src/styles.css"), "utf8");
  assert(
    indexContent.includes("runFetchAttemptsAsync") &&
      indexContent.includes("nativeExactFetchAsync") &&
      indexContent.includes('data-android={isAndroid ? "true" : undefined}'),
    "src/routes/index.tsx must use runFetchAttemptsAsync, nativeExactFetchAsync, and data-android attribute",
  );
  assert(
    stylesContent.includes('[data-android="true"] .backdrop-blur-md') &&
      stylesContent.includes("touch-action: manipulation"),
    "src/styles.css must optimize Android WebView menus backdrop-blur & touch-action",
  );

  console.log("✅ PASS: Android menus responsiveness & non-blocking native bridge verified.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
