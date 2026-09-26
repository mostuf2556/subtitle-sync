import type { Json3 } from "./subtitles";

export type NativeShell = {
  isNativeShell(): boolean;
  getLastObservedTimedTextUrl(): string;
  fetchTranslatedCaptionsWithUrl(url: string, language: string, format: string): string;
};

export function nativeShell(): NativeShell | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as Window & { AndroidNativeShell?: NativeShell }).AndroidNativeShell;
  try { return bridge?.isNativeShell() ? bridge : null; } catch { return null; }
}

export function decodeInterceptedCaption(payload: string): { url: string; rawData: string } | null {
  try {
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value.url === "string" && typeof value.rawData === "string" ? value : null;
  } catch { return null; }
}

export function parseJson3(raw: string): Json3 | null {
  try {
    const data = JSON.parse(raw) as Json3;
    return Array.isArray(data.events) && data.events.some((event) => event.segs?.some((s) => s.utf8?.trim())) ? data : null;
  } catch { return null; }
}

export function timedTextVideoId(url: string): string | null {
  try { return new URL(url).searchParams.get("v"); } catch { return null; }
}

export function parseVideoId(value: string): string | null {
  const text = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(url.hostname)) return null;
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}