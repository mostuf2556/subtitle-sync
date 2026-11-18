export interface SubtitleRowLike {
  texts?: Record<string, string>;
  text?: string;
  translation?: string;
}

export interface ListeningLanguageOption {
  code: string;
  name: string;
}

export interface ListeningLanguagesConfig {
  orderedLanguages: string[];
  enabledLanguages: string[];
}

export type ListeningWordSortBy = "default" | "alphabet" | "word_size" | "sentence_length";

export type ListeningSortDirection = "asc" | "desc";

export interface ListeningWordSortConfig {
  sortBy: ListeningWordSortBy;
  direction: ListeningSortDirection;
}

export interface ListeningGameWordItem {
  id: string;
  word: string;
  normalized: string;
  letterCount: number;
  sourceSentence: string;
  sourceSentenceWordCount: number;
  sourceTranslation: string;
  translationsByLang?: Record<string, string>;
  rowIndex: number;
}

export interface ListeningGameSentenceItem {
  id: string;
  sentence: string;
  translation: string;
  translationsByLang?: Record<string, string>;
  wordCount: number;
  rowIndex: number;
}

export function sanitizeListeningWord(rawWord: string): string {
  return rawWord.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function countWordLetters(word: string): number {
  const letters = word.match(/\p{L}/gu);
  if (letters) return letters.length;
  const alnum = word.match(/[\p{L}\p{N}]/gu);
  return alnum ? alnum.length : 0;
}

export function countSentenceWords(sentence: string): number {
  if (!sentence.trim()) return 0;
  return sentence
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function splitTextIntoPunctuationSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentences: string[] = [];
  let buffer = "";
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    buffer += ch;

    if (ch === '"' || ch === "“" || ch === "”") {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === "(") {
      parenDepth += 1;
    } else if (ch === ")" && parenDepth > 0) {
      parenDepth -= 1;
    }

    const isTerminal =
      ch === "." ||
      ch === "!" ||
      ch === "?" ||
      ch === "؟" ||
      ch === "。" ||
      ch === "！" ||
      ch === "？" ||
      ch === ";";

    if (isTerminal && !inDoubleQuote && parenDepth === 0) {
      // Avoid splitting decimal numbers like 3.5 or abbreviations when next char is digit/letter without whitespace
      const nextChar = trimmed[i + 1];
      if (ch === "." && nextChar && /\S/.test(nextChar) && nextChar !== '"' && nextChar !== ")") {
        continue;
      }
      const candidate = buffer.trim();
      if (candidate && countSentenceWords(candidate) > 0) {
        sentences.push(candidate);
      }
      buffer = "";
    }
  }

  const tail = buffer.trim();
  if (tail && countSentenceWords(tail) > 0) {
    sentences.push(tail);
  }

  return sentences;
}

export function resolveRowBaseAndTranslation(
  row: SubtitleRowLike,
  baseLanguage: string,
  targetLanguage: string,
): { baseText: string; translationText: string } {
  const texts = row.texts || {};
  const baseText = (
    (baseLanguage ? texts[baseLanguage] : undefined) ??
    row.text ??
    Object.values(texts)[0] ??
    ""
  ).trim();

  const translationText = (
    (targetLanguage ? texts[targetLanguage] : undefined) ??
    row.translation ??
    ""
  ).trim();

  return { baseText, translationText };
}

export interface ExtractListeningWordsOptions {
  baseLanguage: string;
  targetLanguage: string;
  minLetters: number;
  fallbackSentence?: string;
  fallbackTranslation?: string;
}

export function extractListeningWords(
  rows: SubtitleRowLike[],
  options: ExtractListeningWordsOptions,
): ListeningGameWordItem[] {
  const safeMinLetters = Math.max(1, Math.floor(options.minLetters || 1));
  const sourceRows: SubtitleRowLike[] =
    rows.length > 0
      ? rows
      : options.fallbackSentence
        ? [
            {
              text: options.fallbackSentence,
              translation: options.fallbackTranslation || "",
            },
          ]
        : [];

  const seen = new Set<string>();
  const items: ListeningGameWordItem[] = [];

  sourceRows.forEach((row, rowIndex) => {
    const { baseText, translationText } = resolveRowBaseAndTranslation(
      row,
      options.baseLanguage,
      options.targetLanguage,
    );
    if (!baseText) return;

    const translationsByLang: Record<string, string> = {};
    if (row.texts) {
      for (const [code, val] of Object.entries(row.texts)) {
        if (typeof val === "string" && val.trim()) {
          translationsByLang[code] = val.trim();
        }
      }
    }
    if (options.baseLanguage && baseText) {
      translationsByLang[options.baseLanguage] = baseText;
    }
    if (options.targetLanguage && translationText) {
      translationsByLang[options.targetLanguage] = translationText;
    }

    const sourceSentenceWordCount = countSentenceWords(baseText);
    const rawTokens = baseText.split(/\s+/);
    for (const token of rawTokens) {
      const clean = sanitizeListeningWord(token);
      if (!clean) continue;
      const letterCount = countWordLetters(clean);
      if (letterCount < safeMinLetters) continue;
      const normalized = clean.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      items.push({
        id: `word-${rowIndex}-${normalized}`,
        word: clean,
        normalized,
        letterCount,
        sourceSentence: baseText,
        sourceSentenceWordCount,
        sourceTranslation: translationText,
        translationsByLang,
        rowIndex,
      });
    }
  });

  return items;
}

