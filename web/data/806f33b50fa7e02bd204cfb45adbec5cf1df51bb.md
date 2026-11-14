# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web.spec.ts >> developer-only views are hidden unless debug=true is in the URL
- Location: e2e/web.spec.ts:67:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('experimental-server-fetch-controls')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" getByTestId('experimental-server-fetch-controls') with timeout 5000ms
  - waiting for getByTestId('experimental-server-fetch-controls')
    14 × locator resolved to <div data-control-category="experimental" data-testid="experimental-server-fetch-controls" class="space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-2">…</div>
       - unexpected value "hidden"

```

```yaml
- banner:
  - text: Parallel Subtitles ·
  - heading "התוכנית החדשה של ארצות הברית" [level=1]
  - text: video vBURridJXZ0
  - 'link "v2.1.117 #e482b19"':
    - /url: https://github.com/mostuf2556/subtitle-sync/releases
  - button "Version"
  - button "Debug ON"
  - button "Theme Standard"
  - button "Export"
  - button "Import"
  - text: video vBURridJXZ0
  - paragraph: YouTube video by הדרך הקלה. Watch on YouTube or play with synchronized parallel captions.
  - tablist "App Navigation Tabs":
    - tab "Parallel Viewer" [selected]
    - tab "Playground"
    - tab "AI Punctuation"
    - link "Storybook":
      - /url: ./storybook
    - text: Developer mode
  - button "Light"
  - button "Dark"
  - button "Midnight"
  - button "Open state machine action logs": Actions
  - button "quick-loader"
  - button "APK"
  - button "Auto-Fetch"
  - button "Log View"
  - button "Share"
  - link "Storybook":
    - /url: /storybook
- text: "Stage:"
- button "1 Learning Goals"
- button "2 Subtitles Table"
- button "3 Video & Playback"
- button "4 Settings"
- button "5 Sentence & Word Game"
- button "6 History"
- group:
  - heading "Settings" [level=2]
  - button "Pin Settings open"
  - button "Move Settings earlier" [disabled]
  - button "Move Settings later"
- group:
  - heading "Video library" [level=2]
  - text: 9s
  - button "Pin Video library open"
  - button "Move Video library earlier"
  - button "Move Video library later"
  - textbox "Search watched videos by title or ID..."
  - button "Refresh"
  - button "Clear"
  - img "התוכנית החדשה של ארצות הברית"
  - text: Active Just now
  - heading "התוכנית החדשה של ארצות הברית" [level=4]
  - paragraph: by הדרך הקלה
  - text: "ID: vBURridJXZ0 Currently loaded"
  - button "Fetch from scratch for התוכנית החדשה של ארצות הברית": Fetch from scratch
  - button "Clear cached subtitles for התוכנית החדשה של ארצות הברית": Clear cache
  - button "Remove התוכנית החדשה של ארצות הברית from history"
  - img "3 Melodic Sequences to Spice Up Your Guitar Solos"
  - button "Play 3 Melodic Sequences to Spice Up Your Guitar Solos"
  - text: Just now
  - heading "3 Melodic Sequences to Spice Up Your Guitar Solos" [level=4]
  - paragraph: by JustinGuitar
  - text: "ID: L2Ryrr6txwA Click to load"
  - button "Fetch from scratch for 3 Melodic Sequences to Spice Up Your Guitar Solos": Fetch from scratch
  - button "Clear cached subtitles for 3 Melodic Sequences to Spice Up Your Guitar Solos": Clear cache
  - button "Remove 3 Melodic Sequences to Spice Up Your Guitar Solos from history"
  - img "Me at the zoo"
  - button "Play Me at the zoo"
  - text: Just now
  - heading "Me at the zoo" [level=4]
  - text: "ID: jNQXAC9IVRw Click to load"
  - button "Fetch from scratch for Me at the zoo": Fetch from scratch
  - button "Clear cached subtitles for Me at the zoo": Clear cache
  - button "Remove Me at the zoo from history"
  - img "JSON3 Subtitle Demo (English + Hebrew)"
  - button "Play JSON3 Subtitle Demo (English + Hebrew)"
  - text: Just now
  - heading "JSON3 Subtitle Demo (English + Hebrew)" [level=4]
  - text: "ID: EILFkSGNkdA Click to load"
  - button "Fetch from scratch for JSON3 Subtitle Demo (English + Hebrew)": Fetch from scratch
  - button "Clear cached subtitles for JSON3 Subtitle Demo (English + Hebrew)": Clear cache
  - button "Remove JSON3 Subtitle Demo (English + Hebrew) from history"
