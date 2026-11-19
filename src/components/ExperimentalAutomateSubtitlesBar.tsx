import React from "react";
import { FlaskConical, Languages } from "lucide-react";

export interface ExperimentalSubtitleLanguageOption {
  code: string;
  label: string;
}

export const EXPERIMENTAL_AUTOMATE_SUBTITLE_LANGUAGES: readonly ExperimentalSubtitleLanguageOption[] = [
  { code: "ru", label: "Russian" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "he", label: "Hebrew" },
  { code: "en", label: "English" },
] as const;

export interface ExperimentalAutomateSubtitlesBarProps {
  activeLanguage?: string;
  availableLanguages?: string[];
  onSwitchSubtitleLanguage: (langCode: string) => void;
}

/**
 * Isolated [Experimental] control placed around the video player to switch
 * subtitles among Russian, Spanish, Arabic, Hebrew, and English.
 * Kept standalone so it never conflicts with existing components and can be
 * cleanly removed on an undo/cancel request.
 */
export const ExperimentalAutomateSubtitlesBar: React.FC<ExperimentalAutomateSubtitlesBarProps> = ({
  activeLanguage,
  availableLanguages = [],
  onSwitchSubtitleLanguage,
}) => {
  return (
    <div
      data-testid="automate_clicking_on_subtitles"
      data-control-category="experimental"
      data-experimental="true"
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/5 px-2.5 py-1.5 text-xs"
    >
      <span className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
        <FlaskConical className="h-3 w-3" />
        [Experimental]
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Languages className="h-3.5 w-3.5" />
        Switch subtitles:
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {EXPERIMENTAL_AUTOMATE_SUBTITLE_LANGUAGES.map((lang) => {
          const isActive = activeLanguage === lang.code;
          const isLoaded = availableLanguages.includes(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              data-testid={`automate_subtitles_lang_${lang.code}`}
              aria-pressed={isActive}
              onClick={() => onSwitchSubtitleLanguage(lang.code)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? "bg-sky-500 text-white shadow-sm"
                  : isLoaded
                    ? "bg-secondary/80 text-foreground hover:bg-sky-500/20"
                    : "bg-background/60 text-muted-foreground hover:bg-sky-500/15 hover:text-foreground"
              }`}
              title={`Switch subtitles to ${lang.label} (${lang.code})`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
