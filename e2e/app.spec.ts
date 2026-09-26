import { test, expect } from "@playwright/test";

test("app smoke test renders the subtitle workspace", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Parallel Subtitles/i);
  await expect(page.getByRole("heading", { name: "Parallel Subtitles", exact: true })).toBeVisible();
  await expect(page.locator("#target-language-select")).toHaveValues(["he", "it"]);
});