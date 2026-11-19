import assert from "node:assert/strict";
import {
  buildLovableTtsRequestBody,
  buildLovableTtsUrl,
  getLastEmployedTtsProvider,
  getLovableTtsMethod,
  synthesizeLovableTtsAudio,
} from "../src/lib/alternative-tts";

async function run() {
  // 1. Default HTTP method must be POST
  assert.equal(getLovableTtsMethod(), "post", "Default Lovable TTS method should be 'post'");

  // 2. buildLovableTtsUrl must NEVER include token, api_key, or speed in GET query params
  const urlStr = buildLovableTtsUrl("Hello world", "en", {
    provider: "openrouter",
    speakApiToken: "spk_secret_token_123",
    apiKey: "sk-or-secret-key-456",
    speed: 1.5,
  });
  const parsed = new URL(urlStr);
  assert.equal(parsed.searchParams.has("token"), false, "GET URL must never contain token param");
  assert.equal(parsed.searchParams.has("api_key"), false, "GET URL must never contain api_key param");
  assert.equal(parsed.searchParams.has("speed"), false, "GET URL must never contain speed param");
  assert.equal(urlStr.includes("spk_secret_token_123"), false, "GET URL must not leak speakApiToken");
  assert.equal(urlStr.includes("sk-or-secret-key-456"), false, "GET URL must not leak provider apiKey");

  // 2b. buildLovableTtsRequestBody must NEVER include speed
  const postBody = buildLovableTtsRequestBody("Hello world", "en", {
    provider: "auto",
    speed: 1.75,
  });
  assert.equal("speed" in postBody, false, "POST body must never contain speed");

  // 3. synthesizeLovableTtsAudio must prefer POST when token is present (even if method:'get' is passed)
  // and must record the employed provider from response headers/body
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  let capturedMethod = "";
  let capturedAuthHeader = "";
  let capturedUrl = "";

  try {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
      "blob:mock-audio-url";

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || "GET";
      const headers = (init?.headers || {}) as Record<string, string>;
      capturedAuthHeader = headers["Authorization"] || headers["authorization"] || "";
      return new Response(new Blob(["mock-audio"], { type: "audio/mpeg" }), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "x-tts-provider": "edge",
        },
      });
    }) as typeof fetch;

    const result = await synthesizeLovableTtsAudio("Hola mundo", "es", {
      method: "get",
      format: "binary",
      provider: "auto",
      speakApiToken: "spk_live_token_999",
    });

    assert.ok(result?.url, "Expected synthesized audio URL");
    assert.equal(capturedMethod, "POST", "Authenticated synthesis must strictly use POST even if method:'get' is passed");
    assert.equal(capturedAuthHeader, "Bearer spk_live_token_999", "Token must be sent via Authorization Bearer header");
    assert.equal(capturedUrl.includes("spk_live_token_999"), false, "Token must never appear in request URL");

    const employed = getLastEmployedTtsProvider();
    assert.ok(employed, "Expected employed TTS provider to be recorded");
    assert.equal(employed.provider, "edge", "Expected employed provider to be extracted from x-tts-provider header");
    assert.equal(employed.source, "header", "Expected employed provider source to be 'header'");
  } finally {
    globalThis.fetch = originalFetch;
    (URL as unknown as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
      originalCreateObjectURL;
  }

  console.log("PASS: verify-tts-post-and-provider-display");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
