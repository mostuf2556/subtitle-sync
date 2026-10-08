/**
 * Multi-Instance Video Player Manager
 * Manages multiple YouTube video player instances mapped by language code:
 * - One primary instance (playing standard video/audio)
 * - One dedicated instance for each language with speak / audio-track mode enabled
 *
 * Ensures each video element instance remembers its own setup, volume, mute state,
 * and audio-track configuration independently without leaking to sibling players.
 */

export interface YTPlayerLike {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getPlayerState?(): number;
  setVolume?(volume: number): void;
  getVolume?(): number;
  mute?(): void;
  unMute?(): void;
  isMuted?(): boolean;
}

export interface VideoInstanceConfig {
  id: string; // e.g. "primary" or `lang_${code}`
  languageCode: string; // e.g. "primary" or "es", "he", etc.
  languageName?: string;
  isPrimary: boolean;
  label: string;
  volume: number; // 0 - 100
  muted: boolean;
  manualTrackConfigured: boolean; // true if user marked audio-track configured in YT player
}

const STORAGE_PREFIX = "yt_multi_instance_";

/**
 * Storage key for instance configs of a specific video.
 */
function getStorageKey(videoId: string): string {
  return `${STORAGE_PREFIX}${videoId || "default"}_configs`;
}

/**
 * Loads stored instance configurations for a video.
 */
