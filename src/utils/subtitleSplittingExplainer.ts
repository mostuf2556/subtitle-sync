import type { SimpleParserConfig } from "@/utils/newSubtitlesParser";
import type { SubtitleColumn } from "@/components/SubtitleRow";
import type { CriteriaMatchAction } from "@/lib/playback-preferences";

export type ExplainedColumnKey = "index" | "time" | `lang:${string}`;

export interface ColumnSplittingFactor {
  label: string;
  value: string;
  detail: string;
}

export interface ColumnSplittingExplanation {
  columnKey: ExplainedColumnKey;
  title: string;
  summary: string;
  factors: ColumnSplittingFactor[];
}

export interface BuildColumnSplittingExplanationParams {
  columnKey: ExplainedColumnKey;
  cols: SubtitleColumn[];
  baseLanguage?: string;
  parserConfig: SimpleParserConfig;
  criteriaMatchAction: CriteriaMatchAction;
  languageMaxWords?: Record<string, number>;
  languageSkipIncomplete?: Record<string, boolean>;
  totalRows: number;
  visibleRows: number;
}

export function buildColumnSplittingExplanation({
  columnKey,
  cols,
  baseLanguage,
  parserConfig,
  criteriaMatchAction,
  languageMaxWords,
  languageSkipIncomplete,
  totalRows,
  visibleRows,
}: BuildColumnSplittingExplanationParams): ColumnSplittingExplanation {
  const defaultLang = baseLanguage || cols[0]?.code || "default";
  const defaultCol = cols.find((c) => c.code === defaultLang) || cols[0];
  const defaultLangLabel = defaultCol?.name || defaultLang.toUpperCase();
  const maxWords = parserConfig?.maxWordsPerSentence;
  const skipIncomplete = Boolean(parserConfig?.skipIncompleteSentences);

  if (columnKey === "index") {
    return {
      columnKey,
      title: "Row Index (#) — Splitting & Visibility",
      summary: `Each row number represents one split subtitle segment driven by the default language (${defaultLangLabel}).`,
      factors: [
        {
          label: "Primary split driver",
          value: defaultLangLabel,
          detail: "Sentence boundaries are detected on the default language track first.",
        },
        {
          label: "Row criteria mode",
          value: criteriaMatchAction === "filter" ? "Filter out non-matching" : "Highlight matching",
          detail: `Showing ${visibleRows} of ${totalRows} split rows based on active row criteria.`,
        },
        {
          label: "Max words per sentence",
          value: maxWords && maxWords > 0 ? `<= ${maxWords} words` : "No limit",
          detail: "Limits which split sentences are included or highlighted.",
        },
        {
          label: "Complete sentences only",
          value: skipIncomplete ? "Enabled" : "Disabled",
          detail: "Requires terminal punctuation (., !, ?) to match criteria.",
        },
      ],
    };
  }

  if (columnKey === "time") {
    return {
      columnKey,
      title: "Time Column — Timestamp Splitting",
      summary: `Row timestamps are derived from ${defaultLangLabel} cue timings and linearly interpolated whenever a cue is split on punctuation.`,
      factors: [
        {
          label: "Timing source",
          value: defaultLangLabel,
          detail: "Start and end timestamps come from the active default language track.",
        },
        {
          label: "Punctuation splitting",
          value: "Terminal punctuation (. ! ?)",
          detail: "Long YouTube cues containing multiple sentences are split with proportional time interpolation.",
        },
        {
          label: "Sanitization before split",
          value: "Special characters removal (Stage 3)",
          detail: "Speaker tags, sound cues ([Music]), and arrows are stripped before sentence boundaries are computed.",
        },
      ],
    };
  }

  const langCode = columnKey.replace(/^lang:/, "");
  const col = cols.find((c) => c.code === langCode);
  const colName = col?.name || langCode.toUpperCase();
  const isDefault = langCode === defaultLang;
  const langMaxWords = languageMaxWords?.[langCode];
  const langSkipIncomplete = languageSkipIncomplete?.[langCode];

  const sourceLabel = col?.isOnDemandTranslation
    ? "On-demand translation"
    : col?.isYouTubeTranslated
      ? "YouTube translated track (tlang)"
      : col?.isYouTubeOrJson
        ? "YouTube / JSON3 track"
        : "Subtitle track";

  const factors: ColumnSplittingFactor[] = [
    {
      label: "Role in splitting",
      value: isDefault ? "Primary timing & split source (Default)" : `Aligned to ${defaultLangLabel}`,
      detail: isDefault
        ? "This column defines the sentence boundaries and timestamps for all other columns."
        : `Rows in this column are synchronized to the time windows split from ${defaultLangLabel}.`,
    },
    {
      label: "Track source",
      value: sourceLabel,
      detail: col?.isOnDemandTranslation
        ? "Translated directly from each split default-language sentence."
        : "Aligned by cue timestamps after Stage 3 sanitization.",
    },
    {
      label: "Max words rule",
      value:
        typeof langMaxWords === "number" && langMaxWords > 0
          ? `<= ${langMaxWords} words (language override)`
          : maxWords && maxWords > 0
            ? `<= ${maxWords} words (global)`
            : "No limit",
      detail: "Controls whether rows pass the active word-count criteria.",
    },
    {
      label: "Complete sentences filter",
      value:
        typeof langSkipIncomplete === "boolean"
          ? `${langSkipIncomplete ? "Enabled" : "Disabled"} (language override)`
          : skipIncomplete
            ? "Enabled (global)"
            : "Disabled",
      detail: "Filters or highlights rows ending with sentence punctuation.",
    },
  ];

  return {
    columnKey,
    title: `${colName} — What Affects Current Splitting`,
    summary: isDefault
      ? `${colName} is the active default language, so its punctuation and cue timings control how every row in the table is split.`
      : `${colName} is aligned to the split boundaries of ${defaultLangLabel} (${sourceLabel}).`,
    factors,
  };
}
