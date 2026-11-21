import type { Json3 } from "./subtitles";
import { extractYouTubeId } from "../utils/youtube";

export type NativeShell = {
  isNativeShell(): boolean;
  getLastObservedTimedTextUrl(): string;
  fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
  fetchTranslatedCaptions?(language: string, format: string): string;
  fetchTimedTextExact?(url: string, withSession: boolean): string;
  fetchTimedTextExactAsync?(requestId: string, url: string, withSession: boolean): boolean;
  openInBrowser?(url: string): boolean;
  shareText?(text: string, title?: string): boolean;
  shareSubtitlesUrl?(url: string, title?: string): boolean;
};

export function nativeShell(): NativeShell | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { AndroidNativeShell?: NativeShell }).AndroidNativeShell;
  try {
    return bridge?.isNativeShell() ? bridge : null;
  } catch {
    return null;
  }
}

export function decodeInterceptedCaption(payload: string): { url: string; rawData: string } | null {
  try {
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value.url === "string" && typeof value.rawData === "string" ? value : null;
  } catch {
    return null;
  }
}

export function parseJson3(raw: string): Json3 | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // Every non-JSON3 response (HTML, XML, plain text, malformed JSON) is an errored / bad response
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const data = JSON.parse(trimmed) as Json3;
    if (
      Array.isArray(data.events) &&
      data.events.length > 0 &&
      data.events.some((event) => event.segs?.some((s) => s.utf8?.trim()))
    ) {
      data.length = data.events.length;
      return data;
    }
  } catch {
    // Malformed JSON is an errored response
  }

  return null;
}

export function timedTextVideoId(url: string): string | null {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
}

export function parseVideoId(value: string): string | null {
  if (!value || typeof value !== "string") return null;
  const text = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  return extractYouTubeId(text);
}

export function buildTranslatedCaptionUrl(
  baseUrl: string,
  targetLanguage: string,
  format = "json3",
): string {
  try {
    const url = new URL(baseUrl);
    const originalLang = url.searchParams.get("lang");
    if (originalLang && originalLang.toLowerCase() === targetLanguage.toLowerCase()) {
      url.searchParams.delete("tlang");
    } else {
      url.searchParams.set("tlang", targetLanguage);
    }
    if (format) {
      url.searchParams.set("fmt", format);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

/** Request type "lang": replace the lang query with the desired language (no tlang). */
export function buildLangReplacedCaptionUrl(
  baseUrl: string,
  language: string,
  format = "json3",
): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("lang", language);
    url.searchParams.delete("tlang");
    if (format) url.searchParams.set("fmt", format);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

declare global {
  interface Window {
    __earlyInterceptedCaptions?: string[];
    onNativeCaptionsInterceptedBase64?: (encoded: string) => void;
    isInterceptorReady?: boolean;
  }
}

/**
 * Initializes early caption interception buffer to guarantee no YouTube API
 * timedtext requests are lost even if dispatched before the React tree mounts.
 */
export function setupEarlyCaptionInterceptor(): void {
  if (typeof window === "undefined") return;
  window.__earlyInterceptedCaptions = window.__earlyInterceptedCaptions || [];
  if (!window.onNativeCaptionsInterceptedBase64) {
    window.onNativeCaptionsInterceptedBase64 = (encoded: string) => {
      if (encoded && typeof encoded === "string") {
        window.__earlyInterceptedCaptions = window.__earlyInterceptedCaptions || [];
        window.__earlyInterceptedCaptions.push(encoded);
      }
    };
  }
  window.isInterceptorReady = true;
}

/**
 * Attaches the live handler and drains any captions intercepted during early app bootstrap.
 */
export function registerLiveCaptionInterceptor(handler: (encoded: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  setupEarlyCaptionInterceptor();
  window.onNativeCaptionsInterceptedBase64 = handler;
  const queued = window.__earlyInterceptedCaptions || [];
  window.__earlyInterceptedCaptions = [];
  if (queued.length > 0) {
    for (const item of queued) {
      try {
        handler(item);
      } catch (err) {
        console.error("[CaptionInterceptor] Error processing queued caption:", err);
      }
    }
  }
  return () => {
    window.onNativeCaptionsInterceptedBase64 = (encoded: string) => {
      window.__earlyInterceptedCaptions = window.__earlyInterceptedCaptions || [];
      window.__earlyInterceptedCaptions.push(encoded);
    };
  };
}

export function isCaptionInterceptorReady(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.isInterceptorReady);
}
