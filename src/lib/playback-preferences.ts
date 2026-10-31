/** Device-saved playback/fetch preferences (localStorage). */

export type SubtitleRequestMode = "tlang" | "lang";
export type SectionOrder = "video-first" | "tts-first" | "video-middle";
export type TtsLanguageOrders = Record<string, SectionOrder>;

export const isTtsSpeakableLanguage = (languageCode: unknown, baseLanguage: unknown): boolean => {
  const code =
    typeof languageCode === "string"
      ? languageCode.trim()
      : languageCode &&
          typeof languageCode === "object" &&
          "code" in languageCode &&
          typeof (languageCode as { code?: unknown }).code === "string"
        ? (languageCode as { code: string }).code.trim()
        : "";
  const base =
    typeof baseLanguage === "string"
      ? baseLanguage.trim()
      : baseLanguage &&
          typeof baseLanguage === "object" &&
          "code" in baseLanguage &&
          typeof (baseLanguage as { code?: unknown }).code === "string"
        ? (baseLanguage as { code: string }).code.trim()
        : "";
  return !base || code !== base;
};

const KEYS = {
  requestMode: "yt_subtitle_request_mode_v1",
  sectionOrder: "yt_section_order_v1",
  ttsLanguageOrders: "yt_tts_language_orders_v1",
  ttsRatios: "yt_tts_ratios_v1",
  ttsRates: "yt_tts_rates_v1",
  autoRetrySubtitles: "yt_auto_retry_subtitles_v1",
  retryPacingMinSec: "yt_retry_pacing_min_sec_v1",
  retryPacingMaxSec: "yt_retry_pacing_max_sec_v1",
  backgroundAudio: "yt_background_audio_enabled_v1",
  primaryTtsLang: "yt_primary_tts_lang_v1",
} as const;

const memoryStorage = new Map<string, string>();

function getStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as unknown as { localStorage?: Storage }).localStorage
    ) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch {
    // ignore
  }
  return {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoryStorage.set(k, v);
    },
  };
}

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const s = getStorage();
  if (!s) return fallback;
  try {
    const v = s.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: string) {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

/** Primary request mode; the other one is used as the fallback. */
export const getSubtitleRequestMode = () =>
  read<SubtitleRequestMode>(KEYS.requestMode, ["tlang", "lang"], "tlang");
export const setSubtitleRequestMode = (m: SubtitleRequestMode) => write(KEYS.requestMode, m);
/** Primary first, then fallback, or random load-balanced selection. */
export const subtitleRequestModeOrder = (primary?: SubtitleRequestMode): SubtitleRequestMode[] => {
  if (primary === "tlang") return ["tlang", "lang"];
  if (primary === "lang") return ["lang", "tlang"];
  return Math.random() < 0.5 ? ["tlang", "lang"] : ["lang", "tlang"];
};

export const getSectionOrder = () =>
  read<SectionOrder>(
    KEYS.sectionOrder,
    ["video-first", "tts-first", "video-middle"],
    "video-first",
  );
export const setSectionOrder = (o: SectionOrder) => write(KEYS.sectionOrder, o);

export const getTtsLanguageOrdersPreference = (): TtsLanguageOrders => {
  try {
    const raw = getStorage().getItem(KEYS.ttsLanguageOrders);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([languageCode, order]) =>
          languageCode.trim().length > 0 &&
          (order === "video-first" || order === "tts-first" || order === "video-middle"),
      ),
    ) as TtsLanguageOrders;
  } catch {
    return {};
  }
};

export const setTtsLanguageOrderPreference = (languageCode: string, order: SectionOrder) => {
  const normalizedCode = languageCode.trim();
  if (!normalizedCode) return;
  const orders = getTtsLanguageOrdersPreference();
  orders[normalizedCode] = order;
  write(KEYS.ttsLanguageOrders, JSON.stringify(orders));
};

