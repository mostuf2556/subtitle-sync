import { test, expect } from "@playwright/test";

test.describe("Parallel Subtitles web app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await expect(page).toHaveTitle(/Parallel Subtitles/i);
    await expect(page.locator("header")).toBeVisible();
  });

  test("loads fixture subtitles and exposes the dynamic target-language list", async ({ page }) => {
    const targetLanguages = page.locator("#target-language-select");
    await expect(targetLanguages).toBeVisible();

    const optionValues = await targetLanguages.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual(expect.arrayContaining(["en", "he", "ar", "it", "es", "ru"]));

    const subtitleTable = page.locator("details").filter({ hasText: "Parallel subtitles" });
    await expect(subtitleTable.locator("tbody tr").first()).toBeVisible();

    await targetLanguages.selectOption(["es"]);
    await expect(targetLanguages).toHaveValues(["es"]);
    await expect(subtitleTable.locator("thead")).toContainText("Spanish");
  });

  test("switches themes without losing the language controls", async ({ page }) => {
    const themeControls = page.locator('[aria-label="Color theme"]');
    const darkButton = themeControls.getByRole("button", { name: "dark", exact: true });

    await darkButton.click();
    await expect(darkButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#target-language-select")).toBeVisible();

    await themeControls.getByRole("button", { name: "light", exact: true }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});