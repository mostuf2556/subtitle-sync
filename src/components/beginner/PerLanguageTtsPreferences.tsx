import React from "react";
import { Gauge, Languages } from "lucide-react";
import { getLanguageVoices, getUniqueVoiceKey, SpeechVoiceLike } from "@/utils/speechVoiceUtils";
import { getLanguageTtsRatio } from "@/lib/playback-preferences";
import { LanguageTtsOrderSelect } from "@/components/LanguageTtsOrderSelect";
import type { SectionOrder } from "@/lib/playback-preferences";

export interface TtsPreferenceLanguage {
  code: string;
  name: string;
  tts: string;
}

interface PerLanguageTtsPreferencesProps {
  languages: TtsPreferenceLanguage[];
  voices: SpeechVoiceLike[];
  ratios: Record<string, number>;
  rates: Record<string, number>;
  languageOrders: Record<string, SectionOrder>;
  defaultOrder: SectionOrder;
  voiceSelections: Record<string, string>;
  primaryLang?: string;
  onPrimaryLangChange?: (languageCode: string) => void;
  onRatioChange: (languageCode: string, ratio: number) => void;
  onRateChange: (languageCode: string, rate: number) => void;
  onOrderChange: (languageCode: string, order: SectionOrder) => void;
  onDefaultOrderChange?: (order: SectionOrder) => void;
  onVoiceChange: (languageCode: string, voiceURI: string) => void;
}

const ratioPresets = [1, 2, 3, 4, 5, 7, 10];