export function partitionTtsLanguagesByOrder<T extends { code: string }>(
  languages: T[],
  languageOrders: TtsLanguageOrders,
  defaultOrder: SectionOrder,
): { ttsFirst: T[]; videoFirst: T[] } {
  const ttsFirst: T[] = [];
  const videoFirst: T[] = [];

  if (defaultOrder === "video-middle") {
    const unconfigured: T[] = [];
    for (const language of languages) {
      const explicit = languageOrders[language.code];
      if (explicit === "tts-first") {
        ttsFirst.push(language);
      } else if (explicit === "video-first") {
        videoFirst.push(language);
      } else {
        unconfigured.push(language);
      }
    }
    const half = Math.ceil(unconfigured.length / 2);
    ttsFirst.push(...unconfigured.slice(0, half));
    videoFirst.push(...unconfigured.slice(half));
  } else {
    for (const language of languages) {
      const order = languageOrders[language.code] ?? defaultOrder;
      if (order === "tts-first") {
        ttsFirst.push(language);
      } else {
        videoFirst.push(language);
      }
    }
  }

  return { ttsFirst, videoFirst };
}

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

export const getTtsRatesPreference = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEYS.ttsRates);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, rate]) =>
          typeof rate === "number" && Number.isFinite(rate) && rate >= 0.3 && rate <= 1.5,
      ),
    );
  } catch {
    return {};
  }
};

export const setTtsRatePreference = (langCode: string, rate: number) => {
  if (typeof window === "undefined" || !Number.isFinite(rate)) return;
  try {
    const existing = getTtsRatesPreference();
    existing[langCode] = Math.max(0.5, Math.min(1.0, Math.round(rate * 10) / 10));
    window.localStorage.setItem(KEYS.ttsRates, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
};

/**
 * Extracts a normalized string language code from string or object ({ code, lang, value }).
 */
export function extractLanguageCodeString(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (val && typeof val === "object") {
    if ("code" in val && typeof (val as { code?: unknown }).code === "string") {
      return (val as { code: string }).code.trim();
    }
    if ("lang" in val && typeof (val as { lang?: unknown }).lang === "string") {
      return (val as { lang: string }).lang.trim();
    }
    if ("value" in val && typeof (val as { value?: unknown }).value === "string") {
      return (val as { value: string }).value.trim();
    }
  }
  return "";
}

/**
 * Normalizes an array or single value into a clean list of language code strings.
 */
export function extractLanguageCodeList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(extractLanguageCodeString).filter((s) => s.length > 0);
  }
  if (typeof val === "string") {
    const s = val.trim();
    return s.length > 0 ? [s] : [];
  }
  if (val && typeof val === "object") {
    const s = extractLanguageCodeString(val);
    return s.length > 0 ? [s] : [];
  }
  return [];
}

/**
 * Normalizes language codes to lookup the configured TTS ratio.
 * Resolves aliases (e.g. "iw" <-> "he", "il" <-> "he") and dialect prefixes (e.g. "pt-BR" <-> "pt", "en-US" <-> "en").
 */
export function getLanguageTtsRatio(
  ratios: Record<string, number> | undefined | null,
  langCode: unknown,
): number {
  if (!ratios || !langCode) return 1;
  const targetCode = extractLanguageCodeString(langCode);
  if (!targetCode) return 1;

  if (typeof ratios[targetCode] === "number" && ratios[targetCode] > 0) {
    return Math.max(1, Math.round(ratios[targetCode]));
  }
  const clean = targetCode.toLowerCase();
  if (typeof ratios[clean] === "number" && ratios[clean] > 0) {
    return Math.max(1, Math.round(ratios[clean]));
  }
  // Hebrew alias normalization
  if (clean === "iw" || clean === "il") {
    if (typeof ratios["he"] === "number" && ratios["he"] > 0) {
      return Math.max(1, Math.round(ratios["he"]));
    }
  } else if (clean === "he") {
    if (typeof ratios["iw"] === "number" && ratios["iw"] > 0) {
      return Math.max(1, Math.round(ratios["iw"]));
    }
  }
  // Prefix matching: e.g. "pt-BR" -> "pt" or "en-US" -> "en"
  const base = clean.split("-")[0];
  if (base && typeof ratios[base] === "number" && ratios[base] > 0) {
    return Math.max(1, Math.round(ratios[base]));
  }
  // Reverse prefix matching: ratios has "pt-BR" and langCode is "pt"
  for (const [key, val] of Object.entries(ratios)) {
    if (typeof val === "number" && val > 0 && key.toLowerCase().startsWith(`${base}-`)) {
      return Math.max(1, Math.round(val));
    }
  }
  return 1;
}

