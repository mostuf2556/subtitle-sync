import React, { useState, useEffect } from "react";
import {
  Sliders,
  Volume2,
  VolumeX,
  Gauge,
  Languages,
  Plus,
  X,
  Check,
  ArrowRight,
  Play,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  Film,
  Mic,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  deduplicateVoices,
  getLanguageVoices,
  getCachedVoices,
  SpeechVoiceLike,
} from "@/utils/speechVoiceUtils";
import {
  ALL_KNOWN_LANGUAGES,
  getOpenRouterApiKeySetting,
  setOpenRouterApiKeySetting,
} from "@/utils/appSettings";
import {
  playAlternativeTtsAudio,
  getUseAlternativeTts,
  setUseAlternativeTts,
  getAlternativeTtsMode,
  setAlternativeTtsMode,
  getAlternativeTtsEngine,
  setAlternativeTtsEngine,
  getLovableTtsProvider,
  setLovableTtsProvider,
  getLovableTtsVoice,
  setLovableTtsVoice,
  getLovableTtsSpeed,
  setLovableTtsSpeed,
  getLovableTtsApiKey,
  setLovableTtsApiKey,
  getServerOpenRouterApiKey,
  hasCustomOpenRouterApiKey,
  LOVABLE_TTS_OPENAPI_URL,
  LOVABLE_VOICES,
  OPENROUTER_VOICES,
  type AlternativeTtsMode,
  type AlternativeTtsEngine,
  type LovableTtsProvider,
} from "@/lib/alternative-tts";

import { GlobalFavoriteLanguagesPanel } from "@/components/GlobalFavoriteLanguagesPanel";

export interface BeginnerPreferencesTabProps {
  ttsSpeed: number;
  onTtsSpeedChange: (speed: number) => void;
  ttsVoice: string;
  onTtsVoiceChange: (voiceURI: string) => void;
  favoriteLanguages: string[];
  onFavoriteLanguagesChange: (langs: string[]) => void;
  showVideoSubtitles: boolean;
  onToggleVideoSubtitles: () => void;
  baseLanguage?: string;
  perLanguageTtsSettingsSlot?: React.ReactNode;
  onContinueToNextTab?: () => void;
  catalog?: Array<{ code: string; name: string }>;
  targetLanguages?: string[];
  videoId?: string;
  onApplyFavoritesToVideo?: () => void;
  onSaveCurrentSelectionAsFavorites?: () => void;
}

