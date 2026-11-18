import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveTextSpeechLanguage } from "../src/utils/openRouterSentenceGenerator.ts";
import {
  getCustomAutoProviders,
  setCustomAutoProviders,
  disableAutoProvider,
} from "../src/lib/alternative-tts.ts";

console.log("=== Verify Tasks 445 & 446: Text Language Pronunciation & Provider Disable Button ===");

// Task 445: Script-aware language resolution
assert.equal(resolveTextSpeechLanguage("שלום עולם", "en", "he"), "he");
assert.equal(resolveTextSpeechLanguage("مرحبا بالعالم", "en", "ar"), "ar");
assert.equal(resolveTextSpeechLanguage("Привет мир", "en", "ru"), "ru");
assert.equal(resolveTextSpeechLanguage("Hola mundo", "es", "en"), "es");
assert.equal(resolveTextSpeechLanguage("Hello world", "en", "he"), "en");

// Task 446: disableAutoProvider & UI buttons
setCustomAutoProviders(["google", "openai"]);
const afterDisable = disableAutoProvider("google");
assert.ok(!afterDisable.includes("google"));
assert.ok(afterDisable.includes("openai"));
assert.deepEqual(getCustomAutoProviders(), afterDisable);

const gameSrc = fs.readFileSync(
  path.resolve("src/components/OpenRouterSentenceGamePanel.tsx"),
  "utf8",
);
assert.ok(
  gameSrc.includes("resolveTextSpeechLanguage("),
  "OpenRouterSentenceGamePanel must resolve text speech language before speaking",
);
assert.ok(
  gameSrc.includes('data-testid="btn-disable-employed-provider"'),
  "OpenRouterSentenceGamePanel must present employed provider as a clickable disable button",
);

const ttsPanelSrc = fs.readFileSync(
  path.resolve("src/components/TtsServiceSettingsPanel.tsx"),
  "utf8",
);
assert.ok(
  ttsPanelSrc.includes("<button") && ttsPanelSrc.includes('data-testid="tts-employed-provider-badge"'),
  "TtsServiceSettingsPanel must render employed provider as a clickable button to disable it",
);

console.log("PASS: Tasks 445 & 446 verified.");
