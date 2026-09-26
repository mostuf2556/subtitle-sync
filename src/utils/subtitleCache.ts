import { CaptionCue, LibraryVideoItem } from '../types';
import { cleanAndFixEncoding } from './captionParser';
import { STORAGE_KEYS } from '../config/appConfig';
import { SAMPLE_AUTHENTIC_RUSSIAN_URL } from '../config/fixtures';
import {
  getCachedJson3ForVideoAndLanguage,
  hasCachedJson3ForVideoAndLanguage,
  getAllCachedLanguageCodesForVideo,
} from '../../test/fixtures/defaultSubtitles';

const SUBTITLE_CACHE_PREFIX = STORAGE_KEYS.SUBTITLE_CACHE_PREFIX;
const LIBRARY_STORAGE_KEY = STORAGE_KEYS.LIBRARY_STORAGE_KEY;
const LAST_ACTIVE_VIDEO_KEY = STORAGE_KEYS.LAST_ACTIVE_VIDEO_KEY;

// In-memory cache for fast synchronous access
const memoryCache = new Map<string, CaptionCue[]>();

function isStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export interface CachedSubtitleData {
  videoId: string;
  cues: CaptionCue[];
  title?: string;
  originalUrl?: string;
  timestamp: number;
}

/**
 * Validate and clean cues array to ensure proper text encoding
 */
export function sanitizeCues(cues: CaptionCue[]): CaptionCue[] {
  if (!Array.isArray(cues)) return [];
  return cues
    .filter((cue) => cue && typeof cue.text === 'string' && typeof cue.start === 'number')
    .map((cue, idx) => ({
      id: cue.id || `cue-${idx + 1}`,
      start: Number(cue.start) || 0,
      duration: Math.max(0.5, Number(cue.duration) || 2),
      text: cleanAndFixEncoding(cue.text),
    }));
}

/**
 * Get cached subtitles for a given YouTube video ID.
 * Tries:
 * 1. Fast in-memory cache
 * 2. Dedicated per-video localStorage item (`yt_subtitles_${videoId}`)
 * 3. Video Library storage (`yt_video_library_v2`)
 */
export function getCachedSubtitles(videoId: string): CaptionCue[] | null {
  if (!videoId) return null;

  // 1. In-memory cache
  if (memoryCache.has(videoId)) {
    const mem = memoryCache.get(videoId);
    if (mem && mem.length > 0) {
      return mem;
    }
  }

  // 2. Dedicated per-video cache item
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(`${SUBTITLE_CACHE_PREFIX}${videoId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cuesList = Array.isArray(parsed) ? parsed : parsed.cues;
        if (Array.isArray(cuesList) && cuesList.length > 0) {
          const sanitized = sanitizeCues(cuesList);
          if (sanitized.length > 0) {
            memoryCache.set(videoId, sanitized);
            return sanitized;
          }
        }
      }
    } catch (err) {
      console.warn(`[SubtitleCache] Failed reading dedicated cache for ${videoId}:`, err);
    }
  }

  // 3. General library storage
  if (isStorageAvailable()) {
    try {
      const rawLib = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (rawLib) {
        const lib = JSON.parse(rawLib);
        if (Array.isArray(lib)) {
          const matched = lib.find((item: LibraryVideoItem) => item.id === videoId);
          if (matched && Array.isArray(matched.cues) && matched.cues.length > 0) {
            const sanitized = sanitizeCues(matched.cues);
            if (sanitized.length > 0) {
              memoryCache.set(videoId, sanitized);
              return sanitized;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[SubtitleCache] Failed reading library cache for ${videoId}:`, err);
    }
  }

  return null;
}

/**
 * Checks if non-empty cached subtitles exist for a video ID
 */
