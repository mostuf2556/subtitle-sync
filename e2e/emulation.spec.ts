import { test, expect, type Page } from "@playwright/test";

const observedUrl =
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&hl=iw&lang=en&fmt=json3&sparams=ip%2Cexpire&signature=xyz%2F123&key=yt8";
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
        events: [{ tStartMs: 0, dDurationMs: 4000, segs: [{ utf8: "Default caption line" }] }],
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
      };

      nativeWindow.__nativeCaptionRequests = [];
      nativeWindow.AndroidNativeShell = {
        isNativeShell: () => true,
        getLastObservedTimedTextUrl: () => url,
        fetchTranslatedCaptionsWithUrl: (requestUrl, language, format) => {
          nativeWindow.__nativeCaptionRequests?.push({ url: requestUrl, language, format });
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

  test("replays the observed timedtext URL with only lang changed for favorite languages", async ({
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
    const parsedIt = new URL(itRequest!.url);
    expect(parsedIt.searchParams.get("lang")).toBe("it");
    expect(parsedIt.searchParams.get("hl")).toBe("iw");
    expect(parsedIt.searchParams.get("tlang")).toBeNull();
    expect(parsedIt.searchParams.get("fmt")).toBe("json3");
    expect(parsedIt.searchParams.get("signature")).toBe("xyz/123");

    const heRequest = requests.find((request) => request.language === "he");
    expect(heRequest).toBeTruthy();
    const parsedHe = new URL(heRequest!.url);
    expect(parsedHe.searchParams.get("lang")).toBe("he");
    expect(parsedHe.searchParams.get("tlang")).toBeNull();
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
    const parsedEs = new URL(esRequest!.url);
    expect(parsedEs.searchParams.get("lang")).toBe("es");
    expect(parsedEs.searchParams.get("tlang")).toBeNull();
    expect(parsedEs.searchParams.get("fmt")).toBe("json3");
    expect(parsedEs.searchParams.get("signature")).toBe("xyz/123");
    const frRequest = requests.find((request) => request.language === "fr");
    expect(new URL(frRequest!.url).searchParams.get("lang")).toBe("fr");
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
});
