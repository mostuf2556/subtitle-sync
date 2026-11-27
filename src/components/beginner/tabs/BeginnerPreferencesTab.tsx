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
  CheckCircle2,
  AlertCircle,
  Activity,
  Settings2,
  Filter,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  deduplicateVoices,
  getLanguageVoices,
  getCachedVoices,
  type SpeechVoiceLike,
  getSampleTextForLanguage,
} from "@/utils/speechVoiceUtils";
import {
  ALL_KNOWN_LANGUAGES,
  getOpenRouterApiKeySetting,
  setOpenRouterApiKeySetting,
  getOpenRouterModelSetting,
  setOpenRouterModelSetting,
  getDisableScrollingSetting,
  setDisableScrollingSetting,
  getDisableAutoFocusSetting,
  setDisableAutoFocusSetting,
  recordUserInteraction,
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
  getSpeakApiToken,
  setSpeakApiToken,
  isSpeakApiPersonalToken,
  getServerOpenRouterApiKey,
  hasCustomOpenRouterApiKey,
  LOVABLE_TTS_DOCS_URL,
  LOVABLE_TTS_OPENAPI_URL,
  LOVABLE_TTS_PROVIDERS,
  LOVABLE_VOICES,
  OPENROUTER_VOICES,
  getVoicesForProvider,
  getDefaultVoiceForProvider,
  validateRemoteTtsService,
  getLastValidationResult,
  getAlternativeTtsAnonymousMode,
  setAlternativeTtsAnonymousMode,
  getTtsFallbackOrder,
  unlockTtsAudioPlayback,
  type AlternativeTtsMode,
  type AlternativeTtsEngine,
  type LovableTtsProvider,
  type RemoteTtsValidationResult,
} from "@/lib/alternative-tts";
import { ExternalTtsDebuggerPanel } from "@/components/ExternalTtsDebuggerPanel";

