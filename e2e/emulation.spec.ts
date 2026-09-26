import { test, expect } from "@playwright/test";

const observedUrl =
  "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3";
type NativeCaptionRequest = { url: string; language: string; format: string };

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
          return JSON.stringify({
            events: [
              {
                tStartMs: 0,
                dDurationMs: 4000,
                segs: [{ utf8: `Live ${language} subtitle` }],
              },
              {
                tStartMs: 4000,
                dDurationMs: 4000,
                segs: [{ utf8: `Next ${language} subtitle` }],
              },
            ],
          });
        },
      };
    }, observedUrl);

    await page.goto("./");
    await expect(page).toHaveTitle(/Parallel Subtitles/i);
    await expect(page.locator("header")).toBeVisible();
  });

  test("fetches every selected target language through the native bridge", async ({ page }) => {
    const targetLanguages = page.locator("#target-language-select");
    await expect(targetLanguages).toBeVisible();

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
                .__nativeCaptionRequests?.map((request) => request.language) ?? [],
          ),
        { timeout: 10000 },
      )
      .toEqual(expect.arrayContaining(["he", "it"]));

    await targetLanguages.selectOption(["es"]);
    await expect(targetLanguages).toHaveValues(["es"]);

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
                .__nativeCaptionRequests?.map((request) => request.language) ?? [],
          ),
        { timeout: 10000 },
      )
      .toContain("es");

    const requests = await page.evaluate(
      () =>
        (window as typeof window & { __nativeCaptionRequests?: NativeCaptionRequest[] })
          .__nativeCaptionRequests ?? [],
    );
    expect(requests.filter((request) => request.language === "es")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: observedUrl,
          format: "json3",
        }),
      ]),
    );
    await expect(page.getByRole("status")).toContainText("live language tracks loaded");
  });
});