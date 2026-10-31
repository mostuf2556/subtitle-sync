import { Cue, Json3, Row, parseCues } from "@/lib/subtitles";

/**
 * New and Easier Subtitles Parser
 * Replaces the old complex multi-criteria parser with an easy, transparent sentence-splitting engine.
 * Specifically enables reliable splitting on the dot '.' character and configurable punctuation marks.
 */

export interface SimpleParserConfig {
  enabled: boolean;
  splitOnDot: boolean;
  splitOnQuestion: boolean;
  splitOnExclamation: boolean;
  splitOnComma: boolean;
  splitOnColonSemicolon: boolean;
  splitIntraCue: boolean;
  shortCompleteSentences: boolean;
  maxWordsPerSentence: number;
  customDelimiters: string;
  dotAbbreviationExceptions: string;
  wrapCoupledPunctuation: boolean;
}

export const DEFAULT_SIMPLE_PARSER_CONFIG: SimpleParserConfig = {
  enabled: true,
  splitOnDot: true,
  splitOnQuestion: true,
  splitOnExclamation: true,
  splitOnComma: true,
  splitOnColonSemicolon: true,
  splitIntraCue: true,
  shortCompleteSentences: true,
  maxWordsPerSentence: 10,
  customDelimiters: "",
  dotAbbreviationExceptions: "dr., mrs., mr., ms., prof., etc., e.g., i.e.",
  wrapCoupledPunctuation: true,
};

export function parseAbbreviationExceptions(rawValue: string): string[] {
  if (!rawValue || rawValue.trim().length === 0) return [];

  return Array.from(
    new Set(
      rawValue
        .split(/[\n,;|]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.toLowerCase().replace(/[^a-z]/g, ""))
        .filter(Boolean),
    ),
  );
}

