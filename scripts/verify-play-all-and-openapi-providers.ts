import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseOpenApiProviders,
  recordEmployedTtsProvider,
  getLastEmployedTtsProvider,
} from "../src/lib/alternative-tts.ts";

console.log("=== Verify Tasks 443 & 444: Play All (10x) & OpenAPI Provider Control ===");

// Task 443: Play All (X=10) cap in OpenRouterSentenceGamePanel
const gameSrc = fs.readFileSync(
  path.resolve("src/components/OpenRouterSentenceGamePanel.tsx"),
  "utf8",
);
assert.ok(
  gameSrc.includes("export const PLAY_ALL_MAX_ITERATIONS = 10;"),
  "OpenRouterSentenceGamePanel must export PLAY_ALL_MAX_ITERATIONS = 10",
);
assert.ok(
  gameSrc.includes('data-testid="ai-game-play-all-btn"'),
  "OpenRouterSentenceGamePanel must render ai-game-play-all-btn",
);
assert.ok(
  gameSrc.includes('data-testid="ai-game-play-all-limit-notice"'),
  "OpenRouterSentenceGamePanel must render token-protection limit notice after 10 iterations",
);

// Task 444: OpenAPI provider parsing & employed provider tracking
const parsed = parseOpenApiProviders({
  components: {
    schemas: {
      TtsRequest: {
        properties: {
          provider: { enum: ["google", "openai", "elevenlabs", "unknown_provider"] },
        },
      },
    },
  },
});
assert.ok(parsed.includes("google"));
assert.ok(!parsed.includes("unknown_provider" as never));

recordEmployedTtsProvider("google", "requested");
assert.equal(getLastEmployedTtsProvider()?.provider, "google");

const ttsPanelSrc = fs.readFileSync(
  path.resolve("src/components/TtsServiceSettingsPanel.tsx"),
  "utf8",
);
assert.ok(
  ttsPanelSrc.includes('data-testid="btn-sync-openapi-providers"'),
  "TtsServiceSettingsPanel must render Sync openapi.json button",
);
assert.ok(
  ttsPanelSrc.includes('data-testid="tts-employed-provider-badge"'),
  "TtsServiceSettingsPanel must render Employed provider badge",
);

console.log("PASS: Tasks 443 & 444 verified.");
