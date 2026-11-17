import React, { memo } from "react";
import { Volume2 } from "lucide-react";
import { type Row, type Json3, fmt, RTL, subtitleTextForColumn } from "@/lib/subtitles";
import {
  getLanguageTtsRatio,
  isSubtitleInstanceEligibleForTTS,
  shouldHighlightSentenceForTTS,
  isLanguageEligibleForTtsWithRole,
  shouldHighlightSentenceForTtsWithRole,
} from "@/lib/playback-preferences";
import { HighlightedSubtitle, type SpeechProgress } from "@/components/HighlightedSubtitle";
import { getLanguageColorPalette } from "@/utils/languageColors";

export interface SubtitleColumn {
  code: string;
  name: string;
  tts: string;
  isYouTubeTranslated?: boolean;
  isYouTubeOrJson?: boolean;
  isOnDemandTranslation?: boolean;
}

export interface SubtitleRowProps {
  r: Row;
  actualIndex: number;
  isActive: boolean;
  cols: SubtitleColumn[];
  baseLanguage?: string;
  speechProgress: SpeechProgress;
  tracks: Record<string, Json3> | null;
  onSeek: (r: Row, index: number) => void;
  spokenLangs?: string[];
  ttsRatios?: Record<string, number>;
  primaryTtsLang?: string;
  blacklist?: string[];
  onSpeakCue?: (text: string, lang: string) => void;
  freezeColumns?: boolean;
  isCriteriaMatched?: boolean;
  isCriteriaHighlightMode?: boolean;
}