export function hasCachedSubtitles(videoId: string): boolean {
  if (!videoId) return false;
  if (memoryCache.has(videoId)) {
    const mem = memoryCache.get(videoId);
    if (mem && mem.length > 0) return true;
  }
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(`${SUBTITLE_CACHE_PREFIX}${videoId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cues = Array.isArray(parsed) ? parsed : parsed.cues;
        if (Array.isArray(cues) && cues.length > 0) return true;
      }
    } catch {}
  }
  return false;
}

/**
 * Persist subtitles for a video into memory and localStorage.
 */
export function saveCachedSubtitles(
  videoId: string,
  cues: CaptionCue[],
  meta?: { title?: string; originalUrl?: string }
): void {
  if (!videoId || !Array.isArray(cues) || cues.length === 0) return;

  const sanitized = sanitizeCues(cues);
  if (sanitized.length === 0) return;

  // 1. Update in-memory cache
  memoryCache.set(videoId, sanitized);

  if (!isStorageAvailable()) return;

  // 2. Update dedicated per-video localStorage entry
  const dataToSave: CachedSubtitleData = {
    videoId,
    cues: sanitized,
    title: meta?.title || `Video ${videoId}`,
    originalUrl: meta?.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(
      `${SUBTITLE_CACHE_PREFIX}${videoId}`,
      JSON.stringify(dataToSave)
    );
  } catch (err) {
    console.warn('[SubtitleCache] LocalStorage quota exceeded, pruning old cached subtitles...', err);
    pruneOldSubtitleCaches();
    try {
      localStorage.setItem(
        `${SUBTITLE_CACHE_PREFIX}${videoId}`,
        JSON.stringify(dataToSave)
      );
    } catch {
      // If still fails, memory cache remains active
    }
  }
}

/**
 * Remove oldest cached items if storage quota is tight
 */
function pruneOldSubtitleCaches(): void {
  if (!isStorageAvailable()) return;
  try {
    const keys: { key: string; time: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SUBTITLE_CACHE_PREFIX)) {
        try {
          const val = JSON.parse(localStorage.getItem(k) || '{}');
          keys.push({ key: k, time: val.timestamp || 0 });
        } catch {
          keys.push({ key: k, time: 0 });
        }
      }
    }
    // Sort oldest first
    keys.sort((a, b) => a.time - b.time);
    // Remove oldest 3
    for (let i = 0; i < Math.min(3, keys.length); i++) {
      localStorage.removeItem(keys[i].key);
    }
  } catch {}
}

/**
 * Remember the last active video ID and URL
 */
export function saveLastActiveVideo(videoId: string, url: string): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(
      LAST_ACTIVE_VIDEO_KEY,
      JSON.stringify({ videoId, url, timestamp: Date.now() })
    );
  } catch {}
}

/**
 * Get the last active video from previous session
 */
export function getLastActiveVideo(): { videoId: string; url: string } | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_VIDEO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.videoId) {
        return { videoId: parsed.videoId, url: parsed.url || `https://www.youtube.com/watch?v=${parsed.videoId}` };
      }
    }
  } catch {}
  return null;
}

const TIMEDTEXT_URL_PREFIX = STORAGE_KEYS.TIMEDTEXT_URL_PREFIX;

// In-memory observed timedtext requests
const observedTimedTextCache = new Map<string, string>();

// Example observed JSON3 timedtext request URL
export const SAMPLE_OBSERVED_TIMEDTEXT_URL = SAMPLE_AUTHENTIC_RUSSIAN_URL;

export function saveObservedTimedTextUrl(videoId: string, url: string): void {
  if (!videoId || !url) return;
  observedTimedTextCache.set(videoId, url);
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(`${TIMEDTEXT_URL_PREFIX}${videoId}`, url);
  } catch {}
}

export function getObservedTimedTextUrl(videoId: string): string | null {
  if (!videoId) return null;
  if (observedTimedTextCache.has(videoId)) {
    return observedTimedTextCache.get(videoId)!;
  }
  if (isStorageAvailable()) {
    try {
      const saved = localStorage.getItem(`${TIMEDTEXT_URL_PREFIX}${videoId}`);
      if (saved) {
        observedTimedTextCache.set(videoId, saved);
        return saved;
      }
    } catch {}
  }

  return null;
}

/**
 * Returns authentic Hebrew subtitles for the default JSON3 demo video.
 */
export function getAuthenticHebrewCuesForDefaultVideo(): CaptionCue[] {
  const json3Cues = getCachedJson3ForVideoAndLanguage('L2Ryrr6txwA', 'he');
  return json3Cues || [];
}