export function loadStoredInstanceConfigs(
  videoId: string,
): Record<string, Partial<VideoInstanceConfig>> {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(videoId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persists instance configuration for a specific video instance.
 */
export function saveVideoInstanceConfig(
  videoId: string,
  instanceId: string,
  updates: Partial<VideoInstanceConfig>,
): void {
  if (typeof window === "undefined" || !window.localStorage || !instanceId) {
    return;
  }
  try {
    const existing = loadStoredInstanceConfigs(videoId);
    existing[instanceId] = {
      ...(existing[instanceId] || {}),
      ...updates,
    };
    window.localStorage.setItem(getStorageKey(videoId), JSON.stringify(existing));
  } catch {
    // Ignore storage quota or access errors
  }
}

/**
 * Computes the required video instance definitions given the spoken languages.
 * Always includes the primary instance, plus one instance for each spoken language.
 */
export function computeVideoInstances(
  spokenLangCodes: string[],
  languageMetaList: Array<{ code: string; name: string }>,
  videoId = "",
): VideoInstanceConfig[] {
  const saved = loadStoredInstanceConfigs(videoId);
  const instances: VideoInstanceConfig[] = [];

  // 1. Primary instance
  const primarySaved = saved["primary"] || {};
  instances.push({
    id: "primary",
    languageCode: "primary",
    languageName: "Original Video",
    isPrimary: true,
    label: "Primary Video (Original Audio)",
    volume: primarySaved.volume ?? 100,
    muted: primarySaved.muted ?? false,
    manualTrackConfigured: primarySaved.manualTrackConfigured ?? true,
  });

  // 2. Instances for each language with speak/audio enabled
  for (const code of spokenLangCodes) {
    const meta = languageMetaList.find((l) => l.code === code);
    const langName = meta?.name || code.toUpperCase();
    const instanceId = `lang_${code}`;
    const instanceSaved = saved[instanceId] || {};

    instances.push({
      id: instanceId,
      languageCode: code,
      languageName: langName,
      isPrimary: false,
      label: `${langName} Audio Track`,
      volume: instanceSaved.volume ?? 100,
      muted: instanceSaved.muted ?? false,
      manualTrackConfigured: instanceSaved.manualTrackConfigured ?? false,
    });
  }

  return instances;
}

/**
 * In-memory registry to hold active YTPlayer references for each video element instance.
 */
export class MultiVideoPlayerRegistry {
  private players = new Map<string, YTPlayerLike>();

  /**
   * Register a player instance with its unique ID (e.g. "primary" or "lang_es").
   */
  public register(id: string, player: YTPlayerLike): void {
    if (!id || !player) return;
    this.players.set(id, player);
  }

  /**
   * Unregister a player instance when its DOM element unmounts.
   */
  public unregister(id: string): void {
    this.players.delete(id);
  }

  /**
   * Get player instance by ID.
   */
  public get(id: string): YTPlayerLike | undefined {
    return this.players.get(id);
  }

  /**
   * Get all registered player IDs.
   */
  public getRegisteredIds(): string[] {
    return Array.from(this.players.keys());
  }

  /**
   * Pause all players except optionally an active one.
   */
  public pauseAllExcept(activeId?: string): void {
    for (const [id, player] of this.players.entries()) {
      if (id !== activeId) {
        try {
          player.pauseVideo();
        } catch {
          // Ignore state transition errors
        }
      }
    }
  }

  /**
   * Mute all players except the specified audible player.
   */
  public unmuteOnly(audibleId: string): void {
    for (const [id, player] of this.players.entries()) {
      try {
        if (id === audibleId) {
          player.unMute?.();
        } else {
          player.mute?.();
        }
      } catch {
        // Ignore volume/mute errors
      }
    }
  }

  /**
   * Seek all secondary players to synchronize with a target time.
   */
  public syncSecondaryPlayers(targetSeconds: number, exceptId = "primary"): void {
    for (const [id, player] of this.players.entries()) {
      if (id !== exceptId) {
        try {
          player.seekTo(targetSeconds, true);
        } catch {
          // Ignore seek errors
        }
      }
    }
  }

  /**
   * Clear all registered players.
   */
  public clear(): void {
    this.players.clear();
  }
}

// Global shared registry instance for multi-video elements
export const multiVideoPlayerRegistry = new MultiVideoPlayerRegistry();

export interface MultiVideoSegmentSyncOptions {
  registry: MultiVideoPlayerRegistry;
  primaryPlayer: YTPlayerLike;
  languageCode: string;
  startMs: number;
  endMs: number;
  checkCancelled?: () => boolean;
  onProgress?: (progress: { currentMs: number; totalMs: number; percent: number }) => void;
}

/**
 * Executes audio-track segment playback synchronization across multi-video player instances.
 * - Resolves the dedicated video player instance for the requested language code (falling back to primary).
 * - Pauses all other player instances and unmutes exclusively the target speaking instance.
 * - Seeks the target instance to startMs and plays through the duration.
 * - Streams progress updates for visual subtitle highlighting / status indicator.
 * - Once complete or cancelled, pauses the target player and restores unmuted state to primary.
 */
export function executeMultiVideoSegmentSync(
  options: MultiVideoSegmentSyncOptions,
): Promise<void> {
  const { registry, primaryPlayer, languageCode, startMs, endMs, checkCancelled, onProgress } =
    options;

  return new Promise<void>((resolve) => {
    const secondaryId = `lang_${languageCode}`;
    const targetPlayer = registry.get(secondaryId) || primaryPlayer;
    const activeId = registry.get(secondaryId) ? secondaryId : "primary";

    if (!targetPlayer || typeof targetPlayer.seekTo !== "function") {
      resolve();
      return;
    }

    // Pause all other instances and unmute only the active speaking instance
    registry.pauseAllExcept(activeId);
    registry.unmuteOnly(activeId);

    const durationMs = Math.max(100, endMs - startMs);
    try {
      targetPlayer.seekTo(startMs / 1000, true);
      targetPlayer.playVideo();
    } catch {
      // Continue even if initial seek or play triggers error
    }

    const startTime = Date.now();
    const timeoutMs = durationMs + 8000;
    let hasStartedNearStart = false;

    const checkInterval = setInterval(() => {
      if (checkCancelled && checkCancelled()) {
        cleanup();
        resolve();
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        cleanup();
        resolve();
        return;
      }

      try {
        const currentMs = (targetPlayer.getCurrentTime?.() ?? 0) * 1000;
        if (!hasStartedNearStart) {
          // Confirm player has arrived near startMs or sufficient time has elapsed for seek to apply
          if (
            Math.abs(currentMs - startMs) <= Math.max(1500, durationMs * 0.75) ||
            Date.now() - startTime >= 350
          ) {
            hasStartedNearStart = true;
          }
        }
        const elapsed = Math.max(0, currentMs - startMs);
        const percent = Math.min(100, Math.round((elapsed / durationMs) * 100));

        if (onProgress) {
          onProgress({ currentMs, totalMs: durationMs, percent });
        }

        if (hasStartedNearStart && currentMs >= endMs - 50) {
          cleanup();
          resolve();
        }
      } catch {
        cleanup();
        resolve();
      }
    }, 100);

    function cleanup() {
      clearInterval(checkInterval);
      try {
        targetPlayer.pauseVideo();
      } catch {
        // ignore
      }
      // Return mute state safely: pause all secondaries and restore primary
      registry.pauseAllExcept("primary");
      registry.unmuteOnly("primary");
    }
  });
}

