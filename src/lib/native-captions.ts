import type { Json3 } from "./subtitles";
import { extractYouTubeId } from "../utils/youtube";

export type NativeShell = {
  isNativeShell(): boolean;
  getLastObservedTimedTextUrl(): string;
  discoverCaptionUrl?(videoId: string): string;
  fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
  fetchTranslatedCaptions?(language: string, format: string): string;
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

export function ensureCaptionBaseUrl(videoId: string): string | null {
  const shell = nativeShell();
  if (!shell) return null;
  const current = shell.getLastObservedTimedTextUrl();
  if (current) return current;
  if (typeof shell.discoverCaptionUrl === "function") {
    const discovered = shell.discoverCaptionUrl(videoId);
    if (discovered) return discovered;
  }
  return null;
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

  // 1. Try standard JSON3 parse
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as Json3;
      if (
        Array.isArray(data.events) &&
        data.events.some((event) => event.segs?.some((s) => s.utf8?.trim()))
      ) {
        return data;
      }
    } catch {
      // Continue to XML parser
    }
  }

  // 2. Resilient XML Fallback parser for timedtext XML / format 3 / transcript
  try {
    const textMatches = Array.from(trimmed.matchAll(/<text\b([^>]*)>(.*?)<\/text>/gis));
    if (textMatches.length > 0) {
      const events: Json3["events"] = [];
      for (const match of textMatches) {
        const attrs = match[1];
        const content = match[2]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (!content) continue;
        const startSec = parseFloat(attrs.match(/start=["']([0-9.]+)["']/i)?.[1] || "0");
        const durSec = parseFloat(attrs.match(/dur=["']([0-9.]+)["']/i)?.[1] || "2");
        events.push({
          tStartMs: Math.round(startSec * 1000),
          dDurationMs: Math.round(durSec * 1000),
          segs: [{ utf8: content }],
        });
      }
      if (events.length > 0) {
        return { events };
      }
    }

    const pMatches = Array.from(trimmed.matchAll(/<p\b([^>]*)>(.*?)<\/p>/gis));
    if (pMatches.length > 0) {
      const events: Json3["events"] = [];
      for (const match of pMatches) {
        const attrs = match[1];
        const content = match[2]
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (!content) continue;
        const startMs = parseInt(attrs.match(/t=["']([0-9]+)["']/i)?.[1] || "0", 10);
        const durMs = parseInt(attrs.match(/d=["']([0-9]+)["']/i)?.[1] || "2000", 10);
        events.push({
          tStartMs: startMs,
          dDurationMs: durMs,
          segs: [{ utf8: content }],
        });
      }
      if (events.length > 0) {
        return { events };
      }
    }
  } catch {
    // Ignore XML parse errors
  }

  // 3. Resilient WebVTT Parser Fallback
  if (trimmed.includes("-->") || trimmed.startsWith("WEBVTT")) {
    try {
      const vttBlocks = trimmed.split(/\r?\n\r?\n/);
      const events: Json3["events"] = [];
      const timeRegex =
        /(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/;

      for (const block of vttBlocks) {
        const lines = block.trim().split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(timeRegex);
          if (match) {
            const startH = parseInt(match[1] || "0", 10);
            const startM = parseInt(match[2], 10);
            const startS = parseInt(match[3], 10);
            const startMs = parseInt(match[4], 10);
            const tStartMs = startH * 3600000 + startM * 60000 + startS * 1000 + startMs;

            const endH = parseInt(match[5] || "0", 10);
            const endM = parseInt(match[6], 10);
            const endS = parseInt(match[7], 10);
            const endMs = parseInt(match[8], 10);
            const tEndMs = endH * 3600000 + endM * 60000 + endS * 1000 + endMs;
            const dDurationMs = Math.max(0, tEndMs - tStartMs);

            const textLines = lines
              .slice(i + 1)
              .join(" ")
              .replace(/<[^>]*>/g, "")
              .trim();
            if (textLines) {
              events.push({
                tStartMs,
                dDurationMs,
                segs: [{ utf8: textLines }],
              });
            }
            break;
          }
        }
      }
      if (events.length > 0) {
        return { events };
      }
    } catch {
      // Ignore VTT parse errors
    }
  }

  return null;
}

export const SUPPORTED_CAPTION_FORMATS = ["json3", "srv3", "srv1", "vtt"] as const;
export type CaptionFormat = (typeof SUPPORTED_CAPTION_FORMATS)[number];

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
