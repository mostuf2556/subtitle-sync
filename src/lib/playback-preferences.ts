/** Device-saved playback/fetch preferences (localStorage). */
import { recordLanguageRatioUpdated } from "../utils/languageUsageTracker";

export type SubtitleRequestMode = "tlang" | "lang";
export type SectionOrder = "video-first" | "tts-first" | "video-middle" | "in-between";
export type TtsLanguageOrders = Record<string, SectionOrder>;

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

export type TableDisplayMode = "single" | "multiple";
export type PickWordStrategy = "longest" | "random";
export type CriteriaMatchAction = "filter" | "highlight";

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
  ttsBlacklist: "yt_tts_blacklist_v1",
  learningGoalsMaxWords: "yt_learning_goals_max_words_v1",
  learningGoalsLangMaxWords: "yt_learning_goals_lang_max_words_v1",
  learningGoalsSkipIncomplete: "yt_learning_goals_skip_incomplete_v1",
  learningGoalsLangSkipIncomplete: "yt_learning_goals_lang_skip_incomplete_v1",
  zeroKnowledgeInLang: "yt_zero_knowledge_in_lang_v1",
  pickWordStrategy: "yt_pick_word_strategy_v1",
  perLangPickWordStrategy: "yt_per_lang_pick_word_strategy_v1",
  ttsVolumes: "yt_tts_volumes_v1",
  tableDisplayMode: "yt_table_display_mode_v1",
  criteriaMatchAction: "yt_criteria_match_action_v1",
  languageOrder: "yt_language_order_v1",
  shownLanguages: "yt_shown_languages_v1",
  spokenLanguages: "yt_spoken_languages_v1",
} as const;

const memoryStorage = new Map<string, string>();

function getStorage(): {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem?(k: string): void;
  length?: number;
  key?(index: number): string | null;
} {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoryStorage.set(k, v);
    },
    removeItem: (k: string) => {
      memoryStorage.delete(k);
    },
    get length() {
      return memoryStorage.size;
    },
    key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
  };
}

function removeStorageKeysByPrefix(prefix: string, excludeKeys: string[] = []): void {
  const s = getStorage();
  try {
    if (typeof s.removeItem !== "function") return;
    if (typeof s.length === "number" && typeof s.key === "function") {
      const toRemove: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(prefix) && !excludeKeys.includes(k)) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        s.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export function getTtsBlacklist(): string[] {
  const s = getStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEYS.ttsBlacklist);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : [];
  } catch {
    return [];
  }
}