/**
 * Checks if target language subtitles are cached for a video ID
 */
export function hasCachedTargetSubtitles(videoId: string, targetLang: string): boolean {
  if (!videoId || !targetLang) return false;
  let cleanLang = targetLang.toLowerCase().split('-')[0];
  if (cleanLang === 'iw' || cleanLang === 'il') cleanLang = 'he';
  const targetKey = `${SUBTITLE_CACHE_PREFIX}${videoId}_${cleanLang}`;
  if (hasCachedJson3ForVideoAndLanguage(videoId, cleanLang)) return true;
  if (memoryCache.has(targetKey)) return true;
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(targetKey);
      return !!raw;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Gets cached target language subtitles for a video ID (from JSON3 fixtures, memory, or localStorage)
 */
export function getCachedTargetSubtitles(videoId: string, targetLang: string): CaptionCue[] | null {
  if (!videoId || !targetLang) return null;
  let cleanLang = targetLang.toLowerCase().split('-')[0];
  if (cleanLang === 'iw' || cleanLang === 'il') cleanLang = 'he';
  const targetKey = `${SUBTITLE_CACHE_PREFIX}${videoId}_${cleanLang}`;

  // 1. Real JSON3 fixtures
  const json3Cues = getCachedJson3ForVideoAndLanguage(videoId, cleanLang);
  if (json3Cues && json3Cues.length > 0) {
    const sanitized = sanitizeCues(json3Cues);
    memoryCache.set(targetKey, sanitized);
    return sanitized;
  }

  // 2. Check in-memory cache
  if (memoryCache.has(targetKey)) {
    const mem = memoryCache.get(targetKey);
    if (mem && mem.length > 0) return mem;
  }

  // 3. Check localStorage
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(targetKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cuesList = Array.isArray(parsed) ? parsed : parsed.cues;
        if (Array.isArray(cuesList) && cuesList.length > 0) {
          const sanitized = sanitizeCues(cuesList);
          memoryCache.set(targetKey, sanitized);
          return sanitized;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Saves cached target language subtitles for a video ID
 */
export function saveCachedTargetSubtitles(videoId: string, targetLang: string, cues: CaptionCue[]): void {
  if (!videoId || !targetLang || !cues || cues.length === 0) return;
  const cleanLang = targetLang.toLowerCase().split('-')[0];
  const targetKey = `${SUBTITLE_CACHE_PREFIX}${videoId}_${cleanLang}`;
  const sanitized = sanitizeCues(cues);
  memoryCache.set(targetKey, sanitized);
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(
      targetKey,
      JSON.stringify({
        videoId,
        lang: cleanLang,
        cues: sanitized,
        timestamp: Date.now(),
      })
    );
  } catch {}
}

/**
 * Lists all target languages with cached JSON3 tracks for a given video
 */
export function getAllCachedTargetLanguages(videoId: string): string[] {
  const set = new Set<string>();
  if (!videoId) return [];

  // 1. Check fixture tracks
  const fixtureLangs = getAllCachedLanguageCodesForVideo(videoId);
  if (Array.isArray(fixtureLangs)) {
    fixtureLangs.forEach((code) => set.add(code.toLowerCase()));
  }

  // 2. Check localStorage
  if (isStorageAvailable()) {
    try {
      const prefix = `${SUBTITLE_CACHE_PREFIX}${videoId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const lang = k.replace(prefix, '');
          if (lang) set.add(lang.toLowerCase());
        }
      }
    } catch {}
  }

  // 3. Check memory cache
  for (const key of memoryCache.keys()) {
    const prefix = `${SUBTITLE_CACHE_PREFIX}${videoId}_`;
    if (key.startsWith(prefix)) {
      const lang = key.replace(prefix, '');
      if (lang) set.add(lang.toLowerCase());
    }
  }

  return Array.from(set);
}

/**
 * Clears in-memory and localStorage subtitle caches
 */
export function clearSubtitleCache(): void {
  memoryCache.clear();
  if (!isStorageAvailable()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SUBTITLE_CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}


