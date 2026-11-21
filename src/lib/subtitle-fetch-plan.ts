import serverConfig from "../config/server.json";
/**
 * Android-only subtitle fetch attempts (see docs/reliable-subtitles-fetching.md).
 * An attempt = request style (tlang | lang) x sending method (session | anon).
 * One HTTP request per attempt; stop at the first good response; no automatic retries.
 */
import { buildLangReplacedCaptionUrl, buildTranslatedCaptionUrl } from "./native-captions";
import type { SubtitleRequestMode } from "./playback-preferences";
export type { SubtitleRequestMode };

export type SendMode = "session" | "anon";
export type FetchAttempt = { mode: SubtitleRequestMode; send: SendMode; enabled: boolean };
export type FetchStrategyMode = "ordered" | "random";

export interface SubtitleFetchStrategyConfig {
  mode: FetchStrategyMode;
  allowSession: boolean;
  allowAnon: boolean;
  allowTlang: boolean;
  allowLang: boolean;
  windowSeconds: number;
}

export const DEFAULT_FETCH_STRATEGY_CONFIG: SubtitleFetchStrategyConfig = {
  mode: "random",
  allowSession: true,
  allowAnon: true,
  allowTlang: true,
  allowLang: true,
  windowSeconds: 5,
};

export type ExactFetchResult = {
  status: number;
  body: string;
  sentUrl: string;
  send: SendMode;
  error?: string;
};

export function isYouTubeTranslatedSubtitle(url: string, languageCode: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isYouTubeHost = host === "youtube.com" || host.endsWith(".youtube.com");
    const targetLanguage = parsed.searchParams.get("tlang");
    return (
      isYouTubeHost &&
      parsed.pathname === "/api/timedtext" &&
      !!targetLanguage &&
      targetLanguage.toLowerCase() === languageCode.toLowerCase()
    );
  } catch {
    return false;
  }
}

export const DEFAULT_ATTEMPT_ORDER: FetchAttempt[] = [
  { mode: "tlang", send: "session", enabled: true },
  { mode: "lang", send: "session", enabled: true },
  { mode: "tlang", send: "anon", enabled: true },
  { mode: "lang", send: "anon", enabled: true },
];

const ORDER_KEY = "yt_fetch_attempt_order_v1";
const PROMOTE_KEY = "yt_fetch_promote_success_v1";
const STRATEGY_CONFIG_KEY = "yt_fetch_strategy_config_v1";

const key = (a: Pick<FetchAttempt, "mode" | "send">) => `${a.mode}/${a.send}`;