const LISTENING_WORD_SORT_STORAGE_KEY = "yt_listening_game_word_sort_v1";

export function sortListeningWords(
  words: ListeningGameWordItem[],
  sortBy: ListeningWordSortBy,
  direction: ListeningSortDirection = "asc",
  locale?: string,
): ListeningGameWordItem[] {
  if (words.length <= 1) return [...words];
  if (sortBy === "default") {
    return direction === "desc" ? [...words].reverse() : [...words];
  }

  const dir = direction === "desc" ? -1 : 1;
  const compareLocale = locale?.trim() || undefined;

  return [...words].sort((a, b) => {
    if (sortBy === "alphabet") {
      const alphaCmp = a.word.localeCompare(b.word, compareLocale, { sensitivity: "base" });
      if (alphaCmp !== 0) return alphaCmp * dir;
      return a.rowIndex - b.rowIndex;
    }

    if (sortBy === "word_size") {
      const sizeCmp = a.letterCount - b.letterCount;
      if (sizeCmp !== 0) return sizeCmp * dir;
      return a.word.localeCompare(b.word, compareLocale, { sensitivity: "base" });
    }

    if (sortBy === "sentence_length") {
      const sentCmp = a.sourceSentenceWordCount - b.sourceSentenceWordCount;
      if (sentCmp !== 0) return sentCmp * dir;
      const sizeCmp = a.letterCount - b.letterCount;
      if (sizeCmp !== 0) return sizeCmp;
      return a.word.localeCompare(b.word, compareLocale, { sensitivity: "base" });
    }

    return 0;
  });
}

export function loadListeningWordSortConfig(): ListeningWordSortConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LISTENING_WORD_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListeningWordSortConfig>;
    if (!parsed || typeof parsed !== "object") return null;
    const validSortBy: ListeningWordSortBy[] = [
      "default",
      "alphabet",
      "word_size",
      "sentence_length",
    ];
    const sortBy = parsed.sortBy && validSortBy.includes(parsed.sortBy) ? parsed.sortBy : "default";
    const direction: ListeningSortDirection = parsed.direction === "desc" ? "desc" : "asc";
    return { sortBy, direction };
  } catch {
    return null;
  }
}

export function saveListeningWordSortConfig(config: ListeningWordSortConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LISTENING_WORD_SORT_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export const MIN_LISTENING_TTS_RATE = 0.25;
export const MAX_LISTENING_TTS_RATE = 2.5;
export const LISTENING_RATE_PRESETS = [0.75, 1.0, 1.25, 1.5, 2.0] as const;
const LISTENING_RATE_OVERRIDE_STORAGE_KEY = "yt_listening_game_rate_override_v1";

export function clampListeningTtsRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1.0;
  const clamped = Math.max(MIN_LISTENING_TTS_RATE, Math.min(MAX_LISTENING_TTS_RATE, rate));
  return Math.round(clamped * 100) / 100;
}

export function resolveEffectiveListeningTtsRate(
  langCode: string,
  configuredRates?: Record<string, number>,
  rateOverride?: number | null,
): number {
  if (typeof rateOverride === "number" && Number.isFinite(rateOverride)) {
    return clampListeningTtsRate(rateOverride);
  }
  const configured = configuredRates?.[langCode];
  return typeof configured === "number" && Number.isFinite(configured)
    ? clampListeningTtsRate(configured)
    : 1.0;
}

export function loadListeningTtsRateOverride(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LISTENING_RATE_OVERRIDE_STORAGE_KEY);
    if (!raw || raw === "null") return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return clampListeningTtsRate(parsed);
  } catch {
    return null;
  }
}

