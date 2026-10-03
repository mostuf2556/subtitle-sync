import { useSyncExternalStore } from "react";

export interface NetworkRequestRecord {
  id: string;
  url: string;
  method: string;
  type: "fetch" | "timedtext_interception" | "native_bridge";
  startTime: number;
  duration?: number;
  status: number;
  responseBodyPreview?: string; // Strictly first X=250 characters
  fullResponseBody?: string; // Complete raw or formatted response body
  error?: string;
  isPending?: boolean;
}

export const MAX_RESPONSE_BODY_PREVIEW_CHARS = 250;

/**
 * Truncate response body strictly to the first X=250 characters
 */
export function truncateResponseBody(
  body: unknown,
  maxChars = MAX_RESPONSE_BODY_PREVIEW_CHARS,
): string {
  if (body === undefined || body === null) return "";
  const str = typeof body === "string" ? body : JSON.stringify(body);
  return str.slice(0, maxChars);
}

// Backward compatibility aliases
export const truncateToFirst15Chars = truncateResponseBody;
export const truncateToFirst50Chars = truncateResponseBody;
export const truncateToFirst200Chars = truncateResponseBody;
export const truncateToFirst250Chars = truncateResponseBody;

let requests: NetworkRequestRecord[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function trackNetworkRequest(
  url: string,
  method = "GET",
  type: "fetch" | "timedtext_interception" | "native_bridge" = "fetch",
) {
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  const record: NetworkRequestRecord = {
    id,
    url,
    method,
    type,
    startTime,
    status: 0,
    isPending: true,
  };

  requests = [record, ...requests.slice(0, 99)];
  notify();

  return {
    id,
    complete: (status: number, responseBody?: unknown) => {
      const duration = Date.now() - startTime;
      const fullStr =
        responseBody === undefined || responseBody === null
          ? ""
          : typeof responseBody === "string"
            ? responseBody
            : JSON.stringify(responseBody, null, 2);
      const preview = truncateResponseBody(fullStr, MAX_RESPONSE_BODY_PREVIEW_CHARS);
      requests = requests.map((req) =>
        req.id === id
          ? {
              ...req,
              status,
              duration,
              isPending: false,
              responseBodyPreview: preview,
              fullResponseBody: fullStr,
            }
          : req,
      );
      notify();
    },
    fail: (error: string) => {
      const duration = Date.now() - startTime;
      requests = requests.map((req) =>
        req.id === id
          ? {
              ...req,
              error,
              duration,
              isPending: false,
              status: 0,
            }
          : req,
      );
      notify();
    },
  };
}

export function clearNetworkRequests() {
  requests = [];
  notify();
}

export function getNetworkRequests(): NetworkRequestRecord[] {
  return requests;
}

export function subscribeToNetworkRequests(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNetworkRequests(): NetworkRequestRecord[] {
  return useSyncExternalStore(subscribeToNetworkRequests, getNetworkRequests, () => []);
}

/**
 * Check if a network request is genuinely successful with a non-empty response body
 */
export function isSuccessfulFetch(req: NetworkRequestRecord): boolean {
  if (req.isPending) return false;
  if (req.error) return false;
  if (req.status !== 200) return false;
  if (!req.fullResponseBody || req.fullResponseBody.trim() === "") return false;
  return true;
}

/**
 * Check if a language has already been successfully fetched with status 200 and body > 0.
 * Rule: never try to fetch if response is ok and size of response body is more than 0.
 */
export function hasSuccessfulFetchForLang(langCode: string): boolean {
  if (!langCode) return false;
  const target = langCode.toLowerCase().trim();
  return requests.some((r) => {
    const tlang = extractTlang(r.url)?.toLowerCase().trim();
    return tlang === target && isSuccessfulFetch(r);
  });
}

/**
 * Extracts target translation language code ('tlang' query param) from a URL if present
 */
export function extractTlang(url: string): string | null {
  try {
    const parsed = new URL(url, "https://www.youtube.com");
    return parsed.searchParams.get("tlang");
  } catch {
    const match = /[?&]tlang=([^&#]+)/i.exec(url);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

/**
 * Formats a network request into a formatted multi-line string for clipboard copy
 */
export function formatRequestForClipboard(req: NetworkRequestRecord): string {
  const tlang = extractTlang(req.url);
  const lines = [
    `=== Network Request ${req.id} ===`,
    `URL: ${req.url}`,
    `Method: ${req.method}`,
    `Type: ${req.type}`,
    `Status: ${req.isPending ? "PENDING" : req.status === 200 && (!req.fullResponseBody || req.fullResponseBody.trim() === "") ? "200 OK (Empty response body — 0 chars)" : req.status}`,
    req.duration !== undefined ? `Duration: ${req.duration}ms` : null,
    tlang ? `Target Language (tlang): ${tlang}` : null,
    req.error ? `Error: ${req.error}` : null,
    `Response Body Length: ${req.fullResponseBody ? req.fullResponseBody.length : 0} characters`,
    `Response:`,
    req.fullResponseBody || (req.status === 200 ? "[Empty response body — 0 chars]" : "[No response body]"),
  ];
  return lines.filter((l): l is string => Boolean(l)).join("\n");
}
