import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert";

function probeUrl(urlPath: string): Promise<{ status: number; text: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          text: data,
          contentType: res.headers["content-type"] || "",
        });
      });
    });
    req.on("error", (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error(`Timeout probing dev server for ${urlPath}`));
    });
  });
}

async function run() {
  console.log("=========================================================================");
  console.log("🧪 Verifying Hotfix: Vite Reload, Module Exports, and Dev Server Health");
  console.log("=========================================================================");

  // 1. Verify appSettings.ts exports
  console.log("Check 1: Verifying appSettings.ts exports...");
  const appSettings = await import("../src/utils/appSettings");
  assert.strictEqual(
    typeof appSettings.getDisableAutoFocusSetting,
    "function",
    "appSettings must export getDisableAutoFocusSetting",
  );
  assert.strictEqual(
    typeof appSettings.setDisableAutoFocusSetting,
    "function",
    "appSettings must export setDisableAutoFocusSetting",
  );
  assert.strictEqual(
    typeof appSettings.getDisableScrollingSetting,
    "function",
    "appSettings must export getDisableScrollingSetting",
  );
  assert.strictEqual(
    typeof appSettings.setDisableScrollingSetting,
    "function",
    "appSettings must export setDisableScrollingSetting",
  );
  console.log("✓ Check 1 passed: appSettings exports verified.");

  // 1b. Verify playback-preferences.ts and speechVoiceUtils.ts exports
  console.log("Check 1b: Verifying playback-preferences.ts and speechVoiceUtils.ts exports...");
  const playbackPrefs = await import("../src/lib/playback-preferences");
  assert.strictEqual(
    typeof playbackPrefs.getTableDisplayModePreference,
    "function",
    "playbackPrefs must export getTableDisplayModePreference",
  );
  assert.strictEqual(
    typeof playbackPrefs.getLanguageTtsVolume,
    "function",
    "playbackPrefs must export getLanguageTtsVolume",
  );
  assert.strictEqual(
    typeof playbackPrefs.setTableDisplayModePreference,
    "function",
    "playbackPrefs must export setTableDisplayModePreference",
  );

  const speechVoiceUtils = await import("../src/utils/speechVoiceUtils");
  assert.strictEqual(
    typeof speechVoiceUtils.getSampleTextForLanguage,
    "function",
    "speechVoiceUtils must export getSampleTextForLanguage",
  );
  console.log("✓ Check 1b passed: playback-preferences and speechVoiceUtils exports verified.");

  // 2. Verify subtitleCache.ts exports
  console.log("Check 2: Verifying subtitleCache.ts exports...");
  const subtitleCache = await import("../src/utils/subtitleCache");
  assert.strictEqual(
    typeof subtitleCache.cacheJson3Track,
    "function",
    "subtitleCache must export cacheJson3Track",
  );
  console.log("✓ Check 2 passed: subtitleCache.cacheJson3Track verified.");

  // 3. Target modules from the prompt error log
  const targetModules = [
    "/src/styles.css",
    "/src/components/AttemptOrderSettings.tsx",
    "/src/utils/appSettings.ts",
    "/src/components/beginner/tabs/BeginnerPreferencesTab.tsx",
    "/src/utils/subtitleCache.ts",
    "/src/routes/index.tsx",
    "/src/storybook/StorybookWorkbench.tsx",
    "/src/client.tsx",
    "/src/lib/playback-preferences.ts",
    "/src/utils/speechVoiceUtils.ts",
    "/src/components/SettingsBackupModal.tsx",
    "/src/components/SubtitlesTablePanel.tsx",
  ];

  console.log("Check 3: Verifying all target files exist on disk without merge markers...");
  for (const modPath of targetModules) {
    const diskPath = path.resolve(process.cwd(), modPath.slice(1));
    assert.ok(fs.existsSync(diskPath), `File must exist on disk: ${diskPath}`);
    const content = fs.readFileSync(diskPath, "utf-8");
    assert.ok(!content.includes("<<<<<<<"), `File must not contain merge markers: ${modPath}`);
  }
  console.log("✓ Check 3 passed: All target files exist cleanly on disk.");

  // 4. Probe Vite dev server for all target modules
  console.log("Check 4: Probing Vite dev server transforms for all target modules...");
  for (const modPath of targetModules) {
    const res = await probeUrl(modPath);
    assert.strictEqual(
      res.status,
      200,
      `Dev server must return HTTP 200 for ${modPath}, got ${res.status}`,
    );
    assert.ok(
      !res.text.includes("[PARSE_ERROR]"),
      `Dev server response for ${modPath} must not contain PARSE_ERROR`,
    );
    if (modPath.endsWith(".tsx")) {
      assert.ok(
        !res.text.trim().startsWith("<!doctype html") && !res.text.trim().startsWith("<!DOCTYPE html"),
        `Dev server must transform ${modPath} as JavaScript/TypeScript, not fallback to index.html`,
      );
    }
    console.log(`  ✓ ${modPath}: 200 OK (${res.text.length} bytes)`);
  }
  console.log("✓ Check 4 passed: All target modules successfully transformed with 200 OK.");

  console.log("=========================================================================");
  console.log("🎉 ALL CHECKS PASSED: Hotfix verified and dev server is healthy!");
  console.log("=========================================================================");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