export function isDotAbbreviationBoundary(
  text: string,
  dotIndex: number,
  config: SimpleParserConfig,
): boolean {
  if (dotIndex < 0 || dotIndex >= text.length || text[dotIndex] !== ".") return false;

  const prefix = text.slice(0, dotIndex + 1);
  const match = prefix.match(/(?:^|[\s(\[])(([a-z][a-z'.-]{0,15}))\.$/i);
  if (!match) return false;

  const normalized = match[1]!.toLowerCase().replace(/[^a-z]/g, "");
  if (!normalized) return false;

  const exceptions = parseAbbreviationExceptions(
    config.dotAbbreviationExceptions || DEFAULT_SIMPLE_PARSER_CONFIG.dotAbbreviationExceptions,
  );
  return exceptions.includes(normalized);
}

/**
 * Checks whether character index in `text` is strictly inside an open paired wrapper
 * such as quotes ("...", '...', “...”, «...») or brackets ((...), [...], {...}).
 * Text within start/closing couples of punctuation chars is kept wrapped together.
 */
export function isInsidePairedWrapper(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;

  const stack: string[] = [];

  for (let i = 0; i <= index; i++) {
    const ch = text[i]!;

    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (ch === top) {
        stack.pop();
        continue;
      }
      if (i === index) {
        return true;
      }
      if (ch === "(") stack.push(")");
      else if (ch === "[") stack.push("]");
      else if (ch === "{") stack.push("}");
      else if (ch === "“") stack.push("”");
      else if (ch === "«") stack.push("»");
      continue;
    }

    if (i === index) {
      return false;
    }

    if (ch === '"') {
      stack.push('"');
    } else if (ch === "“") {
      stack.push("”");
    } else if (ch === "«") {
      stack.push("»");
    } else if (ch === "(") {
      stack.push(")");
    } else if (ch === "[") {
      stack.push("]");
    } else if (ch === "{") {
      stack.push("}");
    } else if (ch === "'") {
      const prev = i > 0 ? text[i - 1]! : " ";
      if (/\s|[([{"«]/.test(prev)) {
        stack.push("'");
      }
    } else if (ch === "‘") {
      stack.push("’");
    }
  }

  return stack.length > 0;
}

/**
 * Builds a regex pattern matching any configured sentence-splitting delimiter.
 */
export function buildSplitRegex(config: SimpleParserConfig): RegExp | null {
  if (!config.enabled) return null;

  const escapedChars: string[] = [];
  if (config.splitOnDot || config.shortCompleteSentences) {
    escapedChars.push("\\.", "。");
  }
  if (config.splitOnQuestion || config.shortCompleteSentences) {
    escapedChars.push("\\?", "؟");
  }
  if (config.splitOnExclamation || config.shortCompleteSentences) {
    escapedChars.push("!");
  }
  if (config.splitOnComma || config.shortCompleteSentences) {
    escapedChars.push(",", "،", "、");
  }
  if (config.splitOnColonSemicolon || config.shortCompleteSentences) {
    escapedChars.push(";", "؛", ":", "—", "–");
  }

  if (config.customDelimiters && config.customDelimiters.trim().length > 0) {
    for (const ch of config.customDelimiters.trim()) {
      const escaped = ch.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      if (!escapedChars.includes(escaped)) {
        escapedChars.push(escaped);
      }
    }
  }

  if (escapedChars.length === 0) return null;

  // Match delimiter followed by optional closing quotes/brackets and either whitespace or end of string,
  // OR delimiter preceded by whitespace (handles patterns like "XXX ,YYY")
  return new RegExp(
    `(?:(?<=\\s)[${escapedChars.join("")}]+["'»)”]*)|(?:[${escapedChars.join("")}]+["'»)”]*(?=\\s+|$))`,
    "gu"
  );
}

export interface SplitSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Counts whitespace-delimited words in a string.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

export function isSentenceWithinWordLimit(text: string, maxWords: number): boolean {
  return !Number.isFinite(maxWords) || maxWords <= 0 || countWords(text) <= maxWords;
}

/**
 * Splits each native timed cue independently so parser output never crosses cue boundaries.
 * Grabs grammatically complete sentence/clause units bounded by punctuation (e.g. XXX, YYY? ZZ -> XXX, YYY?, ZZ).
 * Rejects anti-patterns like "XXX, Y" or "Y? ZZ" by strictly requiring whole-clause boundaries.
 */
export function splitCuesIntoSentences(
  cues: Cue[],
  config: SimpleParserConfig = DEFAULT_SIMPLE_PARSER_CONFIG,
): SplitSegment[] {
  if (!cues || cues.length === 0) return [];
  if (!config.enabled) {
    return cues.map((c) => ({ start: c.start, end: c.end, text: c.text.trim() }));
  }

  const splitRegex = buildSplitRegex(config);
  if (!splitRegex) {
    return cues.map((c) => ({ start: c.start, end: c.end, text: c.text.trim() }));
  }

  const segments: SplitSegment[] = [];

  for (const cue of cues) {
    const cueText = cue.text.trim();
    if (!cueText) continue;

    const cueStart = cue.start;
    const cueEnd = cue.end;
    const cueDuration = cueEnd - cueStart;

    if (!config.splitIntraCue) {
      segments.push({ start: cueStart, end: cueEnd, text: cueText });
      continue;
    }

    splitRegex.lastIndex = 0;
    const matches = Array.from(cueText.matchAll(splitRegex));
    let lastMatchEnd = 0;
    const cueSegments: SplitSegment[] = [];

    for (const match of matches) {
      const delimiterEnd = match.index + match[0].length;
      if (
        config.wrapCoupledPunctuation !== false &&
        isInsidePairedWrapper(cueText, match.index) &&
        isInsidePairedWrapper(cueText, delimiterEnd - 1)
      ) {
        continue;
      }
      const actualDotIndex = match[0].includes(".") ? match.index + match[0].lastIndexOf(".") : -1;
      if (actualDotIndex >= 0 && isDotAbbreviationBoundary(cueText, actualDotIndex, config)) {
        continue;
      }

      let partText = cueText.slice(lastMatchEnd, delimiterEnd).trim();
      if (config.shortCompleteSentences) {
        partText = partText.replace(/^[,\s;:]+|[,\s;:]+$/g, "").trim();
      }
      const charStartFraction = Math.min(1, Math.max(0, lastMatchEnd / cueText.length));
      const charEndFraction = Math.min(1, Math.max(0, delimiterEnd / cueText.length));
      const partStart =
        lastMatchEnd === 0 ? cueStart : Math.round(cueStart + charStartFraction * cueDuration);
      const partEnd = Math.round(cueStart + charEndFraction * cueDuration);

      // Only push if partText contains actual readable word content (avoids isolated dangling punctuation like ",")
      if (partText && /[^\s\p{P}]/u.test(partText)) {
        cueSegments.push({ start: partStart, end: partEnd, text: partText });
        lastMatchEnd = delimiterEnd;
      }
    }

    let leftover = cueText.slice(lastMatchEnd).trim();
    if (config.shortCompleteSentences) {
      leftover = leftover.replace(/^[,\s;:]+|[,\s;:]+$/g, "").trim();
    }
    if (leftover && /[^\s\p{P}]/u.test(leftover)) {
      const charStartFraction = Math.min(1, Math.max(0, lastMatchEnd / cueText.length));
      const partStart =
        lastMatchEnd === 0 ? cueStart : Math.round(cueStart + charStartFraction * cueDuration);
      cueSegments.push({ start: partStart, end: cueEnd, text: leftover });
    } else if (leftover && cueSegments.length > 0 && !config.shortCompleteSentences) {
      // Append any trailing punctuation to the last segment
      cueSegments[cueSegments.length - 1]!.text += " " + leftover;
    }

    if (cueSegments.length === 0) {
      segments.push({ start: cueStart, end: cueEnd, text: cueText });
    } else {
      cueSegments[cueSegments.length - 1]!.end = cueEnd;
      segments.push(...cueSegments);
    }
  }

  // User-defined max words per sentence filter: discard sentences exceeding word count limit
  if (
    config.enabled &&
    typeof config.maxWordsPerSentence === "number" &&
    config.maxWordsPerSentence > 0
  ) {
    return segments.filter((seg) => countWords(seg.text) <= config.maxWordsPerSentence);
  }

  return segments;
}

/**
 * Extracts overlapping text from a target language track for a given time window [start, end].
 */
function getTextInWindow(cues: Cue[], start: number, end: number): string {
  if (!cues || cues.length === 0) return "";
  const overlapping: string[] = [];

  for (const c of cues) {
    // If cue overlaps with [start, end]
    if (c.start < end && c.end > start) {
      overlapping.push(c.text.trim());
    }
  }

  return overlapping.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * New simple align function that parses tracks into parallel language rows.
 */
export function simpleAlign(
  tracks: Record<string, Json3>,
  baseLanguage: string,
  config: SimpleParserConfig = DEFAULT_SIMPLE_PARSER_CONFIG,
): Row[] {
  if (!tracks || Object.keys(tracks).length === 0) return [];

  // Parse all tracks into clean cues
  const parsedTracks: Record<string, Cue[]> = {};
  for (const [code, j3] of Object.entries(tracks)) {
    if (j3) {
      parsedTracks[code] = parseCues(j3);
    }
  }

  // Find base cues
  let baseCues = parsedTracks[baseLanguage] || [];
  let effectiveBaseLang = baseLanguage;
  if (baseCues.length === 0) {
    const firstKey = Object.keys(parsedTracks).find((k) => (parsedTracks[k]?.length ?? 0) > 0);
    if (firstKey) {
      baseCues = parsedTracks[firstKey]!;
      effectiveBaseLang = firstKey;
    }
  }

  if (baseCues.length === 0) return [];

  // Split base cues into sentences using simple parser
  let segments = splitCuesIntoSentences(baseCues, config);
  if (!segments || segments.length === 0) {
    // Fallback: use raw cues directly so table is never empty when valid subtitles exist
    segments = baseCues.map((c) => ({ start: c.start, end: c.end, text: c.text }));
  }

  // Formulate rows aligned across all tracks
  const rows: Row[] = segments.map((seg) => {
    const texts: Record<string, string> = {
      [effectiveBaseLang]: seg.text,
    };
    if (baseLanguage && baseLanguage !== effectiveBaseLang) {
      texts[baseLanguage] = seg.text;
    }

    for (const [code, cues] of Object.entries(parsedTracks)) {
      if (code === effectiveBaseLang || code === baseLanguage) continue;
      texts[code] = getTextInWindow(cues, seg.start, seg.end);
    }

    return {
      start: seg.start,
      end: seg.end,
      texts,
      criteria: ["simple-sentence"],
    };
  });

  return rows;
}