export function saveListeningTtsRateOverride(rate: number | null): void {
  if (typeof window === "undefined") return;
  try {
    if (rate === null || !Number.isFinite(rate)) {
      window.localStorage.removeItem(LISTENING_RATE_OVERRIDE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        LISTENING_RATE_OVERRIDE_STORAGE_KEY,
        String(clampListeningTtsRate(rate)),
      );
    }
  } catch {
    // ignore storage errors
  }
}

export interface ExtractListeningSentencesOptions {
  baseLanguage: string;
  targetLanguage: string;
  maxWords: number;
  fallbackSentence?: string;
  fallbackTranslation?: string;
}

export function extractListeningSentences(
  rows: SubtitleRowLike[],
  options: ExtractListeningSentencesOptions,
): ListeningGameSentenceItem[] {
  const safeMaxWords = Math.max(1, Math.floor(options.maxWords || 1));
  const sourceRows: SubtitleRowLike[] =
    rows.length > 0
      ? rows
      : options.fallbackSentence
        ? [
            {
              text: options.fallbackSentence,
              translation: options.fallbackTranslation || "",
            },
          ]
        : [];

  const seen = new Set<string>();
  const items: ListeningGameSentenceItem[] = [];

  sourceRows.forEach((row, rowIndex) => {
    const { baseText, translationText } = resolveRowBaseAndTranslation(
      row,
      options.baseLanguage,
      options.targetLanguage,
    );
    if (!baseText) return;

    const baseSentences = splitTextIntoPunctuationSentences(baseText);
    const transSentences = translationText
      ? splitTextIntoPunctuationSentences(translationText)
      : [];

    const splitByLang: Record<string, string[]> = {};
    if (row.texts) {
      for (const [code, val] of Object.entries(row.texts)) {
        if (typeof val === "string" && val.trim()) {
          splitByLang[code] = splitTextIntoPunctuationSentences(val.trim());
        }
      }
    }

    baseSentences.forEach((sentence, sIdx) => {
      const wordCount = countSentenceWords(sentence);
      if (wordCount <= 0 || wordCount > safeMaxWords) return;

      const normalized = sentence.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(normalized)) return;
      seen.add(normalized);

      const pairedTranslation =
        transSentences.length === baseSentences.length
          ? transSentences[sIdx] || translationText
          : translationText;

      const translationsByLang: Record<string, string> = {};
      if (row.texts) {
        for (const [code, val] of Object.entries(row.texts)) {
          const trimmed = typeof val === "string" ? val.trim() : "";
          if (!trimmed) continue;
          const langSplits = splitByLang[code] || [];
          translationsByLang[code] =
            langSplits.length === baseSentences.length ? langSplits[sIdx] || trimmed : trimmed;
        }
      }
      if (options.baseLanguage) {
        translationsByLang[options.baseLanguage] = sentence;
      }
      if (options.targetLanguage && pairedTranslation) {
        translationsByLang[options.targetLanguage] = pairedTranslation;
      }

      items.push({
        id: `sentence-${rowIndex}-${sIdx}`,
        sentence,
        translation: pairedTranslation,
        translationsByLang,
        wordCount,
        rowIndex,
      });
    });
  });

  return items;
}

const LISTENING_LANGUAGES_STORAGE_KEY = "yt_listening_game_languages_v1";

function canonicalLangKey(code: string): string {
  const lower = code.trim().toLowerCase();
  if (lower === "iw") return "he";
  if (lower === "ji") return "yi";
  if (lower === "in") return "id";
  return lower;
}

export function buildListeningLanguageOptions(params: {
  baseLanguage: string;
  baseLanguageName?: string;
  targetLanguage?: string;
  targetLanguageName?: string;
  availableLanguages?: ListeningLanguageOption[];
  rows?: SubtitleRowLike[];
}): ListeningLanguageOption[] {
  const seen = new Set<string>();
  const options: ListeningLanguageOption[] = [];
  const nameMap = new Map<string, string>();

  if (params.baseLanguage && params.baseLanguageName) {
    nameMap.set(canonicalLangKey(params.baseLanguage), params.baseLanguageName);
  }
  if (params.targetLanguage && params.targetLanguageName) {
    nameMap.set(canonicalLangKey(params.targetLanguage), params.targetLanguageName);
  }
  for (const lang of params.availableLanguages || []) {
    if (lang.code && lang.name) {
      nameMap.set(canonicalLangKey(lang.code), lang.name);
    }
  }

  const addCode = (rawCode?: string) => {
    const code = rawCode?.trim();
    if (!code) return;
    const key = canonicalLangKey(code);
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({
      code,
      name: nameMap.get(key) || code.toUpperCase(),
    });
  };

  addCode(params.baseLanguage);
  addCode(params.targetLanguage);
  for (const lang of params.availableLanguages || []) {
    addCode(lang.code);
  }
  for (const row of params.rows || []) {
    if (row.texts) {
      for (const code of Object.keys(row.texts)) {
        addCode(code);
      }
    }
  }

  return options;
}