export function setTtsBlacklist(langs: unknown[]): void {
  const s = getStorage();
  if (!s) return;
  try {
    const cleaned = extractLanguageCodeList(langs);
    s.setItem(KEYS.ttsBlacklist, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export function isLanguageTtsBlacklisted(langCode: unknown, blacklist?: string[] | null): boolean {
  const code = extractLanguageCodeString(langCode).toLowerCase();
  if (!code) return false;
  const list = blacklist ?? getTtsBlacklist();
  const normalizedList = list.map((l) => l.toLowerCase());
  if (normalizedList.includes(code)) return true;
  if (
    (code === "iw" && normalizedList.includes("he")) ||
    (code === "he" && normalizedList.includes("iw"))
  ) {
    return true;
  }
  const prefix = code.split("-")[0];
  if (prefix && normalizedList.includes(prefix)) {
    return true;
  }
  return false;
}

export function toggleLanguageTtsBlacklist(langCode: string): boolean {
  const code = extractLanguageCodeString(langCode);
  if (!code) return false;
  const current = getTtsBlacklist();
  const isBlacklisted = isLanguageTtsBlacklisted(code, current);
  const updated = isBlacklisted
    ? current.filter(
        (c) =>
          c.toLowerCase() !== code.toLowerCase() &&
          c.toLowerCase() !== (code === "iw" ? "he" : code === "he" ? "iw" : ""),
      )
    : [...current, code];
  setTtsBlacklist(updated);
  return !isBlacklisted;
}

export const isTtsSpeakableLanguage = (
  languageCode: unknown,
  baseLanguage: unknown,
  blacklist?: string[] | null,
): boolean => {
  const code = extractLanguageCodeString(languageCode);
  if (!code) return false;
  if (isLanguageTtsBlacklisted(code, blacklist)) return false;
  const base = extractLanguageCodeString(baseLanguage);
  return !base || code !== base;
};

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

export const saveSectionOrderPreference = setSectionOrder;
export const saveTtsLanguageOrdersPreference = (orders: TtsLanguageOrders) => {
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
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.ttsRatios);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setTtsRatioPreference = (langCode: string, ratio: number) => {
  const s = getStorage();
  try {
    const existing = getTtsRatiosPreference();
    const clampedRatio = Math.max(1, Math.min(20, Math.round(ratio)));
    existing[langCode] = clampedRatio;
    s.setItem(KEYS.ttsRatios, JSON.stringify(existing));
    try {
      s.setItem(`yt_tts_ratio_${langCode}`, String(clampedRatio));
    } catch {
      // ignore
    }
    try {
      recordLanguageRatioUpdated(langCode);
    } catch {
      // ignore
    }
  } catch {
    // ignore storage errors
  }
};
export const saveTtsRatioPreference = setTtsRatioPreference;
export const saveAllTtsRatiosPreference = (ratios: Record<string, number>): void => {
  const s = getStorage();
  try {
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(ratios || {})) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        cleaned[k] = Math.max(1, Math.min(20, Math.round(v)));
      }
    }
    s.setItem(KEYS.ttsRatios, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
};
export function getDefaultLanguageTtsRate(langCode?: string | null): number {
  if (!langCode || typeof langCode !== "string") return 0.8;
  const normalized = langCode.trim().toLowerCase().split(/[-_]/)[0];
  if (normalized === "en" || normalized === "he" || normalized === "iw") {
    return 1.0;
  }
  return 0.8;
}

export function getDefaultTtsRates(langs: Array<{ code: string }>): Record<string, number> {
  return Object.fromEntries(langs.map((l) => [l.code, getDefaultLanguageTtsRate(l.code)]));
}

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
          typeof rate === "number" && Number.isFinite(rate) && rate >= 0.25 && rate <= 2.5,
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
    existing[langCode] = Math.max(0.25, Math.min(2.5, Math.round(rate * 100) / 100));
    window.localStorage.setItem(KEYS.ttsRates, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
};
export const saveTtsRatePreference = setTtsRatePreference;
export const saveAllTtsRatesPreference = (rates: Record<string, number>): void => {
  const s = getStorage();
  try {
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(rates || {})) {
      if (typeof v === "number" && Number.isFinite(v)) {
        cleaned[k] = Math.max(0.25, Math.min(2.5, Math.round(v * 100) / 100));
      }
    }
    s.setItem(KEYS.ttsRates, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
};

export const getTtsVolumesPreference = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEYS.ttsVolumes);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, vol]) => typeof vol === "number" && Number.isFinite(vol) && vol >= 0 && vol <= 1,
      ),
    );
  } catch {
    return {};
  }
};