/**
 * Checks whether a language code is included in the list of spoken languages,
 * normalizing Hebrew aliases ("iw", "il", "he") and dialect codes ("pt-BR" <-> "pt").
 * Resilient to argument ordering (targetCode, spokenList) or (spokenList, targetCode).
 */
export function isLanguageSpoken(arg1: unknown, arg2: unknown): boolean {
  if (!arg1 || !arg2) return false;

  let targetCode = "";
  let list: string[] = [];

  if (Array.isArray(arg1) && !Array.isArray(arg2)) {
    // Called as isLanguageSpoken(spokenList, targetCode)
    list = extractLanguageCodeList(arg1);
    targetCode = extractLanguageCodeString(arg2);
  } else if (!Array.isArray(arg1) && Array.isArray(arg2)) {
    // Called as isLanguageSpoken(targetCode, spokenList)
    targetCode = extractLanguageCodeString(arg1);
    list = extractLanguageCodeList(arg2);
  } else if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // Both are arrays - check if any intersects
    const list1 = extractLanguageCodeList(arg1);
    const list2 = extractLanguageCodeList(arg2);
    return list1.some((c) => isLanguageSpoken(c, list2));
  } else {
    // Both are single items/strings/objects
    targetCode = extractLanguageCodeString(arg1);
    list = extractLanguageCodeList(arg2);
  }

  if (!targetCode || list.length === 0) return false;

  if (list.includes(targetCode)) return true;
  const clean = targetCode.toLowerCase();
  if (list.some((s) => s.toLowerCase() === clean)) return true;

  if (clean === "iw" || clean === "il") {
    if (list.some((s) => s.toLowerCase() === "he")) return true;
  } else if (clean === "he") {
    if (list.some((s) => s.toLowerCase() === "iw" || s.toLowerCase() === "il")) return true;
  }

  const base = clean.split("-")[0];
  if (
    base &&
    list.some((s) => {
      const lower = s.toLowerCase();
      return lower === base || lower.startsWith(`${base}-`);
    })
  ) {
    return true;
  }
  return false;
}

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
  alreadyPlayedRecords?: Set<number | string> | ReadonlySet<number | string>,
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

export const getPrimaryTtsLang = (): string => {
  const s = getStorage();
  if (!s) return "";
  try {
    return s.getItem(KEYS.primaryTtsLang) || "";
  } catch {
    return "";
  }
};

export const setPrimaryTtsLang = (langCode: string): void => {
  const s = getStorage();
  if (!s) return;
  try {
    s.setItem(KEYS.primaryTtsLang, langCode);
  } catch {
    // ignore
  }
};

/**
 * Automatically computes the primary TTS language as the spoken language with the minimal ratio (e.g. 1:1 < 1:5).
 * No manual selection needed.
 */
export const computePrimaryTtsLang = (
  spokenLangs: string[],
  ttsRatios: Record<string, number>,
): string => {
  if (!spokenLangs || spokenLangs.length === 0) return "";
  let minLang = spokenLangs[0];
  let minRatio = getLanguageTtsRatio(ttsRatios, minLang);

  for (let i = 1; i < spokenLangs.length; i++) {
    const lang = spokenLangs[i];
    const r = getLanguageTtsRatio(ttsRatios, lang);
    if (r < minRatio) {
      minRatio = r;
      minLang = lang;
    }
  }
  return minLang;
};

export interface TtsRoleEvaluationParams {
  rowIdx: number;
  langCode: string;
  ratio?: number | null;
  primaryLang?: string | null;
  primaryRatio?: number | null;
  alreadyPlayedRecords?: Set<number | string> | ReadonlySet<number | string>;
}

/**
 * Evaluates whether a subtitle sentence row is eligible for TTS playback based on primary vs secondary roles:
 * - If langCode === primaryLang (or no primaryLang specified): standard ratio (1 in N sentences: rowIdx % N === 0).
 * - If langCode !== primaryLang: secondary relative to primary.
 *   i.e: every subtitles record where primary is activated, secondary is activated only 1:M from primary's records.
 */