import { GlobalFavoriteLanguagesPanel } from "@/components/GlobalFavoriteLanguagesPanel";
import { PerformanceModeSettingsPanel } from "@/components/shared/PerformanceModeSettingsPanel";
import { OpenRouterSettingsPanel } from "@/components/OpenRouterSettingsPanel";
import { subscribeToCredentialUpdates } from "@/utils/credentialStatus";
import { useIsElementEnabled } from "@/utils/performanceModeManager";
import {
  LearningGoalsFiltersPanel,
  type LearningGoalsFiltersPanelProps,
} from "@/components/shared/LearningGoalsFiltersPanel";
import { LearningGoalAccordion } from "@/components/LearningGoalAccordion";
import { BookOpen } from "lucide-react";

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
  onBaseLanguageChange?: (lang: string) => void;
  availableDefaultLanguages?: string[];
  perLanguageTtsSettingsSlot?: React.ReactNode;
  learningGoalsFiltersSlot?: React.ReactNode;
  maxWordsPerSentence?: number;
  onMaxWordsPerSentenceChange?: (words: number) => void;
  skipIncompleteSentences?: boolean;
  onSkipIncompleteSentencesChange?: (skip: boolean) => void;
  onContinueToNextTab?: () => void;
  catalog?: Array<{ code: string; name: string }>;
  targetLanguages?: string[];
  videoId?: string;
  onApplyFavoritesToVideo?: () => void;
  onSaveCurrentSelectionAsFavorites?: () => void;
  onOpenBackupModal?: () => void;
  disableScrolling?: boolean;
  onDisableScrollingChange?: (disabled: boolean) => void;
  disableAutoFocus?: boolean;
  onDisableAutoFocusChange?: (disabled: boolean) => void;
  languageMaxWords?: Record<string, number>;
  onLanguageMaxWordsChange?: (langCode: string, val: number | undefined) => void;
  languageSkipIncomplete?: Record<string, boolean>;
  onLanguageSkipIncompleteChange?: (langCode: string, val: boolean | undefined) => void;
  onResetAllLanguageCriteria?: () => void;
  learningLanguages?: Array<{ code: string; name: string }>;
  profileSelectorSlot?: React.ReactNode;
  activeProfileName?: string;
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
  onBaseLanguageChange,
  availableDefaultLanguages,
  perLanguageTtsSettingsSlot,
  learningGoalsFiltersSlot,
  maxWordsPerSentence,
  onMaxWordsPerSentenceChange,
  skipIncompleteSentences,
  onSkipIncompleteSentencesChange,
  languageMaxWords,
  onLanguageMaxWordsChange,
  languageSkipIncomplete,
  onLanguageSkipIncompleteChange,
  onResetAllLanguageCriteria,
  learningLanguages,
  onContinueToNextTab,
  catalog,
  targetLanguages,
  videoId,
  onApplyFavoritesToVideo,
  onSaveCurrentSelectionAsFavorites,
  onOpenBackupModal,
  disableScrolling,
  onDisableScrollingChange,
  disableAutoFocus,
  onDisableAutoFocusChange,
  profileSelectorSlot,
  activeProfileName,
}) => {
  const [voices, setVoices] = useState<SpeechVoiceLike[]>(() => getCachedVoices());
  const ttsDebuggerEnabled = useIsElementEnabled("tts_debugger");
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [useAlternativeTtsState, setUseAlternativeTtsState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getUseAlternativeTts() : false,
  );
  const [alternativeTtsModeState, setAlternativeTtsModeState] = useState<AlternativeTtsMode>(() =>
    typeof window !== "undefined" ? getAlternativeTtsMode() : "fallback_only",
  );
  const [alternativeTtsEngineState, setAlternativeTtsEngineState] = useState<AlternativeTtsEngine>(
    () => (typeof window !== "undefined" ? getAlternativeTtsEngine() : "lovable"),
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
    typeof window !== "undefined" ? getOpenRouterApiKeySetting() : "",
  );
  const [showOpenRouterKey, setShowOpenRouterKey] = useState<boolean>(false);
  const [openRouterKeySaved, setOpenRouterKeySaved] = useState<boolean>(false);
  const [openRouterModel, setOpenRouterModel] = useState<string>(() =>
    typeof window !== "undefined" ? getOpenRouterModelSetting() : "openrouter/auto:free",
  );

  useEffect(() => {
    return subscribeToCredentialUpdates(() => {
      setOpenRouterKeyInput(getOpenRouterApiKeySetting());
    });
  }, []);
  const [isTestingAlternativeTts, setIsTestingAlternativeTts] = useState<boolean>(false);
  const [isValidatingRemoteTts, setIsValidatingRemoteTts] = useState<boolean>(false);
  const [remoteValidationResult, setRemoteValidationResult] =
    useState<RemoteTtsValidationResult | null>(() => {
      try {
        return getLastValidationResult(getAlternativeTtsEngine());
      } catch {
        return null;
      }
    });
  const [isAnonymousState, setIsAnonymousState] = useState<boolean>(() =>
    getAlternativeTtsAnonymousMode(),
  );
  const [showOrderHelp, setShowOrderHelp] = useState<boolean>(false);
  const [localDisableScrolling, setLocalDisableScrolling] = useState<boolean>(() =>
    getDisableScrollingSetting(),
  );
  const [localDisableAutoFocus, setLocalDisableAutoFocus] = useState<boolean>(() =>
    getDisableAutoFocusSetting(),
  );

  const currentDisableScrolling =
    disableScrolling !== undefined ? disableScrolling : localDisableScrolling;
  const currentDisableAutoFocus =
    disableAutoFocus !== undefined ? disableAutoFocus : localDisableAutoFocus;

  const handleToggleDisableScrolling = (checked: boolean) => {
    setLocalDisableScrolling(checked);
    setDisableScrollingSetting(checked);
    onDisableScrollingChange?.(checked);
  };

  const handleToggleDisableAutoFocus = (checked: boolean) => {
    setLocalDisableAutoFocus(checked);
    setDisableAutoFocusSetting(checked);
    onDisableAutoFocusChange?.(checked);
  };

  const handleValidateRemoteService = async (serviceToValidate?: AlternativeTtsEngine) => {
    const targetEngine = serviceToValidate || alternativeTtsEngineState;
    setIsValidatingRemoteTts(true);
    try {
      const res = await validateRemoteTtsService(targetEngine, {
        lang: baseLanguage || "en",
        provider: lovableTtsProviderState,
        isAnonymous: isAnonymousState,
      });
      setRemoteValidationResult(res);
    } catch (err: unknown) {
      setRemoteValidationResult({
        ok: false,
        service: targetEngine,
        serviceName: targetEngine === "lovable" ? "Lovable TTS3" : "Google TTS Directly",
        endpoint: "",
        latencyMs: 0,
        audioVerified: false,
        error: err instanceof Error ? err.message : "Validation failed",
        timestamp: Date.now(),
      });
    } finally {
      setIsValidatingRemoteTts(false);
    }
  };

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
    const text = getSampleTextForLanguage(baseLanguage);

    unlockTtsAudioPlayback();
    const useAltTts = getUseAlternativeTts();
    const altMode = getAlternativeTtsMode();
    const fallbackOrder = getTtsFallbackOrder();
    const canFallbackToTts3 = useAltTts || fallbackOrder !== "native_only";

    if (useAltTts && altMode === "always") {
      setIsAuditioning(true);
      playAlternativeTtsAudio(text, baseLanguage, ttsSpeed, undefined, alternativeTtsEngineState, {
        provider: lovableTtsProviderState,
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
          if (canFallbackToTts3) {
            playAlternativeTtsAudio(
              text,
              baseLanguage,
              ttsSpeed,
              undefined,
              alternativeTtsEngineState,
              {
                provider: lovableTtsProviderState || "auto",
                speed: ttsSpeed,
                skipInternalWebSpeechFallback: true,
              },
            ).finally(() => setIsAuditioning(false));
          } else {
            setIsAuditioning(false);
          }
        } else if (prevErr) prevErr(uid, err);
      };
      const ok = window.AndroidNativeShell.speak(text, baseLanguage, ttsSpeed, utteranceId);
      if (ok) return;
    }

    if (!("speechSynthesis" in window)) {
      if (canFallbackToTts3) {
        setIsAuditioning(true);
        playAlternativeTtsAudio(
          text,
          baseLanguage,
          ttsSpeed,
          undefined,
          alternativeTtsEngineState,
          {
            provider: lovableTtsProviderState || "auto",
            speed: ttsSpeed,
            skipInternalWebSpeechFallback: true,
          },
        )
          .catch(() => {})
          .finally(() => setIsAuditioning(false));
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = ttsSpeed;
      utterance.lang = baseLanguage || "en-US";
      if (ttsVoice) {
        const found = voices.find((v) => v.voiceURI === ttsVoice);
        if (found) {
          const sysVoices = window.speechSynthesis.getVoices();
          const target = sysVoices.find((v) => v.voiceURI === found.voiceURI);
          if (target) {
            utterance.voice = target;
            if (target.lang) utterance.lang = target.lang;
          }
        }
      }
      utterance.onend = () => setIsAuditioning(false);
      utterance.onerror = (e) => {
        if (e?.error === "interrupted" || e?.error === "canceled") {
          setIsAuditioning(false);
          return;
        }
        if (canFallbackToTts3) {
          playAlternativeTtsAudio(
            text,
            baseLanguage,
            ttsSpeed,
            undefined,
            alternativeTtsEngineState,
            {
              provider: lovableTtsProviderState || "auto",
              speed: ttsSpeed,
              skipInternalWebSpeechFallback: true,
            },
          )
            .catch(() => {})
            .finally(() => setIsAuditioning(false));
        } else {
          setIsAuditioning(false);
        }
      };
      setIsAuditioning(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      if (canFallbackToTts3) {
        playAlternativeTtsAudio(
          text,
          baseLanguage,
          ttsSpeed,
          undefined,
          alternativeTtsEngineState,
          {
            provider: lovableTtsProviderState || "auto",
            speed: ttsSpeed,
            skipInternalWebSpeechFallback: true,
          },
        )
          .catch(() => {})
          .finally(() => setIsAuditioning(false));
      } else {
        setIsAuditioning(false);
      }
    }
  };

  return (
    <div
      className="space-y-4 max-w-4xl mx-auto p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 [overflow-anchor:none]"
      data-testid="beginner-preferences-tab"
      data-control-category="new-user"
    >
      {/* Tab Title */}
      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="beginner-export-import-settings-btn"
            onClick={onOpenBackupModal}
            className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Export / Import Settings</span>
          </Button>
        </div>
      </div>

      {/* Top Learning Goals Profile Container (Set on top) */}
      {(profileSelectorSlot || activeProfileName) && (
        <div
          id="beginner-top-profile-container"
          data-testid="beginner-top-profile-container"
          className="flex flex-wrap items-center justify-between gap-2 bg-card border border-primary/25 rounded-xl p-3 shadow-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                data-testid="beginner-profile-top-label"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Profile Name:
              </span>
              <span
                data-testid="beginner-active-profile-name"
                className="font-bold text-xs sm:text-sm text-foreground truncate"
              >
                {activeProfileName || "Standard (Even)"}
              </span>
            </div>
          </div>
          {profileSelectorSlot}
        </div>
      )}

      {/* OpenRouter Key & Models Accordion (1st accordion, moved upper into its own dedicated accordion) */}
      <details
        className="group rounded-xl border border-border bg-card/80 overflow-hidden shadow-xs"
        data-testid="beginner-settings-openrouter-accordion"
      >
        <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-foreground hover:bg-muted/40 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Key className="h-4 w-4 text-primary" />
            <span>OpenRouter AI Key &amp; Models</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                openRouterKeyInput.trim()
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {openRouterKeyInput.trim() ? "Key saved" : "Configure key"}
            </Badge>
            <Badge
              variant="outline"
              data-testid="beginner-openrouter-accordion-model-badge"
              className="text-[10px] font-mono bg-primary/10 text-primary border-primary/30"
            >
              {openRouterModel}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div
          className="p-3 pt-2 border-t border-border/40"
          data-testid="beginner-settings-openrouter-container"
        >
          <OpenRouterSettingsPanel
            apiKey={openRouterKeyInput}
            selectedModel={openRouterModel}
            onSaveApiKey={(k) => {
              setOpenRouterKeyInput(k);
              setOpenRouterApiKeySetting(k);
              setOpenRouterKeySaved(true);
              setTimeout(() => setOpenRouterKeySaved(false), 2500);
            }}
            onClearApiKey={() => {
              setOpenRouterKeyInput("");
              setOpenRouterApiKeySetting("");
            }}
            onModelChange={(m) => {
              setOpenRouterModel(m);
              setOpenRouterModelSetting(m);
            }}
          />
        </div>
      </details>

      {/* TTS Service Accordion (2nd accordion, moved upper into its own dedicated accordion) */}
      <details
        className="group rounded-xl border border-border bg-card/80 overflow-hidden shadow-xs"
        data-testid="beginner-settings-tts-service-accordion"
      >
        <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-foreground hover:bg-muted/40 transition">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            <span>TTS Service (Alternative Speech &amp; Voices)</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                useAlternativeTtsState
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {useAlternativeTtsState ? "Enabled" : "Off by default"}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>
        <div
          className="p-3 pt-2 border-t border-border/40"
          data-testid="beginner-settings-tts-service-container"
        >
          {/* Alternative TTS Service (Lovable Speak API & Google Translate) */}
          <div
            id="tts-service-settings-panel"
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
                  </select>
                  <a
                    href={LOVABLE_TTS_DOCS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="beginner-lovable-tts-docs-link"
                    className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 ml-1 font-semibold"
                  >
                    API Docs (https://tts3.lovable.app/docs) ↗
                  </a>
                  <a
                    href={LOVABLE_TTS_OPENAPI_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="beginner-lovable-tts-openapi-link"
                    className="text-muted-foreground hover:text-foreground hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 ml-1"
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
                          const defaultVoice = getDefaultVoiceForProvider(p);
                          if (defaultVoice) {
                            setLovableTtsVoiceState(defaultVoice);
                            setLovableTtsVoice(defaultVoice);
                          }
                        }}
                        className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-mono font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                      >
                        {LOVABLE_TTS_PROVIDERS.map((p) => (
                          <option key={p} value={p}>
                            {p} {p === "google" ? "(Google TTS provider - default)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">Voice:</span>
                      {(() => {
                        const availableVoices = getVoicesForProvider(lovableTtsProviderState);
                        if (availableVoices.length === 0) {
                          return (
                            <span className="text-xs text-muted-foreground italic px-2 py-0.5">
                              {lovableTtsProviderState === "google"
                                ? "Google TTS (Default voice, no key required)"
                                : "Default / auto-selected by provider"}
                            </span>
                          );
                        }
                        const defaultV = getDefaultVoiceForProvider(lovableTtsProviderState);
                        return (
                          <select
                            data-testid="beginner-lovable-tts-voice-select"
                            value={lovableTtsVoiceState || defaultV}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLovableTtsVoiceState(v);
                              setLovableTtsVoice(v);
                            }}
                            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary hover:border-primary/50 cursor-pointer"
                          >
                            {availableVoices.map((v) => (
                              <option key={v} value={v}>
                                {v} {v === defaultV ? "(Default)" : ""}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  {/* OpenRouter API Key Settings */}
                  <div className="space-y-1.5 pt-1 text-xs border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="beginner-openrouter-tts-key-input"
                        className="text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap"
                      >
                        <span>Speak API Token / Provider Key:</span>
                        {getSpeakApiToken() ? (
                          <span
                            data-testid="beginner-custom-speak-token-badge"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal bg-emerald-500/10 px-1 rounded border border-emerald-500/30"
                          >
                            ✓ Speak API token (spk_...) saved
                          </span>
                        ) : hasCustomOpenRouterApiKey() ? (
                          <span
                            data-testid="beginner-custom-openrouter-key-badge"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal bg-emerald-500/10 px-1 rounded border border-emerald-500/30"
                          >
                            ✓ Provider key saved
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
                              ? "Using server key (or enter Bearer spk_...)"
                              : "Bearer spk_... or spk_... (authorization code)"
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
                          const clean = openRouterKeyInput.trim().replace(/^bearer\s+/i, "");
                          if (isSpeakApiPersonalToken(clean)) {
                            setSpeakApiToken(clean);
                          } else {
                            setLovableTtsApiKey(openRouterKeyInput);
                            setOpenRouterApiKeySetting(openRouterKeyInput);
                          }
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
                            const clean = openRouterKeyInput.trim().replace(/^bearer\s+/i, "");
                            setOpenRouterKeyInput("");
                            if (isSpeakApiPersonalToken(clean)) {
                              setSpeakApiToken("");
                            } else {
                              setLovableTtsApiKey("");
                              setOpenRouterApiKeySetting("");
                            }
                          }}
                          className="px-2 py-1 rounded border border-input bg-background text-muted-foreground hover:text-foreground text-xs"
                          title="Clear custom key"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-normal">
                      Set authorization code (
                      <code className="font-mono text-primary">Bearer spk_...</code> or{" "}
                      <code className="font-mono text-primary">spk_...</code>) for{" "}
                      <code className="font-mono text-primary">
                        https://tts3.lovable.app/api/public/tts
                      </code>{" "}
                      POST requests, or an upstream key (
                      <code className="font-mono text-primary">sk_...</code>).
                    </p>
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
                        onChange={(e) => {
                          recordUserInteraction(Date.now());
                          onTtsSpeedChange(Number(e.target.value));
                        }}
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
                    <span>
                      Provider:{" "}
                      <strong className="text-foreground font-mono">
                        {lovableTtsProviderState}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Voice:{" "}
                      <span className="text-foreground">
                        {lovableTtsProviderState === "google"
                          ? "Default"
                          : lovableTtsVoiceState ||
                            (lovableTtsProviderState === "openrouter" ? "alloy" : "Kore")}
                      </span>
                    </span>
                  </p>
                  {/* Anonymity Mode Selector (Regular vs Anonymous) */}
                  <div
                    data-testid="beginner-tts-anonymity-mode-control"
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium flex items-center gap-1.5">
                        <span>Access Mode:</span>
                        <span
                          data-testid="beginner-tts-anonymity-status-label"
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            isAnonymousState
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isAnonymousState ? "Anonymous" : "Regular"}
                        </span>
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {isAnonymousState
                          ? "Anonymous: strips cookies, session tokens, and personal identifiers"
                          : "Regular: uses standard credentials and session tracking"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded border border-input">
                      <button
                        type="button"
                        data-testid="beginner-tts-anonymity-regular-btn"
                        onClick={() => {
                          setIsAnonymousState(false);
                          setAlternativeTtsAnonymousMode(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                          !isAnonymousState
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Regular
                      </button>
                      <button
                        type="button"
                        data-testid="beginner-tts-anonymity-anonymous-btn"
                        onClick={() => {
                          setIsAnonymousState(true);
                          setAlternativeTtsAnonymousMode(true);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                          isAnonymousState
                            ? "bg-amber-500 text-white dark:bg-amber-600 font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Anonymous
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-border/40">
                  <div className="flex flex-wrap items-center gap-2">
                    {!remoteValidationResult?.ok ? (
                      <>
                        <button
                          type="button"
                          data-testid="btn-validate-remote-tts"
                          disabled={isValidatingRemoteTts}
                          onClick={() => handleValidateRemoteService()}
                          className="px-2.5 py-1 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-xs font-mono inline-flex items-center gap-1.5 text-primary disabled:opacity-60 cursor-pointer font-medium"
                        >
                          {isValidatingRemoteTts ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Validating Service…</span>
                            </>
                          ) : (
                            <>
                              <Activity className="h-3 w-3" />
                              <span>Validate TTS3 Service</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          data-testid="btn-validate-tts3-service"
                          disabled={isValidatingRemoteTts}
                          onClick={() => handleValidateRemoteService("lovable")}
                          className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-[11px] font-mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Validate Lovable TTS3 public endpoint"
                        >
                          Validate TTS3 Service
                        </button>

                        <span
                          data-testid="beginner-tts-validation-required-hint"
                          className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3 text-muted-foreground/70" />
                          <span>Validate service first to enable playback</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          data-testid="btn-test-alternative-tts"
                          disabled={isTestingAlternativeTts}
                          onClick={async () => {
                            setIsTestingAlternativeTts(true);
                            try {
                              await playAlternativeTtsAudio(
                                getSampleTextForLanguage(baseLanguage || "en"),
                                baseLanguage || "en",
                                ttsSpeed,
                                undefined,
                                alternativeTtsEngineState,
                                {
                                  provider: lovableTtsProviderState,
                                  speed: ttsSpeed,
                                  isAnonymous: isAnonymousState,
                                },
                              );
                            } catch (err) {
                              console.warn("Test Alternative TTS error:", err);
                            } finally {
                              setIsTestingAlternativeTts(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer font-semibold shadow-xs"
                        >
                          {isTestingAlternativeTts ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                              <span>Playing test audio…</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 text-white fill-current" />
                              <span>
                                ▶ Test Audio (
                                {alternativeTtsEngineState === "lovable" ? "TTS3" : "Google Direct"}
                                )
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          data-testid="btn-validate-remote-tts"
                          disabled={isValidatingRemoteTts}
                          onClick={() => handleValidateRemoteService()}
                          className="px-2 py-1 rounded border border-border bg-background hover:bg-muted text-[11px] font-mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Re-validate service endpoint"
                        >
                          {isValidatingRemoteTts ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Activity className="h-3 w-3" />
                          )}
                          <span>Re-validate</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Validation Status Feedback */}
                  {remoteValidationResult && (
                    <div
                      data-testid="remote-tts-validation-details"
                      className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded border text-xs ${
                        remoteValidationResult.ok
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 border-destructive/30 text-destructive"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          data-testid="remote-tts-validation-badge"
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${
                            remoteValidationResult.ok
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {remoteValidationResult.ok ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Available ({remoteValidationResult.latencyMs}ms)</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              <span>Unavailable ({remoteValidationResult.latencyMs}ms)</span>
                            </>
                          )}
                        </span>
                        <span className="font-semibold">{remoteValidationResult.serviceName}:</span>
                        <span className="text-[11px] opacity-90">
                          {remoteValidationResult.ok
                            ? remoteValidationResult.details || "Audio stream verified"
                            : remoteValidationResult.error || "Service check failed"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-70">
                        Checked {new Date(remoteValidationResult.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {/* External TTS Request & Response Debugger Panel (Hidden by default in Fast Mode) */}
                  {ttsDebuggerEnabled && <ExternalTtsDebuggerPanel className="mt-3" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </details>

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

      {/* Default Language (Translation Source) Accordion */}
      <LearningGoalAccordion
        id="beginner-default-language"
        title="Default Language (Translation Source)"
        icon={<Languages className="w-4 h-4 text-primary" />}
        badge={
          <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
            {baseLanguage ? `${baseLanguage.toUpperCase()} • Synced` : "Synchronized"}
          </span>
        }
        defaultOpen={false}
        autoTimeout={false}
      >
        <div className="space-y-2" data-testid="beginner-default-language-card">
          <p className="text-[11px] text-muted-foreground">
            The single authoritative source language used for translation and parallel alignment
            across the entire app.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {availableDefaultLanguages && availableDefaultLanguages.length > 0 ? (
              Array.from(new Set(availableDefaultLanguages)).map((langCode, idx) => {
                const isDefault = baseLanguage === langCode;
                const langMeta = ALL_KNOWN_LANGUAGES.find((l) => l.code === langCode);
                return (
                  <button
                    key={`${langCode}-${idx}`}
                    type="button"
                    data-testid={`beginner-default-lang-btn-${langCode}`}
                    onClick={() => onBaseLanguageChange?.(langCode)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDefault
                        ? "border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/40"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    {isDefault && <Check className="h-3 w-3" />}
                    <span>{langMeta?.name || langCode.toUpperCase()}</span>
                    <span className="text-[10px] opacity-75 font-mono">({langCode})</span>
                  </button>
                );
              })
            ) : (
              <span className="text-muted-foreground italic text-[11px]">
                No fetched subtitle languages detected yet.
              </span>
            )}
          </div>
        </div>
      </LearningGoalAccordion>

      {/* Global Features: Disable Scrolling & Disable Auto-Focus */}
      <LearningGoalAccordion
        id="beginner-global-features"
        title="Global Features"
        icon={<Sliders className="w-4 h-4 text-primary" />}
        defaultOpen={false}
        autoTimeout={false}
      >
        <div className="space-y-2 text-xs" data-testid="beginner-global-features-card">
          <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-muted/20 cursor-pointer">
            <span className="text-foreground font-medium flex items-center gap-1.5">
              <span>Disable scrolling</span>
            </span>
            <input
              type="checkbox"
              id="beginner-disable-scrolling-toggle"
              data-testid="beginner-disable-scrolling-toggle"
              checked={currentDisableScrolling}
              onChange={(e) => handleToggleDisableScrolling(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-muted/20 cursor-pointer">
            <span className="text-foreground font-medium flex items-center gap-1.5">
              <span>Disable auto-focus</span>
            </span>
            <input
              type="checkbox"
              id="beginner-disable-autofocus-toggle"
              data-testid="beginner-disable-autofocus-toggle"
              checked={currentDisableAutoFocus}
              onChange={(e) => handleToggleDisableAutoFocus(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
          </label>
        </div>
      </LearningGoalAccordion>

      {/* TTS Speed & Voice Selection */}
      <LearningGoalAccordion
        id="beginner-tts-speed-voice"
        title="TTS Speed & Voice"
        icon={<Gauge className="w-4 h-4 text-primary" />}
        badge={
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {ttsSpeed.toFixed(2)}x
          </span>
        }
        defaultOpen={false}
        autoTimeout={false}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-end">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5 pt-1">
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
      </LearningGoalAccordion>

      {/* Performance Mode: Fast vs. Slow (Disables and hides non-obligatory elements by default) */}
      <PerformanceModeSettingsPanel />

      {/* 3. Global Favorite Languages Panel (Learning Goals: Favorite & Target Languages) */}
      <LearningGoalAccordion
        id="beginner-favorite-languages"
        title={`Favorite & Target Languages (${(targetLanguages || []).length})`}
        icon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
        badge={
          <span className="text-muted-foreground text-[10px] font-mono truncate max-w-40 block">
            {(targetLanguages || []).join(", ") || "None"}
          </span>
        }
        defaultOpen={false}
        autoTimeout={false}
      >
        <div
          id="beginner-favorite-languages-section"
          data-testid="beginner-favorite-languages-section"
          className="bg-card rounded-lg p-1.5 space-y-3"
        >
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
      </LearningGoalAccordion>

      {/* 4. Learning Goals: Per-Language Narration Ratios Settings (at the end of learning goals stage) */}
      {perLanguageTtsSettingsSlot && (
        <LearningGoalAccordion
          id="beginner-narration-ratios"
          title="Narration Ratios & Playing Precedence"
          icon={<Sliders className="h-3.5 w-3.5 text-primary" />}
          defaultOpen={false}
          autoTimeout={false}
        >
          <div
            id="beginner-narration-ratios-section"
            data-testid="beginner-narration-ratios-section"
            className="space-y-2"
          >
            <div
              id="beginner-learning-goals-ratios-container"
              data-testid="beginner-learning-goals-ratios-container"
              className="space-y-2"
            >
              {perLanguageTtsSettingsSlot}
            </div>
          </div>
        </LearningGoalAccordion>
      )}

      {/* 5. Learning Goals: Subtitle Row Filters (Max Words Slider & Complete Sentence Filter & Per-Language Max Words) */}
      {(learningGoalsFiltersSlot || onMaxWordsPerSentenceChange) && (
        <LearningGoalAccordion
          id="beginner-row-criteria"
          title="Subtitle Row Criteria & Filters (Per Language)"
          icon={<Filter className="h-3.5 w-3.5 text-primary" />}
          badge={
            <span className="text-primary font-mono text-[10px] font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              {maxWordsPerSentence ?? 10}w max
            </span>
          }
          defaultOpen={false}
          autoTimeout={false}
        >
          <div
            id="beginner-row-criteria-section"
            data-testid="beginner-row-criteria-section"
            className="space-y-2"
          >
            <div
              id="beginner-learning-goals-filters-container"
              data-testid="beginner-learning-goals-filters-container"
              className="space-y-2"
            >
              {learningGoalsFiltersSlot ?? (
                <LearningGoalsFiltersPanel
                  maxWords={maxWordsPerSentence ?? 10}
                  onMaxWordsChange={onMaxWordsPerSentenceChange!}
                  skipIncompleteSentences={skipIncompleteSentences ?? false}
                  onSkipIncompleteSentencesChange={onSkipIncompleteSentencesChange ?? (() => {})}
                  languageMaxWords={languageMaxWords}
                  onLanguageMaxWordsChange={onLanguageMaxWordsChange}
                  languageSkipIncomplete={languageSkipIncomplete}
                  onLanguageSkipIncompleteChange={onLanguageSkipIncompleteChange}
                  onResetAllLanguageCriteria={onResetAllLanguageCriteria}
                  learningLanguages={learningLanguages}
                />
              )}
            </div>
          </div>
        </LearningGoalAccordion>
      )}

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