export function getDefaultListeningLanguageOrder(
  baseLanguage: string,
  targetLanguage?: string,
): string[] {
  const result: string[] = [];
  if (baseLanguage.trim()) result.push(baseLanguage.trim());
  if (
    targetLanguage?.trim() &&
    canonicalLangKey(targetLanguage) !== canonicalLangKey(baseLanguage)
  ) {
    result.push(targetLanguage.trim());
  }
  return result;
}

export function reconcileListeningLanguagesConfig(
  options: ListeningLanguageOption[],
  baseLanguage: string,
  targetLanguage: string,
  saved?: Partial<ListeningLanguagesConfig> | null,
): ListeningLanguagesConfig {
  const optionCodes = options.map((o) => o.code);
  const codeByCanonical = new Map<string, string>();
  for (const code of optionCodes) {
    codeByCanonical.set(canonicalLangKey(code), code);
  }

  const orderedLanguages: string[] = [];
  const seenOrder = new Set<string>();
  for (const raw of saved?.orderedLanguages || []) {
    const matched = codeByCanonical.get(canonicalLangKey(raw));
    if (matched && !seenOrder.has(matched)) {
      seenOrder.add(matched);
      orderedLanguages.push(matched);
    }
  }
  for (const code of optionCodes) {
    if (!seenOrder.has(code)) {
      seenOrder.add(code);
      orderedLanguages.push(code);
    }
  }

  const enabledSet = new Set<string>();
  for (const raw of saved?.enabledLanguages || []) {
    const matched = codeByCanonical.get(canonicalLangKey(raw));
    if (matched) {
      enabledSet.add(matched);
    }
  }

  let enabledLanguages = orderedLanguages.filter((code) => enabledSet.has(code));
  if (enabledLanguages.length === 0) {
    const defaults = getDefaultListeningLanguageOrder(baseLanguage, targetLanguage)
      .map((c) => codeByCanonical.get(canonicalLangKey(c)))
      .filter((c): c is string => Boolean(c));
    enabledLanguages = defaults.length > 0 ? defaults : orderedLanguages.slice(0, 1);
  }

  return { orderedLanguages, enabledLanguages };
}

export function moveListeningLanguage(
  orderedLanguages: string[],
  code: string,
  direction: "up" | "down",
): string[] {
  const idx = orderedLanguages.indexOf(code);
  if (idx < 0) return orderedLanguages;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= orderedLanguages.length) return orderedLanguages;
  const next = [...orderedLanguages];
  [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
  return next;
}

export function toggleListeningLanguageEnabled(
  enabledLanguages: string[],
  code: string,
  orderedLanguages: string[],
): string[] {
  const isCurrentlyEnabled = enabledLanguages.includes(code);
  if (isCurrentlyEnabled && enabledLanguages.length <= 1) {
    return enabledLanguages;
  }
  const nextSet = new Set(enabledLanguages);
  if (isCurrentlyEnabled) {
    nextSet.delete(code);
  } else {
    nextSet.add(code);
  }
  return orderedLanguages.filter((c) => nextSet.has(c));
}

export function loadListeningLanguagesConfig(): ListeningLanguagesConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LISTENING_LANGUAGES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListeningLanguagesConfig>;
    if (!parsed || typeof parsed !== "object") return null;
    const orderedLanguages = Array.isArray(parsed.orderedLanguages)
      ? parsed.orderedLanguages.filter(
          (c): c is string => typeof c === "string" && c.trim().length > 0,
        )
      : [];
    const enabledLanguages = Array.isArray(parsed.enabledLanguages)
      ? parsed.enabledLanguages.filter(
          (c): c is string => typeof c === "string" && c.trim().length > 0,
        )
      : [];
    if (orderedLanguages.length === 0 && enabledLanguages.length === 0) return null;
    return { orderedLanguages, enabledLanguages };
  } catch {
    return null;
  }
}

