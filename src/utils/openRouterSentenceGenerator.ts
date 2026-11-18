import { DEFAULT_OPENROUTER_MODEL } from "./openRouterAiService";
import { getOpenRouterApiKeySetting, getOpenRouterModelSetting } from "./appSettings";
import {
  extractListeningWords,
  type ListeningGameWordItem,
  type SubtitleRowLike,
} from "./listeningGame";
import { logWarn } from "./logBuffer";

export const OPENROUTER_SENTENCE_BATCH_SIZE = 5;
export const OPENROUTER_PREFETCH_REMAINING_THRESHOLD = 1;
export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface GeneratedTargetWordSentence {
  id: string;
  targetWord: string;
  sentence: string;
  translation: string;
  batchIndex: number;
}

export interface ExtractTargetWordsOptions {
  baseLanguage: string;
  targetLanguage: string;
  minLetters?: number;
  maxWords?: number;
  fallbackSentence?: string;
  fallbackTranslation?: string;
}

/**
 * Extracts distinct target vocabulary words to learn from active subtitle rows.
 */
export function extractTargetWordsToLearn(
  rows: SubtitleRowLike[],
  options: ExtractTargetWordsOptions,
): ListeningGameWordItem[] {
  const items = extractListeningWords(rows, {
    baseLanguage: options.baseLanguage,
    targetLanguage: options.targetLanguage,
    minLetters: Math.max(1, options.minLetters ?? 3),
    fallbackSentence: options.fallbackSentence,
    fallbackTranslation: options.fallbackTranslation,
  });
  const cap = Math.max(1, options.maxWords ?? 40);
  return items.slice(0, cap);
}

/**
 * Determines whether the next on-demand batch of X=5 sentences should be prefetched
 * as the learner nears the end of currently loaded sentences.
 */
export function shouldPrefetchNextSentenceBatch(
  currentIndex: number,
  totalCount: number,
  isLoading: boolean,
  remainingThreshold = OPENROUTER_PREFETCH_REMAINING_THRESHOLD,
): boolean {
  if (isLoading || totalCount <= 0) return false;
  const remainingAhead = totalCount - 1 - Math.max(0, currentIndex);
  return remainingAhead <= remainingThreshold;
}

export interface BuildSentenceGenerationPromptParams {
  targetWords: string[];
  baseLanguageName: string;
  targetLanguageName: string;
  count?: number;
  excludeSentences?: string[];
}

export function buildTargetWordSentencesPrompt({
  targetWords,
  baseLanguageName,
  targetLanguageName,
  count = OPENROUTER_SENTENCE_BATCH_SIZE,
  excludeSentences = [],
}: BuildSentenceGenerationPromptParams): string {
  const cleanWords = targetWords.map((w) => w.trim()).filter(Boolean);
  const recentExclusions = excludeSentences
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(-15);

  const exclusionBlock =
    recentExclusions.length > 0
      ? `\nDO NOT repeat or closely paraphrase any of these already-used sentences:\n${recentExclusions
          .map((s) => `- ${s}`)
          .join("\n")}\n`
      : "";

  return `Generate exactly ${count} natural, practical, learner-friendly example sentences in ${baseLanguageName}.
Each sentence MUST naturally incorporate at least one of these target words to learn: ${cleanWords.join(", ")}.
Also provide an accurate, natural translation in ${targetLanguageName} for each sentence.${exclusionBlock}
Return ONLY a valid JSON array of exactly ${count} objects (no markdown prose or extra commentary), shaped strictly like:
[
  {
    "targetWord": "<word from the list used in this sentence>",
    "sentence": "<sentence in ${baseLanguageName}>",
    "translation": "<translation in ${targetLanguageName}>"
  }
]`;
}

