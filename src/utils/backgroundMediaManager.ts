/**
 * Background Media & Lockscreen MediaSession Coordinator
 * Synchronizes playback state, video titles, and parallel subtitle announcements
 * between the React Web app, Android Native Foreground Service, and Web MediaSession API.
 */

import { getBackgroundAudioEnabled, setBackgroundAudioEnabled } from "@/lib/playback-preferences";

export interface MediaTransportCallbacks {
  onPlay: () => void;
  onPause: () => void;
  onNextSection?: () => void;
  onPrevSection?: () => void;
  onSeek?: (seconds: number) => void;
  onStop?: () => void;
}

export interface MediaSyncPayload {
  title: string;
  artist?: string;
  album?: string;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
}

export type MediaCommandSource = "native_media_command" | "web_media_session";

let activeCallbacks: MediaTransportCallbacks | null = null;
let isInitialized = false;
let lastMediaCommandSource: MediaCommandSource | null = null;
let lastMediaCommandAt = 0;

export function getLastMediaCommandMeta(): {
  source: MediaCommandSource | null;
  timestamp: number;
} {
  return {
    source: lastMediaCommandSource,
    timestamp: lastMediaCommandAt,
  };
}

/**
 * Initializes the media session bridge and binds hardware/lockscreen action handlers.
 */
export function initBackgroundMediaManager(callbacks: MediaTransportCallbacks): () => void {
  activeCallbacks = callbacks;

  if (typeof window === "undefined") {
    return () => {};
  }

  // 1. Android Native Shell command dispatcher hook
  window.onNativeMediaCommand = (action: string, data?: number) => {
    if (!activeCallbacks) return;
    lastMediaCommandSource = "native_media_command";
    lastMediaCommandAt = Date.now();
    switch (action) {
      case "play":
        activeCallbacks.onPlay();
        break;
      case "pause":
        activeCallbacks.onPause();
        break;
      case "next_section":
        activeCallbacks.onNextSection?.();
        break;
      case "prev_section":
        activeCallbacks.onPrevSection?.();
        break;
      case "seek":
        if (typeof data === "number") {
          activeCallbacks.onSeek?.(data / 1000);
        }
        break;
      case "stop":
        activeCallbacks.onStop?.();
        break;
    }
  };

  // 2. Standard Web MediaSession API (works on desktop Chrome, Android Chrome, Edge)
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        activeCallbacks?.onPlay();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        activeCallbacks?.onPause();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        activeCallbacks?.onNextSection?.();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        activeCallbacks?.onPrevSection?.();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        if (details.seekTime !== undefined) {
          activeCallbacks?.onSeek?.(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        lastMediaCommandSource = "web_media_session";
        lastMediaCommandAt = Date.now();
        activeCallbacks?.onStop?.();
      });
    } catch {
      // Ignore unsupported media session actions
    }
  }

  // 3. Sync initial background audio preference with native shell
  const isBgEnabled = getBackgroundAudioEnabled();
  if (window.AndroidNativeShell?.setBackgroundAudioEnabled) {
    window.AndroidNativeShell.setBackgroundAudioEnabled(isBgEnabled);
  }

  isInitialized = true;

  return () => {
    activeCallbacks = null;
    delete window.onNativeMediaCommand;
  };
}

/**
 * Updates lockscreen notification and media metadata across native and web layers.
 */
export function syncMediaMetadata(payload: MediaSyncPayload): void {
  const {
    title,
    artist = "Parallel Subtitles",
    album = "YouTube Viewer",
    isPlaying,
    positionSec,
    durationSec,
  } = payload;

  const positionMs = Math.max(0, Math.round(positionSec * 1000));
  const durationMs = Math.max(0, Math.round(durationSec * 1000));

  // 1. Android Native Shell Bridge
  if (typeof window !== "undefined" && window.AndroidNativeShell?.updateMediaMetadata) {
    try {
      window.AndroidNativeShell.updateMediaMetadata(
        title,
        artist,
        isPlaying,
        positionMs,
        durationMs,
      );
    } catch (e) {
      console.warn("Error updating native media metadata:", e);
    }
  }

  // 2. Web MediaSession API
  if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
    try {
      if ("MediaMetadata" in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || "YouTube Video",
          artist: artist,
          album: album,
        });
      }
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

      // Set position state if supported
      if (
        "setPositionState" in navigator.mediaSession &&
        durationSec > 0 &&
        positionSec <= durationSec
      ) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, durationSec),
          playbackRate: 1.0,
          position: Math.max(0, Math.min(positionSec, durationSec)),
        });
      }
    } catch {
      // Ignore media session sync errors
    }
  }
}

/**
 * Toggles Android native background audio playback service.
 */
export function setNativeBackgroundAudio(enabled: boolean): void {
  setBackgroundAudioEnabled(enabled);
  if (typeof window !== "undefined" && window.AndroidNativeShell?.setBackgroundAudioEnabled) {
    window.AndroidNativeShell.setBackgroundAudioEnabled(enabled);
  }
}

export function isBackgroundAudioConfigured(): boolean {
  return getBackgroundAudioEnabled();
}
