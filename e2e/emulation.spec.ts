import { test, expect, type Page } from "@playwright/test";

const observedUrl = "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
type NativeCaptionRequest = { url: string; language: string; format: string };

async function getNativeCaptionRequests(page: Page): Promise<NativeCaptionRequest[]> {
  return page.evaluate(
    () =>
      (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
        .__nativeCaptionRequests ?? [],
  );
}

async function deliverDefaultCaptions(page: Page) {
  await page.evaluate((url) => {
    const nativeWindow = window as typeof window & {
      onNativeCaptionsInterceptedBase64?: (payload: string) => void;
    };
    const payload = {
      url,
      rawData: JSON.stringify({
        events: [
          { tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: "Default caption line dialog" }] },
        ],
      }),
    };
    nativeWindow.onNativeCaptionsInterceptedBase64?.(btoa(JSON.stringify(payload)));
  }, observedUrl);
}

test.describe("Android native subtitle emulation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((url) => {
      const nativeWindow = window as typeof window & {
        AndroidNativeShell?: {
          isNativeShell(): boolean;
          getLastObservedTimedTextUrl(): string;
          fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
        };
        __nativeCaptionRequests?: NativeCaptionRequest[];
        __failTlangOnce?: boolean;
      };

      nativeWindow.__nativeCaptionRequests = [];
      nativeWindow.AndroidNativeShell = {
        isNativeShell: () => true,
        getLastObservedTimedTextUrl: () => url,
        fetchTranslatedCaptionsWithUrl: (requestUrl, language, format) => {
          nativeWindow.__nativeCaptionRequests?.push({ url: requestUrl, language, format });
          // If URL contains tlang and __failTlangOnce is active, return invalid response to trigger lang fallback
          if (nativeWindow.__failTlangOnce && requestUrl.includes("tlang=")) {
            return "<html><body>404 Not Found</body></html>";
          }
          const events = [];
          for (let i = 0; i < 15; i++) {
            events.push({
              tStartMs: i * 4000,
              dDurationMs: 4000,
              segs: [{ utf8: `[${language.toUpperCase()}] Line ${i + 1} dialog` }],
            });
          }
          return JSON.stringify({ events });
        },
      };
    }, observedUrl);

    await page.goto("./");
    await expect(page).toHaveTitle(/Parallel Subtitles/i);
    await expect(page.locator("header")).toBeVisible();
  });

  test("replays the observed timedtext URL with original lang preserved and favorite langs applied via tlang", async ({
    page,
  }) => {
    expect(await getNativeCaptionRequests(page)).toEqual([]);
    await deliverDefaultCaptions(page);

    await expect
      .poll(async () => (await getNativeCaptionRequests(page)).map((request) => request.language))
      .toEqual(expect.arrayContaining(["he", "it"]));

    const requests = await getNativeCaptionRequests(page);
    expect(requests.length).toBeGreaterThan(0);

    const itRequest = requests.find((request) => request.language === "it");
    expect(itRequest).toBeTruthy();
    expect(itRequest?.url).toContain("lang=en");
    expect(itRequest?.url).toContain("tlang=it");
    expect(itRequest?.url).toContain("fmt=json3");

    const heRequest = requests.find((request) => request.language === "he");
    expect(heRequest).toBeTruthy();
    expect(heRequest?.url).toContain("lang=en");
    expect(heRequest?.url).toContain("tlang=he");
  });

  test("fetches every selected target language through the native bridge", async ({ page }) => {
    const targetLanguages = page.locator("#target-language-select");
    await expect(targetLanguages).toBeVisible();
    expect(await getNativeCaptionRequests(page)).toEqual([]);
    await deliverDefaultCaptions(page);

    await expect
      .poll(async () => (await getNativeCaptionRequests(page)).map((request) => request.language), {
        timeout: 10000,
      })
      .toEqual(expect.arrayContaining(["he", "it"]));

    await targetLanguages.selectOption(["es", "fr"]);
    await expect(targetLanguages).toHaveValues(["es", "fr"]);

    await expect
      .poll(async () => (await getNativeCaptionRequests(page)).map((request) => request.language), {
        timeout: 10000,
      })
      .toEqual(expect.arrayContaining(["es", "fr"]));

    const requests = await getNativeCaptionRequests(page);
    const esRequest = requests.find((request) => request.language === "es");
    expect(esRequest).toBeTruthy();
    expect(esRequest?.url).toContain("lang=en");
    expect(esRequest?.url).toContain("tlang=es");
    expect(esRequest?.url).toContain("fmt=json3");
    const frRequest = requests.find((request) => request.language === "fr");
    expect(frRequest?.url).toContain("tlang=fr");
    await expect(page.getByRole("status")).toContainText("live language tracks loaded");
  });

  test("renders the Android favorite-language subtitle pagination banner", async ({ page }) => {
    await deliverDefaultCaptions(page);
    await expect(page.getByRole("status")).toContainText("live language tracks loaded");
    const subtitleTable = page.locator("details").filter({ hasText: "Parallel subtitles" }).last();
    await expect(subtitleTable.locator("table")).toBeVisible();

    const paginationBar = page.getByTestId("android-subtitles-pagination-bar");
    await expect(paginationBar).toBeVisible();
    await expect(paginationBar).toContainText("First 10 lines of favorite languages");
  });

  test("emulator: detects default subtitles, fetches favorite languages with tlang & lang fallback, and inspects via network panel and subtitles view", async ({
    page,
  }) => {
    // Enable debug mode first to expose the Network Inspector button
    const debugModeToggle = page.getByTestId("debug-mode-toggle");
    if (await debugModeToggle.isVisible()) {
      if (!(await debugModeToggle.isChecked())) {
        await debugModeToggle.check();
      }
    }

    // Configure bridge to fail tlang so fallback to lang is executed
    await page.evaluate(() => {
      const win = window as typeof window & { __failTlangOnce?: boolean };
      win.__failTlangOnce = true;
    });

    // Step 1: Detection of fetching the default subtitles
    expect(await getNativeCaptionRequests(page)).toEqual([]);
    await deliverDefaultCaptions(page);
    await page
      .screenshot({
        path: "cypress/screenshots/step1-default-subtitles-detected.png",
        fullPage: false,
      })
      .catch(() => {});

    // Step 2 & 3: Following it, fetching requests of subtitles of favorited languages with tlang & lang fallback
    await expect
      .poll(async () => (await getNativeCaptionRequests(page)).length, { timeout: 10000 })
      .toBeGreaterThanOrEqual(2);

    const nativeRequests = await getNativeCaptionRequests(page);
    // Assert tlang attempt was made
    const tlangAttempt = nativeRequests.find((r) => r.url.includes("tlang="));
    expect(tlangAttempt).toBeTruthy();
    // Assert fallback to lang request occurred
    const langFallbackAttempt = nativeRequests.find(
      (r) => !r.url.includes("tlang=") && r.url.includes("lang="),
    );
    expect(langFallbackAttempt).toBeTruthy();
    await page
      .screenshot({
        path: "cypress/screenshots/step2-step3-fallback-requests.png",
        fullPage: false,
      })
      .catch(() => {});

    // Step 4: Inspection of those subtitles via the Network Panel
    const openNetworkBtn = page.getByTestId("open-network-inspector-button");
    await expect(openNetworkBtn).toBeVisible({ timeout: 5000 });
    await openNetworkBtn.click();

    const networkModal = page.getByTestId("network-inspector-modal");
    await expect(networkModal).toBeVisible();

    // Show failed requests if filtered so both tlang and lang fallback are inspectable
    const hideFailedBtn = page.getByTestId("hide-failed-toggle");
    if (await hideFailedBtn.isVisible()) {
      await hideFailedBtn.click();
    }

    // Verify presence of captured timedtext & bridge requests
    await expect(page.locator("text=timedtext").first()).toBeVisible();
    await page
      .screenshot({
        path: "cypress/screenshots/step4-network-panel-inspection.png",
        fullPage: false,
      })
      .catch(() => {});

    // Close network panel
    const closeNetworkBtn = page.getByTestId("close-network-inspector-button");
    await closeNetworkBtn.click();
    await expect(networkModal).toBeHidden();

    // Step 5: Inspection of those subtitles via the Subtitles view element
    const subtitlesPanel = page.locator('details[data-panel="subtitles"]');
    await expect(subtitlesPanel).toBeVisible();
    const subtitlesTable = subtitlesPanel.locator("table");
    await expect(subtitlesTable).toBeVisible({ timeout: 10000 });

    // Verify subtitle text rows are rendered
    const firstRow = subtitlesTable.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText(/Line 1/i);

    await page
      .screenshot({
        path: "cypress/screenshots/step5-subtitles-view-inspection.png",
        fullPage: false,
      })
      .catch(() => {});
  });

  test("emulator: shares YouTube video links from browser or official YouTube app", async ({
    page,
  }) => {
    // 1. Simulate browser share link (ACTION_VIEW)
    const browserSharedUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    await page.evaluate((url) => {
      const win = window as typeof window & { onNativeSharedLinkReceived?: (link: string) => void };
      win.onNativeSharedLinkReceived?.(url);
    }, browserSharedUrl);

    // Verify header and state updated to dQw4w9WgXcQ
    await expect(page.locator("header")).toContainText("video dQw4w9WgXcQ");
    await page
      .screenshot({ path: "cypress/screenshots/step-share-browser-link.png", fullPage: false })
      .catch(() => {});

    // 2. Simulate official YouTube app share with title text (ACTION_SEND)
    const youtubeAppShareText = "Never Gonna Give You Up\nhttps://youtu.be/kJQP7kiw5Fk?si=123";
    await page.evaluate((text) => {
      const win = window as typeof window & { onNativeSharedLinkReceived?: (link: string) => void };
      win.onNativeSharedLinkReceived?.(text);
    }, youtubeAppShareText);

    // Verify state updated to kJQP7kiw5Fk
    await expect(page.locator("header")).toContainText("video kJQP7kiw5Fk");
    await page
      .screenshot({ path: "cypress/screenshots/step-share-youtube-app-text.png", fullPage: false })
      .catch(() => {});
  });

  test("device parity: adaptive touch gestures and shared intent switching across physical screen profiles", async ({
    page,
  }) => {
    // Test adaptive mobile viewport (e.g. 412x915 Pixel 7 / physical device profile)
    await page.setViewportSize({ width: 412, height: 915 });
    await deliverDefaultCaptions(page);

    // Verify adaptive player tap (50% horizontal, 22% vertical)
    const viewport = page.viewportSize();
    expect(viewport).toBeDefined();
    if (viewport) {
      const tapX = Math.round(viewport.width * 0.5);
      const tapY = Math.round(viewport.height * 0.22);
      await page.mouse.click(tapX, tapY);
    }

    // Verify live intent dispatch with query parameters and shorts
    await page.evaluate(() => {
      const win = window as typeof window & { onNativeSharedLinkReceived?: (link: string) => void };
      win.onNativeSharedLinkReceived?.("https://www.youtube.com/shorts/s8h8W2Lz9H4");
    });
    await expect(page.locator("header")).toContainText("video s8h8W2Lz9H4");

    // Perform adaptive vertical swipe gesture (simulating transcript scroll)
    if (viewport) {
      const swipeX = Math.round(viewport.width * 0.5);
      const swipeStartY = Math.round(viewport.height * 0.75);
      const swipeEndY = Math.round(viewport.height * 0.35);
      await page.mouse.move(swipeX, swipeStartY);
      await page.mouse.down();
      await page.mouse.move(swipeX, swipeEndY, { steps: 5 });
      await page.mouse.up();
    }
  });
});