export const BeginnerPreferencesTab: React.FC<BeginnerPreferencesTabProps> = ({
  ttsSpeed,
  onTtsSpeedChange,
  ttsVoice,
  onTtsVoiceChange,
  favoriteLanguages,
  onFavoriteLanguagesChange,
  showVideoSubtitles,
  onToggleVideoSubtitles,
  baseLanguage = "en",
  perLanguageTtsSettingsSlot,
  onContinueToNextTab,
  catalog,
  targetLanguages,
  videoId,
  onApplyFavoritesToVideo,
  onSaveCurrentSelectionAsFavorites,
}) => {
  const [voices, setVoices] = useState<SpeechVoiceLike[]>(() => getCachedVoices());
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [useAlternativeTtsState, setUseAlternativeTtsState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getUseAlternativeTts() : false,
  );
  const [alternativeTtsModeState, setAlternativeTtsModeState] = useState<AlternativeTtsMode>(() =>
    typeof window !== "undefined" ? getAlternativeTtsMode() : "fallback_only",
  );
  const [alternativeTtsEngineState, setAlternativeTtsEngineState] = useState<AlternativeTtsEngine>(() =>
    typeof window !== "undefined" ? getAlternativeTtsEngine() : "lovable",
  );
  const [lovableTtsProviderState, setLovableTtsProviderState] = useState<LovableTtsProvider>(() =>
    typeof window !== "undefined" ? getLovableTtsProvider() : "google",
  );
  const [lovableTtsVoiceState, setLovableTtsVoiceState] = useState<string>(() =>
    typeof window !== "undefined" ? getLovableTtsVoice() : "Kore",
  );
  const [lovableTtsSpeedState, setLovableTtsSpeedState] = useState<number>(() =>
    typeof window !== "undefined" ? getLovableTtsSpeed() : 1.0,
  );
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("yt_openrouter_api_key") ||
        localStorage.getItem("yt_openrouter_api_key_v1") ||
        localStorage.getItem("yt_alternative_tts_lovable_api_key_v1") ||
        ""
      : "",
  );
  const [showOpenRouterKey, setShowOpenRouterKey] = useState<boolean>(false);
  const [openRouterKeySaved, setOpenRouterKeySaved] = useState<boolean>(false);
  const [isTestingAlternativeTts, setIsTestingAlternativeTts] = useState<boolean>(false);
  const [showOrderHelp, setShowOrderHelp] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(deduplicateVoices(v));
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const filteredVoices = voices.length > 0 ? getLanguageVoices(voices, baseLanguage, true) : [];

  const handleTestVoice = () => {
    if (typeof window === "undefined") return;
    const text =
      baseLanguage === "he"
        ? "שלום, זו בדיקת קול עבור כתוביות"
        : "Hello, this is a subtitle voice preview.";

    const useAltTts = getUseAlternativeTts();
    const altMode = getAlternativeTtsMode();

    if (useAltTts && altMode === "always") {
      setIsAuditioning(true);
      playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
        provider: lovableTtsProviderState,
        voice:
          lovableTtsProviderState === "google"
            ? undefined
            : lovableTtsVoiceState || (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore"),
        speed: ttsSpeed,
      })
        .catch(() => {})
        .finally(() => setIsAuditioning(false));
      return;
    }

    if (typeof window !== "undefined" && window.AndroidNativeShell?.speak) {
      setIsAuditioning(true);
      const utteranceId = `test-voice-${Date.now()}`;
      const prevDone = window.onNativeTTSDone;
      window.onNativeTTSDone = (uid: string) => {
        if (uid === utteranceId) {
          window.onNativeTTSDone = prevDone;
          setIsAuditioning(false);
        } else if (prevDone) prevDone(uid);
      };
      const prevErr = window.onNativeTTSError;
      window.onNativeTTSError = (uid: string, err?: string) => {
        if (uid === utteranceId) {
          window.onNativeTTSError = prevErr;
          playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
            provider: lovableTtsProviderState || "google",
            voice: lovableTtsVoiceState,
            speed: ttsSpeed,
          }).finally(() => setIsAuditioning(false));
        } else if (prevErr) prevErr(uid, err);
      };
      const ok = window.AndroidNativeShell.speak(text, baseLanguage, ttsSpeed, utteranceId);
      if (ok) return;
    }

    if (!("speechSynthesis" in window)) {
      setIsAuditioning(true);
      playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
        provider: lovableTtsProviderState || "google",
        voice:
          lovableTtsProviderState === "google"
            ? undefined
            : lovableTtsVoiceState || (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore"),
        speed: ttsSpeed,
      })
        .catch(() => {})
        .finally(() => setIsAuditioning(false));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = ttsSpeed;
      if (ttsVoice) {
        const found = voices.find((v) => v.voiceURI === ttsVoice);
        if (found) {
          const sysVoices = window.speechSynthesis.getVoices();
          const target = sysVoices.find((v) => v.voiceURI === found.voiceURI);
          if (target) utterance.voice = target;
        }
      }
      utterance.onend = () => setIsAuditioning(false);
      utterance.onerror = () => {
        if (useAltTts) {
          playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
            provider: lovableTtsProviderState,
            voice:
              lovableTtsProviderState === "google"
                ? undefined
                : lovableTtsVoiceState ||
                  (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore"),
            speed: ttsSpeed,
          })
            .catch(() => {})
            .finally(() => setIsAuditioning(false));
        } else {
          setIsAuditioning(false);
        }
      };
      setIsAuditioning(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      if (useAltTts) {
        playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
          provider: lovableTtsProviderState,
          voice:
            lovableTtsProviderState === "google"
              ? undefined
              : lovableTtsVoiceState ||
                (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore"),
          speed: ttsSpeed,
        })
          .catch(() => {})
          .finally(() => setIsAuditioning(false));
      } else {
        setIsAuditioning(false);
      }
    }
  };

  return (
    <div
      className="space-y-4 max-w-4xl mx-auto p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5"
      data-testid="beginner-preferences-tab"
      data-control-category="new-user"
    >
      {/* Tab Title */}
      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
            <p className="text-xs text-muted-foreground">
              Configure speech, narration order, and favorite languages.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs">
        <span className="flex items-center gap-2 font-medium text-foreground">
          {showVideoSubtitles ? (
            <Eye className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          ) : (
            <EyeOff className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          )}
          Show subtitles over the video by default
        </span>
        <input
          type="checkbox"
          checked={showVideoSubtitles}
          onChange={onToggleVideoSubtitles}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          data-testid="beginner-overlay-preference"
        />
      </label>

      {/* TTS Speed & Voice Selection */}
      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">TTS Speed & Voice</h3>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTestVoice}
            disabled={isAuditioning}
            className="h-7 px-2.5 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
            data-testid="btn-test-voice"
          >
            <Volume2 className="w-3 h-3 mr-1" />
            {isAuditioning ? "Speaking..." : "Audition Voice"}
          </Button>
        </div>

        {/* Speed Slider */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Narration Speed</span>
            <span className="font-semibold text-primary font-mono" data-testid="tts-speed-val">
              {ttsSpeed.toFixed(2)}x
            </span>
          </div>
          <Slider
            value={[ttsSpeed]}
            onValueChange={([val]) => onTtsSpeedChange(val)}
            min={0.5}
            max={2.0}
            step={0.05}
            className="w-full"
            data-testid="tts-speed-slider"
          />
          <div className="flex items-center justify-between pt-1">
            {[0.75, 1.0, 1.25, 1.5].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onTtsSpeedChange(preset)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  Math.abs(ttsSpeed - preset) < 0.02
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Synthesis Voice</span>
            <span className="text-[10px] text-muted-foreground/70">
              {filteredVoices.length} voices found
            </span>
          </label>
          <select
            value={ttsVoice}
            onChange={(e) => onTtsVoiceChange(e.target.value)}
            className="w-full h-9 rounded-md bg-background border border-border text-foreground text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="tts-voice-select"
          >
            <option value="">(Default System Voice)</option>
            {filteredVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alternative TTS Service (Lovable Speak API & Google Translate) */}
      <div
        className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-2.5"
        data-testid="beginner-alternative-tts-card"
      >
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="beginner-alternative-tts-toggle"
              data-testid="beginner-alternative-tts-toggle"
              type="checkbox"
              checked={useAlternativeTtsState}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseAlternativeTtsState(checked);
                setUseAlternativeTts(checked);
              }}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <span className="font-semibold text-xs text-foreground">
              Alternative TTS Service (Lovable Speak API &amp; Google Translate)
            </span>
          </label>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Off by default
          </span>
        </div>

        {useAlternativeTtsState && (
          <div className="space-y-2.5 pt-1 pl-6">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="beginner-alternative-tts-mode"
                  data-testid="beginner-alternative-tts-mode-fallback"
                  value="fallback_only"
                  checked={alternativeTtsModeState === "fallback_only"}
                  onChange={() => {
                    setAlternativeTtsModeState("fallback_only");
                    setAlternativeTtsMode("fallback_only");
                  }}
                />
                Fallback when Web Speech fails
              </label>
              <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="beginner-alternative-tts-mode"
                  data-testid="beginner-alternative-tts-mode-always"
                  value="always"
                  checked={alternativeTtsModeState === "always"}
                  onChange={() => {
                    setAlternativeTtsModeState("always");
                    setAlternativeTtsMode("always");
                  }}
                />
                Primary alternative engine
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">TTS Engine:</span>
              <select
                data-testid="beginner-alternative-tts-engine-select"
                value={alternativeTtsEngineState}
                onChange={(e) => {
                  const eng = e.target.value as AlternativeTtsEngine;
                  setAlternativeTtsEngineState(eng);
                  setAlternativeTtsEngine(eng);
                }}
                className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground font-medium transition-all focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="lovable">Lovable Speak API (tts3.lovable.app)</option>
                <option value="google_translate">Google TTS (Direct translate_tts)</option>
              </select>
              <a
                href={LOVABLE_TTS_OPENAPI_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="beginner-lovable-tts-openapi-link"
                className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 ml-1"
              >
                OpenAPI 3.1.0 Spec ↗
              </a>
            </div>

            <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Provider:</span>
                  <select
                    data-testid="beginner-lovable-tts-provider-select"
                    value={lovableTtsProviderState}
                    onChange={(e) => {
                      const p = e.target.value as LovableTtsProvider;
                      setLovableTtsProviderState(p);
                      setLovableTtsProvider(p);
                      if (
                        p === "openrouter" &&
                        !(OPENROUTER_VOICES as readonly string[]).includes(lovableTtsVoiceState)
                      ) {
                        setLovableTtsVoiceState("alloy");
                        setLovableTtsVoice("alloy");
                      } else if (
                        p === "lovable" &&
                        !(LOVABLE_VOICES as readonly string[]).includes(lovableTtsVoiceState)
                      ) {
                        setLovableTtsVoiceState("Kore");
                        setLovableTtsVoice("Kore");
                      }
                    }}
                    className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-mono font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                  >
                    <option value="lovable">lovable</option>
                    <option value="google">google</option>
                    <option value="openrouter">openrouter</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Voice:</span>
                  {lovableTtsProviderState === "google" ? (
                    <span className="text-xs text-muted-foreground italic px-2 py-0.5">
                      Default (Single voice)
                    </span>
                  ) : (
                    <select
                      data-testid="beginner-lovable-tts-voice-select"
                      value={
                        lovableTtsVoiceState ||
                        (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore")
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setLovableTtsVoiceState(v);
                        setLovableTtsVoice(v);
                      }}
                      className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                    >
                      {lovableTtsProviderState === "openrouter"
                        ? OPENROUTER_VOICES.map((v) => (
                            <option key={v} value={v}>
                              {v} {v === "alloy" ? "(Default)" : ""}
                            </option>
                          ))
                        : LOVABLE_VOICES.map((v) => (
                            <option key={v} value={v}>
                              {v} {v === "Kore" ? "(Default)" : ""}
                            </option>
                          ))}
                    </select>
                  )}
                </div>
              </div>

              {/* OpenRouter API Key Settings */}
              <div className="space-y-1.5 pt-1 text-xs border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="beginner-openrouter-tts-key-input"
                    className="text-muted-foreground font-medium flex items-center gap-1.5"
                  >
                    <span>OpenRouter API Key:</span>
                    {hasCustomOpenRouterApiKey() ? (
                      <span
                        data-testid="beginner-custom-openrouter-key-badge"
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal bg-emerald-500/10 px-1 rounded border border-emerald-500/30"
                      >
                        Custom key saved
                      </span>
                    ) : getServerOpenRouterApiKey() ? (
                      <span
                        data-testid="beginner-server-openrouter-key-badge"
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-normal bg-blue-500/10 px-1 rounded border border-blue-500/30"
                      >
                        Using server .env key
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (Optional - free tier default)
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      id="beginner-openrouter-tts-key-input"
                      data-testid="beginner-openrouter-tts-key-input"
                      type={showOpenRouterKey ? "text" : "password"}
                      value={openRouterKeyInput}
                      onChange={(e) => {
                        setOpenRouterKeyInput(e.target.value);
                        setOpenRouterKeySaved(false);
                      }}
                      placeholder={
                        getServerOpenRouterApiKey()
                          ? "Using server key (enter custom to override)"
                          : "sk-or-v1-..."
                      }
                      className="w-full rounded border border-input bg-background px-2.5 py-1 pr-8 text-xs font-mono text-foreground placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      data-testid="beginner-toggle-show-openrouter-key-btn"
                      onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      title={showOpenRouterKey ? "Hide key" : "Show key"}
                    >
                      {showOpenRouterKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    data-testid="beginner-save-openrouter-key-btn"
                    onClick={() => {
                      setLovableTtsApiKey(openRouterKeyInput);
                      setOpenRouterApiKeySetting(openRouterKeyInput);
                      setOpenRouterKeySaved(true);
                      setTimeout(() => setOpenRouterKeySaved(false), 2500);
                    }}
                    className="px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer"
                  >
                    {openRouterKeySaved ? "Saved!" : "Save"}
                  </button>
                  {openRouterKeyInput && (
                    <button
                      type="button"
                      data-testid="beginner-clear-openrouter-key-btn"
                      onClick={() => {
                        setOpenRouterKeyInput("");
                        setLovableTtsApiKey("");
                        setOpenRouterApiKeySetting("");
                      }}
                      className="px-2 py-1 rounded border border-input bg-background text-muted-foreground hover:text-foreground text-xs"
                      title="Clear custom key"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Native TTS Speed Notice (Uses native speech rate settings) */}
              <div
                data-testid="beginner-lovable-tts-native-speed-notice"
                className="flex items-center justify-between rounded border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs"
              >
                <span className="text-muted-foreground font-medium">TTS Speed:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-foreground font-mono text-[11px]">
                    Uses native speech rate ({ttsSpeed.toFixed(1)}x)
                  </span>
                  <select
                    data-testid="beginner-main-settings-tts-rate-select"
                    aria-label="Beginner main TTS speech rate"
                    value={ttsSpeed.toFixed(1)}
                    onChange={(e) => onTtsSpeedChange(Number(e.target.value))}
                    className="rounded border border-input bg-background px-1.5 py-0.5 text-xs font-mono cursor-pointer"
                  >
                    {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((rateVal) => (
                      <option key={rateVal} value={rateVal.toFixed(1)}>
                        {rateVal.toFixed(1)}×
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span>Provider: <strong className="text-foreground font-mono">{lovableTtsProviderState}</strong></span>
                <span>•</span>
                <span>Voice: <span className="text-foreground">{lovableTtsProviderState === "google" ? "Default" : lovableTtsVoiceState || (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore")}</span></span>
              </p>
            </div>

            <div>
              <button
                type="button"
                data-testid="btn-test-alternative-tts"
                disabled={isTestingAlternativeTts}
                onClick={async () => {
                  setIsTestingAlternativeTts(true);
                  try {
                    await playAlternativeTtsAudio(
                      "Hello world",
                      baseLanguage || "en",
                      ttsSpeed,
                      undefined,
                      "lovable",
                      {
                        provider: lovableTtsProviderState,
                        voice:
                          lovableTtsProviderState === "google"
                            ? undefined
                            : lovableTtsVoiceState ||
                              (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore"),
                        speed: ttsSpeed,
                      },
                    );
                  } catch (err) {
                    console.warn("Test Alternative TTS error:", err);
                  } finally {
                    setIsTestingAlternativeTts(false);
                  }
                }}
                className="px-2.5 py-1 rounded border border-input bg-background hover:bg-muted text-xs font-mono inline-flex items-center gap-1.5 text-foreground disabled:opacity-60 cursor-pointer"
              >
                {isTestingAlternativeTts ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Playing test audio…</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 text-primary" />
                    <span>▶ Test Alternative TTS ("Hello world")</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {perLanguageTtsSettingsSlot}

      {/* 3. Global Favorite Languages Panel (Shared Parity) */}
      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3">
        <GlobalFavoriteLanguagesPanel
          catalog={catalog || ALL_KNOWN_LANGUAGES}
          favoriteLanguages={favoriteLanguages}
          targetLanguages={targetLanguages || []}
          videoId={videoId || ""}
          onFavoriteLanguagesChange={onFavoriteLanguagesChange}
          onApplyFavoritesToVideo={onApplyFavoritesToVideo || (() => {})}
          onSaveCurrentSelectionAsFavorites={onSaveCurrentSelectionAsFavorites || (() => {})}
        />
      </div>

      {/* Navigation Footer */}
      {onContinueToNextTab && (
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={onContinueToNextTab}
            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-1.5"
            data-testid="btn-continue-to-video"
          >
            <span>Next: Video &amp; Captions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