- region "Floating Controls Controller":
  - button "Play video": Paused (OFF) Playback Paused
  - button "Open floating controls menu"
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | const capturedBrowserErrors: string[] = [];
  4   | 
  5   | test.beforeEach(async ({ page }) => {
  6   |   capturedBrowserErrors.length = 0;
  7   |   page.on("pageerror", (error) => {
  8   |     capturedBrowserErrors.push(`[PAGE_ERROR] ${error.message}\n${error.stack || ""}`);
  9   |   });
  10  |   page.on("console", (msg) => {
  11  |     if (msg.type() === "error" && msg.text().includes("[APP_BOOT_ERROR]")) {
  12  |       capturedBrowserErrors.push(msg.text());
  13  |     }
  14  |   });
  15  | });
  16  | 
  17  | test.afterEach(async ({ page }) => {
  18  |   const errorComponent = page.locator('[data-testid="router-error-component"]');
  19  |   const count = await errorComponent.count().catch(() => 0);
  20  |   if (count > 0) {
  21  |     const errorText = await errorComponent.textContent().catch(() => "");
  22  |     throw new Error(`[APPLICATION_CRASH] Application rendered error boundary:\n${errorText}`);
  23  |   }
  24  |   if (capturedBrowserErrors.length > 0) {
  25  |     throw new Error(
  26  |       `[APPLICATION_CRASH] Uncaught browser exceptions detected:\n${capturedBrowserErrors.join("\n")}`,
  27  |     );
  28  |   }
  29  | });
  30  | 
  31  | test("e2e tests recognize application crashes and error boundary markers", async ({ page }) => {
  32  |   // 1. Verify clean boot does NOT render crash boundary
  33  |   await page.goto("./");
  34  |   await expect(page.locator("[data-testid='router-error-component']")).toHaveCount(0);
  35  |   await expect(page.locator("text=This page didn't load")).toHaveCount(0);
  36  |   await expect(page.locator("text=Something went wrong on our end")).toHaveCount(0);
  37  |   expect(capturedBrowserErrors.length).toBe(0);
  38  | 
  39  |   // 2. Verify that when an error screen occurs, E2E locator recognizes it accurately
  40  |   await page.evaluate(() => {
  41  |     const simulatedError = document.createElement("div");
  42  |     simulatedError.dataset.testid = "router-error-component";
  43  |     simulatedError.innerHTML = `
  44  |       <h1 data-testid="router-error-title">This page didn't load</h1>
  45  |       <p data-testid="router-error-description">Something went wrong on our end. You can try refreshing or head back home.</p>
  46  |       <pre data-testid="router-error-message">ReferenceError: Languages is not defined</pre>
  47  |     `;
  48  |     document.body.prepend(simulatedError);
  49  |   });
  50  | 
  51  |   const errorScreen = page.locator("[data-testid='router-error-component']");
  52  |   await expect(errorScreen).toBeVisible();
  53  |   await expect(page.getByTestId("router-error-title")).toHaveText("This page didn't load");
  54  |   await expect(page.getByTestId("router-error-description")).toContainText(
  55  |     "Something went wrong on our end",
  56  |   );
  57  |   await expect(page.getByTestId("router-error-message")).toContainText(
  58  |     "ReferenceError: Languages is not defined",
  59  |   );
  60  | 
  61  |   // Clean up simulated element so afterEach hook remains clean
  62  |   await page.evaluate(() => {
  63  |     document.querySelector("[data-testid='router-error-component']")?.remove();
  64  |   });
  65  | });
  66  | 
  67  | test("developer-only views are hidden unless debug=true is in the URL", async ({ page }) => {
  68  |   await page.addInitScript(() => {
  69  |     window.localStorage.setItem("app_workflow_mode", "expert");
  70  |     window.localStorage.setItem("yt_debug_mode", "true");
  71  |   });
  72  | 
  73  |   await page.goto("./");
  74  |   await expect(page.getByTestId("top-tabs-nav")).toBeVisible();
  75  |   await expect(page.getByTestId("tab-viewer")).toBeVisible();
  76  |   await expect(page.getByTestId("tab-playground")).toHaveCount(0);
  77  |   await expect(page.getByTestId("tab-ai-punctuation")).toHaveCount(0);
  78  |   await expect(page.getByTestId("developer-mode-indicator")).toHaveCount(0);
  79  | 
  80  |   await page.goto("./?debug=false");
  81  |   await expect(page.getByTestId("tab-playground")).toHaveCount(0);
  82  |   await expect(page.getByTestId("tab-ai-punctuation")).toHaveCount(0);
  83  | 
  84  |   await page.goto("./?android=true&debug=false&stage=4");
  85  |   await page.locator('details[data-panel-id="playback"] > summary').click();
  86  |   await expect(page.getByTestId("experimental-server-fetch-controls")).toHaveCount(0);
  87  | 
  88  |   await page.goto("./?android=true&debug=true&stage=4");
  89  |   await page.locator('details[data-panel-id="playback"] > summary').click();
> 90  |   await expect(page.getByTestId("experimental-server-fetch-controls")).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  91  |   await expect(page.getByTestId("fetch-server-url-input")).toBeVisible();
  92  | 
  93  |   await page.goto("./?debug=true");
  94  |   await expect(page.getByTestId("tab-playground")).toBeVisible();
  95  |   await expect(page.getByTestId("tab-ai-punctuation")).toBeVisible();
  96  |   await expect(page.getByTestId("developer-mode-indicator")).toHaveAttribute(
  97  |     "data-control-category",
  98  |     "experimental",
  99  |   );
  100 |   await expect(page.getByTestId("tab-playground")).toHaveAttribute(
  101 |     "data-control-category",
  102 |     "experimental",
  103 |   );
  104 | });
  105 | 
  106 | test("state-machine action logs open and copy the diagnostic report", async ({ page, context }) => {
  107 |   await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  108 |   await page.goto("./?debug=true");
  109 | 
  110 |   const openLogsButton = page.getByTestId("open-state-machine-action-logs-button");
  111 |   await expect(openLogsButton).toBeVisible();
  112 |   await openLogsButton.click();
  113 | 
  114 |   const dialog = page.getByRole("dialog", { name: "State Machine Actions" });
  115 |   await expect(dialog).toBeVisible();
  116 |   await expect(
  117 |     dialog.locator('[data-testid="action-log-list"], [data-testid="empty-action-logs"]'),
  118 |   ).toHaveCount(1);
  119 |   await dialog.getByTestId("copy-all-action-logs-button").click();
  120 |   await expect(dialog.getByTestId("copy-all-action-logs-button")).toContainText("Copied");
  121 | 
  122 |   const copiedReport = await page.evaluate(() => navigator.clipboard.readText());
  123 |   expect(copiedReport).toContain("# Bug Report & Troubleshooting Prompt for AI Developer");
  124 |   await dialog.getByRole("button", { name: "Close action logs" }).click();
  125 |   await expect(dialog).toHaveCount(0);
  126 | });
  127 | 
  128 | test.skip("beginner mode has two flows and presents the daily video, favorites, parser, and table", async ({
  129 |   page,
  130 | }) => {
  131 |   await page.addInitScript(() => {
  132 |     window.localStorage.setItem("app_workflow_mode", "beginner");
  133 |   });
  134 |   await page.goto("./?mode=beginner");
  135 | 
  136 |   await expect(page.getByTestId("beginner-tab-nav")).toBeVisible();
  137 |   await expect(page.locator('button[data-testid^="beginner-tab-"]')).toHaveCount(2);
  138 |   await expect(page.getByTestId("beginner-tab-preferences")).toHaveAttribute(
  139 |     "aria-current",
  140 |     "page",
  141 |   );
  142 |   await expect(page.getByTestId("beginner-preferences-tab")).toBeVisible();
  143 |   await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  144 |   await expect(page.getByTestId("beginner-overlay-preference")).toBeVisible();
  145 |   await expect(page.getByTestId("beginner-flow-arrow-preferences")).toBeVisible();
  146 | 
  147 |   const overlayPreference = page.getByTestId("beginner-overlay-preference");
  148 |   const initialOverlayPreference = await overlayPreference.isChecked();
  149 | 
  150 |   await page.getByTestId("btn-continue-to-video").click();
  151 |   await expect(page.getByTestId("beginner-tab-video")).toHaveAttribute("aria-current", "page");
  152 |   await expect(page.getByTestId("beginner-video-tab")).toBeVisible();
  153 |   await expect(page.getByTestId("beginner-player-slot-container")).toBeVisible();
  154 |   await expect(page.getByTestId("video-display-controls")).toBeVisible();
  155 |   await expect(page.getByTestId("subtitle-overlay-size-decrease")).toBeVisible();
  156 |   await expect(page.getByTestId("subtitle-overlay-size-increase")).toBeVisible();
  157 |   await expect(page.getByTestId("video-subtitles-overlay-toggle")).toBeVisible();
  158 |   await expect(page.getByTestId("language-boxes-selector-wrapper")).toBeVisible();
  159 |   await expect(page.getByTestId("beginner-parallel-subtitles")).toBeVisible();
  160 |   await expect(page.getByTestId("beginner-chars-removal-accordion")).toBeVisible();
  161 |   await expect(page.getByTestId("subtitles-table-panel")).toBeVisible();
  162 |   const toggleParserBtn = page.getByTestId("btn-toggle-quarantined-parser");
  163 |   if (await toggleParserBtn.isVisible().catch(() => false)) {
  164 |     await toggleParserBtn.click();
  165 |   }
  166 |   await expect(page.getByTestId("new-subtitles-parser-bar")).toBeVisible();
  167 |   await expect(page.getByTestId("video-subtitles-overlay-toggle")).toHaveAttribute(
  168 |     "aria-pressed",
  169 |     String(initialOverlayPreference),
  170 |   );
  171 | 
  172 |   const controlsBeforeFavorites = await page
  173 |     .getByTestId("video-display-controls")
  174 |     .evaluate((controls) =>
  175 |       Boolean(
  176 |         controls.compareDocumentPosition(
  177 |           document.querySelector('[data-testid="language-boxes-selector-wrapper"]')!,
  178 |         ) & Node.DOCUMENT_POSITION_FOLLOWING,
  179 |       ),
  180 |     );
  181 |   expect(controlsBeforeFavorites).toBe(true);
  182 | 
  183 |   const favoritesBeforeTable = await page
  184 |     .getByTestId("language-boxes-selector-wrapper")
  185 |     .evaluate((selector) =>
  186 |       Boolean(
  187 |         selector.compareDocumentPosition(
  188 |           document.querySelector('[data-testid="beginner-parallel-subtitles"]')!,
  189 |         ) & Node.DOCUMENT_POSITION_FOLLOWING,
  190 |       ),
```