export const setTtsVolumePreference = (langCode: string, volume: number) => {
  if (typeof window === "undefined" || !Number.isFinite(volume)) return;
  try {
    const existing = getTtsVolumesPreference();
    existing[langCode] = Math.max(0, Math.min(1, Math.round(volume * 100) / 100));
    window.localStorage.setItem(KEYS.ttsVolumes, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
};
export const saveTtsVolumePreference = setTtsVolumePreference;
export const saveAllTtsVolumesPreference = (volumes: Record<string, number>): void => {
  const s = getStorage();
  try {
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(volumes || {})) {
      if (typeof v === "number" && Number.isFinite(v)) {
        cleaned[k] = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
      }
    }
    s.setItem(KEYS.ttsVolumes, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
};

export const getLanguageTtsVolume = (
  volumes: Record<string, number> | undefined | null,
  langCode: unknown,
): number => {
  if (!volumes || !langCode) return 1.0;
  const targetCode = extractLanguageCodeString(langCode);
  if (!targetCode) return 1.0;
  if (typeof volumes[targetCode] === "number" && Number.isFinite(volumes[targetCode])) {
    return Math.max(0, Math.min(1, volumes[targetCode]));
  }
  const clean = targetCode.toLowerCase();
  if (typeof volumes[clean] === "number" && Number.isFinite(volumes[clean])) {
    return Math.max(0, Math.min(1, volumes[clean]));
  }
  if (clean === "iw" || clean === "il") {
    if (typeof volumes["he"] === "number" && Number.isFinite(volumes["he"])) {
      return Math.max(0, Math.min(1, volumes["he"]));
    }
  }
  return 1.0;
};

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
  blacklist?: string[] | null;
}

/**
 * Evaluates whether a subtitle sentence row is eligible for TTS playback based on primary vs secondary roles:
 * - If langCode is on the TTS blacklist: always false (skipped from TTS-play under all circumstances).
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
  blacklist,
}: TtsRoleEvaluationParams): boolean => {
  if (rowIdx < 0) return false;
  if (isLanguageTtsBlacklisted(langCode, blacklist)) return false;
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
  blacklist,
}: {
  rowIdx: number;
  langCode: string;
  ratio?: number | null;
  primaryLang?: string | null;
  primaryRatio?: number | null;
  isSpoken?: boolean;
  blacklist?: string[] | null;
}): boolean => {
  if (!isSpoken || rowIdx < 0) return false;
  if (isLanguageTtsBlacklisted(langCode, blacklist)) return false;
  const isSecondary = Boolean(primaryLang && langCode !== primaryLang);
  const effectiveRatio = Math.max(1, Math.round(ratio ?? 1));
  if (!isSecondary && effectiveRatio <= 1) return false;
  return isLanguageEligibleForTtsWithRole({
    rowIdx,
    langCode,
    ratio: effectiveRatio,
    primaryLang,
    primaryRatio: Math.max(1, Math.round(primaryRatio ?? 1)),
    blacklist,
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

export const getLearningGoalsMaxWords = (): number => {
  const s = getStorage();
  if (!s) return 10;
  try {
    const raw = s.getItem(KEYS.learningGoalsMaxWords);
    if (!raw) return 10;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  } catch {
    return 10;
  }
};

export const setLearningGoalsMaxWords = (maxWords: number) => {
  const safe = Math.max(1, Math.min(100, Math.round(maxWords)));
  write(KEYS.learningGoalsMaxWords, String(safe));
};

export const getLearningGoalsSkipIncomplete = (): boolean => {
  const s = getStorage();
  if (!s) return false;
  try {
    const raw = s.getItem(KEYS.learningGoalsSkipIncomplete);
    return raw !== null ? raw === "1" || raw === "true" : false;
  } catch {
    return false;
  }
};

export const setLearningGoalsSkipIncomplete = (skip: boolean) => {
  write(KEYS.learningGoalsSkipIncomplete, skip ? "1" : "0");
};

export const getLearningGoalsLanguageMaxWords = (): Record<string, number> => {
  const s = getStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEYS.learningGoalsLangMaxWords);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        result[k] = Math.max(1, Math.min(100, Math.round(v)));
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const setLearningGoalsLanguageMaxWords = (
  langCode: string,
  maxWords: number | undefined,
): Record<string, number> => {
  const current = getLearningGoalsLanguageMaxWords();
  const next = { ...current };
  if (typeof maxWords === "number" && Number.isFinite(maxWords) && maxWords > 0) {
    next[langCode] = Math.max(1, Math.min(100, Math.round(maxWords)));
  } else {
    delete next[langCode];
  }
  write(KEYS.learningGoalsLangMaxWords, JSON.stringify(next));
  return next;
};

export const saveLearningGoalsLanguageMaxWords = setLearningGoalsLanguageMaxWords;

export const saveAllLearningGoalsLanguageMaxWords = (map: Record<string, number>): void => {
  write(KEYS.learningGoalsLangMaxWords, JSON.stringify(map));
};

export const getEffectiveLanguageMaxWords = (
  langCode: string,
  langMap?: Record<string, number> | null,
  fallback = 10,
): number => {
  if (langMap && typeof langMap[langCode] === "number" && langMap[langCode] > 0) {
    return langMap[langCode];
  }
  const stored = getLearningGoalsLanguageMaxWords();
  if (typeof stored[langCode] === "number" && stored[langCode] > 0) {
    return stored[langCode];
  }
  return fallback;
};

export const getLearningGoalsLanguageSkipIncomplete = (): Record<string, boolean> => {
  const s = getStorage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEYS.learningGoalsLangSkipIncomplete);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "boolean") {
        result[k] = v;
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const setLearningGoalsLanguageSkipIncomplete = (
  langCode: string,
  skip: boolean | undefined,
): Record<string, boolean> => {
  const current = getLearningGoalsLanguageSkipIncomplete();
  const next = { ...current };
  if (typeof skip === "boolean") {
    next[langCode] = skip;
  } else {
    delete next[langCode];
  }
  write(KEYS.learningGoalsLangSkipIncomplete, JSON.stringify(next));
  return next;
};

export const saveLearningGoalsLanguageSkipIncomplete = setLearningGoalsLanguageSkipIncomplete;

export const saveAllLearningGoalsLanguageSkipIncomplete = (map: Record<string, boolean>): void => {
  write(KEYS.learningGoalsLangSkipIncomplete, JSON.stringify(map));
};

export const getEffectiveLanguageSkipIncomplete = (
  langCode: string,
  langMap?: Record<string, boolean> | null,
  fallback = false,
): boolean => {
  if (langMap && typeof langMap[langCode] === "boolean") {
    return langMap[langCode];
  }
  const stored = getLearningGoalsLanguageSkipIncomplete();
  if (typeof stored[langCode] === "boolean") {
    return stored[langCode];
  }
  return fallback;
};

// ----------------------------------------------------------------------------
// Preferences Accessors for Settings Backup & Route State
// ----------------------------------------------------------------------------

export const getPrimaryTtsLanguagePreference = getPrimaryTtsLang;
export const setPrimaryTtsLanguagePreference = setPrimaryTtsLang;

export const getSubtitleRequestModePreference = getSubtitleRequestMode;
export const setSubtitleRequestModePreference = setSubtitleRequestMode;

export const getSectionOrderPreference = getSectionOrder;
export const setSectionOrderPreference = setSectionOrder;

export function getFavoriteLanguagesPreference(): string[] {
  const s = getStorage();
  try {
    const raw = s.getItem("yt_favorite_languages");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : [];
  } catch {
    return [];
  }
}

export function setFavoriteLanguagesPreference(langs: unknown[]): void {
  const s = getStorage();
  try {
    const cleaned = extractLanguageCodeList(langs);
    s.setItem("yt_favorite_languages", JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export function getTargetLanguagesPreference(): string[] {
  const s = getStorage();
  try {
    const raw = s.getItem("yt_target_languages_v1") || s.getItem("yt_learning_languages_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : [];
  } catch {
    return [];
  }
}

export function setTargetLanguagesPreference(langs: unknown[]): void {
  const s = getStorage();
  try {
    const cleaned = extractLanguageCodeList(langs);
    s.setItem("yt_target_languages_v1", JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export function getBaseLanguagePreference(): string {
  const s = getStorage();
  try {
    return s.getItem("yt_base_language") || "en";
  } catch {
    return "en";
  }
}

export function setBaseLanguagePreference(lang: string): void {
  const s = getStorage();
  try {
    s.setItem("yt_base_language", extractLanguageCodeString(lang) || "en");
  } catch {
    // ignore
  }
}

export function getRatioCompositionsPreference(): Record<string, Record<string, number>> {
  const s = getStorage();
  try {
    const raw = s.getItem("yt_language_ratio_compositions_v1");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const res: Record<string, Record<string, number>> = {};
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        "name" in item &&
        typeof (item as { name: unknown }).name === "string" &&
        "ratios" in item &&
        (item as { ratios: unknown }).ratios &&
        typeof (item as { ratios: unknown }).ratios === "object"
      ) {
        const comp = item as { name: string; ratios: Record<string, number> };
        res[comp.name] = comp.ratios;
      }
    }
    return res;
  } catch {
    return {};
  }
}

export function saveRatioCompositionPreference(name: string, ratios: Record<string, number>): void {
  const s = getStorage();
  try {
    const raw = s.getItem("yt_language_ratio_compositions_v1");
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const updated = list.filter((i: unknown) => {
      if (i && typeof i === "object" && "name" in i) {
        return (i as { name: unknown }).name !== name;
      }
      return true;
    });
    updated.push({
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      ratios,
      createdAt: Date.now(),
    });
    s.setItem("yt_language_ratio_compositions_v1", JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getTtsVoicesPreference(): Record<string, string> {
  const s = getStorage();
  try {
    const raw = s.getItem("yt_tts_voices_v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setTtsVoicePreference(langCode: string, voiceName: string): void {
  const s = getStorage();
  try {
    const existing = getTtsVoicesPreference();
    existing[langCode] = voiceName;
    s.setItem("yt_tts_voices_v1", JSON.stringify(existing));
  } catch {
    // ignore
  }
}

export function getTtsServiceTypePreference(): string {
  const s = getStorage();
  try {
    return s.getItem("yt_tts_service_type_v1") || "native";
  } catch {
    return "native";
  }
}

export function setTtsServiceTypePreference(type: string): void {
  const s = getStorage();
  try {
    s.setItem("yt_tts_service_type_v1", type);
  } catch {
    // ignore
  }
}

export function getTtsAlternativeServicePreference(): string {
  const s = getStorage();
  try {
    return s.getItem("yt_tts_alternative_service_v1") || "google_tts";
  } catch {
    return "google_tts";
  }
}

export function setTtsAlternativeServicePreference(service: string): void {
  const s = getStorage();
  try {
    s.setItem("yt_tts_alternative_service_v1", service);
  } catch {
    // ignore
  }
}

export function getTtsCustomEndpointPreference(): string | null {
  const s = getStorage();
  try {
    return s.getItem("yt_tts_custom_endpoint_v1") || null;
  } catch {
    return null;
  }
}

export function setTtsCustomEndpointPreference(endpoint: string): void {
  const s = getStorage();
  try {
    s.setItem("yt_tts_custom_endpoint_v1", endpoint);
  } catch {
    // ignore
  }
}

export const ZERO_KNOWLEDGE_EVENT = "yt_zero_knowledge_changed";
export const PICK_WORD_STRATEGY_EVENT = "yt_pick_word_strategy_changed";

/**
 * Returns true if the language is configured with zero_knowledge_in_lang = true.
 */
export function getZeroKnowledgeInLang(langCode: unknown): boolean {
  const code = extractLanguageCodeString(langCode).toLowerCase();
  if (!code) return false;
  const s = getStorage();
  try {
    const rawDirect = s.getItem(`yt_zero_knowledge_${code}`);
    if (rawDirect !== null) return rawDirect === "true" || rawDirect === "1";
    const rawAll = s.getItem(KEYS.zeroKnowledgeInLang);
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (parsed && typeof parsed === "object" && code in parsed) {
        return Boolean(parsed[code]);
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Sets the zero_knowledge_in_lang parameter for a language.
 */
export function setZeroKnowledgeInLang(langCode: unknown, enabled: boolean): void {
  const code = extractLanguageCodeString(langCode).toLowerCase();
  if (!code) return;
  const s = getStorage();
  try {
    s.setItem(`yt_zero_knowledge_${code}`, enabled ? "true" : "false");
    const all = getAllZeroKnowledgeInLang();
    all[code] = enabled;
    s.setItem(KEYS.zeroKnowledgeInLang, JSON.stringify(all));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ZERO_KNOWLEDGE_EVENT, { detail: { langCode: code, enabled } }),
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Toggles the zero_knowledge_in_lang parameter for a language and returns the new value.
 */
export function toggleZeroKnowledgeInLang(langCode: unknown): boolean {
  const current = getZeroKnowledgeInLang(langCode);
  const next = !current;
  setZeroKnowledgeInLang(langCode, next);
  return next;
}

/**
 * Gets all zero knowledge settings as a map of languageCode -> boolean.
 */
export function getAllZeroKnowledgeInLang(): Record<string, boolean> {
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.zeroKnowledgeInLang);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Sets all zero knowledge settings from a map of languageCode -> boolean.
 */
export function setAllZeroKnowledgeInLang(map: Record<string, boolean>): void {
  const s = getStorage();
  try {
    const prev = getAllZeroKnowledgeInLang();
    if (typeof s.removeItem === "function") {
      for (const prevCode of Object.keys(prev)) {
        s.removeItem(`yt_zero_knowledge_${prevCode.toLowerCase()}`);
      }
    }
    removeStorageKeysByPrefix("yt_zero_knowledge_", [KEYS.zeroKnowledgeInLang]);

    const normalized: Record<string, boolean> = {};
    for (const [code, val] of Object.entries(map || {})) {
      const clean = extractLanguageCodeString(code).toLowerCase();
      if (!clean) continue;
      normalized[clean] = Boolean(val);
      s.setItem(`yt_zero_knowledge_${clean}`, val ? "true" : "false");
    }
    s.setItem(KEYS.zeroKnowledgeInLang, JSON.stringify(normalized));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ZERO_KNOWLEDGE_EVENT, { detail: { map: normalized } }));
    }
  } catch {
    // ignore
  }
}

/**
 * Gets all per-language pick word strategies as a map of languageCode -> PickWordStrategy.
 */
export function getAllPerLanguagePickWordStrategies(): Record<string, PickWordStrategy> {
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.perLangPickWordStrategy);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, PickWordStrategy> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const clean = extractLanguageCodeString(k).toLowerCase();
      if (clean && (v === "longest" || v === "random")) {
        result[clean] = v;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Sets all per-language pick word strategies from a map of languageCode -> PickWordStrategy.
 */
export function setAllPerLanguagePickWordStrategies(map: Record<string, PickWordStrategy>): void {
  const s = getStorage();
  try {
    const prev = getAllPerLanguagePickWordStrategies();
    if (typeof s.removeItem === "function") {
      for (const prevCode of Object.keys(prev)) {
        s.removeItem(`yt_pick_word_strategy_${prevCode.toLowerCase()}`);
      }
    }
    removeStorageKeysByPrefix("yt_pick_word_strategy_", [
      KEYS.pickWordStrategy,
      KEYS.perLangPickWordStrategy,
    ]);

    const normalized: Record<string, PickWordStrategy> = {};
    for (const [code, val] of Object.entries(map || {})) {
      const clean = extractLanguageCodeString(code).toLowerCase();
      if (clean && (val === "longest" || val === "random")) {
        normalized[clean] = val;
        s.setItem(`yt_pick_word_strategy_${clean}`, val);
      }
    }
    s.setItem(KEYS.perLangPickWordStrategy, JSON.stringify(normalized));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PICK_WORD_STRATEGY_EVENT, { detail: { map: normalized } }),
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Gets the pick word strategy ("longest" | "random") for a language or globally.
 * Defaults to "longest".
 */
export function getPickWordStrategy(langCode?: unknown): PickWordStrategy {
  const s = getStorage();
  const code = langCode ? extractLanguageCodeString(langCode).toLowerCase() : "";
  try {
    if (code) {
      const perLang = s.getItem(`yt_pick_word_strategy_${code}`);
      if (perLang === "longest" || perLang === "random") return perLang;
      const rawAll = s.getItem(KEYS.perLangPickWordStrategy);
      if (rawAll) {
        const parsed = JSON.parse(rawAll);
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed[code] === "longest" || parsed[code] === "random")
        ) {
          return parsed[code];
        }
      }
    }
    const globalVal = s.getItem(KEYS.pickWordStrategy);
    if (globalVal === "longest" || globalVal === "random") return globalVal;
  } catch {
    // ignore
  }
  return "longest";
}

/**
 * Sets the pick word strategy ("longest" | "random") for a language or globally.
 */
export function setPickWordStrategy(strategy: PickWordStrategy, langCode?: unknown): void {
  if (strategy !== "longest" && strategy !== "random") return;
  const s = getStorage();
  const code = langCode ? extractLanguageCodeString(langCode).toLowerCase() : "";
  try {
    if (code) {
      s.setItem(`yt_pick_word_strategy_${code}`, strategy);
      const rawAll = s.getItem(KEYS.perLangPickWordStrategy);
      const parsed = rawAll ? JSON.parse(rawAll) : {};
      parsed[code] = strategy;
      s.setItem(KEYS.perLangPickWordStrategy, JSON.stringify(parsed));
    } else {
      s.setItem(KEYS.pickWordStrategy, strategy);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PICK_WORD_STRATEGY_EVENT, { detail: { langCode: code, strategy } }),
      );
    }
  } catch {
    // ignore
  }
}

export function getLanguageOrderPreference(): string[] {
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.languageOrder);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : [];
  } catch {
    return [];
  }
}

