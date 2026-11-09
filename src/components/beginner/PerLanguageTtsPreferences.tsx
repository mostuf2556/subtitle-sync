import React from "react";
import { Gauge, Languages, Film, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { getLanguageVoices, getUniqueVoiceKey, SpeechVoiceLike } from "@/utils/speechVoiceUtils";
import {
  getLanguageTtsRatio,
  isLanguageTtsBlacklisted,
  getZeroKnowledgeInLang,
  toggleZeroKnowledgeInLang,
  getPickWordStrategy,
  setPickWordStrategy,
  ZERO_KNOWLEDGE_EVENT,
  PICK_WORD_STRATEGY_EVENT,
  PickWordStrategy,
} from "@/lib/playback-preferences";
import {
  VideoPlaybackPrecedenceBar,
  getVideoBarIndex,
  updatePrecedenceFromVideoBarIndex,
} from "@/components/VideoPlaybackPrecedenceBar";
import type { SectionOrder } from "@/lib/playback-preferences";
import { recordUserInteraction } from "@/utils/appSettings";

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
  blacklist?: string[];
  onToggleBlacklist?: (languageCode: string) => void;
  onPrimaryLangChange?: (languageCode: string) => void;
  onRatioChange: (languageCode: string, ratio: number) => void;
  onRateChange: (languageCode: string, rate: number) => void;
  onOrderChange: (languageCode: string, order: SectionOrder) => void;
  onDefaultOrderChange?: (order: SectionOrder) => void;
  onVoiceChange: (languageCode: string, voiceURI: string) => void;
  onMoveLanguage?: (languageCode: string, direction: -1 | 1) => void;
}

const ratioPresets = [1, 2, 3, 4, 5, 7, 10, 15, 20];