export function saveListeningLanguagesConfig(config: ListeningLanguagesConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LISTENING_LANGUAGES_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export interface SentenceHighlightPart {
  text: string;
  isMatch: boolean;
}

/**
 * Splits a source sentence into segments so occurrences of the derived word can be
 * highlighted inline without altering text content or breaking unicode word boundaries.
 */
export function splitSentenceHighlightParts(
  sentence: string,
  word: string,
): SentenceHighlightPart[] {
  if (!sentence) return [];
  const trimmedWord = word.trim();
  if (!trimmedWord) return [{ text: sentence, isMatch: false }];

  const escaped = trimmedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regex: RegExp;
  try {
    regex = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped})(?![\\p{L}\\p{N}])`, "giu");
  } catch {
    return [{ text: sentence, isMatch: false }];
  }

  const parts: SentenceHighlightPart[] = [];
  let lastIndex = 0;
  for (const match of sentence.matchAll(regex)) {
    const idx = match.index ?? -1;
    if (idx < 0) continue;
    if (idx > lastIndex) {
      parts.push({ text: sentence.slice(lastIndex, idx), isMatch: false });
    }
    parts.push({ text: match[0], isMatch: true });
    lastIndex = idx + match[0].length;
  }

  if (lastIndex === 0) {
    return [{ text: sentence, isMatch: false }];
  }
  if (lastIndex < sentence.length) {
    parts.push({ text: sentence.slice(lastIndex), isMatch: false });
  }
  return parts;
}

export interface ArchivedListeningWordEntry {
  normalized: string;
  word: string;
  archivedAt: number;
}

export const LISTENING_ARCHIVED_WORDS_STORAGE_KEY = "yt_listening_game_archived_words_v1";
export const LISTENING_ARCHIVED_WORDS_UPDATED_EVENT = "yt-listening-archived-words-updated";

export function normalizeArchivedWordKey(word: string): string {
  const clean = sanitizeListeningWord(word) || word.trim();
  return clean.toLowerCase();
}

export function loadArchivedListeningWords(): ArchivedListeningWordEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LISTENING_ARCHIVED_WORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: ArchivedListeningWordEntry[] = [];
    for (const item of parsed) {
      let word = "";
      let archivedAt = Date.now();
      if (typeof item === "string") {
        word = sanitizeListeningWord(item) || item.trim();
      } else if (item && typeof item === "object") {
        const rec = item as Partial<ArchivedListeningWordEntry>;
        if (typeof rec.word === "string" && rec.word.trim()) {
          word = sanitizeListeningWord(rec.word) || rec.word.trim();
        } else if (typeof rec.normalized === "string" && rec.normalized.trim()) {
          word = rec.normalized.trim();
        }
        if (typeof rec.archivedAt === "number" && Number.isFinite(rec.archivedAt)) {
          archivedAt = rec.archivedAt;
        }
      }
      const normalized = normalizeArchivedWordKey(word);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push({ normalized, word, archivedAt });
    }
    return result;
  } catch {
    return [];
  }
}

export function saveArchivedListeningWords(entries: ArchivedListeningWordEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LISTENING_ARCHIVED_WORDS_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(LISTENING_ARCHIVED_WORDS_UPDATED_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function archiveListeningWord(
  entries: ArchivedListeningWordEntry[],
  word: string,
): ArchivedListeningWordEntry[] {
  const displayWord = sanitizeListeningWord(word) || word.trim();
  const normalized = normalizeArchivedWordKey(displayWord);
  if (!normalized) return entries;
  if (entries.some((entry) => entry.normalized === normalized)) {
    return entries;
  }
  return [
    {
      normalized,
      word: displayWord,
      archivedAt: Date.now(),
    },
    ...entries,
  ];
}

export function unquarantineListeningWord(
  entries: ArchivedListeningWordEntry[],
  wordOrNormalized: string,
): ArchivedListeningWordEntry[] {
  const targetKey = normalizeArchivedWordKey(wordOrNormalized);
  if (!targetKey) return entries;
  return entries.filter((entry) => entry.normalized !== targetKey);
}

export function clearArchivedListeningWords(): ArchivedListeningWordEntry[] {
  return [];
}

export function filterArchivedListeningWords(
  words: ListeningGameWordItem[],
  archived: ArchivedListeningWordEntry[],
): ListeningGameWordItem[] {
  if (archived.length === 0 || words.length === 0) return words;
  const archivedSet = new Set(archived.map((entry) => entry.normalized));
  return words.filter((item) => {
    const key = normalizeArchivedWordKey(item.normalized || item.word);
    return !archivedSet.has(key);
  });
}

export function filterArchivedWordStrings(
  words: string[],
  archived: ArchivedListeningWordEntry[],
): string[] {
  if (archived.length === 0 || words.length === 0) return words;
  const archivedSet = new Set(archived.map((entry) => entry.normalized));
  return words.filter((w) => !archivedSet.has(normalizeArchivedWordKey(w)));
}