function normalizeSentenceKey(sentence: string): string {
  return sentence.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveMatchingTargetWord(sentence: string, targetWords: string[], fallback?: string): string {
  const lowerSentence = sentence.toLowerCase();
  const found = targetWords.find((w) => {
    const clean = w.trim().toLowerCase();
    return clean.length > 0 && lowerSentence.includes(clean);
  });
  if (found) return found;
  if (fallback && fallback.trim()) return fallback.trim();
  return targetWords[0] || "";
}

export interface ParseGeneratedSentencesOptions {
  targetWords: string[];
  batchIndex: number;
  excludeSentences?: string[];
  expectedCount?: number;
}

/**
 * Parses JSON (or fallback numbered lines) returned by OpenRouter into deduplicated sentence cards.
 */
export function parseGeneratedSentencesResponse(
  rawContent: string,
  options: ParseGeneratedSentencesOptions,
): GeneratedTargetWordSentence[] {
  const trimmed = rawContent.trim();
  if (!trimmed) return [];

  const maxCount = Math.max(1, options.expectedCount ?? OPENROUTER_SENTENCE_BATCH_SIZE);
  const seen = new Set<string>((options.excludeSentences || []).map(normalizeSentenceKey));
  const results: GeneratedTargetWordSentence[] = [];

  // Strip optional markdown code fences
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsedArray: Array<Record<string, unknown>> | null = null;
  try {
    const direct = JSON.parse(stripped);
    if (Array.isArray(direct)) {
      parsedArray = direct;
    } else if (direct && typeof direct === "object") {
      const obj = direct as Record<string, unknown>;
      if (Array.isArray(obj.sentences)) {
        parsedArray = obj.sentences as Array<Record<string, unknown>>;
      } else if (Array.isArray(obj.items)) {
        parsedArray = obj.items as Array<Record<string, unknown>>;
      }
    }
  } catch {
    // Attempt extracting embedded JSON array
    const firstBracket = stripped.indexOf("[");
    const lastBracket = stripped.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      try {
        const sliced = JSON.parse(stripped.slice(firstBracket, lastBracket + 1));
        if (Array.isArray(sliced)) {
          parsedArray = sliced;
        }
      } catch {
        parsedArray = null;
      }
    }
  }

  if (parsedArray) {
    parsedArray.forEach((entry, idx) => {
      if (results.length >= maxCount || !entry || typeof entry !== "object") return;
      const rawSentence =
        typeof entry.sentence === "string"
          ? entry.sentence.trim()
          : typeof entry.text === "string"
            ? entry.text.trim()
            : "";
      if (!rawSentence) return;

      const norm = normalizeSentenceKey(rawSentence);
      if (seen.has(norm)) return;
      seen.add(norm);

      const rawTranslation =
        typeof entry.translation === "string"
          ? entry.translation.trim()
          : typeof entry.meaning === "string"
            ? entry.meaning.trim()
            : "";
      const rawWord =
        typeof entry.targetWord === "string"
          ? entry.targetWord.trim()
          : typeof entry.word === "string"
            ? entry.word.trim()
            : "";

      results.push({
        id: `or-sent-b${options.batchIndex}-${idx}-${norm.slice(0, 16)}`,
        targetWord: resolveMatchingTargetWord(rawSentence, options.targetWords, rawWord),
        sentence: rawSentence,
        translation: rawTranslation,
        batchIndex: options.batchIndex,
      });
    });

    if (results.length > 0) return results;
  }

  // Fallback line parser if model answered in numbered format ("1. Sentence | Translation")
  const lines = stripped
    .split(/\r?\n/)
    .map((l) => l.replace(/^\d+[.)\-:\s]+/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("{") && !l.startsWith("["));

  lines.forEach((line, idx) => {
    if (results.length >= maxCount) return;
    const parts = line.split(/\s+\|\s+|\s+—\s+/);
    const sentence = (parts[0] || "").trim();
    if (!sentence) return;
    const norm = normalizeSentenceKey(sentence);
    if (seen.has(norm)) return;
    seen.add(norm);

    results.push({
      id: `or-sent-b${options.batchIndex}-${idx}-${norm.slice(0, 16)}`,
      targetWord: resolveMatchingTargetWord(sentence, options.targetWords),
      sentence,
      translation: (parts[1] || "").trim(),
      batchIndex: options.batchIndex,
    });
  });

  return results;
}

