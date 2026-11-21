/**
 * Client-Side Video Metadata Manager
 * Extracts rich YouTube video metadata without backend dependencies or API keys
 * using official CORS oEmbed endpoints, thumbnail services, client-side timedtext
 * tracklist queries, and active embedded player state inspection.
 */

import { VideoMetadata, VideoCaptionTrackInfo } from "../types";
import { trackNetworkRequest } from "./networkTracker";

const METADATA_KEY_PREFIX = "yt_video_metadata_";
const inMemoryCache = new Map<string, VideoMetadata>();
const inFlightRequests = new Map<string, Promise<VideoMetadata>>();

export interface ThumbnailCollection {
  maxRes: string;
  sd: string;
  hq: string;
  mq: string;
  default: string;
}

/**
 * Returns standard and high-resolution YouTube image thumbnail URLs for a given video ID.
 */
export function getVideoThumbnails(videoId: string): ThumbnailCollection {
  const cleanId = (videoId || "").trim();
  return {
    maxRes: `https://img.youtube.com/vi/${cleanId}/maxresdefault.jpg`,
    sd: `https://img.youtube.com/vi/${cleanId}/sddefault.jpg`,
    hq: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
    mq: `https://img.youtube.com/vi/${cleanId}/mqdefault.jpg`,
    default: `https://img.youtube.com/vi/${cleanId}/default.jpg`,
  };
}

/**
 * Formats a duration in seconds into a human-readable string (e.g. "3:45" or "1:15:30").
 */
export function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

/**
 * Extracts a channel handle or ID from an author URL.
 */
export function extractChannelIdentifier(authorUrl?: string): string | undefined {
  if (!authorUrl) return undefined;
  try {
    const parsed = new URL(authorUrl);
    const path = parsed.pathname;
    if (path.startsWith("/@")) {
      return path.slice(1);
    }
    if (path.startsWith("/channel/")) {
      return path.replace("/channel/", "");
    }
    if (path.startsWith("/c/")) {
      return path.replace("/c/", "");
    }
    if (path.startsWith("/user/")) {
      return path.replace("/user/", "");
    }
  } catch {
    // If not a full URL, check directly
    if (authorUrl.startsWith("@")) return authorUrl;
  }
  return undefined;
}

/**
 * Parses YouTube timedtext tracklist XML response into structured VideoCaptionTrackInfo objects.
 */
export function parseTimedTextTrackList(xmlText: string, videoId: string): VideoCaptionTrackInfo[] {
  if (!xmlText || typeof xmlText !== "string") return [];
  const tracks: VideoCaptionTrackInfo[] = [];

  // Parse using regex to work in both browser and node/worker environments without DOMParser dependency
  const trackRegex = /<track\b([^>]+)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = trackRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const getAttr = (name: string): string => {
      const attrMatch = new RegExp(`${name}="([^"]*)"`, "i").exec(attrs);
      return attrMatch ? attrMatch[1] : "";
    };

    const langCode = getAttr("lang_code");
    if (!langCode) continue;

    const langOriginal = getAttr("lang_original");
    const langTranslated = getAttr("lang_translated");
    const name = getAttr("name");
    const isDefault = getAttr("lang_default") === "true";
    const kind = getAttr("kind");
    const isAsr = kind === "asr";

    const displayName = langOriginal || langTranslated || name || langCode;
    const trackUrl = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(langCode)}${name ? `&name=${encodeURIComponent(name)}` : ""}&fmt=json3`;

    tracks.push({
      langCode,
      name: displayName,
      isDefault,
      isAsr,
      trackUrl,
    });
  }

  return tracks;
}

/**
 * Fetches available caption tracks client-side without backend dependencies.
 */
export async function fetchAvailableCaptionTracks(videoId: string): Promise<{
  tracks: VideoCaptionTrackInfo[];
  defaultLang?: string;
}> {
  const cleanId = (videoId || "").trim();
  if (!cleanId) return { tracks: [] };

  const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(cleanId)}`;

  // Attempt 1: Android native bridge if running in native app (non-blocking)
  if (
    typeof window !== "undefined" &&
    (window.AndroidNativeShell?.fetchTimedTextExactAsync ||
      window.AndroidNativeShell?.fetchTimedTextExact)
  ) {
    const tracker = trackNetworkRequest(trackListUrl, "GET", "native_bridge");
    try {
      const { nativeExactFetchAsync } = await import("../lib/subtitle-fetch-plan");
      const res = await nativeExactFetchAsync(window.AndroidNativeShell, trackListUrl, true);
      const rawXml = res.body || "";
      if (res.status === 200 && rawXml.includes("<transcript_list")) {
        tracker.complete(200, rawXml);
        const tracks = parseTimedTextTrackList(rawXml, cleanId);
        const defaultTrack = tracks.find((t) => t.isDefault);
        return {
          tracks,
          defaultLang: defaultTrack?.langCode || tracks[0]?.langCode,
        };
      }
      tracker.fail(
        res.error || "Non-transcript_list XML response from Android bridge",
        res.status || 200,
        rawXml,
      );
    } catch (err) {
      tracker.fail(err instanceof Error ? err.message : "Android bridge error");
      // Fallback to fetch
    }
  }

  // Attempt 2: Direct client-side fetch (works when CORS is permitted or via extension/proxy)
  const fetchTracker = trackNetworkRequest(trackListUrl, "GET", "fetch");
  try {
    const res = await fetch(trackListUrl, { method: "GET" });
    if (res.ok) {
      const xml = await res.text();
      if (xml.includes("<transcript_list")) {
        fetchTracker.complete(res.status, xml);
        const tracks = parseTimedTextTrackList(xml, cleanId);
        const defaultTrack = tracks.find((t) => t.isDefault);
        return {
          tracks,
          defaultLang: defaultTrack?.langCode || tracks[0]?.langCode,
        };
      }
      fetchTracker.fail("Non-transcript_list response body", res.status, xml);
    } else {
      fetchTracker.fail(`HTTP ${res.status}`, res.status);
    }
  } catch (err) {
    fetchTracker.fail(err instanceof Error ? err.message : "Network or CORS error");
    // Graceful fallback: return empty tracks on network/CORS restrictions
  }

  return { tracks: [] };
}