export const isLanguageEligibleForTtsWithRole = ({
  rowIdx,
  langCode,
  ratio = 1,
  primaryLang,
  primaryRatio = 1,
  alreadyPlayedRecords,
}: TtsRoleEvaluationParams): boolean => {
  if (rowIdx < 0) return false;
  if (alreadyPlayedRecords?.has(rowIdx)) return false;

  const effectiveRatio = Math.max(1, Math.round(ratio ?? 1));
  const effectivePrimaryRatio = Math.max(1, Math.round(primaryRatio ?? 1));

  // If this language is primary, or no primary is configured:
  if (!primaryLang || langCode === primaryLang) {
    return rowIdx % effectiveRatio === 0;
  }

  // Secondary language relative to primary language:
  // Must only activate when primary is activated on this row
  const isPrimaryActiveOnRow = rowIdx % effectivePrimaryRatio === 0;
  if (!isPrimaryActiveOnRow) return false;

  // Activation ordinal among records where primary is activated
  const primaryActivationOrdinal = Math.floor(rowIdx / effectivePrimaryRatio);
  return primaryActivationOrdinal % effectiveRatio === 0;
};

export const shouldHighlightSentenceForTtsWithRole = ({
  rowIdx,
  langCode,
  ratio = 1,
  primaryLang,
  primaryRatio = 1,
  isSpoken = true,
}: {
  rowIdx: number;
  langCode: string;
  ratio?: number | null;
  primaryLang?: string | null;
  primaryRatio?: number | null;
  isSpoken?: boolean;
}): boolean => {
  if (!isSpoken || rowIdx < 0) return false;
  const isSecondary = Boolean(primaryLang && langCode !== primaryLang);
  const effectiveRatio = Math.max(1, Math.round(ratio ?? 1));
  if (!isSecondary && effectiveRatio <= 1) return false;
  return isLanguageEligibleForTtsWithRole({
    rowIdx,
    langCode,
    ratio: effectiveRatio,
    primaryLang,
    primaryRatio: Math.max(1, Math.round(primaryRatio ?? 1)),
  });
};

export const getAutoRetrySubtitles = (): boolean => {
  const s = getStorage();
  if (!s) return true;
  try {
    const v = s.getItem(KEYS.autoRetrySubtitles);
    return v === null ? true : v === "1"; // Default true: retry by default
  } catch {
    return true;
  }
};

export const setAutoRetrySubtitles = (enabled: boolean) => {
  write(KEYS.autoRetrySubtitles, enabled ? "1" : "0");
};

export const getRetryPacingMinSec = (): number => {
  const s = getStorage();
  if (!s) return 3;
  try {
    const raw = s.getItem(KEYS.retryPacingMinSec);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 3;
  } catch {
    return 3;
  }
};

export const setRetryPacingMinSec = (sec: number) => {
  const clamped = Math.max(1, Math.round(sec));
  write(KEYS.retryPacingMinSec, String(clamped));
};

export const getRetryPacingMaxSec = (): number => {
  const s = getStorage();
  if (!s) return 8;
  try {
    const raw = s.getItem(KEYS.retryPacingMaxSec);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 8;
  } catch {
    return 8;
  }
};

export const setRetryPacingMaxSec = (sec: number) => {
  const clamped = Math.max(1, Math.round(sec));
  write(KEYS.retryPacingMaxSec, String(clamped));
};

export const getRandomRetryDelayMs = (
  minSec: number = getRetryPacingMinSec(),
  maxSec: number = getRetryPacingMaxSec(),
): number => {
  const safeMin = Math.max(1, Math.min(minSec, maxSec));
  const safeMax = Math.max(safeMin, Math.max(minSec, maxSec));
  const diff = safeMax - safeMin;
  const randomSec = safeMin + Math.random() * diff;
  return Math.round(randomSec * 1000);
};

export const getBackgroundAudioEnabled = (): boolean => {
  const s = getStorage();
  if (!s) return true;
  try {
    const raw = s.getItem(KEYS.backgroundAudio);
    return raw !== null ? raw === "1" || raw === "true" : true;
  } catch {
    return true;
  }
};

export const setBackgroundAudioEnabled = (enabled: boolean) => {
  write(KEYS.backgroundAudio, enabled ? "1" : "0");
};
