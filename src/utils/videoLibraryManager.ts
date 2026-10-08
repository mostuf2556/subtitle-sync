import { LibraryVideoItem } from "../types";
import { STORAGE_KEYS, DEFAULT_LIBRARY_ITEMS } from "../config/appConfig";

const STORAGE_KEY = STORAGE_KEYS.LIBRARY_STORAGE_KEY;
const MAX_LIBRARY_ITEMS = 50;

/**
 * Checks if browser localStorage is accessible.
 */
function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Loads video watch history / library from localStorage.
 * Falls back to DEFAULT_LIBRARY_ITEMS if storage is empty.
 */
export function loadVideoLibrary(): LibraryVideoItem[] {
  if (!isStorageAvailable()) {
    return [...DEFAULT_LIBRARY_ITEMS];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default library items on first access
      saveVideoLibrary(DEFAULT_LIBRARY_ITEMS);
      return [...DEFAULT_LIBRARY_ITEMS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        id: String(item.id || "").trim(),
        originalUrl: String(item.originalUrl || `https://www.youtube.com/watch?v=${item.id}`),
        title: String(item.title || `YouTube Video · ${item.id}`),
        cues: Array.isArray(item.cues) ? item.cues : [],
        timestamp: typeof item.timestamp === "number" ? item.timestamp : Date.now(),
        targetLanguages: Array.isArray(item.targetLanguages) ? item.targetLanguages : undefined,
      }));
    }
    return [...DEFAULT_LIBRARY_ITEMS];
  } catch {
    return [...DEFAULT_LIBRARY_ITEMS];
  }
}

/**
 * Persists the video library list to localStorage.
 */
export function saveVideoLibrary(items: LibraryVideoItem[]): void {
  if (!isStorageAvailable() || !Array.isArray(items)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_LIBRARY_ITEMS)));
  } catch (err) {
    console.warn("[VideoLibraryManager] Failed to persist video library:", err);
  }
}

/**
 * Records or updates a video in the watch history (most recent first).
 */
export function recordVideoWatch(video: {
  id: string;
  title?: string;
  originalUrl?: string;
}): LibraryVideoItem[] {
  const videoId = String(video.id || "").trim();
  if (!videoId) return loadVideoLibrary();

  const currentItems = loadVideoLibrary();
  const existingIndex = currentItems.findIndex((item) => item.id === videoId);

  const updatedItem: LibraryVideoItem = {
    id: videoId,
    originalUrl: video.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
    title: video.title || (existingIndex >= 0 ? currentItems[existingIndex].title : `YouTube Video · ${videoId}`),
    cues: existingIndex >= 0 ? currentItems[existingIndex].cues : [],
    timestamp: Date.now(),
    targetLanguages: existingIndex >= 0 ? currentItems[existingIndex].targetLanguages : undefined,
  };

  const filtered = currentItems.filter((item) => item.id !== videoId);
  const updatedList = [updatedItem, ...filtered].slice(0, MAX_LIBRARY_ITEMS);

  saveVideoLibrary(updatedList);
  return updatedList;
}

/**
 * Removes a video from the library.
 */
export function removeVideoFromLibrary(videoId: string): LibraryVideoItem[] {
  const currentItems = loadVideoLibrary();
  const updatedList = currentItems.filter((item) => item.id !== videoId);
  saveVideoLibrary(updatedList);
  return updatedList;
}

/**
 * Clears the watch history and resets to empty.
 */
export function clearVideoLibrary(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns the high-resolution or medium thumbnail URL for a YouTube video ID.
 */
export function getVideoThumbnailUrl(videoId: string): string {
  if (!videoId) return "";
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Formats a timestamp into human-readable relative or date string.
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return "Recently";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