/**
 * Retrieves cached video metadata from localStorage or memory cache if present.
 */
export function getCachedVideoMetadata(videoId: string): VideoMetadata | null {
  const cleanId = (videoId || "").trim();
  if (!cleanId) return null;

  if (inMemoryCache.has(cleanId)) {
    return inMemoryCache.get(cleanId)!;
  }

  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      const raw = window.localStorage.getItem(`${METADATA_KEY_PREFIX}${cleanId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as VideoMetadata;
        if (parsed && parsed.videoId === cleanId && parsed.title) {
          inMemoryCache.set(cleanId, parsed);
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  return null;
}

/**
 * Persists video metadata into memory and localStorage.
 */
export function cacheVideoMetadata(metadata: VideoMetadata): void {
  const cleanId = metadata.videoId;
  inMemoryCache.set(cleanId, metadata);

  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      window.localStorage.setItem(`${METADATA_KEY_PREFIX}${cleanId}`, JSON.stringify(metadata));
    } catch {
      // Ignore localStorage write quota errors
    }
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent("video-metadata-updated", { detail: { videoId: cleanId, metadata } }),
      );
    } catch {}
  }
}

/**
 * Enriches existing or newly fetched video metadata using live YouTube Player instance inspection.
 */
export function enrichMetadataWithPlayer(
  videoId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player: any,
): VideoMetadata | null {
  const cleanId = (videoId || "").trim();
  if (!cleanId || !player) return null;

  const current = getCachedVideoMetadata(cleanId) || {
    videoId: cleanId,
    title: `YouTube Video (${cleanId})`,
    fetchedAt: Date.now(),
  };

  const thumbs = getVideoThumbnails(cleanId);
  let updated = false;

  // Extract duration if available
  try {
    if (typeof player.getDuration === "function") {
      const dur = player.getDuration();
      if (typeof dur === "number" && dur > 0 && dur !== current.durationSeconds) {
        current.durationSeconds = dur;
        current.durationFormatted = formatDurationSeconds(dur);
        updated = true;
      }
    }
  } catch {}

  // Extract video data (title, author) if available
  try {
    if (typeof player.getVideoData === "function") {
      const data = player.getVideoData();
      if (data && typeof data === "object") {
        if (data.title && typeof data.title === "string" && !current.title.startsWith(data.title)) {
          current.title = data.title;
          updated = true;
        }
        if (data.author && typeof data.author === "string" && !current.authorName) {
          current.authorName = data.author;
          updated = true;
        }
      }
    }
  } catch {}

  // Ensure thumbnails are populated
  if (!current.thumbnailUrl) {
    current.thumbnailUrl = thumbs.hq;
    current.maxResThumbnailUrl = thumbs.maxRes;
    current.sdThumbnailUrl = thumbs.sd;
    current.hqThumbnailUrl = thumbs.hq;
    current.mqThumbnailUrl = thumbs.mq;
    current.defaultThumbnailUrl = thumbs.default;
    updated = true;
  }

  if (updated) {
    cacheVideoMetadata(current);
  }

  return current;
}

/**
 * Client-side fetch for YouTube video metadata.
 * Uses YouTube's official public CORS oEmbed API with fallback to noembed,
 * thumbnail generation, client-side caption tracklist discovery, and player data.
 */
export async function fetchVideoMetadata(
  videoId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: { forceRefresh?: boolean; player?: any },
): Promise<VideoMetadata> {
  const cleanId = (videoId || "").trim();
  if (!cleanId) {
    throw new Error("Invalid videoId provided for metadata extraction");
  }

  if (!options?.forceRefresh) {
    const cached = getCachedVideoMetadata(cleanId);
    if (cached) {
      if (options?.player) {
        enrichMetadataWithPlayer(cleanId, options.player);
      }
      return cached;
    }
  }

  // Deduplicate in-flight requests for the same video ID
  if (inFlightRequests.has(cleanId)) {
    return inFlightRequests.get(cleanId)!;
  }

  const fetchPromise = (async (): Promise<VideoMetadata> => {
    const thumbs = getVideoThumbnails(cleanId);
    const watchUrl = `https://www.youtube.com/watch?v=${cleanId}`;

    let baseMetadata: VideoMetadata | null = null;

    // Attempt 1: Official YouTube oEmbed endpoint (CORS-enabled)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
      const res = await fetch(oembedUrl, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.title === "string" && data.title.trim()) {
          const channelId = extractChannelIdentifier(data.author_url);
          baseMetadata = {
            videoId: cleanId,
            title: data.title.trim(),
            description: `YouTube video by ${data.author_name || "creator"}. Watch on YouTube or play with synchronized parallel captions.`,
            authorName: data.author_name || undefined,
            authorUrl: data.author_url || undefined,
            channelId,
            thumbnailUrl: data.thumbnail_url || thumbs.hq,
            maxResThumbnailUrl: thumbs.maxRes,
            sdThumbnailUrl: thumbs.sd,
            hqThumbnailUrl: thumbs.hq,
            mqThumbnailUrl: thumbs.mq,
            defaultThumbnailUrl: thumbs.default,
            html: data.html || undefined,
            providerName: data.provider_name || "YouTube",
            providerUrl: data.provider_url || "https://www.youtube.com/",
            extractedVia: "youtube_oembed",
            fetchedAt: Date.now(),
          };
        }
      }
    } catch {
      // Fallback to secondary endpoint
    }

    // Attempt 2: NoEmbed open CORS proxy
    if (!baseMetadata) {
      try {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`;
        const res = await fetch(noembedUrl, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.title === "string" && data.title.trim() && !data.error) {
            const channelId = extractChannelIdentifier(data.author_url);
            baseMetadata = {
              videoId: cleanId,
              title: data.title.trim(),
              description: `YouTube video by ${data.author_name || "creator"}. Watch on YouTube or play with synchronized parallel captions.`,
              authorName: data.author_name || undefined,
              authorUrl: data.author_url || undefined,
              channelId,
              thumbnailUrl: data.thumbnail_url || thumbs.hq,
              maxResThumbnailUrl: thumbs.maxRes,
              sdThumbnailUrl: thumbs.sd,
              hqThumbnailUrl: thumbs.hq,
              mqThumbnailUrl: thumbs.mq,
              defaultThumbnailUrl: thumbs.default,
              html: data.html || undefined,
              providerName: "YouTube",
              providerUrl: "https://www.youtube.com/",
              extractedVia: "noembed_cors",
              fetchedAt: Date.now(),
            };
          }
        }
      } catch {
        // Fallback to structured fallback
      }
    }

    // Fallback 3: Standard structured fallback metadata
    if (!baseMetadata) {
      baseMetadata = {
        videoId: cleanId,
        title: `YouTube Video (${cleanId})`,
        description: `YouTube video (${cleanId}). Extracted client-side with full resolution thumbnails.`,
        thumbnailUrl: thumbs.hq,
        maxResThumbnailUrl: thumbs.maxRes,
        sdThumbnailUrl: thumbs.sd,
        hqThumbnailUrl: thumbs.hq,
        mqThumbnailUrl: thumbs.mq,
        defaultThumbnailUrl: thumbs.default,
        providerName: "YouTube",
        providerUrl: "https://www.youtube.com/",
        extractedVia: "client_structured_fallback",
        fetchedAt: Date.now(),
      };
    }

    // Client-side discovery of available caption tracks
    try {
      const captionInfo = await fetchAvailableCaptionTracks(cleanId);
      if (captionInfo.tracks.length > 0) {
        baseMetadata.availableCaptionTracks = captionInfo.tracks;
        baseMetadata.defaultSubtitleLang = captionInfo.defaultLang;
      }
    } catch {}

    // Enrich with player instance if provided
    if (options?.player) {
      try {
        const dur = options.player.getDuration?.();
        if (typeof dur === "number" && dur > 0) {
          baseMetadata.durationSeconds = dur;
          baseMetadata.durationFormatted = formatDurationSeconds(dur);
        }
      } catch {}
    }

    cacheVideoMetadata(baseMetadata);
    return baseMetadata;
  })();

  inFlightRequests.set(cleanId, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cleanId);
  }
}

/**
 * Batch fetches metadata for multiple video IDs.
 */
export async function fetchMultipleVideoMetadata(
  videoIds: string[],
): Promise<Record<string, VideoMetadata>> {
  const results: Record<string, VideoMetadata> = {};
  const promises = videoIds.map(async (id) => {
    try {
      const meta = await fetchVideoMetadata(id);
      results[id] = meta;
    } catch {
      // ignore individual failures
    }
  });
  await Promise.all(promises);
  return results;
}

/**
 * Clears video metadata from in-memory and local storage caches.
 */
export function clearVideoMetadataCache(): void {
  inMemoryCache.clear();
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(METADATA_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {}
  }
}