export interface GenerateTargetWordSentencesOptions {
  targetWords: string[];
  baseLanguage: string;
  baseLanguageName: string;
  targetLanguage: string;
  targetLanguageName: string;
  count?: number;
  batchIndex?: number;
  excludeSentences?: string[];
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface GenerateTargetWordSentencesResult {
  sentences: GeneratedTargetWordSentence[];
  modelUsed: string;
  latencyMs: number;
}

/**
 * Generates the next batch of X=5 practice sentences on demand using OpenRouter
 * and the learner's configured OpenRouter API key + selected free model.
 */
export async function generateNextTargetWordSentencesBatch({
  targetWords,
  baseLanguageName,
  targetLanguageName,
  count = OPENROUTER_SENTENCE_BATCH_SIZE,
  batchIndex = 1,
  excludeSentences = [],
  apiKey,
  model,
  signal,
}: GenerateTargetWordSentencesOptions): Promise<GenerateTargetWordSentencesResult> {
  const cleanWords = targetWords.map((w) => w.trim()).filter(Boolean);
  if (cleanWords.length === 0) {
    throw new Error("Select or load at least one target word to generate practice sentences.");
  }

  const effectiveKey = (apiKey !== undefined ? apiKey : getOpenRouterApiKeySetting()).trim();
  if (!effectiveKey) {
    throw new Error(
      "OpenRouter API key is required. Set your OpenRouter key in Settings (1st accordion).",
    );
  }

  const effectiveModel =
    (model !== undefined ? model : getOpenRouterModelSetting()).trim() || DEFAULT_OPENROUTER_MODEL;
  const effectiveCount = Math.max(1, Math.min(10, Math.floor(count)));

  const prompt = buildTargetWordSentencesPrompt({
    targetWords: cleanWords,
    baseLanguageName: baseLanguageName || "English",
    targetLanguageName: targetLanguageName || "Target Language",
    count: effectiveCount,
    excludeSentences,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${effectiveKey}`,
    "HTTP-Referer":
      typeof window !== "undefined"
        ? window.location.origin
        : "https://github.com/mostuf2556/subtitle-sync",
    "X-Title": "Parallel Subtitles Target Word Sentence Game",
  };

  const startedAt = Date.now();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("Sentence generation was cancelled.");
    }

    const res = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: effectiveModel,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are a concise language-learning tutor. Respond strictly with valid JSON arrays matching the requested schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
      logWarn("OpenRouterGame", `Rate limited (${res.status}), retrying sentence batch generation…`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const rawContent: string = data?.choices?.[0]?.message?.content || "";
    const parsed = parseGeneratedSentencesResponse(rawContent, {
      targetWords: cleanWords,
      batchIndex,
      excludeSentences,
      expectedCount: effectiveCount,
    });

    if (parsed.length === 0) {
      throw new Error("OpenRouter returned no usable sentences. Please try again.");
    }

    return {
      sentences: parsed,
      modelUsed: data?.model || effectiveModel,
      latencyMs: Date.now() - startedAt,
    };
  }

  throw new Error("Failed to generate sentences from OpenRouter after retry.");
}

/**
 * Resolves the best TTS language code for a given text string so pronunciation
 * always matches the actual script/language of the text (e.g. Hebrew, Arabic,
 * Cyrillic, CJK, Greek, Devanagari) even if base/target props were swapped.
 */
export function resolveTextSpeechLanguage(
  text: string,
  expectedLang: string,
  alternateLang?: string,
): string {
  const sample = (text || "").trim();
  const baseExpected = (expectedLang || "en").split("-")[0].toLowerCase();
  const baseAlt = (alternateLang || "").split("-")[0].toLowerCase();

  if (!sample) return expectedLang || "en";

  const pick = (detected: string, allowedSet?: string[]) => {
    if (allowedSet && allowedSet.includes(baseExpected)) return expectedLang;
    if (baseExpected === detected) return expectedLang;
    if (allowedSet && allowedSet.includes(baseAlt) && alternateLang) return alternateLang;
    if (baseAlt === detected && alternateLang) return alternateLang;
    return detected;
  };

  if (/[\u0590-\u05FF]/.test(sample)) return pick("he");
  if (/[\u0600-\u06FF]/.test(sample)) return pick("ar", ["ar", "fa", "ur"]);
  if (/[\u0400-\u04FF]/.test(sample)) return pick("ru", ["ru", "uk", "bg", "sr"]);
  if (/[\u0370-\u03FF]/.test(sample)) return pick("el");
  if (/[\u3040-\u30FF]/.test(sample)) return pick("ja");
  if (/[\uAC00-\uD7AF]/.test(sample)) return pick("ko");
  if (/[\u4E00-\u9FFF]/.test(sample)) return pick("zh");
  if (/[\u0900-\u097F]/.test(sample)) return pick("hi");

  return expectedLang || "en";
}