export const PerLanguageTtsPreferences: React.FC<PerLanguageTtsPreferencesProps> = ({
  languages,
  voices,
  ratios,
  rates,
  languageOrders,
  defaultOrder,
  voiceSelections,
  primaryLang,
  onPrimaryLangChange,
  onRatioChange,
  onRateChange,
  onOrderChange,
  onDefaultOrderChange,
  onVoiceChange,
}) => {
  const effectivePrimary = primaryLang || languages[0]?.code || "";
  const primaryLangObj = languages.find((l) => l.code === effectivePrimary);

  return (
    <section
      className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3"
      data-testid="beginner-per-language-tts-settings"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Per-language TTS settings</h3>
        </div>
        {languages.length > 1 && onPrimaryLangChange && (
          <button
            type="button"
            data-testid="tts-switch-roles-button"
            onClick={() => {
              const other = languages.find((l) => l.code !== effectivePrimary);
              if (other) onPrimaryLangChange(other.code);
            }}
            className="inline-flex items-center gap-1 rounded border border-border bg-background hover:bg-muted px-2 py-0.5 text-[11px] font-medium text-primary transition-colors"
            title="Switch primary and secondary roles"
          >
            ⇄ Switch Primary/Secondary
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Choose narration frequency, speed, and device voice. Secondary languages are activated
        relative to the primary language.
      </p>
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-muted/20">
        <div className="space-y-0.5">
          <label
            htmlFor="beginner-section-order-select"
            className="text-xs font-medium text-foreground cursor-pointer"
          >
            Video &amp; TTS Playback Sequence
          </label>
          <div className="text-[10px] text-muted-foreground">
            Should video play before, after, or in between TTS groups?
          </div>
        </div>
        <select
          id="beginner-section-order-select"
          data-testid="beginner-section-order-select"
          value={defaultOrder}
          onChange={(e) => onDefaultOrderChange?.(e.target.value as SectionOrder)}
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground cursor-pointer font-medium"
        >
          <option value="video-first">Video before TTS</option>
          <option value="tts-first">Video after TTS</option>
          <option value="video-middle">Video in between TTS groups</option>
        </select>
      </div>
      {languages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Add a favorite language below to configure its TTS settings.
        </p>
      ) : (
        <div className="space-y-2">
          {languages.map((language) => {
            const languageVoices = getLanguageVoices(voices, language.tts, true);
            const ratio = getLanguageTtsRatio(ratios, language.code);
            const rate = rates[language.code] ?? 0.5;
            const isPrimary = language.code === effectivePrimary;
            return (
              <div
                key={language.code}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 sm:grid-cols-[minmax(8rem,1fr)_auto_minmax(8rem,1fr)_minmax(10rem,1.5fr)_minmax(9rem,1fr)] sm:items-center"
                data-testid={`beginner-tts-language-${language.code}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {isPrimary ? (
                    <span className="truncate text-xs font-semibold text-primary flex items-center gap-1">
                      <span data-testid={`tts-switch-primary-${language.code}`}>
                        {language.name}
                      </span>
                      <span
                        data-testid={`tts-role-badge-${language.code}`}
                        className="rounded bg-primary/20 text-primary border border-primary/40 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider"
                      >
                        Primary
                      </span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 truncate">
                      {onPrimaryLangChange ? (
                        <button
                          type="button"
                          data-testid={`tts-switch-primary-${language.code}`}
                          onClick={() => onPrimaryLangChange(language.code)}
                          className="truncate text-xs font-semibold text-foreground hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                          title={`Set ${language.name} as Primary`}
                        >
                          {language.name}
                        </button>
                      ) : (
                        <span className="truncate text-xs font-semibold text-foreground">
                          {language.name}
                        </span>
                      )}
                      <span
                        data-testid={`tts-role-badge-${language.code}`}
                        className="rounded bg-muted text-muted-foreground border border-border px-1 py-0.2 text-[9px] font-medium"
                        title={`Relative to ${primaryLangObj?.name || "Primary"}`}
                      >
                        Sec ({primaryLangObj?.name ? `rel. ${primaryLangObj.name}` : "rel. primary"})
                      </span>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs">
                  <span
                    className="text-muted-foreground truncate"
                    title={
                      isPrimary
                        ? "Speaks 1 in N sentences"
                        : `Speaks 1 in N sentences relative to ${primaryLangObj?.name || "primary"} activations`
                    }
                  >
                    Ratio
                  </span>
                  <select
                    aria-label={`${language.name} TTS sentence ratio`}
                    data-testid={`beginner-tts-ratio-${language.code}`}
                    value={ratio}
                    onChange={(event) =>
                      onRatioChange(
                        language.code,
                        Math.max(1, Math.min(10, Number(event.target.value))),
                      )
                    }
                    className="rounded border border-input bg-background px-1.5 py-1 text-xs"
                  >
                    {ratioPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {isPrimary
                          ? `1:${preset} (Every ${preset === 1 ? "sentence" : `${preset} sentences`})`
                          : `1:${preset} (Every ${preset}× of ${primaryLangObj?.name || "Primary"})`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="shrink-0 text-muted-foreground">Speed</span>
                  <select
                    aria-label={`${language.name} speech rate`}
                    data-testid={`beginner-tts-speed-${language.code}`}
                    value={rate.toFixed(1)}
                    onChange={(event) => onRateChange(language.code, Number(event.target.value))}
                    className="rounded border border-input bg-background px-1.5 py-1 text-xs font-mono"
                  >
                    {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((rateVal) => (
                      <option key={rateVal} value={rateVal.toFixed(1)}>
                        {rateVal.toFixed(1)}×
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 items-center gap-1.5 text-xs">
                  <span className="shrink-0 text-muted-foreground">Voice</span>
                  <select
                    aria-label={`${language.name} voice`}
                    data-testid={`beginner-tts-voice-${language.code}`}
                    value={voiceSelections[language.code] ?? ""}
                    onChange={(event) => onVoiceChange(language.code, event.target.value)}
                    disabled={languageVoices.length === 0}
                    title={
                      languageVoices.length === 0
                        ? "No selectable voices on this device; the device default voice is used"
                        : "Choose a voice for this language"
                    }
                    className="min-w-0 flex-1 truncate rounded border border-input bg-background px-1.5 py-1 text-xs disabled:opacity-60"
                  >
                    <option value="">
                      {languageVoices.length === 0 ? "Device voice" : "Default voice"}
                    </option>
                    {languageVoices.map((voice, index) => (
                      <option
                        key={getUniqueVoiceKey(voice, index)}
                        value={voice.voiceURI || voice.name}
                      >
                        {voice.name} {voice.lang ? `(${voice.lang})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <LanguageTtsOrderSelect
                  languageCode={language.code}
                  languageName={language.name}
                  order={languageOrders[language.code] ?? defaultOrder}
                  onChange={onOrderChange}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
