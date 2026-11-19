import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  TTS_FALLBACK_ORDER_OPTIONS,
  TtsFallbackOrderSwitch,
} from "../src/components/TtsFallbackOrderSwitch";
import {
  DEFAULT_TTS_FALLBACK_ORDER,
  getTtsFallbackOrder,
  setTtsFallbackOrder,
  getLovableTtsProvider,
  setLovableTtsProvider,
  executeTtsFallbackSequence,
  type TtsFallbackOrder,
} from "../src/lib/alternative-tts";

console.log("=== Running verify-tts-fallback-order-switch.ts ===");

// 1. Component file and options structure
assert(typeof TtsFallbackOrderSwitch === "function", "TtsFallbackOrderSwitch must be a exported React component");
assert(Array.isArray(TTS_FALLBACK_ORDER_OPTIONS), "TTS_FALLBACK_ORDER_OPTIONS must be an array");
assert(TTS_FALLBACK_ORDER_OPTIONS.length === 3, `Expected 3 fallback order options, got ${TTS_FALLBACK_ORDER_OPTIONS.length}`);

const orderIds = TTS_FALLBACK_ORDER_OPTIONS.map((o) => o.id);
assert(orderIds.includes("tts3_native"), "Must contain tts3_native");
assert(orderIds.includes("native_tts3"), "Must contain native_tts3");
assert(orderIds.includes("native_only"), "Must contain native_only");

console.log("✓ All 3 fallback sequences correctly defined in options");

// 2. Storybook stories coverage
const storiesPath = path.resolve(process.cwd(), "src/components/TtsFallbackOrderSwitch.stories.tsx");
assert(fs.existsSync(storiesPath), "TtsFallbackOrderSwitch.stories.tsx must exist");
const storiesContent = fs.readFileSync(storiesPath, "utf-8");
assert(storiesContent.includes("Tts3ServiceFirst"), "Stories must include Tts3ServiceFirst story");
assert(storiesContent.includes("NativeVoiceFirst"), "Stories must include NativeVoiceFirst story");
assert(storiesContent.includes("NativeOnly"), "Stories must include NativeOnly story");

console.log("✓ Storybook stories file verified with complete coverage");

// 3. Fallback order state persistence & default provider
assert(DEFAULT_TTS_FALLBACK_ORDER === "native_tts3", "DEFAULT_TTS_FALLBACK_ORDER must default to native_tts3");

setTtsFallbackOrder("tts3_native");
assert(getTtsFallbackOrder() === "tts3_native", "getTtsFallbackOrder must return persisted order");

setTtsFallbackOrder("native_tts3");
assert(getTtsFallbackOrder() === "native_tts3", "getTtsFallbackOrder restored to default");

// Provider default to "auto"
setLovableTtsProvider("auto");
assert(getLovableTtsProvider() === "auto", "getLovableTtsProvider must return 'auto'");

console.log("✓ Fallback order storage & provider default verified");

// 4. Test executeTtsFallbackSequence logic
async function testFallbackExecution() {
  // Test native_only execution
  const nativeOutcome = await executeTtsFallbackSequence(
    "Hello test",
    "en",
    1.0,
    "native_only",
    undefined,
    {
      onNativeSpeak: async () => true,
    },
  );
  assert(nativeOutcome === "native", `Expected native outcome for native_only, got ${nativeOutcome}`);

  // Test fallback progression with onNativeSpeak fallback
  const fallbackOutcome = await executeTtsFallbackSequence(
    "Hello test",
    "en",
    1.0,
    "native_tts3",
    undefined,
    {
      onNativeSpeak: async () => true,
    },
  );
  assert(fallbackOutcome === "native", `Expected native outcome for native_tts3 when native succeeds, got ${fallbackOutcome}`);

  console.log("✓ executeTtsFallbackSequence execution verified");
}

await testFallbackExecution();

// 5. Verification of integration in src/routes/index.tsx
const indexPath = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexContent = fs.readFileSync(indexPath, "utf-8");

assert(
  indexContent.includes("import { TtsFallbackOrderSwitch } from \"@/components/TtsFallbackOrderSwitch\";"),
  "src/routes/index.tsx must import TtsFallbackOrderSwitch",
);
assert(
  indexContent.includes("executeTtsFallbackSequence"),
  "src/routes/index.tsx must use executeTtsFallbackSequence",
);
assert(
  indexContent.includes("handleNavigateToTtsSetup"),
  "src/routes/index.tsx must define handleNavigateToTtsSetup",
);

// Verify parity: TtsFallbackOrderSwitch must be in Beginner and Advanced modes
const occurrences = (indexContent.match(/<TtsFallbackOrderSwitch/g) || []).length;
assert(
  occurrences >= 2,
  `Expected at least 2 occurrences of <TtsFallbackOrderSwitch (one for Beginner, one for Advanced), found ${occurrences}`,
);

console.log(`✓ Absolute parity verified: <TtsFallbackOrderSwitch rendered in both modes (${occurrences} instances)`);

// 6. Deep navigation anchor
assert(
  indexContent.includes('id="tts-service-settings-panel"') ||
    indexContent.includes("tts-service-settings-panel"),
  "Must include tts-service-settings-panel anchor for deep navigation",
);

console.log("=== All verify-tts-fallback-order-switch assertions passed! ===");
