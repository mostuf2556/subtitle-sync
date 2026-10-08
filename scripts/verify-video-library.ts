import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadVideoLibrary,
  saveVideoLibrary,
  recordVideoWatch,
  removeVideoFromLibrary,
  clearVideoLibrary,
  getVideoThumbnailUrl,
  formatRelativeTime,
} from "../src/utils/videoLibraryManager";
import { DEFAULT_LIBRARY_ITEMS, STORAGE_KEYS } from "../src/config/appConfig";

console.log("====================================================");
console.log("🧪 Starting Video Library Test Suite (Subtask 41.1)");
console.log("====================================================");

// Mock localStorage in Node environment
const storage = new Map<string, string>();
const storageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
(globalThis as any).window = {
  localStorage: storageMock,
};
(globalThis as any).localStorage = storageMock;

// Test 1: Fallback to DEFAULT_LIBRARY_ITEMS on empty storage
storage.clear();
const initialItems = loadVideoLibrary();
assert(Array.isArray(initialItems), "loadVideoLibrary must return an array");
assert.equal(
  initialItems.length,
  DEFAULT_LIBRARY_ITEMS.length,
  "Should return DEFAULT_LIBRARY_ITEMS when storage is uninitialized",
);
assert.equal(initialItems[0].id, DEFAULT_LIBRARY_ITEMS[0].id);
console.log("✅ PASS: loadVideoLibrary returns DEFAULT_LIBRARY_ITEMS fallback and seeds storage");

// Test 2: recordVideoWatch adds a new video to the top of the list
const newVideoId = "dQw4w9WgXcQ";
const updated = recordVideoWatch({
  id: newVideoId,
  title: "Rick Astley - Never Gonna Give You Up",
  originalUrl: `https://www.youtube.com/watch?v=${newVideoId}`,
});
assert.equal(updated[0].id, newVideoId, "New video must be inserted at index 0");
assert.equal(updated[0].title, "Rick Astley - Never Gonna Give You Up");
assert.equal(
  updated.length,
  DEFAULT_LIBRARY_ITEMS.length + 1,
  "List size should increment by 1",
);
console.log("✅ PASS: recordVideoWatch prepends new video item");

// Test 3: recordVideoWatch deduplicates and moves re-watched video to front
const rewatchedId = DEFAULT_LIBRARY_ITEMS[1].id;
const afterRewatch = recordVideoWatch({
  id: rewatchedId,
});
assert.equal(afterRewatch[0].id, rewatchedId, "Re-watched video must move to index 0");
const occurrences = afterRewatch.filter((v) => v.id === rewatchedId);
assert.equal(occurrences.length, 1, "Should deduplicate and contain only one entry for video ID");
console.log("✅ PASS: recordVideoWatch moves existing video to front without duplicate entries");

// Test 4: removeVideoFromLibrary removes specific video item
const afterRemove = removeVideoFromLibrary(newVideoId);
assert.equal(
  afterRemove.some((v) => v.id === newVideoId),
  false,
  "Removed video should no longer exist in library",
);
console.log("✅ PASS: removeVideoFromLibrary removes item accurately");

// Test 5: clearVideoLibrary empties the library storage
clearVideoLibrary();
assert.equal(
  storage.get(STORAGE_KEYS.LIBRARY_STORAGE_KEY),
  JSON.stringify([]),
  "clearVideoLibrary should persist empty array",
);
console.log("✅ PASS: clearVideoLibrary clears persisted library state");

// Test 6: Thumbnail URL generator
const thumbUrl = getVideoThumbnailUrl("n9qwEOsqsoo");
assert.equal(
  thumbUrl,
  "https://img.youtube.com/vi/n9qwEOsqsoo/mqdefault.jpg",
  "getVideoThumbnailUrl must return correct YouTube mqdefault url",
);
assert.equal(getVideoThumbnailUrl(""), "", "Should return empty string for blank video ID");
console.log("✅ PASS: getVideoThumbnailUrl generates expected thumbnail paths");

// Test 7: formatRelativeTime handles relative time calculations
const now = Date.now();
assert.equal(formatRelativeTime(now - 10000), "Just now");
assert.equal(formatRelativeTime(now - 5 * 60 * 1000), "5m ago");
assert.equal(formatRelativeTime(now - 3 * 3600 * 1000), "3h ago");
assert.equal(formatRelativeTime(now - 2 * 86400 * 1000), "2d ago");
console.log("✅ PASS: formatRelativeTime handles just now, minutes, hours, days");

// Test 8: Verify VideoLibraryPanel component and UI structure in source
const panelComponentPath = path.resolve(process.cwd(), "src/components/VideoLibraryPanel.tsx");
assert(fs.existsSync(panelComponentPath), "src/components/VideoLibraryPanel.tsx must exist");
const panelCode = fs.readFileSync(panelComponentPath, "utf-8");
assert(panelCode.includes("data-testid=\"video-library-panel\""), "Must contain data-testid for panel");
assert(panelCode.includes("data-testid=\"library-search-input\""), "Must support search filter input");
assert(panelCode.includes("data-testid=\"library-clear-btn\""), "Must support clear button");
assert(panelCode.includes("getVideoThumbnailUrl"), "Must render video thumbnail URLs");
console.log("✅ PASS: VideoLibraryPanel component contains required testids and controls");

// Test 9: Verify index.tsx integration
const indexCode = path.resolve(process.cwd(), "src/routes/index.tsx");
const indexContent = fs.readFileSync(indexCode, "utf-8");
assert(indexContent.includes('import { VideoLibraryPanel } from "@/components/VideoLibraryPanel"'));
assert(indexContent.includes('id: "library", title: "Video library"'));
assert(indexContent.includes('handleSelectLibraryVideo'));
assert(indexContent.includes('{panelId === "library" && ('));
console.log("✅ PASS: src/routes/index.tsx cleanly integrates VideoLibraryPanel in PANELS list");

console.log("====================================================");
console.log("🎉 All Video Library tests PASSED successfully!");
console.log("====================================================");