export function saveLanguageOrderPreference(order: unknown[]): void {
  const s = getStorage();
  try {
    const cleaned = extractLanguageCodeList(order);
    s.setItem(KEYS.languageOrder, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export function getShownLanguagesPreference(): string[] | null {
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.shownLanguages);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : null;
  } catch {
    return null;
  }
}

export function saveShownLanguagesPreference(langs: unknown[] | null): void {
  const s = getStorage();
  try {
    if (langs === null) {
      s.removeItem?.(KEYS.shownLanguages);
      return;
    }
    s.setItem(KEYS.shownLanguages, JSON.stringify(extractLanguageCodeList(langs)));
  } catch {
    // ignore
  }
}

export function getSpokenLanguagesPreference(): string[] | null {
  const s = getStorage();
  try {
    const raw = s.getItem(KEYS.spokenLanguages);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? extractLanguageCodeList(parsed) : null;
  } catch {
    return null;
  }
}

export function saveSpokenLanguagesPreference(langs: unknown[] | null): void {
  const s = getStorage();
  try {
    if (langs === null) {
      s.removeItem?.(KEYS.spokenLanguages);
      return;
    }
    s.setItem(KEYS.spokenLanguages, JSON.stringify(extractLanguageCodeList(langs)));
  } catch {
    // ignore
  }
}

export const TABLE_DISPLAY_MODE_EVENT = "yt-table-display-mode-changed";

export function getTableDisplayModePreference(): TableDisplayMode {
  const s = getStorage();
  try {
    const val = s.getItem(KEYS.tableDisplayMode);
    if (val === "multiple" || val === "single") return val;
  } catch {
    // ignore
  }
  return "single";
}

export function setTableDisplayModePreference(mode: TableDisplayMode): void {
  if (mode !== "single" && mode !== "multiple") return;
  const s = getStorage();
  try {
    s.setItem(KEYS.tableDisplayMode, mode);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(TABLE_DISPLAY_MODE_EVENT, { detail: mode }));
    }
  } catch {
    // ignore
  }
}

export const CRITERIA_MATCH_ACTION_EVENT = "yt-criteria-match-action-changed";

export function getCriteriaMatchActionPreference(): CriteriaMatchAction {
  const s = getStorage();
  try {
    const val = s.getItem(KEYS.criteriaMatchAction);
    if (val === "highlight" || val === "filter") return val;
  } catch {
    // ignore
  }
  return "filter";
}

export function setCriteriaMatchActionPreference(action: CriteriaMatchAction): void {
  if (action !== "filter" && action !== "highlight") return;
  const s = getStorage();
  try {
    s.setItem(KEYS.criteriaMatchAction, action);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CRITERIA_MATCH_ACTION_EVENT, { detail: action }));
    }
  } catch {
    // ignore
  }
}