export const PerLanguageTtsPreferences: React.FC<PerLanguageTtsPreferencesProps> = ({
  languages,
  voices,
  ratios,
  rates,
  languageOrders,
  defaultOrder,
  voiceSelections,
  primaryLang,
  blacklist,
  onToggleBlacklist,
  onPrimaryLangChange,
  onRatioChange,
  onRateChange,
  onOrderChange,
  onDefaultOrderChange,
  onVoiceChange,
  onMoveLanguage,
}) => {
  const uniqueLanguages = React.useMemo(() => {
    const seen = new Set<string>();
    return languages.filter((l) => {
      if (!l?.code || seen.has(l.code)) return false;
      seen.add(l.code);
      return true;
    });
  }, [languages]);

  const effectivePrimary = primaryLang || uniqueLanguages[0]?.code || "";
  const primaryLangObj = uniqueLanguages.find((l) => l.code === effectivePrimary);
  const orderedCodes = uniqueLanguages.map((l) => l.code);
  const activeVideoBarIndex = getVideoBarIndex(orderedCodes, languageOrders, defaultOrder);
  const handleSetVideoBarPosition = (newIndex: number) => {
    const { sectionOrder: nextSectionOrder, languageOrders: nextLanguageOrders } =
      updatePrecedenceFromVideoBarIndex(orderedCodes, newIndex);
    onDefaultOrderChange?.(nextSectionOrder);
    for (const [code, ord] of Object.entries(nextLanguageOrders)) {
      onOrderChange(code, ord);
    }
  };

  const [, setZkTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setZkTick((t) => t + 1);
    window.addEventListener(ZERO_KNOWLEDGE_EVENT, handler);
    window.addEventListener(PICK_WORD_STRATEGY_EVENT, handler);
    return () => {
      window.removeEventListener(ZERO_KNOWLEDGE_EVENT, handler);
      window.removeEventListener(PICK_WORD_STRATEGY_EVENT, handler);
    };
  }, []);

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
        {uniqueLanguages.length > 1 && onPrimaryLangChange && (
          <button
            type="button"
            data-testid="tts-switch-roles-button"
            onClick={() => {
              const other = uniqueLanguages.find((l) => l.code !== effectivePrimary);
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

      {uniqueLanguages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Add a favorite language below to configure its TTS settings.
        </p>
      ) : (
        <div className="space-y-2">
          {activeVideoBarIndex === 0 && (
            <VideoPlaybackPrecedenceBar
              currentPosition={0}
              totalRecords={uniqueLanguages.length}
              onMoveUp={() => handleSetVideoBarPosition(0)}
              onMoveDown={() => handleSetVideoBarPosition(1)}
              onPlaceAtTop={() => handleSetVideoBarPosition(0)}
              onPlaceAtBottom={() => handleSetVideoBarPosition(uniqueLanguages.length)}
            />
          )}
          {uniqueLanguages.map((language, index) => {
            const languageVoices = getLanguageVoices(voices, language.tts, true);
            const ratio = getLanguageTtsRatio(ratios, language.code);
            const rate = rates[language.code] ?? 0.5;
            const isPrimary = language.code === effectivePrimary;
            const isBlacklisted = isLanguageTtsBlacklisted(language.code, blacklist);
            const isZeroKnowledge = getZeroKnowledgeInLang(language.code);
            const wordStrategy = getPickWordStrategy(language.code);
            return (
              <React.Fragment key={language.code}>
                <div
                  className={`grid grid-cols-1 gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(8rem,1fr)_auto_minmax(8rem,1fr)_minmax(10rem,1.5fr)_minmax(9rem,1fr)_auto] sm:items-center ${
                    isBlacklisted
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border/60 bg-muted/20"
                  }`}
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
                          Sec (
                          {primaryLangObj?.name ? `rel. ${primaryLangObj.name}` : "rel. primary"})
                        </span>
                      </div>
                    )}
                    {onToggleBlacklist && (
                      <button
                        type="button"
                        data-testid={`tts-blacklist-toggle-${language.code}`}
                        onClick={() => onToggleBlacklist(language.code)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors shrink-0 ml-1 cursor-pointer ${
                          isBlacklisted
                            ? "bg-destructive/15 border-destructive text-destructive hover:bg-destructive/25"
                            : "bg-muted/70 border-border text-muted-foreground hover:text-foreground"
                        }`}
                        title={
                          isBlacklisted
                            ? `${language.name} is blacklisted from sentence TTS (word TTS remains allowed). Click to whitelist.`
                            : `Click to blacklist ${language.name} from sentence TTS (allows word TTS)`
                        }
                      >
                        {isBlacklisted ? (
                          <>
                            <VolumeX className="h-3 w-3" />
                            <span>Blacklisted (Skip sentence, allow word)</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" />
                            <span>Whitelist</span>
                          </>
                        )}
                      </button>
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
                          Math.max(1, Math.min(20, Number(event.target.value))),
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
                      onChange={(event) => {
                        recordUserInteraction(Date.now());
                        onRateChange(language.code, Number(event.target.value));
                      }}
                      className="rounded border border-input bg-background px-1.5 py-1 text-xs font-mono"
                    >
                      {[0.5, 0.6, 0.75, 0.8, 0.9, 1.0, 1.25, 1.5, 2.0].map((rateVal) => (
                        <option key={rateVal} value={rateVal.toFixed(2)}>
                          {rateVal}×
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      data-testid={`beginner-zero-knowledge-toggle-${language.code}`}
                      onClick={() => {
                        toggleZeroKnowledgeInLang(language.code);
                        setZkTick((t) => t + 1);
                      }}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                        isZeroKnowledge
                          ? "border-amber-500/60 bg-amber-500/20 text-amber-300 font-semibold"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                      title={
                        isZeroKnowledge
                          ? `${language.name}: Zero knowledge enabled (pronounces picked word + translation)`
                          : `Enable Zero Knowledge word learning for ${language.name}`
                      }
                    >
                      <span>{isZeroKnowledge ? "0-Knowledge: Words" : "Sentences"}</span>
                    </button>
                    {isZeroKnowledge && (
                      <div className="flex items-center gap-1">
                        <select
                          data-testid={`beginner-pick-word-strategy-${language.code}`}
                          value={wordStrategy}
                          onChange={(e) => {
                            setPickWordStrategy(e.target.value as PickWordStrategy, language.code);
                            setZkTick((t) => t + 1);
                          }}
                          className="rounded border border-input bg-background px-1.5 py-0.5 text-[10px]"
                          aria-label={`Pick word strategy for ${language.name}`}
                        >
                          <option value="longest">Longest word</option>
                          <option value="random">Random word</option>
                        </select>
                      </div>
                    )}
                    {onMoveLanguage && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMoveLanguage(language.code, -1)}
                          title={`Move ${language.name} earlier in TTS playback order`}
                          aria-label={`Move ${language.name} earlier in TTS playback order`}
                          data-testid={`beginner-btn-move-lang-up-${language.code}`}
                          className="p-1 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === languages.length - 1}
                          onClick={() => onMoveLanguage(language.code, 1)}
                          title={`Move ${language.name} later in TTS playback order`}
                          aria-label={`Move ${language.name} later in TTS playback order`}
                          data-testid={`beginner-btn-move-lang-down-${language.code}`}
                          className="p-1 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      data-testid={`btn-place-video-before-${language.code}`}
                      onClick={() => handleSetVideoBarPosition(index)}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                        activeVideoBarIndex === index
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                      title={`Place video playing precedence before ${language.name}`}
                    >
                      <Film className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Place Video Here</span>
                    </button>
                  </div>
                </div>
                {activeVideoBarIndex === index + 1 && (
                  <VideoPlaybackPrecedenceBar
                    currentPosition={index + 1}
                    totalRecords={languages.length}
                    onMoveUp={() => handleSetVideoBarPosition(index)}
                    onMoveDown={() =>
                      handleSetVideoBarPosition(Math.min(languages.length, index + 2))
                    }
                    onPlaceAtTop={() => handleSetVideoBarPosition(0)}
                    onPlaceAtBottom={() => handleSetVideoBarPosition(languages.length)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
};