/** Normalizes any stored list: keeps known attempts once each, appends missing ones. */
export function normalizeAttemptOrder(list: unknown): FetchAttempt[] {
  const out: FetchAttempt[] = [];
  const seen = new Set<string>();
  if (Array.isArray(list)) {
    for (const item of list) {
      const a = item as Partial<FetchAttempt>;
      if (
        (a.mode === "tlang" || a.mode === "lang") &&
        (a.send === "session" || a.send === "anon")
      ) {
        const k = key(a as FetchAttempt);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ mode: a.mode, send: a.send, enabled: a.enabled !== false });
      }
    }
  }
  for (const d of DEFAULT_ATTEMPT_ORDER) if (!seen.has(key(d))) out.push({ ...d });
  return out;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getAttemptOrder(): FetchAttempt[] {
  try {
    return normalizeAttemptOrder(JSON.parse(storage()?.getItem(ORDER_KEY) || "null"));
  } catch {
    return normalizeAttemptOrder(null);
  }
}
export function setAttemptOrder(order: FetchAttempt[]) {
  try {
    storage()?.setItem(ORDER_KEY, JSON.stringify(normalizeAttemptOrder(order)));
  } catch {
    // ignore storage errors
  }
}
export function getPromoteSuccessfulAttempt(): boolean {
  return storage()?.getItem(PROMOTE_KEY) !== "0";
}
export function setPromoteSuccessfulAttempt(on: boolean) {
  try {
    storage()?.setItem(PROMOTE_KEY, on ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function getFetchStrategyConfig(): SubtitleFetchStrategyConfig {
  try {
    const raw = storage()?.getItem(STRATEGY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          mode: parsed.mode === "random" ? "random" : "ordered",
          allowSession: parsed.allowSession !== false,
          allowAnon: parsed.allowAnon !== false,
          allowTlang: parsed.allowTlang !== false,
          allowLang: parsed.allowLang !== false,
          windowSeconds:
            typeof parsed.windowSeconds === "number" && parsed.windowSeconds > 0
              ? parsed.windowSeconds
              : 5,
        };
      }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_FETCH_STRATEGY_CONFIG };
}

export function setFetchStrategyConfig(
  patch: Partial<SubtitleFetchStrategyConfig>,
): SubtitleFetchStrategyConfig {
  const current = getFetchStrategyConfig();
  const updated: SubtitleFetchStrategyConfig = {
    ...current,
    ...patch,
  };
  try {
    storage()?.setItem(STRATEGY_CONFIG_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export function shuffleAttempts(attempts: FetchAttempt[]): FetchAttempt[] {
  const out = [...attempts];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = out[i]!;
    out[i] = out[j]!;
    out[j] = temp;
  }
  return out;
}

/**
 * Filters and orders attempts based on active strategy config:
 * - Filters by session/anon and tlang/lang toggles.
 * - If mode === "random" (first-random-strategy), returns randomized order.
 * - If mode === "ordered", preserves base order.
 */
export function buildActiveAttemptOrder(
  baseOrder: FetchAttempt[],
  config?: SubtitleFetchStrategyConfig,
): FetchAttempt[] {
  const cfg = config || getFetchStrategyConfig();
  let filtered = baseOrder.filter((a) => {
    if (!a.enabled) return false;
    if (a.send === "session" && !cfg.allowSession) return false;
    if (a.send === "anon" && !cfg.allowAnon) return false;
    if (a.mode === "tlang" && !cfg.allowTlang) return false;
    if (a.mode === "lang" && !cfg.allowLang) return false;
    return true;
  });

  // Prevent deadlock: if everything was filtered out, fallback to enabled attempts
  if (filtered.length === 0) {
    filtered = baseOrder.filter((a) => a.enabled);
  }
  if (filtered.length === 0) {
    filtered = [...DEFAULT_ATTEMPT_ORDER];
  }

  if (cfg.mode === "random") {
    return shuffleAttempts(filtered);
  }

  return filtered;
}

const USE_SERVER_KEY = "yt_fetch_use_server_v1";
const SERVER_URL_KEY = "yt_fetch_server_url_v1";
/** Defaults come from src/config/server.json (see docs/server.md). */
export const DEFAULT_FETCH_SERVER_URL = serverConfig.server_address;

/** Server proxy is Android-only (web demo stays fixture-only). */
export function getUseFetchServer(): boolean {
  try {
    const v = storage()?.getItem(USE_SERVER_KEY);
    return v == null ? serverConfig.is_enabled : v === "1";
  } catch {
    return serverConfig.is_enabled;
  }
}

export function setUseFetchServer(enabled: boolean) {
  try {
    storage()?.setItem(USE_SERVER_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function getFetchServerUrl(): string {
  try {
    return storage()?.getItem(SERVER_URL_KEY) || DEFAULT_FETCH_SERVER_URL;
  } catch {
    return DEFAULT_FETCH_SERVER_URL;
  }
}

export function setFetchServerUrl(url: string) {
  try {
    storage()?.setItem(SERVER_URL_KEY, url);
  } catch {
    // ignore storage errors
  }
}

/** Builds `<server>/api/proxy?url=<encoded>` from a server base, query template, or endpoint ending in `?url=`. */
export function buildServerProxyUrl(serverUrl: string, targetUrl: string): string {
  const trimmed = (serverUrl || "").trim();
  const encoded = encodeURIComponent(targetUrl);
  if (trimmed.includes("{url}")) return trimmed.replace("{url}", encoded);
  if (trimmed.endsWith("?url=") || trimmed.endsWith("&url=")) return `${trimmed}${encoded}`;
  if (trimmed.endsWith("?url") || trimmed.endsWith("&url")) return `${trimmed}=${encoded}`;

  let base = trimmed.replace(/\/+$/, "");
  if (!/\/proxy$/.test(base)) base = /\/api$/.test(base) ? `${base}/proxy` : `${base}/api/proxy`;
  return `${base}?url=${encoded}`;
}

/** Sends an anonymous timedtext request through `<server>/api/proxy`. */
export async function fetchViaServer(
  serverUrl: string,
  targetUrl: string,
): Promise<ExactFetchResult> {
  const cleanServer = (serverUrl || "").trim();
  if (!cleanServer || cleanServer.includes("<lovable-address>")) {
    return {
      status: 0,
      body: "",
      sentUrl: targetUrl,
      send: "anon",
      error: "Server address is not configured",
    };
  }
  const requestUrl = buildServerProxyUrl(cleanServer, targetUrl);

  try {
    const res = await fetch(requestUrl, {
      method: "GET",

      headers: { Accept: "application/json, text/plain, */*" },
    });
    const body = await res.text();
    return {
      status: res.status,
      body,
      sentUrl: requestUrl,
      send: "anon",
      error: res.ok ? undefined : `Server returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      status: 0,
      body: "",
      sentUrl: requestUrl,
      send: "anon",
      error: String(err),
    };
  }
}

/** Moves the given attempt to the front (keeps everything else in order). */
export function promoteAttempt(order: FetchAttempt[], winner: Pick<FetchAttempt, "mode" | "send">) {
  const k = key(winner);
  const hit = order.find((a) => key(a) === k);
  return hit ? [hit, ...order.filter((a) => key(a) !== k)] : order;
}

export function moveAttempt(order: FetchAttempt[], index: number, dir: -1 | 1): FetchAttempt[] {
  const next = index + dir;
  if (index < 0 || next < 0 || next >= order.length) return order;
  const copy = [...order];
  [copy[index], copy[next]] = [copy[next]!, copy[index]!];
  return copy;
}

export function buildAttemptUrl(observedUrl: string, lang: string, mode: SubtitleRequestMode) {
  return mode === "lang"
    ? buildLangReplacedCaptionUrl(observedUrl, lang, "json3")
    : buildTranslatedCaptionUrl(observedUrl, lang, "json3");
}

export type AttemptLog = (a: FetchAttempt, url: string, r: ExactFetchResult, good: boolean) => void;

/**
 * Runs enabled attempts in order, one request each, until one is good.
 * `send` performs exactly one request; `isGood` validates the body.
 */
export function runFetchAttempts(opts: {
  observedUrl: string;
  lang: string;
  order: FetchAttempt[];
  send: (url: string, withSession: boolean) => ExactFetchResult;
  isGood: (body: string) => boolean;
  onAttempt?: AttemptLog;
}): { body: string; winner: FetchAttempt } | null {
  for (const a of opts.order) {
    if (!a.enabled) continue;
    const url = buildAttemptUrl(opts.observedUrl, opts.lang, a.mode);
    const r = opts.send(url, a.send === "session");
    const good = r.status === 200 && opts.isGood(r.body);
    opts.onAttempt?.(a, url, r, good);
    if (good) return { body: r.body, winner: a };
  }
  return null;
}

/** Yields control back to the browser/WebView UI loop so menus & touch inputs stay responsive. */
export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Async variant of runFetchAttempts that yields between attempts so Android WebView
 * touch handlers, menus, and accordions never become unresponsive during subtitle fetching.
 */
export async function runFetchAttemptsAsync(opts: {
  observedUrl: string;
  lang: string;
  order: FetchAttempt[];
  send: (url: string, withSession: boolean) => Promise<ExactFetchResult> | ExactFetchResult;
  isGood: (body: string) => boolean;
  onAttempt?: AttemptLog;
}): Promise<{ body: string; winner: FetchAttempt } | null> {
  for (const a of opts.order) {
    if (!a.enabled) continue;
    await yieldToMainThread();
    const url = buildAttemptUrl(opts.observedUrl, opts.lang, a.mode);
    const r = await opts.send(url, a.send === "session");
    const good = r.status === 200 && opts.isGood(r.body);
    opts.onAttempt?.(a, url, r, good);
    if (good) return { body: r.body, winner: a };
  }
  return null;
}

const pendingNativeExactFetches = new Map<string, (rawJson: string) => void>();
let nativeExactFetchSeq = 0;

if (typeof window !== "undefined") {
  window.__onNativeFetchTimedTextResult = (requestId: string, payloadJson: string) => {
    const resolver = pendingNativeExactFetches.get(requestId);
    if (resolver) {
      pendingNativeExactFetches.delete(requestId);
      resolver(payloadJson);
    }
  };
}

/**
 * Non-blocking Android native bridge exact fetch: uses `fetchTimedTextExactAsync`
 * when available so the WebView JS/UI thread never stalls on OkHttp I/O, and
 * falls back cleanly to a yielded `fetchTimedTextExact` call on older APKs.
 */
export async function nativeExactFetchAsync(
  bridge: {
    fetchTimedTextExact?: (url: string, withSession: boolean) => string;
    fetchTimedTextExactAsync?: (requestId: string, url: string, withSession: boolean) => boolean;
  },
  url: string,
  withSession: boolean,
): Promise<ExactFetchResult> {
  const send: SendMode = withSession ? "session" : "anon";
  if (typeof window !== "undefined" && bridge.fetchTimedTextExactAsync) {
    // Re-ensure callback dispatcher is installed (handles late mock/bridge attachment)
    window.__onNativeFetchTimedTextResult = (requestId: string, payloadJson: string) => {
      const resolver = pendingNativeExactFetches.get(requestId);
      if (resolver) {
        pendingNativeExactFetches.delete(requestId);
        resolver(payloadJson);
      }
    };
    const requestId = `nf_${Date.now()}_${++nativeExactFetchSeq}`;
    try {
      const rawJson = await new Promise<string>((resolve) => {
        const timer = setTimeout(() => {
          pendingNativeExactFetches.delete(requestId);
          resolve(
            JSON.stringify({
              status: 0,
              body: "",
              sentUrl: url,
              send,
              error: "Native async timedtext fetch timeout",
            }),
          );
        }, 12000);
        pendingNativeExactFetches.set(requestId, (payload: string) => {
          clearTimeout(timer);
          resolve(payload);
        });
        const accepted = bridge.fetchTimedTextExactAsync!(requestId, url, withSession);
        if (accepted === false) {
          clearTimeout(timer);
          pendingNativeExactFetches.delete(requestId);
          resolve("");
        }
      });
      if (rawJson) {
        const r = JSON.parse(rawJson || "{}");
        return {
          status: Number(r.status) || 0,
          body: typeof r.body === "string" ? r.body : "",
          sentUrl: r.sentUrl || url,
          send,
          error: r.error,
        };
      }
    } catch (e) {
      return { status: 0, body: "", sentUrl: url, send, error: String(e) };
    }
  }

  await yieldToMainThread();
  return nativeExactFetch(bridge, url, withSession);
}

/** Calls the native bridge's exact fetch and parses its JSON reply. */
export function nativeExactFetch(
  bridge: { fetchTimedTextExact?: (url: string, withSession: boolean) => string },
  url: string,
  withSession: boolean,
): ExactFetchResult {
  const send: SendMode = withSession ? "session" : "anon";
  if (!bridge.fetchTimedTextExact) {
    return {
      status: 0,
      body: "",
      sentUrl: url,
      send,
      error: "App update required for exact fetch",
    };
  }
  try {
    const r = JSON.parse(bridge.fetchTimedTextExact(url, withSession) || "{}");
    return {
      status: Number(r.status) || 0,
      body: typeof r.body === "string" ? r.body : "",
      sentUrl: r.sentUrl || url,
      send,
      error: r.error,
    };
  } catch (e) {
    return { status: 0, body: "", sentUrl: url, send, error: String(e) };
  }
}
