/** Device-saved playback/fetch preferences (localStorage). */

export type SubtitleRequestMode = "tlang" | "lang";
export type SectionOrder = "video-first" | "tts-first";

const KEYS = {
  requestMode: "yt_subtitle_request_mode_v1",
  sectionOrder: "yt_section_order_v1",
  ttsRatios: "yt_tts_ratios_v1",
} as const;

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

/** Primary request mode; the other one is used as the fallback. */
export const getSubtitleRequestMode = () =>
  read<SubtitleRequestMode>(KEYS.requestMode, ["tlang", "lang"], "tlang");
export const setSubtitleRequestMode = (m: SubtitleRequestMode) => write(KEYS.requestMode, m);
/** Primary first, then fallback. */
export const subtitleRequestModeOrder = (primary: SubtitleRequestMode): SubtitleRequestMode[] =>
  primary === "tlang" ? ["tlang", "lang"] : ["lang", "tlang"];

export const getSectionOrder = () =>
  read<SectionOrder>(KEYS.sectionOrder, ["video-first", "tts-first"], "video-first");
export const setSectionOrder = (o: SectionOrder) => write(KEYS.sectionOrder, o);

export const getTtsRatiosPreference = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEYS.ttsRatios);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setTtsRatioPreference = (langCode: string, ratio: number) => {
  if (typeof window === "undefined") return;
  try {
    const existing = getTtsRatiosPreference();
    existing[langCode] = Math.max(1, Math.round(ratio));
    window.localStorage.setItem(KEYS.ttsRatios, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
};

/**
 * Evaluates whether a subtitle sentence row is eligible for TTS playback based on the ratio
 * and skipping records that have already been played.
 * - rowIdx < 0: false
 * - alreadyPlayedRecords contains rowIdx: false (skip from TTS-play more than once)
 * - ratio = 1 (1:1 / 100%): every row is spoken
 * - ratio = 2 (1:2 / 50%): rows 0, 2, 4, ... are spoken
 * - ratio = N: 1 in every N rows (rowIdx % N === 0)
 */
export const isSubtitleInstanceEligibleForTTS = (
  rowIdx: number,
  ratio?: number | null,
  alreadyPlayedRecords?: Set<number> | ReadonlySet<number>,
): boolean => {
  if (rowIdx < 0) return false;
  if (alreadyPlayedRecords?.has(rowIdx)) return false;
  const interval = Math.max(1, Math.round(ratio ?? 1));
  return rowIdx % interval === 0;
};

/**
 * Checks whether a subtitle record should be skipped from TTS playback because it has
 * already been played.
 */
export const shouldSkipTTSBecauseAlreadyPlayed = (
  rowIdx: number,
  alreadyPlayedRecords?: Set<number> | ReadonlySet<number>,
): boolean => {
  if (rowIdx < 0) return true;
  return Boolean(alreadyPlayedRecords?.has(rowIdx));
};

/**
 * Evaluates whether a subtitle sentence should be background highlighted for TTS pronunciation.
 * Highlight is strictly applied ONLY when:
 * 1. The ratio is not 1:1 (i.e. ratio > 1).
 * 2. The language is enabled for speech (isSpoken === true).
 * 3. The sentence row is eligible to be pronounced (isSubtitleInstanceEligibleForTTS(rowIdx, ratio) === true).
 */
export const shouldHighlightSentenceForTTS = (
  rowIdx: number,
  ratio?: number | null,
  isSpoken: boolean = true,
): boolean => {
  if (!isSpoken || rowIdx < 0) return false;
  const currentRatio = Math.max(1, Math.round(ratio ?? 1));
  if (currentRatio <= 1) return false; // Strictly highlight only when ratio is not 1:1
  return isSubtitleInstanceEligibleForTTS(rowIdx, currentRatio);
};