export const SubtitleRow = memo(function SubtitleRow({
  r,
  actualIndex,
  isActive,
  cols,
  baseLanguage,
  speechProgress,
  tracks,
  onSeek,
  spokenLangs,
  ttsRatios,
  primaryTtsLang,
  blacklist,
  onSpeakCue,
  freezeColumns = true,
  isCriteriaMatched = false,
  isCriteriaHighlightMode = false,
}: SubtitleRowProps) {
  const isHighlighted = Boolean(isCriteriaHighlightMode && isCriteriaMatched);

  return (
    <tr
      key={actualIndex}
      id={`subtitle-cue-row-${actualIndex}`}
      data-testid={`subtitle-cue-row-${actualIndex}`}
      data-row={actualIndex}
      data-active={isActive ? "true" : undefined}
      data-criteria-highlighted={isHighlighted ? "true" : undefined}
      onClick={() => onSeek(r, actualIndex)}
      className={`cursor-pointer border-t border-border/70 align-top transition-colors duration-150 ${
        isActive
          ? "bg-primary/[0.08] dark:bg-primary/[0.14]"
          : isHighlighted
            ? "bg-amber-500/[0.09] dark:bg-amber-500/[0.16] border-l-4 border-l-amber-500 hover:bg-amber-500/[0.13]"
            : "hover:bg-muted/40"
      }`}
    >
      <td
        data-testid="cue-row-index"
        className={`whitespace-nowrap px-2.5 py-2.5 text-center tabular-nums text-xs font-mono text-muted-foreground w-14 min-w-[3.5rem] max-w-[3.5rem] transition-colors ${
          freezeColumns
            ? `sticky left-0 z-10 ${
                isActive
                  ? "bg-accent/95 backdrop-blur-xs font-semibold text-foreground"
                  : isHighlighted
                    ? "bg-amber-500/10 font-medium text-amber-800 dark:text-amber-200"
                    : "bg-card/95"
              } shadow-[1px_0_0_0_rgba(0,0,0,0.06)]`
            : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span>{actualIndex + 1}</span>
          {isHighlighted && (
            <span
              data-testid="row-criteria-highlighted"
              className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1 py-0.2 text-[9px] font-semibold border border-amber-500/30"
              title="Matches Row Criteria"
            >
              Matched
            </span>
          )}
        </div>
      </td>
      <td
        data-testid="cue-row-timestamp"
        className={`whitespace-nowrap px-3 py-2.5 tabular-nums text-xs font-mono text-muted-foreground w-28 min-w-[7rem] max-w-[7rem] transition-colors ${
          freezeColumns
            ? `sticky left-14 z-10 ${isActive ? "bg-accent/95 backdrop-blur-xs font-semibold text-foreground" : "bg-card/95"} shadow-[1px_0_0_0_rgba(0,0,0,0.06)]`
            : ""
        }`}
      >
        {fmt(r.start)}–{fmt(r.end)}
      </td>
      {cols.map((l, colIdx) => {
        const isFirstCol = colIdx === 0;
        const columnText = subtitleTextForColumn(r, l.code);
        const isSpoken = Boolean(spokenLangs?.includes(l.code));
        const ratio = getLanguageTtsRatio(ttsRatios, l.code);
        const primaryRatio = primaryTtsLang ? getLanguageTtsRatio(ttsRatios, primaryTtsLang) : 1;
        const isEligible = isLanguageEligibleForTtsWithRole({
          rowIdx: actualIndex,
          langCode: l.code,
          ratio,
          primaryLang: primaryTtsLang,
          primaryRatio,
          blacklist,
        });
        const isPronouncedHighlight = shouldHighlightSentenceForTtsWithRole({
          rowIdx: actualIndex,
          langCode: l.code,
          ratio,
          primaryLang: primaryTtsLang,
          primaryRatio,
          isSpoken,
          blacklist,
        });
        const isPrimary = primaryTtsLang ? l.code === primaryTtsLang : false;
        const palette = getLanguageColorPalette(l.code);
        return (
          <td
            key={`${l.code}-${colIdx}`}
            dir={RTL.has(l.code) ? "rtl" : "ltr"}
            data-language-column={l.code}
            data-lang-cell={l.code}
            data-testid={`subtitle-cell-${actualIndex}-${l.code}`}
            data-tts-pronounced={isPronouncedHighlight ? "true" : undefined}
            data-tts-eligible={isEligible ? "true" : "false"}
            data-tts-role={isPrimary ? "primary" : primaryTtsLang ? "secondary" : undefined}
            className={`px-3.5 py-2.5 text-sm leading-relaxed transition-colors min-w-[12rem] border-r border-border/40 ${
              freezeColumns && isFirstCol
                ? `sticky left-42 z-10 ${isActive ? "bg-accent/95 backdrop-blur-xs font-medium text-foreground" : "bg-card/95"} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]`
                : ""
            } ${isActive ? palette.cellActiveBg : palette.cellBg} ${
              isPronouncedHighlight ? "ring-1 ring-inset ring-primary/40 font-medium" : ""
            }`}
          >
            {tracks && !tracks[l.code] && !columnText ? (
              <span
                data-testid={`sentence-pending-indicator-${actualIndex}-${l.code}`}
                className="text-[11px] text-muted-foreground/50 italic select-none"
              >
                Translating...
              </span>
            ) : (
              <div
                data-testid={`sentence-container-${actualIndex}-${l.code}`}
                data-tts-pronounced-highlight={isPronouncedHighlight ? "true" : "false"}
                className={`flex items-start justify-between gap-1.5 p-1 rounded transition-colors ${
                  isPronouncedHighlight
                    ? "bg-primary/15 text-foreground font-medium ring-1 ring-primary/25 shadow-xs dark:bg-primary/20 dark:ring-primary/40"
                    : ""
                }`}
              >
                <div className="flex-1" data-testid="sentence-text-wrapper">
                  <HighlightedSubtitle
                    text={columnText}
                    progress={
                      speechProgress?.row === actualIndex && speechProgress.lang === l.code
                        ? speechProgress
                        : null
                    }
                    isPronouncedHighlighted={isPronouncedHighlight}
                  />
                </div>
                <div
                  className="flex items-center gap-1 shrink-0 pt-0.5"
                  data-testid="sentence-actions-wrapper"
                >
                  {onSpeakCue && columnText && l.code !== baseLanguage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSpeakCue(columnText, l.code);
                      }}
                      className="opacity-45 hover:opacity-100 p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer"
                      data-testid={`btn-speak-cell-${actualIndex}-${l.code}`}
                      title={`Listen to pronunciation (${l.name})`}
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                  )}
                  {isSpoken && ratio > 1 && (
                    <span
                      data-testid={`row-${actualIndex}-tts-status-${l.code}`}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono select-none transition-colors ${
                        isEligible
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "opacity-35 text-muted-foreground line-through"
                      }`}
                      title={
                        isEligible
                          ? `TTS will play this sentence (1:${ratio} ratio)`
                          : `TTS skipped for this sentence (1:${ratio} ratio)`
                      }
                    >
                      TTS
                    </span>
                  )}
                </div>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
});
