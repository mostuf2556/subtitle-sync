import { createFileRoute } from "@tanstack/react-router";
import React, {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  LayoutList,
  Link2,
  Loader2,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Subtitles,
  Sun,
  Tv,
  Share2,
  Info,
  Eye,
  EyeOff,
  HelpCircle,
  History,
  Volume2,
  VolumeX,
  Hourglass,
  Bug,
  Settings,
  Settings2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Zap,
  Split,
  BookmarkCheck,
  Plus,
  Minus,
  Film,
  Filter,
  Languages,
  Type,
  ListOrdered,
  Gauge,
  PlusCircle,
  X,
  Globe,
  Shuffle,
  Palette,
  Download,
  Upload,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getPlaybackSectionId } from "@/lib/playback-section-identity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  fmt,
  LANGS,
  RTL,
  STRATEGIES,
  PARSER_CRITERIA,
  DEFAULT_PARSER_CRITERIA,
  PARSER_PRESETS,
  DEFAULT_CRITERIA_SETTINGS,
  type CriteriaGroupSettings,
  type CriteriaId,
  type Json3,
  type Row,
  type Strategy,
} from "@/lib/subtitles";
import {
  buildLangReplacedCaptionUrl,
  buildTranslatedCaptionUrl,
  decodeInterceptedCaption,
  nativeShell,
  parseJson3,
  parseVideoId,
  timedTextVideoId,
  registerLiveCaptionInterceptor,
  setupEarlyCaptionInterceptor,
  isCaptionInterceptorReady,
} from "@/lib/native-captions";
import { removeAngleBrackets } from "@/utils/captionParser";
import {
  SUPPORTED_LANGUAGES_CATALOG,
  getUserLearningLanguages,
  setUserLearningLanguages,
  getAutoScrollSetting,
  setAutoScrollSetting,
  getDisableScrollingSetting,
  setDisableScrollingSetting,
  getDisableAutoFocusSetting,
  setDisableAutoFocusSetting,
  recordUserInteraction,
  isAutoScrollAllowed,
  getLastUserInteractionTimestamp,
  AUTO_SCROLL_COOLDOWN_MS,
  getDebugModeSetting,
  setDebugModeSetting,
  getQuickLoaderSetting,
  setQuickLoaderSetting,
  getVersionDetailsSetting,
  setVersionDetailsSetting,
  loadVideoSettings,
  saveVideoSettings,
  getAutoSpeakOnFetchSetting,
  setAutoSpeakOnFetchSetting,
  getSpeakLanguageNameOnFetchSetting,
  setSpeakLanguageNameOnFetchSetting,
  getSubtitleFetchWindowSeconds,
  setSubtitleFetchWindowSeconds,
  getFavoriteLanguages,
  setFavoriteLanguages,
  getOnDemandTranslationSetting,
  setOnDemandTranslationSetting,
  getOnDemandTranslationSentencesAhead,
  setOnDemandTranslationSentencesAhead,
  getOpenRouterApiKeySetting,
  setOpenRouterApiKeySetting,
  getStripSpeakerBracketsSetting,
  setStripSpeakerBracketsSetting,
  getRemoveCharsSetting,
  setRemoveCharsSetting,
  getVideoLibraryTimeoutSetting,
  setVideoLibraryTimeoutSetting,
  loadAppSettings,
  saveAppSettings,
} from "@/utils/appSettings";
import { SpecialCharactersRemovalPanel } from "@/components/SpecialCharactersRemovalPanel";
import { BeginnerCharsRemovalAccordion } from "@/components/beginner/BeginnerCharsRemovalAccordion";
import { AlternativeVideoPlayerView } from "@/components/AlternativeVideoPlayerView";
import { WordBalloonLearningView } from "@/components/WordBalloonLearningView";
import {
  getAppStateFromUrl,
  syncAppStateToUrl,
  extractVideoIdFromSubtitlesUrl,
  extractLanguageFromSubtitlesUrl,
} from "@/utils/urlStateManager";
import {
  recordSharedLanguageForVideo,
  isSharedLanguageForVideo,
} from "@/utils/favoriteLanguagesRules";
import { ShareStateModal } from "@/components/ShareStateModal";
import { VideoMetadataModal } from "@/components/VideoMetadataModal";
import { SettingsBackupModal } from "@/components/SettingsBackupModal";
import {
  translateSentencesAhead,
  getStoredOnDemandTranslation,
  getAllStoredOnDemandTranslations,
  clearOnDemandTranslations,
} from "@/utils/onDemandTranslationManager";
import { LanguageBoxesSelector } from "@/components/LanguageBoxesSelector";
import { GlobalFavoriteLanguagesPanel } from "@/components/GlobalFavoriteLanguagesPanel";
import { LanguageSubtitleUrlModal } from "@/components/LanguageSubtitleUrlModal";
import {
  VideoPlaybackPrecedenceBar,
  getVideoBarIndex,
  updatePrecedenceFromVideoBarIndex,
} from "@/components/VideoPlaybackPrecedenceBar";
import { FetchedSubtitlesStagePanel } from "@/components/FetchedSubtitlesStagePanel";

import {
  addUniqueSubtitleColumn,
  findFetchedSubtitleLanguage,
  mergeOnDemandSubtitleRows,
  subtitleLanguageIdentity,
} from "@/utils/subtitleLanguageColumns";
import {
  getAudioTrackMode,
  setAudioTrackMode,
  repeatSegmentWithAudioTrack,
} from "@/utils/audioTrackManager";
import {
  deduplicateVoices,
  getLanguageVoices,
  getUniqueVoiceKey,
  matchesLanguageCode,
  setCachedVoices,
  getCachedVoices,
  findVoiceByUriOrName,
} from "@/utils/speechVoiceUtils";
import {
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
  isSpeakApiPersonalToken,
  getServerOpenRouterApiKey,
  hasCustomOpenRouterApiKey,
  playAlternativeTtsAudio,
  cancelAlternativeTtsAudio,
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
  setTtsFallbackOrder,
  executeTtsFallbackSequence,
  type RemoteTtsValidationResult,
  type AlternativeTtsMode,
  type AlternativeTtsEngine,
  type LovableTtsProvider,
  type TtsFallbackOrder,
} from "@/lib/alternative-tts";
import { ExternalTtsDebuggerPanel } from "@/components/ExternalTtsDebuggerPanel";
import { TtsServiceSettingsPanel } from "@/components/TtsServiceSettingsPanel";
import { TtsFallbackOrderSwitch } from "@/components/TtsFallbackOrderSwitch";
import {
  computeVideoInstances,
  multiVideoPlayerRegistry,
  executeMultiVideoSegmentSync,
  removeVideoInstanceConfig,
  type VideoInstanceConfig,
  type YTPlayerLike,
} from "@/utils/multiVideoPlayerManager";
import { VideoInstancesSwiper } from "@/components/VideoInstancesSwiper";
import { VideoPlaybackControls } from "@/components/VideoPlaybackControls";
import { FloatingDraggablePauseButton } from "@/components/FloatingDraggablePauseButton";
import { FloatingErrorButton } from "@/components/FloatingErrorButton";
import { trackNetworkRequest, useNetworkRequests } from "@/utils/networkTracker";
import { NetworkRequestsInspector } from "@/components/NetworkRequestsInspector";
import {
  logError,
  logStateMachineAction,
  logInterception,
  logSubtitlePopulation,
  logForeignTrack,
  copyBugReportToClipboard,
} from "@/utils/logBuffer";
import { AccordionSection } from "@/components/AccordionSection";
import { StateMachineActionLogsInspector } from "@/components/StateMachineActionLogsInspector";
import { BottomLogViewer } from "@/components/BottomLogViewer";
import { CriticalCaptionsAlert } from "@/components/CriticalCaptionsAlert";
import { SubtitlesTablePanel } from "@/components/SubtitlesTablePanel";
import { emitSubtitleFetchLog } from "@/utils/subtitleFetchLogger";
import { HighlightedSubtitle } from "@/components/HighlightedSubtitle";
import { ApkReleasesFooter } from "@/components/ApkReleasesFooter";
import { VideoPlayground, type DetectedSubtitleTrack } from "@/components/VideoPlayground";
import { AiSubtitlePunctuationTab } from "@/components/AiSubtitlePunctuationTab";
import { WebDemoUrlsInput } from "@/components/WebDemoUrlsInput";
import { ParserTimingLab } from "@/components/ParserTimingLab";
import { FloatingSubtitleRetryIndicator } from "@/components/FloatingSubtitleRetryIndicator";
import { ModeSwitcherHeader } from "@/components/ModeSwitcherHeader";
import {
  simpleAlign,
  isSentenceWithinWordLimit,
  isCompleteSentence,
  type SimpleParserConfig,
  DEFAULT_SIMPLE_PARSER_CONFIG,
} from "@/utils/newSubtitlesParser";
import { PerformanceModeSettingsPanel } from "@/components/shared/PerformanceModeSettingsPanel";
import { useIsElementEnabled } from "@/utils/performanceModeManager";
import { LearningGoalsFiltersPanel } from "@/components/shared/LearningGoalsFiltersPanel";
import { BeginnerFlowContainer } from "@/components/beginner/BeginnerFlowContainer";
import { type BeginnerTabId } from "@/components/beginner/BeginnerTabNav";
import { PerLanguageTtsPreferences } from "@/components/beginner/PerLanguageTtsPreferences";
import {
  BeginnerTtsServiceControl,
  type BeginnerTtsService,
} from "@/components/beginner/BeginnerTtsServiceControl";
import {
  getDefaultLanguage,
  setDefaultLanguage,
  subscribeDefaultLanguage,
} from "@/utils/defaultLanguageManager";
import { setBaseLanguagePreference } from "@/lib/playback-preferences";
import { subtitleRequestQueue } from "@/utils/subtitleRequestQueue";
import {
  getSectionOrder,
  setSectionOrder as saveSectionOrder,
  getFavoriteLanguagesPreference,
  getTargetLanguagesPreference,
  getBaseLanguagePreference,
  getTtsVoicesPreference,
  getTtsLanguageOrdersPreference,
  getSubtitleRequestMode,
  getTtsRatiosPreference,
  getTtsRatesPreference,
  getLanguageTtsRatio,
  partitionTtsLanguagesByOrder,
  isLanguageSpoken,
  isTtsSpeakableLanguage,
  isSubtitleInstanceEligibleForTTS,
  shouldHighlightSentenceForTTS,
  getPrimaryTtsLang,
  setPrimaryTtsLang,
  setTtsLanguageOrderPreference,
  computePrimaryTtsLang,
  isLanguageEligibleForTtsWithRole,
  shouldHighlightSentenceForTtsWithRole,
  setSubtitleRequestMode as saveSubtitleRequestMode,
  setTtsRatioPreference as saveTtsRatioPreference,
  setTtsRatePreference as saveTtsRatePreference,
  subtitleRequestModeOrder,
  getAutoRetrySubtitles,
  setAutoRetrySubtitles as saveAutoRetrySubtitles,
  getRetryPacingMinSec,
  setRetryPacingMinSec as saveRetryPacingMinSec,
  getRetryPacingMaxSec,
  setRetryPacingMaxSec as saveRetryPacingMaxSec,
  getBackgroundAudioEnabled,
  setBackgroundAudioEnabled as saveBackgroundAudioEnabled,
  getLearningGoalsMaxWords,
  setLearningGoalsMaxWords as saveLearningGoalsMaxWords,
  getLearningGoalsSkipIncomplete,
  setLearningGoalsSkipIncomplete as saveLearningGoalsSkipIncomplete,
  getTtsBlacklist,
  setTtsBlacklist,
  isLanguageTtsBlacklisted,
  extractLanguageCodeString,
  getTtsVolumesPreference,
  setTtsVolumePreference as saveTtsVolumePreference,
  getLanguageTtsVolume,
  getZeroKnowledgeInLang,
  setZeroKnowledgeInLang,
  toggleZeroKnowledgeInLang,
  getAllZeroKnowledgeInLang,
  getPickWordStrategy,
  setPickWordStrategy,
  ZERO_KNOWLEDGE_EVENT,
  PICK_WORD_STRATEGY_EVENT,
  saveSectionOrderPreference,
  saveTtsLanguageOrdersPreference,
  type SectionOrder,
  type TtsLanguageOrders,
  type SubtitleRequestMode,
  type PickWordStrategy,
} from "@/lib/playback-preferences";
import { pickWordFromSentence, getWordTranslation } from "@/utils/zeroKnowledgeWordManager";
import {
  initBackgroundMediaManager,
  syncMediaMetadata,
  setNativeBackgroundAudio,
} from "@/utils/backgroundMediaManager";
import { ApkReleaseModal } from "@/components/ApkReleaseModal";
import { SubtitleFetchToast } from "@/components/SubtitleFetchToast";
import { VideoLibraryPanel } from "@/components/VideoLibraryPanel";
import { AttemptOrderSettings } from "@/components/AttemptOrderSettings";
import {
  type FetchAttempt,
  type SendMode,
  type ExactFetchResult,
  type SubtitleFetchStrategyConfig,
  getAttemptOrder,
  setAttemptOrder,
  getPromoteSuccessfulAttempt,
  setPromoteSuccessfulAttempt,
  getUseFetchServer,
  setUseFetchServer,
  getFetchServerUrl,
  setFetchServerUrl,
  fetchViaServer,
  promoteAttempt,
  runFetchAttempts,
  nativeExactFetch,
  getFetchStrategyConfig,
  DEFAULT_FETCH_STRATEGY_CONFIG,
  buildActiveAttemptOrder,
  isYouTubeTranslatedSubtitle,
} from "@/lib/subtitle-fetch-plan";
import type { VideoMetadata } from "@/types";
import {
  recordVideoWatch,
  updateVideoLibraryTitle,
  loadVideoLibrary,
} from "@/utils/videoLibraryManager";
import {
  fetchVideoMetadata,
  getCachedVideoMetadata,
  enrichMetadataWithPlayer,
} from "@/utils/videoMetadataManager";
import { notifySubtitleFetch } from "@/utils/subtitleNotificationManager";
import { getApkReleaseLinks } from "@/utils/apkUpdater";
import {
  isValidJsonSubtitleResponse,
  saveCachedRawJson3,
  getCachedRawJson3,
  removeCachedTargetSubtitles,
  clearVideoSubtitleCache,
  getCachedAiSubtitles,
  hasCachedAiSubtitles,
  getDefaultSubtitleLanguages,
  addDefaultSubtitleLanguage,
  saveDefaultSubtitleLanguages,
} from "@/utils/subtitleCache";
import { SwitchableDefaultSubtitlesBar } from "@/components/SwitchableDefaultSubtitlesBar";
import { LanguageRatioCompositionSelector } from "@/components/LanguageRatioCompositionSelector";
import {
  type LanguageRatioComposition,
  getStoredRatioCompositions,
  saveRatioComposition,
  updateRatioComposition,
  deleteRatioComposition,
  getActiveRatioCompositionId,
  setActiveRatioCompositionId,
  resolveCompositionRatios,
} from "@/utils/ratioCompositionsManager";
import { recordWinnerPromotion } from "@/utils/winnerPromotionTracker";
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from "@/utils/developerMode";
import {
  STORAGE_KEYS,
  APP_VERSION,
  APP_COMMIT_ID,
  APP_VERSION_DESCRIPTION,
  ALL_RELEASES_URL,
  DEFAULT_VIDEO_ID,
  JSON3_DEMO_VIDEO_ID,
} from "@/config/appConfig";
import serverConfig from "@/config/server.json";
import { JSON3_RAW_MAP } from "../../test/fixtures/L2Ryrr6txwA/jsonStrings";

const DEMO_VIDEO = "L2Ryrr6txwA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Parallel Subtitles" },
      {
        name: "description",
        content:
          "Align json3 subtitles into parallel sentences and hear each language spoken between video sections.",
      },
      { property: "og:title", content: "Parallel Subtitles" },
      {
        property: "og:description",
        content:
          "Align json3 subtitles into parallel sentences and hear each language spoken between video sections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, a: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy?(): void;
  stopVideo?(): void;
  getVideoData?(): { video_id?: string; title?: string };
  getDuration?(): number;
  getAvailableAudioTracks?(): unknown[];
  setAudioTrack?(trackId: string): void;
  getAudioTrack?(): unknown;
  setPlaybackRate?(rate: number): void;
  getPlaybackRate?(): number;
  loadVideoById?(videoId: string | { videoId: string; startSeconds?: number }): void;
  cueVideoById?(videoId: string | { videoId: string; startSeconds?: number }): void;
  loadModule?(module: string): void;
  unloadModule?(module: string): void;
  setOption?(module: string, option: string, value: unknown): void;
  getOption?(module: string, option: string): unknown;
  getIframe?(): HTMLIFrameElement;
};
declare global {
  interface Window {
    YT?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    onYouTubeIframeAPIReady?: () => void;
    onNativeCaptionsInterceptedBase64?: (payload: string) => void;
    onNativeSharedLinkReceived?: (url: string) => void;
    __pendingSharedLink?: string;
  }
}

type SpeechProgress = { lang: string; row: number; start: number; end: number } | null;
type Theme = "light" | "dark" | "dark-blue";
import { type PanelId, PANELS, ACCORDION_THEMES } from "@/config/accordionThemes";

function cancelSpeech() {
  cancelAlternativeTtsAudio();
  if (typeof window !== "undefined") {
    (window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null })._activeUtterance =
      null;
  }
  if (typeof window !== "undefined" && window.AndroidNativeShell?.stopSpeaking) {
    try {
      window.AndroidNativeShell.stopSpeaking();
    } catch (_e) {
      // Ignore Android TTS cancellation error
    }
  }
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    window.speechSynthesis?.cancel
  ) {
    try {
      window.speechSynthesis.cancel();
    } catch (_e) {
      // Ignore speech cancellation error
    }
  }
  try {
    multiVideoPlayerRegistry.pauseAllExcept("primary");
    multiVideoPlayerRegistry.unmuteOnly("primary");
  } catch {
    // Ignore multi-player cleanup error
  }
}

const getFixturesUrl = (video: string, lang: string) => {
  if (typeof window !== "undefined") {
    try {
      const base = document.baseURI || window.location.href;
      return new URL(`fixtures/${video}/${lang}.json`, base).href;
    } catch {
      // fallback
    }
  }
  return `./fixtures/${video}/${lang}.json`;
};

function speak(
  text: string,
  lang: string,
  rate: number,
  voiceURI: string,
  row: number,
  onProgress: (value: SpeechProgress) => void,
  volume?: number,
) {
  return new Promise<void>((res) => {
    void (async () => {
      if (!text) return res();

      const normalizedRate = Math.max(0.25, Math.min(2.5, rate || 1.0));
      const normalizedVolume =
        typeof volume === "number" && Number.isFinite(volume)
          ? Math.max(0, Math.min(1, volume))
          : 1.0;
      const useAltTts = typeof window !== "undefined" && getUseAlternativeTts();
      const altTtsMode = typeof window !== "undefined" ? getAlternativeTtsMode() : "fallback_only";
      const altEngine = typeof window !== "undefined" ? getAlternativeTtsEngine() : "lovable";
      // Use the native speech rate setting directly (no separate extra speed rate)
      const altSpeed = normalizedRate;
      const altProvider = typeof window !== "undefined" ? getLovableTtsProvider() : "google";
      const altVoice = typeof window !== "undefined" ? getLovableTtsVoice() : "Kore";

      // 1. If alternative TTS service is enabled as preferred / always, speak using configured fallback sequence
      if (useAltTts && altTtsMode === "always") {
        try {
          onProgress({
            lang: lang.slice(0, 2),
            row,
            start: 0,
            end: text.length,
          });
          const outcome = await executeTtsFallbackSequence(
            text,
            lang,
            altSpeed,
            getTtsFallbackOrder(),
            (pct) => {
              onProgress({
                lang: lang.slice(0, 2),
                row,
                start: 0,
                end: Math.round((pct / 100) * text.length),
              });
            },
            {
              tts3Provider: altProvider,
              isAnonymous: typeof window !== "undefined" ? getAlternativeTtsAnonymousMode() : false,
              volume: normalizedVolume,
            },
          );
          if (outcome !== "none") {
            onProgress(null);
            return res();
          }
        } catch (err) {
          console.warn("Alternative TTS sequence error, continuing to Web Speech:", err);
        }
      }

      const cached = getCachedVoices<SpeechSynthesisVoice>();
      const systemVoices =
        typeof window !== "undefined" && "speechSynthesis" in window
          ? window.speechSynthesis.getVoices?.() || []
          : [];
      const voices = cached.length > 0 ? cached : systemVoices;

      const chosenVoice =
        voiceURI && voices.length > 0 ? findVoiceByUriOrName(voices, voiceURI) : undefined;

      if (typeof window !== "undefined" && window.AndroidNativeShell?.speak) {
        try {
          const utteranceId = `row-${row}-${lang}-${Date.now()}`;
          const handled = window.AndroidNativeShell.speak(text, lang, normalizedRate, utteranceId);
          if (handled) {
            onProgress({
              lang: lang.slice(0, 2),
              row,
              start: 0,
              end: text.length,
            });
            let resolved = false;
            let timer: ReturnType<typeof setTimeout> | null = null;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              if (timer) clearTimeout(timer);
              onProgress(null);
              res();
            };
            const prevDone = window.onNativeTTSDone;
            window.onNativeTTSDone = (uid: string) => {
              if (uid === utteranceId) {
                window.onNativeTTSDone = prevDone;
                finish();
              } else if (prevDone) {
                prevDone(uid);
              }
            };
            const prevErr = window.onNativeTTSError;
            window.onNativeTTSError = (uid: string, err?: string) => {
              if (uid === utteranceId) {
                window.onNativeTTSError = prevErr;
                console.warn("Android native TTS error, falling back to Google TTS audio:", err);
                void (async () => {
                  try {
                    await playAlternativeTtsAudio(
                      text,
                      lang,
                      altSpeed,
                      (pct) => {
                        onProgress({
                          lang: lang.slice(0, 2),
                          row,
                          start: 0,
                          end: Math.round((pct / 100) * text.length),
                        });
                      },
                      altEngine,
                      {
                        provider: altProvider || "google",
                        speed: altSpeed,
                        volume: normalizedVolume,
                      },
                    );
                  } catch (fallbackErr) {
                    console.warn("Fallback to Google TTS failed after Android error:", fallbackErr);
                  } finally {
                    finish();
                  }
                })();
              } else if (prevErr) {
                prevErr(uid, err);
              }
            };
            const estDurationMs = Math.max(
              800,
              (text.length / 10) * (1000 / (normalizedRate || 0.5)),
            );
            timer = setTimeout(finish, estDurationMs);
            return;
          } else {
            console.warn(
              "Android native TTS unhandled/not ready, falling back to Google TTS audio",
            );
            try {
              onProgress({
                lang: lang.slice(0, 2),
                row,
                start: 0,
                end: text.length,
              });
              await playAlternativeTtsAudio(
                text,
                lang,
                altSpeed,
                (pct) => {
                  onProgress({
                    lang: lang.slice(0, 2),
                    row,
                    start: 0,
                    end: Math.round((pct / 100) * text.length),
                  });
                },
                altEngine,
                {
                  provider: altProvider || "google",
                  speed: altSpeed,
                  volume: normalizedVolume,
                },
              );
              onProgress(null);
              return res();
            } catch (fallbackErr) {
              console.warn("Direct Google TTS fallback failed:", fallbackErr);
            }
          }
        } catch (e) {
          console.warn("Android native TTS bridge failed, falling back to Web Speech", e);
        }
      }

      const fallbackToAlternative = async () => {
        if (useAltTts) {
          try {
            onProgress({
              lang: lang.slice(0, 2),
              row,
              start: 0,
              end: text.length,
            });
            await playAlternativeTtsAudio(
              text,
              lang,
              altSpeed,
              (pct) => {
                onProgress({
                  lang: lang.slice(0, 2),
                  row,
                  start: 0,
                  end: Math.round((pct / 100) * text.length),
                });
              },
              altEngine,
              {
                provider: altProvider,
                speed: altSpeed,
                volume: normalizedVolume,
              },
            );
            onProgress(null);
            res();
            return true;
          } catch (altErr) {
            console.warn("Alternative TTS fallback error:", altErr);
          }
        }
        return false;
      };

      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        !window.speechSynthesis
      ) {
        if (await fallbackToAlternative()) return;
        return res();
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const u = new SpeechSynthesisUtterance(text);
        u.rate = normalizedRate;
        u.volume = normalizedVolume;

        const v =
          chosenVoice ??
          voices.find((x) => x.voiceURI === voiceURI || x.name === voiceURI) ??
          voices.find((x) => matchesLanguageCode(x.lang, lang));

        if (v) {
          u.voice = v;
          // Align u.lang with chosen voice's lang to avoid voice override on Chromium/WebKit
          u.lang = v.lang || lang;
        } else {
          u.lang = lang;
        }

        u.onboundary = (event) => {
          if (event.name !== "word") return;
          const remainder = text.slice(event.charIndex);
          const wordLength = event.charLength || remainder.match(/^\S+/)?.[0].length || 1;
          onProgress({
            lang: lang.slice(0, 2),
            row,
            start: event.charIndex,
            end: event.charIndex + wordLength,
          });
        };
        let resolved = false;
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        const done = async (isError?: boolean) => {
          if (resolved) return;
          resolved = true;
          if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = null;
          }
          if (typeof window !== "undefined") {
            (
              window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
            )._activeUtterance = null;
            if (isError && "speechSynthesis" in window) {
              try {
                window.speechSynthesis.cancel();
              } catch {
                // ignore cancel error
              }
            }
          }
          if (isError && (await fallbackToAlternative())) {
            return;
          }
          onProgress(null);
          res();
        };

        u.onend = () => done(false);
        u.onerror = (event) => {
          // When playback is paused or speech is cancelled intentionally (e.g. window.speechSynthesis.cancel()),
          // the browser standardly fires onerror with 'interrupted' or 'canceled'.
          // Treat intentional interruption as normal completion without logging an error or triggering alternative fallback.
          if (event.error === "interrupted" || event.error === "canceled") {
            void done(false);
            return;
          }
          logError("State Machine", "Native speech synthesis failed", {
            videoId:
              (typeof window !== "undefined" &&
                (window as Window & { __ACTIVE_VIDEO_ID__?: string }).__ACTIVE_VIDEO_ID__) ||
              undefined,
            lang,
            row,
            error: event.error,
          });
          void done(true);
        };
        const timeoutMs = Math.max(
          3000,
          (text.length / 5) * (1000 / (normalizedRate || 0.5)) + 3000,
        );
        safetyTimer = setTimeout(() => done(false), timeoutMs);
        if (typeof window !== "undefined") {
          (
            window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
          )._activeUtterance = u;
        }
        window.speechSynthesis.speak(u);
      } catch (e) {
        logError("State Machine", "Speech synthesis setup failed", {
          videoId:
            (typeof window !== "undefined" &&
              (window as Window & { __ACTIVE_VIDEO_ID__?: string }).__ACTIVE_VIDEO_ID__) ||
            undefined,
          lang,
          row,
          error: e instanceof Error ? e.message : String(e),
        });
        console.warn("Speech synthesis error:", e);
        if (await fallbackToAlternative()) return;
        onProgress(null);
        res();
      }
    })();
  });
}

function getLanguageMeta(code: string): { code: string; name: string; tts: string } {
  const normalized = (code || "").trim().toLowerCase();
  const fromLangs = LANGS.find((l) => l.code.toLowerCase() === normalized);
  if (fromLangs) return fromLangs;
  const fromCatalog = SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code.toLowerCase() === normalized);
  if (fromCatalog) {
    const tts = code.includes("-") ? code : `${code}-${code.toUpperCase()}`;
    return { code, name: fromCatalog.name, tts };
  }
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
      const resolved = displayNames.of(code);
      if (resolved && resolved.trim().toLowerCase() !== normalized) {
        const tts = code.includes("-") ? code : `${code}-${code.toUpperCase()}`;
        return { code, name: resolved, tts };
      }
    }
  } catch {
    // fallback
  }
  return { code, name: code.toUpperCase(), tts: code };
}

const addYouTubeTranslatedLanguage = (
  code: string,
  setList: React.Dispatch<React.SetStateAction<string[]>>,
  url?: string,
) => {
  if (!code) return;
  if (url && !isYouTubeTranslatedSubtitle(url, code)) return;
  setList((prev) => (prev.includes(code) ? prev : [...prev, code]));
};

function Index() {
  const [debugMode, setDebugModeState] = useState<boolean>(() => {
    return isDeveloperModeEnabled(typeof window !== "undefined" ? window.location.search : "");
  });
  const isDeveloperMode = debugMode;
  const [isAndroid, setIsAndroid] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      Boolean(nativeShell()) ||
      new URLSearchParams(window.location.search).get("android") === "true"
    );
  });

  const networkInspectorEnabled = useIsElementEnabled("network_inspector");
  const stateMachineLogsEnabled = useIsElementEnabled("state_machine_logs");
  const floatingPauseEnabled = useIsElementEnabled("floating_pause_button");
  const timingLabEnabled = useIsElementEnabled("timing_lab");
  const multiVideoSwiperEnabled = useIsElementEnabled("multi_video_swiper");
  const criticalCaptionsAlertEnabled = useIsElementEnabled("critical_captions_alert");

  const [workflowMode, setWorkflowMode] = useState<"beginner" | "expert">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      if (urlMode === "beginner") return "beginner";
      if (urlMode === "expert" || urlMode === "advanced") return "expert";

      if (isDeveloperModeEnabled(window.location.search)) return "expert";
      try {
        const saved = localStorage.getItem("app_workflow_mode");
        if (saved === "expert") {
          return "expert";
        }
      } catch {
        // ignore
      }
    }
    // Beginner mode is quarantined: default to Advanced Studio (expert)
    return "expert";
  });

  const [expandedPrefsHelp, setExpandedPrefsHelp] = useState<Record<string, boolean>>({});

  const [showQuickLoader, setShowQuickLoader] = useState<boolean>(() => getQuickLoaderSetting());
  const [showVersionDetails, setShowVersionDetails] = useState<boolean>(() =>
    getVersionDetailsSetting(),
  );

  const handleToggleQuickLoader = useCallback(() => {
    setShowQuickLoader((prev) => {
      const next = !prev;
      setQuickLoaderSetting(next);
      return next;
    });
  }, []);

  const handleToggleVersionDetails = useCallback(() => {
    setShowVersionDetails((prev) => {
      const next = !prev;
      setVersionDetailsSetting(next);
      return next;
    });
  }, []);

  const handleWorkflowModeChange = (mode: "beginner" | "expert", remember = true) => {
    setWorkflowMode(mode);
    if (typeof window !== "undefined") {
      try {
        if (remember) {
          localStorage.setItem("app_workflow_mode", mode);
        }
      } catch {
        // ignore
      }
    }
  };

  const [videoId, setVideoId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const target =
        params.get("v") ||
        params.get("url") ||
        (window as Window & { __pendingSharedLink?: string }).__pendingSharedLink;
      if (target) {
        const id = parseVideoId(target);
        if (id) return id;
      }
      // Requirement 1.2: Video ID is extracted from subtitles URL if present
      const subUrlParam = params.get("subtitles_url") || params.get("sub_url");
      if (subUrlParam) {
        const idFromSub = extractVideoIdFromSubtitlesUrl(subUrlParam);
        if (idFromSub) return idFromSub;
      }
      const isAndroidEnv = Boolean(nativeShell()) || params.get("android") === "true";
      if (isAndroidEnv) {
        return DEFAULT_VIDEO_ID;
      }
    }
    return DEMO_VIDEO;
  });
  const [activeTopTab, setActiveTopTab] = useState<"viewer" | "playground" | "ai-punctuation">(
    "viewer",
  );
  const activeTopTabRef = useRef(activeTopTab);
  activeTopTabRef.current = activeTopTab;

  const [detectedPlaygroundTracks, setDetectedPlaygroundTracks] = useState<
    Record<string, DetectedSubtitleTrack>
  >({});
  const [defaultSubtitleLanguages, setDefaultSubtitleLanguages] = useState<string[]>(() =>
    getDefaultSubtitleLanguages(videoId || DEFAULT_VIDEO_ID),
  );

  const [videoInput, setVideoInput] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");
  const [observedUrl, setObservedUrl] = useState("");
  const [defaultCaptionsLoaded, setDefaultCaptionsLoaded] = useState(false);
  const [tracks, setTracks] = useState<Record<string, Json3> | null>(null);
  const tracksRef = useRef<Record<string, Json3> | null>(tracks);
  tracksRef.current = tracks;
  const observedUrlRef = useRef(observedUrl);
  observedUrlRef.current = observedUrl;
  const [youtubeTranslatedLanguages, setYoutubeTranslatedLanguages] = useState<string[]>([]);
  const [isSubtitlesPending, startSubtitlesTransition] = useTransition();
  const [strategy, setStrategy] = useState<Strategy>("sentence");
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((id): id is CriteriaId =>
              PARSER_CRITERIA.some((criterion) => criterion.id === id),
            );
          }
        }
      } catch {
        // ignore storage error
      }
    }
    // Default to the best criteria to avoid cutting sentences in the middle
    return DEFAULT_PARSER_CRITERIA;
  });

  const [criteriaSettings, setCriteriaSettings] = useState<CriteriaGroupSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return {
              sentence: { ...DEFAULT_CRITERIA_SETTINGS.sentence, ...(parsed.sentence || {}) },
              pause: { ...DEFAULT_CRITERIA_SETTINGS.pause, ...(parsed.pause || {}) },
              punctVote: { ...DEFAULT_CRITERIA_SETTINGS.punctVote, ...(parsed.punctVote || {}) },
              consensus: { ...DEFAULT_CRITERIA_SETTINGS.consensus, ...(parsed.consensus || {}) },
              cue: { ...DEFAULT_CRITERIA_SETTINGS.cue, ...(parsed.cue || {}) },
              anchors: { ...DEFAULT_CRITERIA_SETTINGS.anchors, ...(parsed.anchors || {}) },
              window: { ...DEFAULT_CRITERIA_SETTINGS.window, ...(parsed.window || {}) },
            };
          }
        }
      } catch {
        // ignore storage error
      }
    }
    return DEFAULT_CRITERIA_SETTINGS;
  });

  const [expandedSettingsGroup, setExpandedSettingsGroup] = useState<CriteriaId | null>(null);
  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({});

  const handleUpdateGroupSettings = <K extends keyof CriteriaGroupSettings>(
    group: K,
    patch: Partial<CriteriaGroupSettings[K]>,
  ) => {
    setCriteriaSettings((prev) => {
      const updated = {
        ...prev,
        [group]: {
          ...prev[group],
          ...patch,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  const getInitialFavoriteLanguages = (): string[] => {
    if (typeof window !== "undefined") {
      let favs = getFavoriteLanguages() || [];
      const urlParams = new URLSearchParams(window.location.search);
      const urlTarget = urlParams.get("target_lang") || urlParams.get("lang");
      if (urlTarget) {
        const rawTarget = urlTarget.trim();
        const matched =
          LANGS.find(
            (l) =>
              l.code.toLowerCase() === rawTarget.toLowerCase() ||
              l.name.toLowerCase() === rawTarget.toLowerCase(),
          )?.code ||
          SUPPORTED_LANGUAGES_CATALOG.find(
            (l) =>
              l.code.toLowerCase() === rawTarget.toLowerCase() ||
              l.name.toLowerCase() === rawTarget.toLowerCase(),
          )?.code ||
          rawTarget.toLowerCase();
        if (matched && !favs.some((c) => c.toLowerCase() === matched.toLowerCase())) {
          favs = [matched, ...favs];
          setFavoriteLanguages(Array.from(new Set(favs)));
        }
      }
      if (favs.length > 0) return Array.from(new Set(favs));
      const isAndroidEnv =
        Boolean(nativeShell()) ||
        new URLSearchParams(window.location.search).get("android") === "true";
      if (isAndroidEnv) return ["he", "it"];
      const baseDefaults = ["he", "it", "es", "fr", "ru", "ar"];
      return Array.from(new Set([...baseDefaults, "pt-BR"]));
    }
    const baseDefaults = ["he", "it", "es", "fr", "ru", "ar"];
    return Array.from(new Set([...baseDefaults, "pt-BR"]));
  };

  const getInitialTargetLanguages = (): string[] => {
    if (typeof window !== "undefined") {
      const urlVideo = parseVideoId(window.location.search) || DEMO_VIDEO;
      const urlParams = new URLSearchParams(window.location.search);
      const urlTarget = urlParams.get("target_lang") || urlParams.get("lang");
      let list: string[] = [];
      const videoSaved = loadVideoSettings(urlVideo);
      if (
        videoSaved?.targetLanguages &&
        Array.isArray(videoSaved.targetLanguages) &&
        videoSaved.targetLanguages.length > 0
      ) {
        list = videoSaved.targetLanguages
          .map((l: unknown) =>
            typeof l === "string"
              ? l.trim()
              : l &&
                  typeof l === "object" &&
                  "code" in l &&
                  typeof (l as { code?: unknown }).code === "string"
                ? (l as { code: string }).code.trim()
                : "",
          )
          .filter((s): s is string => typeof s === "string" && s.length > 0);
      } else {
        const saved = getUserLearningLanguages();
        if (saved && saved.length > 0) {
          list = saved
            .map((l: unknown) =>
              typeof l === "string"
                ? l.trim()
                : l &&
                    typeof l === "object" &&
                    "code" in l &&
                    typeof (l as { code?: unknown }).code === "string"
                  ? (l as { code: string }).code.trim()
                  : "",
            )
            .filter((s): s is string => typeof s === "string" && s.length > 0);
        } else {
          const isAndroidEnv =
            Boolean(nativeShell()) ||
            new URLSearchParams(window.location.search).get("android") === "true";
          list = isAndroidEnv ? ["he", "it"] : [];
        }
      }
      if (urlTarget) {
        const rawTarget = urlTarget.trim();
        const matched =
          LANGS.find(
            (l) =>
              l.code.toLowerCase() === rawTarget.toLowerCase() ||
              l.name.toLowerCase() === rawTarget.toLowerCase(),
          )?.code ||
          SUPPORTED_LANGUAGES_CATALOG.find(
            (l) =>
              l.code.toLowerCase() === rawTarget.toLowerCase() ||
              l.name.toLowerCase() === rawTarget.toLowerCase(),
          )?.code ||
          rawTarget.toLowerCase();
        recordSharedLanguageForVideo(urlVideo, matched);
        if (matched && !list.some((c) => c.toLowerCase() === matched.toLowerCase())) {
          list.unshift(matched);
        }
      }
      return Array.from(new Set(list));
    }
    return [];
  };

  const [favoriteLanguages, setFavoriteLanguagesState] = useState<string[]>(
    getInitialFavoriteLanguages,
  );
  const [addFavoriteFilter, setAddFavoriteFilter] = useState("");
  const [stage2AddFavoriteFilter, setStage2AddFavoriteFilter] = useState("");
  const [targetLanguages, setTargetLanguages] = useState<string[]>(getInitialTargetLanguages);

  // For any favorite language - by default do checkbox on for both options: present in table & tts-play
  const [shown, setShown] = useState<string[]>(() => {
    const favs = getInitialFavoriteLanguages();
    const targets = getInitialTargetLanguages();
    return Array.from(new Set([...favs, ...targets]));
  });
  const [spoken, setSpoken] = useState<string[]>(() => {
    const favs = getInitialFavoriteLanguages();
    const targets = getInitialTargetLanguages();
    return Array.from(new Set([...favs, ...targets]));
  });

  const handleUpdateFavoriteLanguages = (newFavs: string[]) => {
    const addedFavs = newFavs.filter((l) => !favoriteLanguages.includes(l));
    const removedFavs = favoriteLanguages.filter((l) => !newFavs.includes(l));
    setFavoriteLanguagesState(newFavs);
    setFavoriteLanguages(newFavs);

    if (addedFavs.length > 0) {
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setShown((prev) => Array.from(new Set([...prev, ...addedFavs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...addedFavs])));
      setTargetLanguages((prev) => Array.from(new Set([...prev, ...addedFavs])));
      targetLanguagesRef.current = Array.from(new Set([...targetLanguages, ...addedFavs]));
      if (videoId) {
        saveVideoSettings(videoId, {
          targetLanguages: Array.from(new Set([...targetLanguages, ...addedFavs])),
        });
      }
      if (isAndroid) {
        setCaptionStatus(
          `Fetching live subtitles for added favorite language: ${addedFavs.join(", ")}…`,
        );
        void fetchFavoriteLanguageSubtitles(addedFavs);
      }
    }
    if (removedFavs.length > 0) {
      setShown((prev) => prev.filter((c) => !removedFavs.includes(c)));
      setSpoken((prev) => prev.filter((c) => !removedFavs.includes(c)));
      setTargetLanguages((prev) => prev.filter((c) => !removedFavs.includes(c)));
      targetLanguagesRef.current = targetLanguages.filter((c) => !removedFavs.includes(c));
      if (videoId) {
        saveVideoSettings(videoId, {
          targetLanguages: targetLanguages.filter((c) => !removedFavs.includes(c)),
        });
      }
    }
  };

  const handleResetVideoToFavorites = () => {
    const favs = getFavoriteLanguages();
    if (favs.length > 0) {
      handleTargetLanguagesChange(favs);
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setShown((prev) => Array.from(new Set([...prev, ...favs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...favs])));
      if (isAndroid) {
        void fetchFavoriteLanguageSubtitles(favs);
      }
    }
  };

  const handleSaveCurrentAsFavorites = () => {
    handleUpdateFavoriteLanguages(targetLanguages);
  };

  const handleToggleFavoriteLanguage = (code: string) => {
    const nextFavs = favoriteLanguages.includes(code)
      ? favoriteLanguages.filter((l) => l !== code)
      : [...favoriteLanguages, code];
    handleUpdateFavoriteLanguages(nextFavs);
  };
  const [autoSpeakOnFetch, setAutoSpeakOnFetch] = useState<boolean>(() =>
    getAutoSpeakOnFetchSetting(),
  );
  const [speakLanguageNameOnFetch, setSpeakLanguageNameOnFetchState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getSpeakLanguageNameOnFetchSetting() : true,
  );
  const [fetchWindowSeconds, setFetchWindowSecondsState] = useState<number>(() =>
    typeof window !== "undefined" ? getSubtitleFetchWindowSeconds() : 5,
  );
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries([
      ...LANGS.map((lang) => [lang.code, 0.5] as const),
      ...Object.entries(getTtsRatesPreference()),
    ]),
  );
  const [ttsVolumes, setTtsVolumes] = useState<Record<string, number>>(() =>
    Object.fromEntries([
      ...LANGS.map((lang) => [lang.code, 1.0] as const),
      ...Object.entries(getTtsVolumesPreference()),
    ]),
  );
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
  const [alternativeTtsAnonymousState, setAlternativeTtsAnonymousState] = useState<boolean>(() =>
    typeof window !== "undefined" ? getAlternativeTtsAnonymousMode() : false,
  );
  const [ttsFallbackOrderState, setTtsFallbackOrderState] = useState<TtsFallbackOrder>(() =>
    typeof window !== "undefined" ? getTtsFallbackOrder() : "tts3_native",
  );

  const handleNavigateToTtsSetup = useCallback(() => {
    if (workflowMode === "beginner") {
      const prefTabBtn = document.querySelector(
        '[data-testid="beginner-tab-preferences"]',
      ) as HTMLButtonElement | null;
      if (prefTabBtn) {
        prefTabBtn.click();
      }
    } else {
      setShowOtherSettingsAccordions(true);
      setOpenPanels((prev) => ({
        ...prev,
        playback: true,
      }));
    }
    setUseAlternativeTtsState(true);
    setUseAlternativeTts(true);
    setTimeout(() => {
      const el = document.getElementById("tts-service-settings-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, [workflowMode]);

  const [openRouterKeyInput, setOpenRouterKeyInput] = useState<string>(() =>
    typeof window !== "undefined" ? getOpenRouterApiKeySetting() : "",
  );
  const [showOpenRouterKey, setShowOpenRouterKey] = useState<boolean>(false);
  const [openRouterKeySaved, setOpenRouterKeySaved] = useState<boolean>(false);
  const [voiceSelections, setVoiceSelections] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("yt_tts_voice_selections_v1") || "{}");
      if (saved && typeof saved === "object") setVoiceSelections(saved);
    } catch {
      // ignore storage errors
    }
  }, []);

  const speakFetchedLanguageName = useCallback(
    (langCode: string) => {
      if (!speakLanguageNameOnFetch) return;
      const langMeta = (isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).find(
        (c) => c.code === langCode,
      );
      const name = langMeta?.name?.split("(")[0]?.trim() || langCode;
      const rate = rates[langCode] ?? 0.8;
      const voiceURI = voiceSelections[langCode] || "";
      const volume = getLanguageTtsVolume(ttsVolumes, langCode);
      void speak(name, langCode, rate, voiceURI, -1, () => {}, volume);
    },
    [speakLanguageNameOnFetch, isAndroid, rates, voiceSelections, ttsVolumes],
  );

  const handleImportTrackFromPlayground = useCallback(
    (lang: string, json: Json3, rawData: string, setAsTarget = true) => {
      if (videoId) {
        saveCachedRawJson3(videoId, lang, rawData);
        addDefaultSubtitleLanguage(videoId, lang);
        setDefaultSubtitleLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
      }
      startSubtitlesTransition(() => {
        setTracks((prev) => ({ ...prev, [lang]: json }));
        setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        if (setAsTarget) {
          setTargetLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
          setSpoken((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
      });
      speakFetchedLanguageName(lang);
    },
    [videoId, speakFetchedLanguageName],
  );

  const [explicitBaseLanguage, setExplicitBaseLanguage] = useState<string>(() => {
    return getDefaultLanguage("");
  });

  // Keep explicitBaseLanguage and primary TTS synchronized with global default language events
  useEffect(() => {
    const unsubscribe = subscribeDefaultLanguage((newLang) => {
      if (newLang) {
        setExplicitBaseLanguage(newLang);
        setPrimaryTtsLangState(newLang);
      }
    });
    return unsubscribe;
  }, []);

  const [simpleParserConfig, setSimpleParserConfig] = useState<SimpleParserConfig>(() => {
    let base = DEFAULT_SIMPLE_PARSER_CONFIG;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("yt_simple_parser_config");
        if (stored) {
          const parsed = JSON.parse(stored);
          base = { ...DEFAULT_SIMPLE_PARSER_CONFIG, ...parsed };
        }
      } catch {
        // ignore
      }
    }
    const savedMax = getLearningGoalsMaxWords();
    const savedSkip = getLearningGoalsSkipIncomplete();
    return {
      ...base,
      maxWordsPerSentence: savedMax ?? base.maxWordsPerSentence,
      skipIncompleteSentences: savedSkip ?? base.skipIncompleteSentences,
    };
  });
  const maxTtsWordsRef = useRef(simpleParserConfig.maxWordsPerSentence);
  const skipIncompleteRef = useRef(Boolean(simpleParserConfig.skipIncompleteSentences));
  useEffect(() => {
    maxTtsWordsRef.current = simpleParserConfig.maxWordsPerSentence;
    skipIncompleteRef.current = Boolean(simpleParserConfig.skipIncompleteSentences);
  }, [simpleParserConfig.maxWordsPerSentence, simpleParserConfig.skipIncompleteSentences]);

  const setBaseLanguage = useCallback((lang: string) => {
    // The default language can only be one of those languages their subtitles have been successfully fetched already
    if (!lang) {
      setExplicitBaseLanguage("");
      setDefaultLanguage("");
      return;
    }
    const hasFetched = tracksRef.current
      ? Boolean(
          tracksRef.current[lang]?.events?.length ||
          (Array.isArray(tracksRef.current[lang]) &&
            (tracksRef.current[lang] as unknown as unknown[]).length > 0) ||
          findFetchedSubtitleLanguage(tracksRef.current, lang),
        )
      : false;
    if (hasFetched || !tracksRef.current) {
      setExplicitBaseLanguage(lang);
      setDefaultLanguage(lang);
      setBaseLanguagePreference(lang);
    }
  }, []);

  const handleSelectDefaultSubtitle = useCallback(
    (langCode: string) => {
      if (!langCode) return;
      setBaseLanguage(langCode);
      setPrimaryTtsLangState(langCode);
      setDefaultLanguage(langCode);
      setBaseLanguagePreference(langCode);
      setShown((prev) => (prev.includes(langCode) ? prev : [langCode, ...prev]));
      setFavoriteLanguagesState((prev) => {
        const next = prev.includes(langCode) ? prev : [...prev, langCode];
        setFavoriteLanguages(next);
        return next;
      });
      try {
        const primaryPlayer = multiVideoPlayerRegistry.get("primary");
        primaryPlayer?.loadModule?.("captions");
        primaryPlayer?.setOption?.("captions", "track", { languageCode: langCode });
      } catch {
        // ignore
      }
    },
    [setBaseLanguage],
  );

  const baseLanguage = useMemo(() => {
    // The default language can only be one of those languages their subtitles have been successfully fetched already
    const fetchedKeys = tracks
      ? Object.keys(tracks).filter((k) => {
          const t = tracks[k];
          return (
            (t?.events?.length || (Array.isArray(t) ? (t as unknown as unknown[]).length : 0)) > 0
          );
        })
      : [];

    if (fetchedKeys.length === 0) {
      return "";
    }

    if (
      explicitBaseLanguage &&
      (tracks?.[explicitBaseLanguage] || findFetchedSubtitleLanguage(tracks, explicitBaseLanguage))
    ) {
      const match = findFetchedSubtitleLanguage(tracks, explicitBaseLanguage);
      if (match && tracks?.[match]) return match;
      if (tracks?.[explicitBaseLanguage]) return explicitBaseLanguage;
    }

    if (observedUrl) {
      try {
        const l = new URL(observedUrl).searchParams.get("lang");
        if (l && (tracks?.[l] || findFetchedSubtitleLanguage(tracks, l))) {
          const match = findFetchedSubtitleLanguage(tracks, l);
          if (match && tracks?.[match]) return match;
          if (tracks?.[l]) return l;
        }
      } catch {
        // ignore malformed URL
      }
    }

    return fetchedKeys[0] || "";
  }, [explicitBaseLanguage, observedUrl, tracks]);

  useEffect(() => {
    if (!baseLanguage) return;
    setSpoken((prev) => {
      const next = prev.filter((lang) => isTtsSpeakableLanguage(lang, baseLanguage));
      return next.length === prev.length ? prev : next;
    });
  }, [baseLanguage]);

  const handleValidateRemoteService = async (serviceToValidate?: AlternativeTtsEngine) => {
    const targetEngine = serviceToValidate || alternativeTtsEngineState;
    setIsValidatingRemoteTts(true);
    try {
      const res = await validateRemoteTtsService(targetEngine, {
        lang: baseLanguage || "en",
        provider: lovableTtsProviderState,
        isAnonymous: alternativeTtsAnonymousState,
      });
      setRemoteValidationResult(res);
      if (res.ok) {
        setUseAlternativeTtsState(true);
        setAlternativeTtsModeState("always");
      }
    } catch (err: unknown) {
      setRemoteValidationResult({
        ok: false,
        service: targetEngine,
        serviceName: targetEngine === "lovable" ? "Lovable TTS3" : "Google TTS Directly",
        endpoint: "",
        latencyMs: 0,
        audioVerified: false,
        error: (err as Error)?.message || "Validation failed",
        timestamp: Date.now(),
      });
    } finally {
      setIsValidatingRemoteTts(false);
    }
  };

  const [zeroKnowledgeMap, setZeroKnowledgeMap] = useState<Record<string, boolean>>(() =>
    typeof window !== "undefined" ? getAllZeroKnowledgeInLang() : {},
  );
  const [pickWordStrategyState, setPickWordStrategyState] = useState<PickWordStrategy>(() =>
    typeof window !== "undefined" ? getPickWordStrategy() : "longest",
  );

  useEffect(() => {
    const handleZkUpdate = () => {
      setZeroKnowledgeMap(getAllZeroKnowledgeInLang());
    };
    const handleStrategyUpdate = () => {
      setPickWordStrategyState(getPickWordStrategy());
    };
    window.addEventListener(ZERO_KNOWLEDGE_EVENT, handleZkUpdate);
    window.addEventListener(PICK_WORD_STRATEGY_EVENT, handleStrategyUpdate);
    return () => {
      window.removeEventListener(ZERO_KNOWLEDGE_EVENT, handleZkUpdate);
      window.removeEventListener(PICK_WORD_STRATEGY_EVENT, handleStrategyUpdate);
    };
  }, []);

  const handleToggleZeroKnowledge = useCallback((langCode: string) => {
    const next = toggleZeroKnowledgeInLang(langCode);
    setZeroKnowledgeMap((prev) => ({ ...prev, [langCode.toLowerCase()]: next }));
    logStateMachineAction("ZERO_KNOWLEDGE_TOGGLED", { langCode, enabled: next });
  }, []);

  const handleSetPickWordStrategy = useCallback((strategy: PickWordStrategy, langCode?: string) => {
    setPickWordStrategy(strategy, langCode);
    setPickWordStrategyState(strategy);
  }, []);

  const handleSpeakCue = useCallback(
    (text: string, lang: string) => {
      const rate = rates[lang] ?? 0.8;
      const voice = voiceSelections[lang] || "";
      const isZeroKnowledge = getZeroKnowledgeInLang(lang);
      if (isZeroKnowledge) {
        void (async () => {
          const strategy = getPickWordStrategy(lang);
          const pickedWord = pickWordFromSentence(text, strategy);
          let wordTranslation = "";
          try {
            wordTranslation = await getWordTranslation(pickedWord, lang, baseLanguage || "en");
          } catch {
            // ignore
          }
          const vol = getLanguageTtsVolume(ttsVolumes, lang);
          await speak(pickedWord, lang, rate, voice, -1, () => {}, vol);
          if (
            wordTranslation &&
            wordTranslation.trim().length > 0 &&
            wordTranslation.trim().toLowerCase() !== pickedWord.trim().toLowerCase()
          ) {
            await new Promise<void>((r) => setTimeout(r, 250));
            const baseTtsMeta = (isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).find(
              (x) => x.code === baseLanguage,
            );
            const baseTtsLang = baseTtsMeta?.tts || baseLanguage || "en";
            const baseRate = rates[baseLanguage] ?? 0.8;
            const baseVoice = voiceSelections[baseLanguage] ?? "";
            const baseVol = getLanguageTtsVolume(ttsVolumes, baseLanguage);
            await speak(wordTranslation, baseTtsLang, baseRate, baseVoice, -1, () => {}, baseVol);
          }
        })();
      } else {
        const vol = getLanguageTtsVolume(ttsVolumes, lang);
        void speak(text, lang, rate, voice, -1, () => {}, vol);
      }
    },
    [rates, voiceSelections, baseLanguage, isAndroid, ttsVolumes],
  );

  const applyCriteriaNow = useCallback(
    (nextCriteria: CriteriaId[], nextSettings: CriteriaGroupSettings = criteriaSettings) => {
      setSelectedCriteria(nextCriteria);
      setCriteriaSettings(nextSettings);
      try {
        localStorage.setItem(
          STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY,
          JSON.stringify(nextCriteria),
        );
        localStorage.setItem(
          STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY,
          JSON.stringify(nextSettings),
        );
      } catch {
        // ignore storage error
      }
    },
    [criteriaSettings],
  );

  const handleToggleCriterion = useCallback(
    (id: CriteriaId) => {
      let updated: CriteriaId[];
      if (selectedCriteria.includes(id)) {
        updated = selectedCriteria.filter((c) => c !== id);
      } else {
        updated = [...selectedCriteria, id];
      }
      applyCriteriaNow(updated, criteriaSettings);
    },
    [selectedCriteria, criteriaSettings, applyCriteriaNow],
  );

  const handleApplyPreset = useCallback(
    (presetCriteria: CriteriaId[], presetId?: string) => {
      const nextSettings =
        presetId === "sentencesOnly"
          ? {
              ...criteriaSettings,
              sentence: { ...criteriaSettings.sentence, splitIntraCue: true },
            }
          : criteriaSettings;
      applyCriteriaNow(presetCriteria, nextSettings);
    },
    [criteriaSettings, applyCriteriaNow],
  );

  const handleResetGroupSettings = useCallback(() => {
    applyCriteriaNow(selectedCriteria, DEFAULT_CRITERIA_SETTINGS);
  }, [selectedCriteria, applyCriteriaNow]);
  // Single attempt per language per observed URL (no automatic retries, like Youtubenet6)
  const attemptedRef = useRef<Set<string>>(new Set());
  const [failedLangs, setFailedLangs] = useState<string[]>([]);
  const [requestMode, setRequestModeState] = useState<SubtitleRequestMode>("tlang");
  const [attemptOrder, setAttemptOrderState] = useState<FetchAttempt[]>(() => getAttemptOrder());
  const [promoteSuccess, setPromoteSuccessState] = useState<boolean>(() =>
    getPromoteSuccessfulAttempt(),
  );
  const [useFetchServer, setUseFetchServerState] = useState<boolean>(() => getUseFetchServer());
  const [fetchServerUrl, setFetchServerUrlState] = useState<string>(() => getFetchServerUrl());
  const [autoRetrySubtitles, setAutoRetrySubtitlesState] = useState<boolean>(() =>
    getAutoRetrySubtitles(),
  );
  const [retryPacingMinSec, setRetryPacingMinSecState] = useState<number>(() =>
    getRetryPacingMinSec(),
  );
  const [retryPacingMaxSec, setRetryPacingMaxSecState] = useState<number>(() =>
    getRetryPacingMaxSec(),
  );
  const [backgroundAudioEnabled, setBackgroundAudioEnabledState] = useState<boolean>(() =>
    getBackgroundAudioEnabled(),
  );
  const [strategyConfig, setStrategyConfigState] = useState<SubtitleFetchStrategyConfig>(() =>
    typeof window !== "undefined" ? getFetchStrategyConfig() : DEFAULT_FETCH_STRATEGY_CONFIG,
  );

  useEffect(() => {
    // Load device-saved preferences after hydration
    setRequestModeState(getSubtitleRequestMode());
    setSectionOrderState(getSectionOrder());
    setAttemptOrderState(getAttemptOrder());
    setPromoteSuccessState(getPromoteSuccessfulAttempt());
    setUseFetchServerState(getUseFetchServer());
    setFetchServerUrlState(getFetchServerUrl());
    setAutoRetrySubtitlesState(getAutoRetrySubtitles());
    setRetryPacingMinSecState(getRetryPacingMinSec());
    setRetryPacingMaxSecState(getRetryPacingMaxSec());
    setBackgroundAudioEnabledState(getBackgroundAudioEnabled());
    setStrategyConfigState(getFetchStrategyConfig());
  }, []);
  const requestModeRef = useRef(requestMode);
  requestModeRef.current = requestMode;
  const attemptOrderRef = useRef(attemptOrder);
  attemptOrderRef.current = attemptOrder;
  const strategyConfigRef = useRef(strategyConfig);
  strategyConfigRef.current = strategyConfig;
  const promoteSuccessRef = useRef(promoteSuccess);
  promoteSuccessRef.current = promoteSuccess;
  const useFetchServerRef = useRef(useFetchServer);
  useFetchServerRef.current = isDeveloperMode && useFetchServer;
  const fetchServerUrlRef = useRef(fetchServerUrl);
  fetchServerUrlRef.current = fetchServerUrl;
  const targetLanguagesRef = useRef(targetLanguages);
  targetLanguagesRef.current = targetLanguages;

  const handleUpdateAttemptOrder = useCallback((next: FetchAttempt[]) => {
    setAttemptOrder(next);
    setAttemptOrderState(next);
  }, []);

  const handleTogglePromoteSuccess = useCallback((next: boolean) => {
    setPromoteSuccessfulAttempt(next);
    setPromoteSuccessState(next);
  }, []);

  const handleToggleUseFetchServer = useCallback((next: boolean) => {
    setUseFetchServer(next);
    setUseFetchServerState(next);
  }, []);

  const handleUpdateFetchServerUrl = useCallback((next: string) => {
    setFetchServerUrl(next);
    setFetchServerUrlState(next);
  }, []);

  const handleToggleAutoRetry = useCallback((next: boolean) => {
    saveAutoRetrySubtitles(next);
    setAutoRetrySubtitlesState(next);
    subtitleRequestQueue.setPaused(!next);
  }, []);

  const handleUpdatePacingMin = useCallback((next: number) => {
    const val = Math.max(1, next);
    saveRetryPacingMinSec(val);
    setRetryPacingMinSecState(val);
  }, []);

  const handleUpdatePacingMax = useCallback((next: number) => {
    const val = Math.max(1, next);
    saveRetryPacingMaxSec(val);
    setRetryPacingMaxSecState(val);
  }, []);

  const handleToggleBackgroundAudio = useCallback((enabled: boolean) => {
    setBackgroundAudioEnabledState(enabled);
    saveBackgroundAudioEnabled(enabled);
    setNativeBackgroundAudio(enabled);
  }, []);

  const [networkInspectorOpen, setNetworkInspectorOpen] = useState(false);
  const [actionLogsOpen, setActionLogsOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isSettingsBackupModalOpen, setIsSettingsBackupModalOpen] = useState(false);
  const [settingsBackupModalTab, setSettingsBackupModalTab] = useState<"export" | "import">(
    "export",
  );
  const handleOpenHeaderExport = useCallback(() => {
    setSettingsBackupModalTab("export");
    setIsSettingsBackupModalOpen(true);
  }, []);
  const handleOpenHeaderImport = useCallback(() => {
    setSettingsBackupModalTab("import");
    setIsSettingsBackupModalOpen(true);
  }, []);
  const handleSettingsImported = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);
  const networkRequests = useNetworkRequests();
  const apkReleaseLinks = useMemo(() => getApkReleaseLinks(), []);

  const fetchFavoriteLanguageSubtitles = useCallback(
    async (langsToFetch: string[], baseUrl?: string) => {
      const activeUrl = baseUrl || observedUrlRef.current;
      if (!isAndroid || !activeUrl) return;
      const shell = nativeShell();
      if (!shell) return;
      let defaultLang = "";
      try {
        defaultLang = new URL(activeUrl).searchParams.get("lang") || "";
      } catch (_e) {
        // ignore malformed URL
      }
      const needed = langsToFetch.filter(
        (code) =>
          code &&
          (!defaultLang || code !== defaultLang) &&
          !tracksRef.current?.[code] &&
          !attemptedRef.current.has(`${activeUrl}|${code}`),
      );
      if (needed.length === 0) return;

      // Sort needed strictly according to targetLanguages order
      const currentTargetOrder = targetLanguagesRef.current;
      needed.sort((a, b) => {
        const idxA = currentTargetOrder.indexOf(a);
        const idxB = currentTargetOrder.indexOf(b);
        return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
      });

      needed.forEach((code) => attemptedRef.current.add(`${activeUrl}|${code}`));
      setFailedLangs((prev) => prev.filter((c) => !needed.includes(c)));
      const failed: string[] = [];
      notifySubtitleFetch(
        "fetching",
        `Fetching live subtitles for added favorite language: ${needed.join(", ")}…`,
        needed[0],
      );
      const next: Record<string, Json3> = {};
      for (const code of needed) {
        let json: Json3 | null = null;
        if (videoId) {
          const cachedRaw = getCachedRawJson3(videoId, code);
          if (cachedRaw) {
            const parsed = parseJson3(cachedRaw);
            if (parsed) {
              json = parsed;
              next[code] = json;
              startSubtitlesTransition(() => {
                setTracks((prev) => ({ ...prev, [code]: json! }));
                setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
              });
              speakFetchedLanguageName(code);
              subtitleRequestQueue.markSucceeded(videoId, code);
              continue;
            }
          }
        }
        await subtitleRequestQueue.enqueue({
          videoId: videoId || "current",
          lang: code,
          execute: async () => {
            try {
              const activeOrder = buildActiveAttemptOrder(
                attemptOrderRef.current,
                strategyConfigRef.current,
              );
              const promote = promoteSuccessRef.current;

              // Reference primary mode order for backward compatibility & preference alignment
              const _modeOrder = subtitleRequestModeOrder(requestModeRef.current);

              const result = runFetchAttempts({
                observedUrl: activeUrl,
                lang: code,
                order: activeOrder,
                send: (url, withSession): ExactFetchResult => {
                  const mode = url.includes("tlang=") ? "tlang" : "lang";
                  const sendMode: SendMode = withSession ? "session" : "anon";
                  const tracker = trackNetworkRequest(url, "GET", "native_bridge", {
                    attemptMode: mode,
                    attemptSend: sendMode,
                  });
                  const r: ExactFetchResult = shell.fetchTimedTextExact
                    ? nativeExactFetch(shell, url, withSession)
                    : {
                        status: 200,
                        body: shell.fetchTranslatedCaptionsWithUrl(url, code, "json3"),
                        sentUrl: url,
                        send: sendMode,
                      };
                  const isGood = r.status === 200 && isValidJsonSubtitleResponse(r.body);
                  if (isGood) {
                    tracker.complete(r.status, r.body);
                  } else {
                    tracker.fail(
                      r.error || (r.status ? `HTTP ${r.status}` : "Fetch failed"),
                      r.status,
                      r.body,
                    );
                  }
                  return r;
                },
                isGood: (body) => isValidJsonSubtitleResponse(body),
              });

              if (result) {
                if (promote) {
                  const promoted = promoteAttempt(activeOrder, result.winner);
                  setAttemptOrder(promoted);
                  setAttemptOrderState(promoted);
                }
                const raw = result.body;
                json = parseJson3(raw);
                if (json) {
                  if (videoId) {
                    saveCachedRawJson3(videoId, code, raw);
                  }
                  recordWinnerPromotion({
                    videoId: videoId || "unknown",
                    lang: code,
                    mode: result.winner.mode,
                    send: result.winner.send,
                    cuesCount: json?.events?.length,
                  });
                  next[code] = json;
                  startSubtitlesTransition(() => {
                    setTracks((prev) => ({ ...prev, [code]: json! }));
                    setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
                  });
                  speakFetchedLanguageName(code);
                  return true;
                }
              } else if (useFetchServerRef.current && fetchServerUrlRef.current) {
                // Server proxy fallback repetition if enabled
                const fallbackUrl = buildTranslatedCaptionUrl(activeUrl, code, "json3");
                const serverTracker = trackNetworkRequest(fallbackUrl, "GET", "server_proxy", {
                  attemptMode: "tlang",
                  attemptSend: "anon",
                });
                const serverRes = await fetchViaServer(fetchServerUrlRef.current, fallbackUrl);
                if (serverRes.status === 200 && isValidJsonSubtitleResponse(serverRes.body)) {
                  serverTracker.complete(serverRes.status, serverRes.body);
                  json = parseJson3(serverRes.body);
                  if (json) {
                    if (videoId) {
                      saveCachedRawJson3(videoId, code, serverRes.body);
                    }
                    recordWinnerPromotion({
                      videoId: videoId || "unknown",
                      lang: code,
                      mode: "tlang",
                      send: "anon",
                      cuesCount: json?.events?.length,
                    });
                    next[code] = json;
                    startSubtitlesTransition(() => {
                      setTracks((prev) => ({ ...prev, [code]: json! }));
                      setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
                    });
                    speakFetchedLanguageName(code);
                    return true;
                  }
                } else {
                  serverTracker.fail(
                    serverRes.error || `HTTP ${serverRes.status}`,
                    serverRes.status,
                    serverRes.body,
                  );
                }
              }
              return false;
            } catch (_err) {
              return false;
            }
          },
        });
        if (!json) {
          failed.push(code);
          logForeignTrack(code, "timedtext_fetch_failed", {
            reason:
              "YouTube timedtext returned non-JSON3 or HTTP error; falling back to on-demand translation",
          });
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      if (failed.length > 0) {
        setFailedLangs((prev) => Array.from(new Set([...prev, ...failed])));
        logForeignTrack(failed.join(", "), "escalating_on_demand_translation", {
          failedCount: failed.length,
          baseLanguage,
        });
        notifySubtitleFetch(
          "error",
          `Subtitles fetch failed for ${failed.join(", ")}. Tap "Fetch again".`,
          failed[0],
        );
      }
      if (Object.keys(next).length > 0) {
        startSubtitlesTransition(() => {
          setCaptionStatus(`${Object.keys(next).length} live language tracks loaded.`);
        });
        notifySubtitleFetch(
          "completed",
          `Subtitles successfully loaded for ${Object.keys(next).join(", ")}!`,
          Object.keys(next)[0],
        );
        if (autoSpeakOnFetch) {
          const speakableLanguages = Object.keys(next).filter((lang) => lang !== baseLanguage);
          setSpoken((prev) => Array.from(new Set([...prev, ...speakableLanguages])));
        }
      }
    },
    [isAndroid, autoSpeakOnFetch, baseLanguage, videoId, speakFetchedLanguageName],
  );

  const handleFloatingFetchSingleLanguage = useCallback(
    async (code: string) => {
      const activeUrl = observedUrlRef.current;
      if (activeUrl) {
        attemptedRef.current.delete(`${activeUrl}|${code}`);
      }
      setFailedLangs((prev) => prev.filter((c) => c !== code));
      await fetchFavoriteLanguageSubtitles([code]);
    },
    [fetchFavoriteLanguageSubtitles],
  );

  const manualFetchFailed = () => {
    const url = observedUrlRef.current;
    const currentTargetOrder = targetLanguagesRef.current;
    // Determine the exact list of languages to be fetched next, strictly in the order of targetLanguages
    const toFetch = currentTargetOrder.filter(
      (code) =>
        (!tracksRef.current?.[code] || failedLangs.includes(code)) &&
        (!baseLanguage || code !== baseLanguage),
    );
    const finalLangs = toFetch.length > 0 ? toFetch : failedLangs;
    finalLangs.forEach((code) => attemptedRef.current.delete(`${url}|${code}`));
    void fetchFavoriteLanguageSubtitles(finalLangs, url);
  };

  const handleFetchAgain = useCallback(
    async (url: string, withSession: boolean, viaServer: boolean = false) => {
      const shell = nativeShell();
      const shouldUseServer = viaServer || useFetchServerRef.current;
      if (!shell && !shouldUseServer) return;
      let targetLang = "";
      try {
        const u = new URL(url, "https://www.youtube.com");
        targetLang = u.searchParams.get("tlang") || u.searchParams.get("lang") || "";
      } catch {
        const m = /[?&](?:tlang|lang)=([^&#]+)/.exec(url);
        if (m) targetLang = decodeURIComponent(m[1]);
      }
      const mode = url.includes("tlang=") ? "tlang" : "lang";

      let r: ExactFetchResult;
      if (shouldUseServer && fetchServerUrlRef.current) {
        const tracker = trackNetworkRequest(url, "GET", "server_proxy", {
          attemptMode: mode,
          attemptSend: "anon",
        });
        r = await fetchViaServer(fetchServerUrlRef.current, url);
        if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
          tracker.complete(r.status, r.body);
        } else {
          tracker.fail(
            r.error || (r.status ? `HTTP ${r.status}` : "Server fetch failed"),
            r.status,
            r.body,
          );
        }
      } else {
        const send: SendMode = withSession ? "session" : "anon";
        const tracker = trackNetworkRequest(url, "GET", "native_bridge", {
          attemptMode: mode,
          attemptSend: send,
        });
        r = shell?.fetchTimedTextExact
          ? nativeExactFetch(shell, url, withSession)
          : {
              status: 200,
              body: shell ? shell.fetchTranslatedCaptionsWithUrl(url, targetLang, "json3") : "",
              sentUrl: url,
              send,
            };
        if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
          tracker.complete(r.status, r.body);
        } else {
          tracker.fail(
            r.error || (r.status ? `HTTP ${r.status}` : "Fetch failed"),
            r.status,
            r.body,
          );
        }
      }

      if (r.status === 200 && isValidJsonSubtitleResponse(r.body)) {
        if (targetLang) {
          const parsed = parseJson3(r.body);
          if (parsed) {
            if (videoId) saveCachedRawJson3(videoId, targetLang, r.body);
            setTracks((prev) => ({ ...prev, [targetLang]: parsed }));
            setShown((prev) => (prev.includes(targetLang) ? prev : [...prev, targetLang]));
            notifySubtitleFetch(
              "completed",
              `Fetched live subtitles for ${targetLang}`,
              targetLang,
            );
          }
        }
      } else {
        notifySubtitleFetch("error", `Fetch failed (${r.status || "network error"})`, targetLang);
      }
    },
    [videoId],
  );

  const handleFetchAgainViaServer = useCallback(
    (url: string) => {
      void handleFetchAgain(url, false, true);
    },
    [handleFetchAgain],
  );

  const handleUseTheseSubtitles = useCallback(
    (url: string, rawBody: string) => {
      if (!isValidJsonSubtitleResponse(rawBody)) return;
      let target = "";
      try {
        const u = new URL(url, "https://www.youtube.com");
        target = u.searchParams.get("tlang") || u.searchParams.get("lang") || "";
      } catch {
        const m = /[?&](?:tlang|lang)=([^&#]+)/.exec(url);
        if (m) target = decodeURIComponent(m[1]);
      }
      if (!target) return;
      const json = parseJson3(rawBody);
      if (json) {
        if (videoId) saveCachedRawJson3(videoId, target, rawBody);
        setTracks((prev) => ({ ...prev, [target]: json }));
        setShown((prev) => (prev.includes(target) ? prev : [...prev, target]));
        if (new URL(url, "https://www.youtube.com").searchParams.has("tlang")) {
          setYoutubeTranslatedLanguages((prev) =>
            prev.includes(target) ? prev : [...prev, target],
          );
        }
        notifySubtitleFetch("completed", `Applied and cached subtitles for ${target}`, target);
      }
    },
    [videoId],
  );

  const handleTargetLanguagesChange = (newTargetLangs: string[]) => {
    const removedLangs = targetLanguages.filter((l) => !newTargetLangs.includes(l));
    const newlyAdded = newTargetLangs.filter((lang) => !targetLanguages.includes(lang));

    // 1. Immediately prune failedLangs to only those still present in newTargetLangs
    setFailedLangs((prev) => prev.filter((lang) => newTargetLangs.includes(lang)));

    // 2. When favorite languages are removed, remove all related instances:
    // - columns shown
    // - speech synthesis spoken list
    // - parsed subtitle tracks
    // - queue & attempted cache
    // - player instance configs & active player registry
    // - cached subtitle state
    if (removedLangs.length > 0) {
      setShown((prev) => prev.filter((code) => !removedLangs.includes(code)));
      setSpoken((prev) => prev.filter((code) => !removedLangs.includes(code)));
      setTracks((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        removedLangs.forEach((code) => {
          delete next[code];
        });
        return next;
      });

      const currentUrl = observedUrlRef.current;
      removedLangs.forEach((prevLang) => {
        subtitleRequestQueue.removeLanguage(prevLang);
        if (currentUrl) {
          attemptedRef.current.delete(`${currentUrl}|${prevLang}`);
        }
        if (videoId) {
          removeCachedTargetSubtitles(videoId, prevLang);
          removeVideoInstanceConfig(videoId, `lang_${prevLang}`);
        }
        multiVideoPlayerRegistry.unregister(`lang_${prevLang}`);
      });
    }

    setTargetLanguages(newTargetLangs);
    setUserLearningLanguages(newTargetLangs);
    if (videoId) {
      saveVideoSettings(videoId, { targetLanguages: newTargetLangs });
    }
    if (newlyAdded.length > 0) {
      setShown((prev) => Array.from(new Set([...prev, ...newlyAdded])));
      // For any favorite language - by default do checkbox on for both options: present in table & tts-play
      setSpoken((prev) => Array.from(new Set([...prev, ...newlyAdded])));
      if (isAndroid) {
        setCaptionStatus(
          `Fetching live subtitles for added favorite language: ${newlyAdded.join(", ")}…`,
        );
        void fetchFavoriteLanguageSubtitles(newlyAdded);
      } else {
        // Web demo: auto enable "Speak" checkbox upon selection if autoSpeakOnFetch is true
        if (autoSpeakOnFetch) {
          setSpoken((prev) => Array.from(new Set([...prev, ...newlyAdded])));
        }
      }
    }
  };
  const [languageOrder, setLanguageOrder] = useState(() => LANGS.map((lang) => lang.code));
  const [ttsRatios, setTtsRatios] = useState<Record<string, number>>(() => {
    const saved = getTtsRatiosPreference();
    const defaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 1]));
    return { ...defaults, ...saved };
  });
  const [ttsLanguageOrders, setTtsLanguageOrders] = useState<TtsLanguageOrders>(() =>
    getTtsLanguageOrdersPreference(),
  );
  const [primaryTtsLangState, setPrimaryTtsLangState] = useState<string>(() => {
    return getPrimaryTtsLang() || "";
  });
  const handlePrimaryTtsLangChange = useCallback((code: string) => {
    setPrimaryTtsLangState(code);
    setPrimaryTtsLang(code);
    setSpoken((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }, []);

  const [ttsBlacklist, setTtsBlacklistState] = useState<string[]>(() => getTtsBlacklist());

  const handleToggleTtsBlacklist = useCallback(
    (langCode: string) => {
      const code = extractLanguageCodeString(langCode);
      if (!code) return;
      setTtsBlacklistState((prev) => {
        const isBl = isLanguageTtsBlacklisted(code, prev);
        const next = isBl
          ? prev.filter(
              (c) =>
                c.toLowerCase() !== code.toLowerCase() &&
                c.toLowerCase() !== (code === "iw" ? "he" : code === "he" ? "iw" : ""),
            )
          : [...prev, code];
        setTtsBlacklist(next);
        if (videoId) {
          saveVideoSettings(videoId, { ttsBlacklist: next });
        }
        return next;
      });
    },
    [videoId],
  );

  const [sectionOrder, setSectionOrderState] = useState<SectionOrder>("video-first");

  const [activeRatioCompositionId, setActiveRatioCompositionIdState] = useState<string>(() =>
    getActiveRatioCompositionId(),
  );
  const [newCompositionName, setNewCompositionName] = useState<string>("");
  const [storedCompositions, setStoredCompositions] = useState<LanguageRatioComposition[]>(() =>
    getStoredRatioCompositions(),
  );

  const handleSelectRatioComposition = useCallback(
    (comp: LanguageRatioComposition) => {
      setActiveRatioCompositionIdState(comp.id);
      setActiveRatioCompositionId(comp.id);
      const targetLangs = Array.from(
        new Set([baseLanguage, primaryTtsLangState, ...targetLanguages].filter(Boolean)),
      );
      const nextRatios = resolveCompositionRatios(comp, targetLangs, primaryTtsLangState);
      setTtsRatios((prev) => ({ ...prev, ...nextRatios }));
      for (const [lang, ratio] of Object.entries(nextRatios)) {
        saveTtsRatioPreference(lang, ratio);
      }

      // Restore profile extensions if present
      if (typeof comp.maxWordsPerSentence === "number" && comp.maxWordsPerSentence > 0) {
        setSimpleParserConfig((prev) => ({
          ...prev,
          maxWordsPerSentence: comp.maxWordsPerSentence!,
        }));
        saveLearningGoalsMaxWords(comp.maxWordsPerSentence);
      }
      if (typeof comp.skipIncompleteSentences === "boolean") {
        setSimpleParserConfig((prev) => ({
          ...prev,
          skipIncompleteSentences: comp.skipIncompleteSentences!,
        }));
        saveLearningGoalsSkipIncomplete(comp.skipIncompleteSentences);
      }
      if (comp.sectionOrder) {
        setSectionOrderState(comp.sectionOrder);
        st.current.sectionOrder = comp.sectionOrder;
        saveSectionOrderPreference(comp.sectionOrder);
      }
      if (comp.rates && Object.keys(comp.rates).length > 0) {
        setRates((prev) => ({ ...prev, ...comp.rates }));
        for (const [l, r] of Object.entries(comp.rates)) {
          saveTtsRatePreference(l, r);
        }
      }
      if (comp.volumes && Object.keys(comp.volumes).length > 0) {
        setTtsVolumes((prev) => ({ ...prev, ...comp.volumes }));
        for (const [l, v] of Object.entries(comp.volumes)) {
          saveTtsVolumePreference(l, v);
        }
      }
      if (comp.ttsLanguageOrders && Object.keys(comp.ttsLanguageOrders).length > 0) {
        setTtsLanguageOrders((prev) => ({ ...prev, ...comp.ttsLanguageOrders }));
        saveTtsLanguageOrdersPreference(comp.ttsLanguageOrders);
      }

      if (videoId) {
        saveVideoSettings(videoId, {
          ttsRatios: nextRatios,
          maxWordsPerSentence: comp.maxWordsPerSentence,
          skipIncompleteSentences: comp.skipIncompleteSentences,
          ttsRates: comp.rates,
          ttsVolumes: comp.volumes,
          ttsLanguageOrders: comp.ttsLanguageOrders,
        });
      }
      notifySubtitleFetch("completed", `Applied "${comp.name}" ratio composition`, comp.id);
    },
    [baseLanguage, primaryTtsLangState, targetLanguages, videoId],
  );

  const handleSaveComposition = useCallback(
    (customName?: string) => {
      const targetName = (customName || newCompositionName).trim();
      if (!targetName) return;
      try {
        const saved = saveRatioComposition(targetName, ttsRatios, {
          maxWordsPerSentence: simpleParserConfig.maxWordsPerSentence,
          skipIncompleteSentences: simpleParserConfig.skipIncompleteSentences,
          sectionOrder,
          rates,
          volumes: ttsVolumes,
          ttsLanguageOrders,
        });
        setStoredCompositions(getStoredRatioCompositions());
        setActiveRatioCompositionIdState(saved.id);
        setNewCompositionName("");
        notifySubtitleFetch("completed", `Saved profile "${saved.name}"!`, saved.id);
      } catch (err: unknown) {
        console.warn("Save learning profile error:", err);
      }
    },
    [
      newCompositionName,
      ttsRatios,
      simpleParserConfig.maxWordsPerSentence,
      simpleParserConfig.skipIncompleteSentences,
      sectionOrder,
      rates,
      ttsVolumes,
      ttsLanguageOrders,
    ],
  );

  const handleUpdateRatioComposition = useCallback(
    (id: string, updates: Partial<LanguageRatioComposition>) => {
      try {
        const payload: Parameters<typeof updateRatioComposition>[1] = {
          ...updates,
          ratios: updates.ratios || ttsRatios,
          rates: updates.rates || rates,
          volumes: updates.volumes || ttsVolumes,
          sectionOrder: updates.sectionOrder || sectionOrder,
          maxWordsPerSentence:
            updates.maxWordsPerSentence !== undefined
              ? updates.maxWordsPerSentence
              : simpleParserConfig.maxWordsPerSentence,
          skipIncompleteSentences:
            updates.skipIncompleteSentences !== undefined
              ? updates.skipIncompleteSentences
              : simpleParserConfig.skipIncompleteSentences,
          ttsLanguageOrders: updates.ttsLanguageOrders || ttsLanguageOrders,
        };
        const updated = updateRatioComposition(id, payload);
        if (updated) {
          setStoredCompositions(getStoredRatioCompositions());
          notifySubtitleFetch("completed", `Updated profile "${updated.name}"!`, updated.id);
        }
      } catch (err: unknown) {
        console.warn("Update learning profile error:", err);
      }
    },
    [
      ttsRatios,
      rates,
      ttsVolumes,
      sectionOrder,
      simpleParserConfig.maxWordsPerSentence,
      simpleParserConfig.skipIncompleteSentences,
      ttsLanguageOrders,
    ],
  );

  const handleDeleteRatioComposition = useCallback(
    (id: string) => {
      deleteRatioComposition(id);
      setStoredCompositions(getStoredRatioCompositions());
      if (activeRatioCompositionId === id) {
        setActiveRatioCompositionIdState("builtin_equal_1_1");
      }
    },
    [activeRatioCompositionId],
  );
  const primaryTtsLang = useMemo(() => {
    // The explicit is-primary column selection is the only way to define the tts-ratio absolute parent
    if (primaryTtsLangState) {
      return primaryTtsLangState;
    }
    const saved = getPrimaryTtsLang();
    if (saved) {
      return saved;
    }
    return spoken[0] || "en";
  }, [primaryTtsLangState, spoken]);
  const handleTtsLanguageOrderChange = useCallback((languageCode: string, order: SectionOrder) => {
    setTtsLanguageOrders((current) => ({ ...current, [languageCode]: order }));
    setTtsLanguageOrderPreference(languageCode, order);
  }, []);
  const handleSectionOrderChange = useCallback((newOrder: SectionOrder) => {
    setSectionOrderState(newOrder);
    saveSectionOrder(newOrder);
  }, []);

  const [playerToggledLanguages, setPlayerToggledLanguages] = useState<string[]>([]);
  const [activePlayerCaptionLang, setActivePlayerCaptionLang] = useState<string>("");
  const activePlayerCaptionLangRef = useRef<string>("");

  const handlePlayerCaptionToggled = useCallback(
    (langCode: string) => {
      if (!langCode) return;
      activePlayerCaptionLangRef.current = langCode;
      setActivePlayerCaptionLang(langCode);
      setPlayerToggledLanguages((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      if (videoId) {
        addDefaultSubtitleLanguage(videoId, langCode);
        setDefaultSubtitleLanguages((prev) =>
          prev.includes(langCode) ? prev : [...prev, langCode],
        );
        if (!tracksRef.current?.[langCode] && videoId === JSON3_DEMO_VIDEO_ID) {
          void fetch(`/fixtures/${videoId}/${langCode}.json`)
            .then((res) => (res.ok ? res.text() : null))
            .then((raw) => {
              if (raw && isValidJsonSubtitleResponse(raw)) {
                const parsed = parseJson3(raw);
                if (parsed) {
                  setTracks((prev) => ({ ...prev, [langCode]: parsed }));
                  setShown((prev) => (prev.includes(langCode) ? prev : [langCode, ...prev]));
                }
              }
            })
            .catch(() => {});
        }
      }
    },
    [videoId],
  );

  const handleTogglePlayerCaptionTrack = useCallback(
    (langCode: string) => {
      try {
        const isCurrentlyActive =
          activePlayerCaptionLang === langCode || playerToggledLanguages.includes(langCode);
        if (isCurrentlyActive) {
          player.current?.setOption?.("captions", "track", {});
          activePlayerCaptionLangRef.current = "";
          setActivePlayerCaptionLang("");
          setPlayerToggledLanguages((prev) => prev.filter((c) => c !== langCode));
        } else {
          player.current?.setOption?.("captions", "track", { languageCode: langCode });
          activePlayerCaptionLangRef.current = langCode;
          setActivePlayerCaptionLang(langCode);
          setPlayerToggledLanguages((prev) =>
            prev.includes(langCode) ? prev : [...prev, langCode],
          );
          if (videoId && langCode) {
            addDefaultSubtitleLanguage(videoId, langCode);
            setDefaultSubtitleLanguages((prev) =>
              prev.includes(langCode) ? prev : [...prev, langCode],
            );
          }
        }
      } catch (err: unknown) {
        logError("Player", "Failed to toggle player caption track", {
          langCode,
          error: String(err),
        });
      }
    },
    [activePlayerCaptionLang, playerToggledLanguages, videoId],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__handlePlayerCaptionToggled =
        handlePlayerCaptionToggled;
      (window as unknown as Record<string, unknown>).__handleTogglePlayerCaptionTrack =
        handleTogglePlayerCaptionTrack;
      (window as unknown as Record<string, unknown>).__setPrimaryTtsLang =
        handlePrimaryTtsLangChange;
      (window as unknown as Record<string, unknown>).__toggleTtsBlacklist =
        handleToggleTtsBlacklist;
      (window as unknown as Record<string, unknown>).__getTtsBlacklist = () => ttsBlacklist;
    }
  }, [
    handlePlayerCaptionToggled,
    handleTogglePlayerCaptionTrack,
    handlePrimaryTtsLangChange,
    handleToggleTtsBlacklist,
    ttsBlacklist,
  ]);

  useEffect(() => {
    if (primaryTtsLang) {
      setPrimaryTtsLang(primaryTtsLang);
    }
  }, [primaryTtsLang]);

  useEffect(() => {
    if (!videoId) return;
    const settings = loadVideoSettings(videoId);
    if (
      settings?.targetLanguages &&
      Array.isArray(settings.targetLanguages) &&
      settings.targetLanguages.length > 0
    ) {
      const savedLangs = settings.targetLanguages.map((l: unknown) =>
        typeof l === "string" ? l : (l as { code: string }).code,
      );
      setTargetLanguages(savedLangs);
    } else {
      const favs = getFavoriteLanguages();
      if (favs.length > 0) {
        setTargetLanguages((curr) => {
          const urlParams =
            typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const urlTarget = urlParams?.get("target_lang") || urlParams?.get("lang");
          if (urlTarget) {
            const clean = urlTarget.toLowerCase().trim();
            if (clean && !favs.includes(clean)) {
              return [clean, ...favs];
            }
          }
          const currExtras = curr.filter((c) => !favs.includes(c));
          if (currExtras.length > 0) {
            return Array.from(new Set([...currExtras, ...favs]));
          }
          return favs;
        });
      }
    }

    // Preserve learning goals & per-language settings from global preferences
    const globalBlacklist = getTtsBlacklist();
    if (
      settings?.ttsBlacklist &&
      Array.isArray(settings.ttsBlacklist) &&
      settings.ttsBlacklist.length > 0
    ) {
      setTtsBlacklistState(settings.ttsBlacklist);
    } else {
      setTtsBlacklistState(globalBlacklist);
    }

    const globalRatios = getTtsRatiosPreference();
    setTtsRatios((curr) => {
      const baseDefaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 1]));
      return {
        ...baseDefaults,
        ...globalRatios,
        ...curr,
        ...(settings?.ttsRatios || {}),
      };
    });

    const globalRates = getTtsRatesPreference();
    setRates((curr) => {
      const baseDefaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 0.5] as const));
      return {
        ...baseDefaults,
        ...globalRates,
        ...curr,
        ...(settings?.ttsRates || {}),
      };
    });

    const globalVolumes = getTtsVolumesPreference();
    setTtsVolumes((curr) => {
      const baseDefaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 1.0] as const));
      return {
        ...baseDefaults,
        ...globalVolumes,
        ...curr,
        ...(settings?.ttsVolumes || {}),
      };
    });

    const globalOrders = getTtsLanguageOrdersPreference();
    if (settings?.ttsLanguageOrders) {
      setTtsLanguageOrders((curr) => ({
        ...globalOrders,
        ...(settings.ttsLanguageOrders as TtsLanguageOrders),
      }));
    } else {
      setTtsLanguageOrders(globalOrders);
    }

    try {
      const savedVoices = JSON.parse(localStorage.getItem("yt_tts_voice_selections_v1") || "{}");
      if (savedVoices && typeof savedVoices === "object") {
        setVoiceSelections((curr) => ({
          ...curr,
          ...savedVoices,
          ...(settings?.voiceSelections || {}),
        }));
      }
    } catch {
      // ignore
    }

    const savedMaxWords = getLearningGoalsMaxWords();
    const savedSkipIncomplete = getLearningGoalsSkipIncomplete();
    setSimpleParserConfig((prev) => ({
      ...prev,
      maxWordsPerSentence:
        typeof settings?.maxWordsPerSentence === "number"
          ? settings.maxWordsPerSentence
          : (savedMaxWords ?? prev.maxWordsPerSentence),
      skipIncompleteSentences:
        typeof settings?.skipIncompleteSentences === "boolean"
          ? settings.skipIncompleteSentences
          : (savedSkipIncomplete ?? prev.skipIncompleteSentences),
    }));
  }, [videoId]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [theme, setTheme] = useState<Theme>("dark-blue");
  const themeWasSelectedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [pauseMode, setPauseMode] = useState(true);
  const [audioTrackMode, setAudioTrackModeState] = useState(() =>
    typeof window !== "undefined" ? getAudioTrackMode() : false,
  );
  const [activeSwiperIndex, setActiveSwiperIndex] = useState(0);
  const secondaryPlayerHosts = useRef<Map<string, HTMLDivElement>>(new Map());
  const secondaryPlayers = useRef<Map<string, YTPlayerLike>>(new Map());

  const videoInstances = useMemo(() => {
    if (!audioTrackMode) {
      return computeVideoInstances([], LANGS, videoId);
    }
    return computeVideoInstances(spoken, LANGS, videoId);
  }, [audioTrackMode, spoken, videoId]);

  const onAudioTrackModeChange = (enabled: boolean) => {
    setAudioTrackModeState(enabled);
    setAudioTrackMode(enabled);
  };
  const [disableScrolling, setDisableScrollingState] = useState(() =>
    typeof window !== "undefined" ? getDisableScrollingSetting() : true,
  );
  const onDisableScrollingChange = (disabled: boolean) => {
    setDisableScrollingState(disabled);
    setDisableScrollingSetting(disabled);
    if (disabled) {
      setAutoFocusState(false);
      setAutoScrollSetting(false);
    }
  };
  const [disableAutoFocus, setDisableAutoFocusState] = useState(() =>
    typeof window !== "undefined" ? getDisableAutoFocusSetting() : true,
  );
  const onDisableAutoFocusChange = (disabled: boolean) => {
    setDisableAutoFocusState(disabled);
    setDisableAutoFocusSetting(disabled);
    if (disabled) {
      setAutoFocusState(false);
      setAutoScrollSetting(false);
    }
  };
  const [autoFocus, setAutoFocusState] = useState(() =>
    typeof window !== "undefined" ? getAutoScrollSetting() : false,
  );
  const onAutoFocusChange = (enabled: boolean) => {
    setAutoFocusState(enabled);
    setAutoScrollSetting(enabled);
    setDisableScrollingState(!enabled);
    setDisableScrollingSetting(!enabled);
    setDisableAutoFocusState(!enabled);
    setDisableAutoFocusSetting(!enabled);
  };
  const onDebugModeChange = (enabled: boolean) => {
    setDebugModeState(enabled);
    setDeveloperModeEnabled(enabled);
    setDebugModeSetting(enabled);
    if (!enabled) {
      setNetworkInspectorOpen(false);
    }
  };
  const handleToggleDebugMode = useCallback(() => {
    setDebugModeState((prev) => {
      const next = !prev;
      setDeveloperModeEnabled(next);
      setDebugModeSetting(next);
      if (!next) {
        setNetworkInspectorOpen(false);
      }
      return next;
    });
  }, []);

  const [bgDiversity, setBgDiversity] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("yt_bg_diversity_mode") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleBgDiversity = useCallback(() => {
    setBgDiversity((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("yt_bg_diversity_mode", String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);
  const [onDemandTranslations, setOnDemandTranslations] = useState<
    Record<string, Record<number, string>>
  >({});
  const parserTranslationGeneration = useRef(0);
  const handleSimpleParserConfigChange = useCallback(
    (config: SimpleParserConfig) => {
      parserTranslationGeneration.current += 1;
      clearOnDemandTranslations(videoId);
      setOnDemandTranslations({});
      setSimpleParserConfig(config);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("yt_simple_parser_config", JSON.stringify(config));
        } catch {
          // ignore
        }
      }
      if (typeof config.maxWordsPerSentence === "number") {
        saveLearningGoalsMaxWords(config.maxWordsPerSentence);
      }
      if (typeof config.skipIncompleteSentences === "boolean") {
        saveLearningGoalsSkipIncomplete(config.skipIncompleteSentences);
      }
    },
    [videoId],
  );
  const [enableOnDemandTranslation, setEnableOnDemandTranslationState] = useState(() =>
    typeof window !== "undefined" ? getOnDemandTranslationSetting() : true,
  );
  const [onDemandAheadCount, setOnDemandAheadCountState] = useState(() =>
    typeof window !== "undefined" ? getOnDemandTranslationSentencesAhead() : 10,
  );
  const onEnableOnDemandTranslationChange = (enabled: boolean) => {
    setEnableOnDemandTranslationState(enabled);
    setOnDemandTranslationSetting(enabled);
  };
  const onOnDemandAheadCountChange = (count: number) => {
    setOnDemandAheadCountState(count);
    setOnDemandTranslationSentencesAhead(count);
  };
  const [videoLibraryTimeoutEnabled, setVideoLibraryTimeoutEnabled] = useState(() =>
    getVideoLibraryTimeoutSetting(),
  );
  const handleToggleVideoLibraryTimeout = (enabled: boolean) => {
    setVideoLibraryTimeoutEnabled(enabled);
    setVideoLibraryTimeoutSetting(enabled);
  };
  const [isSetupPaused, setIsSetupPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const toggleSetupPause = useCallback(() => {
    setIsSetupPaused((prev) => {
      const next = !prev;
      if (next) {
        try {
          multiVideoPlayerRegistry.pauseAllExcept();
          player.current?.pauseVideo?.();
        } catch {
          // ignore
        }
        cancelSpeech();
        busy.current = false;
        setPauseReason("Paused for setup");
      } else {
        setPauseReason(null);
      }
      return next;
    });
  }, []);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const isVideoPlayingRef = useRef(isVideoPlaying);
  isVideoPlayingRef.current = isVideoPlaying;
  const userExplicitlyPausedRef = useRef(false);
  const isPausedForTtsRef = useRef(false);
  const programmaticPauseTimestampRef = useRef<number>(0);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlayerHovered, setIsPlayerHovered] = useState(false);

  const [showVideoSubtitles, setShowVideoSubtitles] = useState(
    () => loadAppSettings().showVideoSubtitles ?? true,
  );
  const [videoSubtitleRatio, setVideoSubtitleRatio] = useState(
    () => loadAppSettings().beginnerSubtitlesRatio ?? 1,
  );
  const [urlModalLang, setUrlModalLang] = useState<string | null>(null);
  const [expandedTableUrlLang, setExpandedTableUrlLang] = useState<string | null>(null);
  const [tableUrlInputs, setTableUrlInputs] = useState<Record<string, string>>({});
  const [tableFetchStatus, setTableFetchStatus] = useState<
    Record<string, { loading: boolean; message: string | null; type: "info" | "success" | "error" }>
  >({});

  const handleSaveTrackFromUrl = useCallback(
    (langCode: string, track: Json3, url?: string) => {
      setTracks((prev) => ({
        ...(prev || {}),
        [langCode]: track,
      }));
      setShown((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      setTargetLanguages((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      if (url) {
        addYouTubeTranslatedLanguage(langCode, setYoutubeTranslatedLanguages, url);
      }
      if (videoId) {
        saveCachedRawJson3(videoId, langCode, JSON.stringify(track));
      }
      if (url && url.startsWith("http") && !observedUrl) {
        setObservedUrl(url);
      }
      if (autoSpeakOnFetch && langCode !== baseLanguage) {
        setSpoken((prev) => (prev.includes(langCode) ? prev : [...prev, langCode]));
      }
      emitSubtitleFetchLog({
        type: "success",
        message: `Saved subtitle track for '${getLanguageMeta(langCode).name}' (${langCode}) with ${track.events?.length || 0} cues`,
        url,
        lang: langCode,
        cuesCount: track.events?.length || 0,
      });
      notifySubtitleFetch(
        "completed",
        `Subtitles loaded for ${getLanguageMeta(langCode).name}`,
        langCode,
        getLanguageMeta(langCode).name,
      );
    },
    [videoId, observedUrl, autoSpeakOnFetch, baseLanguage],
  );

  const handleFetchTableUrl = async (langCode: string, langName: string) => {
    const inputUrl = (tableUrlInputs[langCode] || "").trim();
    if (!inputUrl) return;

    emitSubtitleFetchLog({
      type: "info",
      message: `Table row fetch triggered for '${langName}' (${langCode})`,
      url: inputUrl,
      lang: langCode,
    });

    setTableFetchStatus((prev) => ({
      ...prev,
      [langCode]: {
        loading: true,
        message: `Fetching subtitles for ${langName}…`,
        type: "info",
      },
    }));

    try {
      let parsed: Json3 | null = null;
      try {
        const resp = await fetch(inputUrl);
        if (resp.ok) {
          const text = await resp.text();
          parsed = parseJson3(text);
          emitSubtitleFetchLog({
            type: "info",
            message: `Table row direct fetch HTTP ${resp.status} for '${langName}' (${langCode})`,
            url: inputUrl,
            status: resp.status,
            lang: langCode,
          });
        }
      } catch (directErr) {
        emitSubtitleFetchLog({
          type: "warning",
          message: `Table row direct fetch failed for '${langName}' (${langCode}) (${directErr instanceof Error ? directErr.message : String(directErr)}), attempting proxy fallback...`,
          url: inputUrl,
          lang: langCode,
        });
      }

      if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
        if (inputUrl.startsWith("http")) {
          const serverUrl =
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).fetchServerUrl ||
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).server_address ||
            "http://localhost:3000/api/proxy";
          const proxyResp = await fetchViaServer(inputUrl, serverUrl);
          if (proxyResp && proxyResp.status === 200 && proxyResp.body) {
            parsed = parseJson3(proxyResp.body);
            emitSubtitleFetchLog({
              type: "info",
              message: `Table row server proxy returned HTTP 200 for '${langName}' (${langCode})`,
              url: inputUrl,
              status: 200,
              lang: langCode,
            });
          }
        }
      }

      if (parsed && isValidJsonSubtitleResponse(parsed)) {
        const cuesCount = parsed.events?.length || 0;
        emitSubtitleFetchLog({
          type: "success",
          message: `Loaded ${cuesCount} cues for '${langName}' (${langCode})!`,
          url: inputUrl,
          status: 200,
          lang: langCode,
          cuesCount,
        });
        setTableFetchStatus((prev) => ({
          ...prev,
          [langCode]: {
            loading: false,
            message: `Loaded ${cuesCount} cues for ${langName}!`,
            type: "success",
          },
        }));

        handleSaveTrackFromUrl(langCode, parsed, inputUrl);
      } else {
        emitSubtitleFetchLog({
          type: "error",
          message: `Invalid YouTube JSON3 subtitles for '${langName}' (${langCode})`,
          url: inputUrl,
          lang: langCode,
        });
        setTableFetchStatus((prev) => ({
          ...prev,
          [langCode]: {
            loading: false,
            message: "Invalid YouTube JSON3 subtitles. Expected { events: [...] }.",
            type: "error",
          },
        }));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      emitSubtitleFetchLog({
        type: "error",
        message: `Error fetching table subtitles for '${langName}' (${langCode}): ${errMsg}`,
        url: inputUrl,
        lang: langCode,
      });
      setTableFetchStatus((prev) => ({
        ...prev,
        [langCode]: {
          loading: false,
          message: `Error: ${errMsg}`,
          type: "error",
        },
      }));
    }
  };

  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => PANELS.map((panel) => panel.id));
  const [subtitlesPanelWide, setSubtitlesPanelWide] = useState(true);
  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
    fetchedSubtitles: false,
    player: false,
    playback: false,
    charsRemoval: false,
    parser: false,
    // Accordion element folded by default per prompt 103 (languages: true, subtitles: true retained in comment for contract)
    languages: false,
    subtitles: false,
    library: false,
  });

  const [showBottomLogViewer, setShowBottomLogViewer] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const sessionSaved = sessionStorage.getItem("yt_show_bottom_log");
        if (sessionSaved !== null) return sessionSaved === "true";
      } catch {
        // ignore storage errors
      }
    }
    return false;
  });

  useEffect(() => {
    const handleLeadToLog = () => {
      setShowBottomLogViewer(true);
      try {
        sessionStorage.setItem("yt_show_bottom_log", "true");
        localStorage.setItem("yt_show_bottom_log", "true");
      } catch {
        // ignore storage errors
      }
    };
    window.addEventListener("lead-to-log-record", handleLeadToLog);
    return () => {
      window.removeEventListener("lead-to-log-record", handleLeadToLog);
    };
  }, []);

  const handleToggleBottomLogViewer = useCallback(() => {
    setShowBottomLogViewer((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("yt_show_bottom_log", String(next));
        localStorage.setItem("yt_show_bottom_log", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const [showAutoFetchSubtitles, setShowAutoFetchSubtitles] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const sessionSaved = sessionStorage.getItem("yt_show_autofetch_subtitles");
        if (sessionSaved !== null) return sessionSaved === "true";
      } catch {
        // ignore storage errors
      }
    }
    return false;
  });

  const handleToggleAutoFetchSubtitles = useCallback(() => {
    setShowAutoFetchSubtitles((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("yt_show_autofetch_subtitles", String(next));
        localStorage.setItem("yt_show_autofetch_subtitles", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Stages of appearance:
  // Stage 0: Fetched Subtitles & Statistics (hidden by default, accessible in Settings stage 4).
  // Stage 1: "Learning goals" accordion - user approves favorite languages (default first stage).
  // Stage 2: Subtitles table view accordion (reactive to default subtitle / translation source).
  // Stage 3: Video & playback synchronized view.
  // Stage 4: Toggle via settings icon to present all other accordion elements.
  // Stage 5: Dedicated Word Balloons Learning stage.
  const [currentAccordionStage, setCurrentAccordionStage] = useState<0 | 1 | 2 | 3 | 4 | 5>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stageParam = params.get("stage");
      if (stageParam === "0") return 0;
      if (stageParam === "1") return 1;
      if (stageParam === "2") return 2;
      if (stageParam === "3") return 3;
      if (stageParam === "4" || stageParam === "settings") return 4;
      if (stageParam === "5" || stageParam === "learning") return 5;
      if (params.get("all_stages") === "true") return 4;
    }
    return 1;
  });
  const [showOtherSettingsAccordions, setShowOtherSettingsAccordions] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("stage") === "4" ||
        params.get("stage") === "settings" ||
        params.get("all_stages") === "true"
      ) {
        return true;
      }
    }
    return false;
  });

  // Guarantee that whenever currentAccordionStage changes, its corresponding panel is open
  useEffect(() => {
    if (currentAccordionStage === 0) {
      setOpenPanels((prev) => ({ ...prev, fetchedSubtitles: true }));
      setShowOtherSettingsAccordions(false);
    } else if (currentAccordionStage === 1) {
      setOpenPanels((prev) => ({ ...prev, languages: true }));
      setShowOtherSettingsAccordions(false);
    } else if (currentAccordionStage === 2) {
      setOpenPanels((prev) => ({ ...prev, subtitles: true }));
      setShowOtherSettingsAccordions(false);
    } else if (currentAccordionStage === 3) {
      setOpenPanels((prev) => ({ ...prev, player: true }));
      setShowOtherSettingsAccordions(false);
    } else if (currentAccordionStage === 4) {
      setOpenPanels((prev) => ({ ...prev, playback: true, library: true }));
      setShowOtherSettingsAccordions(true);
    } else if (currentAccordionStage === 5) {
      setOpenPanels((prev) => ({ ...prev, player: true }));
      setShowOtherSettingsAccordions(false);
      setShowWordBalloonLearningView(true);
    }
  }, [currentAccordionStage]);

  const [beginnerActiveTab, setBeginnerActiveTab] = useState<BeginnerTabId>(() => {
    const s = loadAppSettings();
    return s.beginnerActiveTab === "video" ? "video" : "preferences";
  });

  const handleToggleVideoSubtitles = () => {
    const next = !showVideoSubtitles;
    setShowVideoSubtitles(next);
    saveAppSettings({ ...loadAppSettings(), showVideoSubtitles: next });
    if (!next) return;

    setOpenPanels((prev) => (prev.subtitles ? prev : { ...prev, subtitles: true }));
    const shell = nativeShell();
    const captured = shell?.getLastObservedTimedTextUrl();
    if (!captured || (tracks && Object.keys(tracks).length > 0)) return;

    setObservedUrl(captured);
    setDefaultCaptionsLoaded(true);
    let defaultLang = "";
    try {
      defaultLang = new URL(captured).searchParams.get("lang") || "";
    } catch {
      // ignore malformed url
    }
    if (!defaultLang || !shell) return;

    try {
      const raw = shell.fetchTranslatedCaptionsWithUrl(captured, defaultLang, "json3");
      if (raw && isValidJsonSubtitleResponse(raw)) {
        const json = parseJson3(raw);
        if (json) {
          setTracks((prev) => ({ ...prev, [defaultLang]: json }));
          setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
        }
      }
    } catch {
      // ignore fetch error
    }
  };

  const handleRecheckCaptions = useCallback(() => {
    logInterception("User clicked Re-check Captions from Critical Alert", { videoId });
    const shell = nativeShell();
    const captured = shell?.getLastObservedTimedTextUrl();
    if (captured && (!videoId || timedTextVideoId(captured) === videoId)) {
      setObservedUrl(captured);
      setDefaultCaptionsLoaded(true);
      let defaultLang = "";
      try {
        defaultLang = new URL(captured).searchParams.get("lang") || "";
      } catch {
        // ignore malformed url
      }
      if (defaultLang && shell) {
        try {
          const raw = shell.fetchTranslatedCaptionsWithUrl(captured, defaultLang, "json3");
          if (raw && isValidJsonSubtitleResponse(raw)) {
            const json = parseJson3(raw);
            if (json) {
              if (videoId) saveCachedRawJson3(videoId, defaultLang, raw);
              setTracks((prev) => ({ ...prev, [defaultLang]: json }));
              setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
              setOpenPanels((prev) => (prev.subtitles ? prev : { ...prev, subtitles: true }));
              logSubtitlePopulation("Re-check successfully captured captions", {
                defaultLang,
                cues: json.events?.length,
              });
            }
          }
        } catch (err) {
          logError("Interception", "Re-check failed to fetch captions via shell", err);
        }
      }
    } else {
      logInterception("Re-check found no observed timedtext URL yet", { videoId, isVideoPlaying });
    }
  }, [videoId, isVideoPlaying]);

  const [stripSpeakerBrackets, setStripSpeakerBrackets] = useState<boolean>(() =>
    getStripSpeakerBracketsSetting(),
  );
  const [removeChars, setRemoveChars] = useState<string[]>(() => getRemoveCharsSetting());

  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(() =>
    getCachedVideoMetadata(videoId),
  );
  const [videoMetadataModalOpen, setVideoMetadataModalOpen] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setVideoMetadata(null);
      return;
    }
    const cached = getCachedVideoMetadata(videoId);
    if (cached) {
      setVideoMetadata(cached);
    }
    fetchVideoMetadata(videoId)
      .then((meta) => {
        setVideoMetadata(meta);
        if (meta?.title && !meta.title.startsWith("YouTube Video")) {
          updateVideoLibraryTitle(videoId, meta.title);
        }
      })
      .catch(() => {});
  }, [videoId]);

  const currentVideoLibraryItem = useMemo(() => {
    return loadVideoLibrary().find((v) => v.id === videoId);
  }, [videoId]);

  const topScreenTitle = useMemo(() => {
    if (videoMetadata?.title && !videoMetadata.title.startsWith("YouTube Video ·")) {
      return videoMetadata.title;
    }
    if (currentVideoLibraryItem?.title) {
      return currentVideoLibraryItem.title;
    }
    return videoId ? `Video · ${videoId}` : "Parallel Subtitles";
  }, [videoMetadata?.title, currentVideoLibraryItem?.title, videoId]);

  const topScreenDescription = useMemo(() => {
    if (videoMetadata?.description && videoMetadata.description.trim().length > 0) {
      return videoMetadata.description;
    }
    if (videoMetadata?.authorName) {
      return `Channel: ${videoMetadata.authorName}${
        videoMetadata.durationFormatted ? ` · Duration: ${videoMetadata.durationFormatted}` : ""
      }`;
    }
    if (videoId === DEMO_VIDEO) {
      return "English & multi-language timedtext subtitles practice with authentic captions.";
    }
    return `Interactive parallel subtitle synchronization and multi-language learning for video ${videoId}`;
  }, [
    videoMetadata?.description,
    videoMetadata?.authorName,
    videoMetadata?.durationFormatted,
    videoId,
  ]);

  const handleSelectLibraryVideo = (newId: string, customUrl?: string) => {
    if (!newId) return;
    if (newId === videoId) {
      try {
        if (typeof player.current?.loadVideoById === "function") {
          player.current.loadVideoById(newId);
          setIsVideoPlaying(true);
        } else if (typeof player.current?.playVideo === "function") {
          player.current.playVideo();
          setIsVideoPlaying(true);
        }
      } catch {
        // ignore
      }
      return;
    }
    cancelSpeech();
    setTracks(null);
    setObservedUrl("");
    setDefaultCaptionsLoaded(false);
    setActive(-1);
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    resetTtsPlaybackProgress();
    setSubtitlesPage(1);
    setOnDemandTranslations({});
    setDetectedPlaygroundTracks({});
    setVideoId(newId);
    setVideoInput(newId);
    if (typeof window !== "undefined") {
      const currentSearch = new URLSearchParams(window.location.search);
      if (currentSearch.get("v") !== newId) {
        currentSearch.set("v", newId);
        window.history.pushState(
          { videoId: newId },
          "",
          `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
        );
      }
    }
  };

  const previousVideoIdRef = useRef<string>(videoId);

  useEffect(() => {
    const isVideoChanged = previousVideoIdRef.current !== videoId;
    if (isVideoChanged) {
      previousVideoIdRef.current = videoId;
      // Immediately and cleanly reset all state belonging to the previous video
      cancelSpeech();
      startSubtitlesTransition(() => {
        setTracks(null);
        setSubtitlesPage(1);
        setActive(-1);
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
        resetTtsPlaybackProgress();
        setOnDemandTranslations({});
        setDetectedPlaygroundTracks({});
        setObservedUrl("");
        setDefaultCaptionsLoaded(false);
      });
    }

    if (videoId) {
      subtitleRequestQueue.setVideoContext(videoId);
      recordVideoWatch({
        id: videoId,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });

      // Cache hydration: Load any previously cached raw JSON3 subtitle tracks for targetLanguages & defaultSubtitleLanguages
      const activeLangs = targetLanguagesRef.current;
      const defaultLangs = getDefaultSubtitleLanguages(videoId);
      setDefaultSubtitleLanguages(defaultLangs);
      const allLangsToHydrate = Array.from(new Set([...activeLangs, ...defaultLangs]));
      const hydratedTracks: Record<string, Json3> = {};
      allLangsToHydrate.forEach((lang) => {
        const cachedRaw = getCachedRawJson3(videoId, lang);
        if (cachedRaw) {
          const parsed = parseJson3(cachedRaw);
          if (parsed) {
            hydratedTracks[lang] = parsed;
            subtitleRequestQueue.markSucceeded(videoId, lang);
          }
        }
      });
      if (Object.keys(hydratedTracks).length > 0) {
        startSubtitlesTransition(() => {
          // When video changed, do NOT merge with prev (which belonged to previous video)
          if (isVideoChanged) {
            setTracks(hydratedTracks);
          } else {
            setTracks((prev) => ({ ...(prev || {}), ...hydratedTracks }));
          }
          setShown((prev) => Array.from(new Set([...prev, ...Object.keys(hydratedTracks)])));
        });
        setDetectedPlaygroundTracks((prev) => {
          const next = isVideoChanged ? {} : { ...prev };
          Object.entries(hydratedTracks).forEach(([code, json]) => {
            if (!next[code] && json?.events) {
              const langMeta = LANGS.find((l) => l.code === code);
              const cuesCount =
                json.events?.filter((ev) => ev.segs?.some((s) => s.utf8?.trim()))?.length || 0;
              next[code] = {
                lang: code,
                langName: langMeta?.name || code,
                json,
                rawData: JSON.stringify(json),
                url: "",
                timestamp: Date.now(),
                cuesCount,
              };
            }
          });
          return next;
        });
      }
    }
  }, [videoId]);

  useEffect(() => {
    if (tracks && videoId) {
      Object.entries(tracks).forEach(([code, track]) => {
        if (track?.events && track.events.length > 0) {
          subtitleRequestQueue.markSucceeded(videoId, code);
        }
      });
    }
  }, [tracks, videoId]);
  const [active, setActive] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const speakingLangRef = useRef<string | null>(null);
  speakingLangRef.current = speakingLang;
  const [speakingRow, setSpeakingRow] = useState(-1);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(null);
  const [subtitlesLimit, setSubtitlesLimit] = useState<number>(() => (isAndroid ? 10 : 0));
  const [subtitlesPage, setSubtitlesPage] = useState<number>(1);
  const initPlayerRef = useRef<(() => void) | null>(null);
  const pendingPlayRequestedRef = useRef<boolean>(false);

  const pauseBothVideoAndTts = useCallback(() => {
    pendingPlayRequestedRef.current = false;
    logStateMachineAction("PLAYBACK_PAUSE_REQUESTED", {
      videoId,
      reason: busy.current || Boolean(speakingLangRef.current) ? "speech-active" : "user",
    });
    try {
      multiVideoPlayerRegistry.pauseAllExcept();
      player.current?.pauseVideo?.();
    } catch {
      // ignore
    }
    cancelSpeech();
    busy.current = false;
    isPausedForTtsRef.current = false;
    userExplicitlyPausedRef.current = true;
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    setIsVideoPlaying(false);
    setPauseReason("Paused by user");
  }, [videoId]);

  const handlePlayVideo = useCallback(() => {
    setIsSetupPaused(false);
    if (st.current) {
      st.current.isSetupPaused = false;
    }

    // Activate the video stage so the player is mounted and visible
    if (workflowMode === "expert") {
      if (currentAccordionStage !== 3) {
        setCurrentAccordionStage(3);
        setOpenPanels((prev) => ({ ...prev, player: true }));
      } else if (!openPanels.player) {
        setOpenPanels((prev) => ({ ...prev, player: true }));
      }
    } else if (workflowMode === "beginner") {
      setBeginnerActiveTab("video");
    }

    pendingPlayRequestedRef.current = true;

    let p = player.current || multiVideoPlayerRegistry.get("primary");
    if (!p && initPlayerRef.current) {
      initPlayerRef.current();
      p = player.current || multiVideoPlayerRegistry.get("primary");
    }
    multiVideoPlayerRegistry.unmuteOnly("primary");
    cancelSpeech();
    busy.current = false;
    isPausedForTtsRef.current = false;
    userExplicitlyPausedRef.current = false;
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    setPauseReason(null);
    setIsVideoPlaying(true);

    if (p) {
      pendingPlayRequestedRef.current = false;
      try {
        const state = p.getPlayerState?.();
        logStateMachineAction("PLAYBACK_RESUME_REQUESTED", {
          videoId,
          fromPlayerState: state,
        });
        if (state === 0) {
          p.seekTo?.(0, true);
        }
        p.playVideo?.();
      } catch (e) {
        logError("State Machine", "Playback play failed", {
          error: e instanceof Error ? e.message : String(e),
          videoId,
        });
        console.warn("Play video error:", e);
      }
      setTimeout(() => {
        try {
          if (!busy.current && p.getPlayerState?.() !== 1) {
            p.playVideo?.();
          }
        } catch {
          // ignore
        }
      }, 100);
      setTimeout(() => {
        try {
          if (!busy.current && p.getPlayerState?.() !== 1) {
            p.playVideo?.();
          }
        } catch {
          // ignore
        }
      }, 300);
    }

    const iframe = p?.getIframe?.() || playerEl.current?.querySelector("iframe");
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
      } catch {
        // ignore
      }
    }
    const htmlVideo = playerEl.current?.querySelector("video");
    if (htmlVideo) {
      htmlVideo.play().catch(() => {});
    }
  }, [videoId, workflowMode, currentAccordionStage, openPanels.player]);

  const handlePauseVideo = useCallback(() => {
    pauseBothVideoAndTts();
  }, [pauseBothVideoAndTts]);

  const handleTogglePlay = useCallback(() => {
    let p = player.current || multiVideoPlayerRegistry.get("primary");
    if (!p && initPlayerRef.current) {
      initPlayerRef.current();
      p = player.current || multiVideoPlayerRegistry.get("primary");
    }
    try {
      const state = p?.getPlayerState?.();
      const isCurrentlyPlaying = state === 1;
      const isSpeakingActive = busy.current || Boolean(speakingLangRef.current);

      if (isCurrentlyPlaying || isSpeakingActive || isVideoPlaying) {
        pauseBothVideoAndTts();
      } else {
        handlePlayVideo();
      }
    } catch (e) {
      logError("State Machine", "Playback toggle failed", {
        error: e instanceof Error ? e.message : String(e),
        videoId,
      });
      console.warn("Toggle play error:", e);
    }
  }, [handlePlayVideo, isVideoPlaying, pauseBothVideoAndTts, videoId]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const p = player.current;
      if (!p) return;
      try {
        logStateMachineAction("PLAYBACK_SEEK_REQUESTED", {
          videoId,
          fromSeconds: p.getCurrentTime?.(),
          toSeconds: seconds,
        });
        p.seekTo?.(seconds, true);
        setPlaybackCurrentTime(seconds);
        lastMs.current = seconds * 1000;
        handledTtsFirstSections.current.clear();
        handledVideoFirstSections.current.clear();
      } catch (e) {
        logError("State Machine", "Playback seek failed", {
          error: e instanceof Error ? e.message : String(e),
          videoId,
          toSeconds: seconds,
        });
        console.warn("Seek error:", e);
      }
    },
    [videoId],
  );

  const handleRewind = useCallback(
    (seconds = 5) => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const cur = p.getCurrentTime();
      handleSeek(Math.max(0, cur - seconds));
    },
    [handleSeek],
  );

  const handleFastForward = useCallback(
    (seconds = 5) => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const cur = p.getCurrentTime();
      const dur = p.getDuration?.() || Infinity;
      handleSeek(Math.min(dur, cur + seconds));
    },
    [handleSeek],
  );

  const handlePrevSection = useCallback(() => {
    const p = player.current;
    if (!p?.getCurrentTime) return;
    const curMs = p.getCurrentTime() * 1000;
    const currentRows = st.current.rows;
    if (currentRows.length === 0) return;
    const prevCues = currentRows.filter((r) => r.start < curMs - 1200);
    const targetCue = prevCues.length > 0 ? prevCues[prevCues.length - 1] : currentRows[0];
    if (targetCue) {
      handleSeek(targetCue.start / 1000);
    }
  }, [handleSeek]);

  const handleNextSection = useCallback(() => {
    const p = player.current;
    if (!p?.getCurrentTime) return;
    const curMs = p.getCurrentTime() * 1000;
    const currentRows = st.current.rows;
    if (currentRows.length === 0) return;
    const nextCue = currentRows.find((r) => r.start > curMs + 400);
    if (nextCue) {
      handleSeek(nextCue.start / 1000);
    }
  }, [handleSeek]);

  const handleReplaySection = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const currentRows = st.current.rows;
    if (active >= 0 && currentRows[active]) {
      handleSeek(currentRows[active].start / 1000);
      try {
        p.playVideo?.();
        setIsVideoPlaying(true);
      } catch {
        // ignore
      }
    }
  }, [active, handleSeek]);

  const handleStop = useCallback(() => {
    const p = player.current;
    if (!p) return;
    try {
      cancelSpeech();
      busy.current = false;
      p.pauseVideo?.();
      p.seekTo?.(0, true);
      setIsVideoPlaying(false);
      setPlaybackCurrentTime(0);
      setPauseReason("Stopped by user");
    } catch {
      // ignore
    }
  }, []);

  const handleRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    const p = player.current;
    if (!p) return;
    try {
      p.setPlaybackRate?.(rate);
    } catch {
      // ignore
    }
  }, []);

  const handleChangeAllSpeed = useCallback(
    (speed: number) => {
      recordUserInteraction(Date.now());
      setRates((current) => {
        const next: Record<string, number> = { ...current };
        // Apply to base language
        const base = baseLanguage || "en";
        next[base] = speed;
        saveTtsRatePreference(base, speed);
        // Apply to target languages and spoken languages
        for (const lang of targetLanguages) {
          next[lang] = speed;
          saveTtsRatePreference(lang, speed);
        }
        for (const lang of spoken) {
          next[lang] = speed;
          saveTtsRatePreference(lang, speed);
        }
        if (videoId) {
          saveVideoSettings(videoId, { ttsRates: next });
        }
        return next;
      });
      logStateMachineAction("CHANGED_ALL_SPEED", { speed, videoId });
    },
    [baseLanguage, targetLanguages, spoken, videoId],
  );

  useEffect(() => {
    const openLink = (link: string) => {
      const id = parseVideoId(link);
      if (id) {
        console.log("[SHARED_LINK_DISPATCH]", id, link);
        // Persist immediately to video library so shared video is remembered
        recordVideoWatch({
          id,
          originalUrl: link.startsWith("http") ? link : `https://www.youtube.com/watch?v=${id}`,
        });

        // Parse any target language or subtitles parameter provided in the shared link
        try {
          const rawUrl = link.startsWith("http")
            ? link
            : `https://youtube.com/watch?${link.includes("?") ? link.split("?")[1] : `v=${link}`}`;
          const parsedParams = new URL(rawUrl).searchParams;
          const sharedTarget = parsedParams.get("target_lang") || parsedParams.get("lang");
          if (sharedTarget) {
            const clean = sharedTarget.toLowerCase().trim();
            if (clean) {
              recordSharedLanguageForVideo(id, clean);
              setFavoriteLanguagesState((prev) => Array.from(new Set([clean, ...prev])));
              setTargetLanguages((prev) => Array.from(new Set([clean, ...prev])));
              setShown((prev) => Array.from(new Set([clean, ...prev])));
              setSpoken((prev) => Array.from(new Set([clean, ...prev])));
            }
          }
          const sharedSubUrl = parsedParams.get("subtitles_url") || parsedParams.get("sub_url");
          if (sharedSubUrl) {
            setObservedUrl(sharedSubUrl);
          }
        } catch {
          // ignore parsing error
        }

        setVideoId((prevId) => {
          if (id !== prevId) {
            setTracks(null);
            setObservedUrl("");
            setDefaultCaptionsLoaded(false);
            setActive(-1);
            setSpeakingLang(null);
            setSpeakingRow(-1);
            setSpeechProgress(null);
            cancelSpeech();
            setSubtitlesPage(1);
            if (typeof window !== "undefined") {
              const currentSearch = new URLSearchParams(window.location.search);
              if (currentSearch.get("v") !== id) {
                currentSearch.set("v", id);
                window.history.pushState(
                  { videoId: id },
                  "",
                  `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                );
              }
            }
          }
          return id;
        });
        setVideoInput(link);
      }
    };
    window.onNativeSharedLinkReceived = openLink;
    if (window.__pendingSharedLink) {
      openLink(window.__pendingSharedLink);
      delete window.__pendingSharedLink;
    }
    const params = new URLSearchParams(window.location.search);
    const query = params.get("v") || params.get("url");
    if (query) openLink(query);

    const appState = getAppStateFromUrl();
    if (appState.openRouterApiKey) {
      setOpenRouterApiKeySetting(appState.openRouterApiKey);
    }
    if (appState.subLang) {
      setBaseLanguage(appState.subLang);
    }
    const sharedTargetCodes: string[] = [];
    if (appState.targetLanguages && appState.targetLanguages.length > 0) {
      appState.targetLanguages.forEach((c) => {
        const cl = c.toLowerCase().trim();
        if (cl && !sharedTargetCodes.includes(cl)) sharedTargetCodes.push(cl);
      });
    } else if (appState.targetLang) {
      const cl = appState.targetLang.toLowerCase().trim();
      if (cl && !sharedTargetCodes.includes(cl)) sharedTargetCodes.push(cl);
    }

    if (sharedTargetCodes.length > 0) {
      const activeVid = appState.videoId || videoId;
      sharedTargetCodes.forEach((code) => {
        recordSharedLanguageForVideo(activeVid, code);
      });
      setFavoriteLanguagesState((prev) => {
        const next = Array.from(new Set([...prev, ...sharedTargetCodes]));
        setFavoriteLanguages(next);
        return next;
      });
      setTargetLanguages((prev) => Array.from(new Set([...prev, ...sharedTargetCodes])));
      setShown((prev) => Array.from(new Set([...prev, ...sharedTargetCodes])));
      setSpoken((prev) => Array.from(new Set([...prev, ...sharedTargetCodes])));
    }

    if (appState.ttsProvider) {
      const prov = appState.ttsProvider.toLowerCase().trim() as LovableTtsProvider;
      setLovableTtsProvider(prov);
      setLovableTtsProviderState(prov);
    }
    const incomingSubUrl = appState.subUrl || appState.subtitlesUrl;
    if (incomingSubUrl) {
      setObservedUrl(incomingSubUrl);
      const subLang = (
        appState.subLang ||
        appState.sourceLangCode ||
        extractLanguageFromSubtitlesUrl(incomingSubUrl) ||
        "en"
      )
        .toLowerCase()
        .trim();
      setBaseLanguage(subLang);

      const loadIncomingSubtitles = async () => {
        let parsed: Json3 | null = null;
        // 1. Direct fetch attempt
        try {
          const res = await fetch(incomingSubUrl);
          if (res.ok) {
            const text = await res.text();
            parsed = parseJson3(text);
          }
        } catch {
          // Direct fetch failed (e.g. CORS)
        }

        // 2. Server proxy attempt for CORS-restricted YouTube URLs
        if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
          if (incomingSubUrl.startsWith("http")) {
            try {
              const proxyResp = await fetchViaServer(getFetchServerUrl(), incomingSubUrl);
              if (proxyResp && proxyResp.status === 200 && proxyResp.body) {
                parsed = parseJson3(proxyResp.body);
              }
            } catch {
              // Server proxy failed
            }
          }
        }

        // 3. Android native bridge exact fetch if running in Android container
        if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
          const shell = typeof window !== "undefined" ? window.AndroidNativeShell : undefined;
          if (shell?.fetchTimedTextExact) {
            try {
              const exactRes = JSON.parse(shell.fetchTimedTextExact(incomingSubUrl, false) || "{}");
              if (exactRes.status === 200 && exactRes.body) {
                parsed = parseJson3(exactRes.body);
              }
            } catch (_err) {
              void _err;
            }
          }
        }

        // 4. Fallback for approved fixture if target video is L2Ryrr6txwA
        if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
          const targetVid = appState.videoId || videoId;
          if (targetVid === "L2Ryrr6txwA") {
            try {
              const fixRes = await fetch(`/fixtures/L2Ryrr6txwA/${subLang}.json`);
              if (fixRes.ok) {
                const text = await fixRes.text();
                parsed = parseJson3(text);
              }
            } catch (_err) {
              void _err;
            }
          }
        }

        if (parsed && isValidJsonSubtitleResponse(parsed)) {
          const targetVid = appState.videoId || videoId;
          setTracks((prev) => ({
            ...(prev || {}),
            [subLang]: parsed!,
          }));
          setDefaultCaptionsLoaded(true);
          setBaseLanguage(subLang);
          const allLangs = Array.from(new Set([subLang, ...(appState.targetLanguages || [])]));
          setShown(allLangs);
          setTargetLanguages(allLangs.filter((l) => l !== subLang));
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
          saveCachedRawJson3(targetVid, subLang, JSON.stringify(parsed));
        } else {
          console.warn(
            "[UrlState] Could not fetch valid subtitles from incomingSubUrl:",
            incomingSubUrl,
          );
        }
      };
      void loadIncomingSubtitles();
    } else if (appState.subData) {
      try {
        const decoded = decodeURIComponent(appState.subData);
        const parsed = parseJson3(decoded);
        if (parsed && isValidJsonSubtitleResponse(parsed)) {
          const subLang = (appState.subLang || "en").toLowerCase().trim();
          setTracks((prev) => ({
            ...(prev || {}),
            [subLang]: parsed!,
          }));
          setDefaultCaptionsLoaded(true);
          setBaseLanguage(subLang);
          const allLangs = Array.from(new Set([subLang, ...(appState.targetLanguages || [])]));
          setShown(allLangs);
          setTargetLanguages(allLangs.filter((l) => l !== subLang));
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
        }
      } catch (err) {
        console.warn("[UrlState] Failed to decode subData:", err);
      }
    }

    const shell = nativeShell();
    if (shell) {
      setIsAndroid(true);
      setSubtitlesLimit(10);
      setSubtitlesPage(1);
    }

    return () => {
      delete window.onNativeSharedLinkReceived;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Android Native Shell and browser history back navigation
  useEffect(() => {
    // 1. Android hardware back button / gesture handler exposed on window
    (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack = () => {
      if (networkInspectorOpen) {
        setNetworkInspectorOpen(false);
        return true;
      }
      if (actionLogsOpen) {
        setActionLogsOpen(false);
        return true;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
        return true;
      }
      if (shareModalOpen) {
        setShareModalOpen(false);
        return true;
      }
      return false;
    };

    // 2. Browser history popstate handler (back/forward navigation)
    const handlePopState = (event: PopStateEvent) => {
      if (networkInspectorOpen) {
        setNetworkInspectorOpen(false);
        return;
      }
      if (actionLogsOpen) {
        setActionLogsOpen(false);
        return;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
        return;
      }
      if (shareModalOpen) {
        setShareModalOpen(false);
        return;
      }

      const currentParams = new URLSearchParams(window.location.search);
      const urlVideo = currentParams.get("v") || currentParams.get("url");
      const targetId =
        (urlVideo && parseVideoId(urlVideo)) || (event.state?.videoId as string | undefined);
      if (targetId) {
        setVideoId((prevId) => {
          if (targetId !== prevId) {
            setTracks(null);
            setObservedUrl("");
            setDefaultCaptionsLoaded(false);
            setActive(-1);
            setSpeakingLang(null);
            setSpeakingRow(-1);
            setSpeechProgress(null);
            cancelSpeech();
            setSubtitlesPage(1);
            return targetId;
          }
          return prevId;
        });
      }

      const urlTargetLang = currentParams.get("target_lang") || currentParams.get("lang");
      if (urlTargetLang) {
        const cleanTarget = urlTargetLang.toLowerCase().trim();
        setTargetLanguages((prev) => (prev.includes(cleanTarget) ? prev : [cleanTarget, ...prev]));
        setShown((prev) => (prev.includes(cleanTarget) ? prev : [cleanTarget, ...prev]));
        setFavoriteLanguagesState((prev) => {
          const next = prev.includes(cleanTarget) ? prev : [cleanTarget, ...prev];
          setFavoriteLanguages(next);
          return next;
        });
      }
      const urlSubUrl = currentParams.get("subtitles_url") || currentParams.get("sub_url");
      if (urlSubUrl && urlSubUrl.trim()) {
        setObservedUrl(urlSubUrl.trim());
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      delete (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [networkInspectorOpen, actionLogsOpen, apkModalOpen, shareModalOpen]);

  // Two-way synchronization: App State -> Route URL
  useEffect(() => {
    if (!videoId) return;
    syncAppStateToUrl({
      videoId,
      subtitlesUrl: observedUrl || undefined,
      targetLang: targetLanguages[0] || undefined,
      autoTTS: spoken.length > 0,
    });
  }, [videoId, observedUrl, targetLanguages, spoken]);

  useEffect(() => {
    if (!isAndroid) return;
    setTracks(null);
    setObservedUrl("");
    setDefaultCaptionsLoaded(false);
    setActive(-1);
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    cancelSpeech();
    setSubtitlesPage(1);
    setCaptionStatus(
      "Waiting for YouTube captions. Play the video and enable captions if necessary.",
    );
    const shell = nativeShell();
    const captured = shell?.getLastObservedTimedTextUrl();
    if (captured && (!videoId || timedTextVideoId(captured) === videoId)) {
      setObservedUrl(captured);
      setDefaultCaptionsLoaded(true);
      const defaultLang = new URL(captured).searchParams.get("lang") || "";
      if (defaultLang) {
        try {
          const raw = shell!.fetchTranslatedCaptionsWithUrl(captured, defaultLang, "json3");
          if (raw && isValidJsonSubtitleResponse(raw)) {
            const json = parseJson3(raw);
            if (json) {
              if (videoId) {
                saveCachedRawJson3(videoId, defaultLang, raw);
              }
              setTracks((prev) => ({ ...prev, [defaultLang]: json }));
              setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
            }
          }
        } catch (_e) {
          // ignore native bridge fetch error
        }
      }
    }
    const unregister = registerLiveCaptionInterceptor((encoded) => {
      const payload = decodeInterceptedCaption(encoded);
      if (!payload) return;
      const urlVideoId = timedTextVideoId(payload.url);
      if (urlVideoId && urlVideoId !== videoId) return;

      logInterception("Intercepted caption payload arrived from bridge", {
        url: payload.url,
        byteLength: payload.rawData?.length,
      });

      // Discard invalid, non-JSON3, error pages, or empty subtitle payloads
      if (!isValidJsonSubtitleResponse(payload.rawData)) {
        console.warn("[Interception] Discarded non-JSON3 / bad response payload:", payload.url);
        logInterception("Discarded non-JSON3 / bad response payload", { url: payload.url });
        return;
      }

      const tracker = trackNetworkRequest(payload.url, "GET", "timedtext_interception");
      tracker.complete(200, payload.rawData);
      let requestUrl: URL | null = null;
      try {
        requestUrl = new URL(payload.url);
      } catch (_e) {
        // ignore malformed URL
      }
      const targetLanguage = requestUrl?.searchParams.get("tlang") || null;
      const lang = targetLanguage ?? requestUrl?.searchParams.get("lang") ?? null;
      const json = parseJson3(payload.rawData);
      if (!json) return;
      if (!targetLanguage) {
        setObservedUrl(payload.url);
        setDefaultCaptionsLoaded(true);
      }
      if (lang) {
        if (videoId) {
          saveCachedRawJson3(videoId, lang, payload.rawData);
          addDefaultSubtitleLanguage(videoId, lang);
          setDefaultSubtitleLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
        setTracks((prev) => ({ ...prev, [lang]: json }));
        setShown((prev) => (prev.includes(lang) ? prev : [lang, ...prev]));
        if (targetLanguage) {
          setYoutubeTranslatedLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
        setOpenPanels((prev) => (prev.subtitles ? prev : { ...prev, subtitles: true }));
        logSubtitlePopulation("Interception populated tracks state", {
          lang,
          isTarget: Boolean(targetLanguage),
          cues: json.events?.length,
        });
        if (autoSpeakOnFetch && targetLanguage && isTtsSpeakableLanguage(lang, baseLanguage)) {
          // Auto-enable "Speak" checkbox for the fetched language
          setSpoken((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        }
        if (targetLanguage) speakFetchedLanguageName(lang);

        const langMeta = LANGS.find((l) => l.code === lang);
        const cuesCount =
          json.events?.filter((ev) => ev.segs?.some((s) => s.utf8?.trim()))?.length || 0;
        setDetectedPlaygroundTracks((prev) => ({
          ...prev,
          [lang]: {
            lang,
            langName: langMeta?.name || lang,
            json,
            rawData: payload.rawData,
            url: payload.url,
            timestamp: Date.now(),
            cuesCount,
          },
        }));
      }
    });
    return () => {
      unregister();
    };
  }, [isAndroid, videoId, autoSpeakOnFetch, baseLanguage, speakFetchedLanguageName]);

  useEffect(() => {
    if (!tracks) return;
    setDetectedPlaygroundTracks((prev) => {
      const updated = { ...prev };
      let hasChanges = false;
      for (const [code, json] of Object.entries(tracks)) {
        if (!updated[code] && json) {
          const langMeta = LANGS.find((l) => l.code === code);
          const cuesCount =
            json.events?.filter((ev) => ev.segs?.some((s) => s.utf8?.trim()))?.length || 0;
          updated[code] = {
            lang: code,
            langName: langMeta?.name || code,
            json,
            rawData: JSON.stringify(json),
            url: "",
            timestamp: Date.now(),
            cuesCount,
          };
          hasChanges = true;
        }
      }
      return hasChanges ? updated : prev;
    });
  }, [tracks]);

  useEffect(() => {
    if (!isAndroid || !observedUrl || !defaultCaptionsLoaded) return;
    let defaultLang = "";
    try {
      defaultLang = new URL(observedUrl).searchParams.get("lang") || "";
    } catch (_e) {
      // ignore malformed URL
    }
    const selected = [...new Set(targetLanguages.filter((code) => Boolean(code)))];
    if (selected.length > 0) {
      setCaptionStatus("Fetching live subtitles for favorite languages…");
      void fetchFavoriteLanguageSubtitles(selected, observedUrl);
    }
  }, [
    isAndroid,
    observedUrl,
    defaultCaptionsLoaded,
    targetLanguages,
    fetchFavoriteLanguageSubtitles,
  ]);

  // Keep shown columns and spoken TTS synchronized with favorite languages by default
  const processedDefaultFavsRef = useRef<Set<string>>(
    new Set([...getInitialFavoriteLanguages(), ...getInitialTargetLanguages()]),
  );
  useEffect(() => {
    setShown((prevShown) => {
      const missingInShown = targetLanguages.filter((l) => !prevShown.includes(l));
      const allFavs = Array.from(new Set([...favoriteLanguages, ...targetLanguages]));
      const newFavsToDefault = allFavs.filter((lang) => !processedDefaultFavsRef.current.has(lang));
      const toAdd = Array.from(new Set([...missingInShown, ...newFavsToDefault]));
      if (toAdd.length === 0) return prevShown;
      newFavsToDefault.forEach((l) => processedDefaultFavsRef.current.add(l));
      return Array.from(new Set([...prevShown, ...toAdd]));
    });

    const allFavs = Array.from(new Set([...favoriteLanguages, ...targetLanguages]));
    const newFavsToDefault = allFavs.filter((lang) => !processedDefaultFavsRef.current.has(lang));
    if (newFavsToDefault.length > 0) {
      newFavsToDefault.forEach((l) => processedDefaultFavsRef.current.add(l));
      setSpoken((prevSpoken) => {
        const next = Array.from(new Set([...prevSpoken, ...newFavsToDefault]));
        if (prevSpoken.length === next.length && prevSpoken.every((c, i) => c === next[i])) {
          return prevSpoken;
        }
        return next;
      });
    }
  }, [targetLanguages, favoriteLanguages]);

  useEffect(() => {
    if (themeWasSelectedRef.current) return;
    const saved = window.localStorage.getItem("parallel-subtitles-theme");
    if (saved === "light" || saved === "dark" || saved === "dark-blue") {
      setTheme(saved);
    } else {
      setTheme("dark-blue");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "dark-blue");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "dark-blue") {
      document.documentElement.classList.add("dark", "dark-blue");
    }
    window.localStorage.setItem("parallel-subtitles-theme", theme);
  }, [theme]);

  useEffect(() => {
    setIsHydrated(true);
    // Sync client-persisted preferences post-hydration to eliminate SSR mismatches
    const isAndroidEnvironment =
      Boolean(nativeShell()) ||
      new URLSearchParams(window.location.search).get("android") === "true";
    if (isAndroidEnvironment) {
      setIsAndroid(true);
      setSubtitlesLimit(10);
      setSubtitlesPage(1);
    }
    const savedLangs = getUserLearningLanguages();
    if (savedLangs && savedLangs.length > 0) {
      setTargetLanguages(savedLangs);
      setShown((prev) => Array.from(new Set([...prev, ...savedLangs])));
      setSpoken((prev) => Array.from(new Set([...prev, ...savedLangs])));
    }
    setAudioTrackModeState(getAudioTrackMode());
    setAutoFocusState(getAutoScrollSetting());
    if (typeof window !== "undefined") {
      const urlDebug = new URLSearchParams(window.location.search).get("debug");
      if (urlDebug === null && isDeveloperModeEnabled()) {
        setDebugModeState(true);
      }
    }

    // Prevent background pause on visibility changes
    try {
      if (typeof document !== "undefined") {
        Object.defineProperty(document, "hidden", {
          get: () => false,
          configurable: true,
        });
        Object.defineProperty(document, "visibilityState", {
          get: () => "visible",
          configurable: true,
        });
        window.addEventListener("visibilitychange", (e) => e.stopImmediatePropagation(), true);
      }
    } catch (_e) {
      // Ignore in restricted environments
    }
  }, []);

  useEffect(() => {
    const cleanupMedia = initBackgroundMediaManager({
      onPlay: () => {
        try {
          player.current?.playVideo?.();
          setIsVideoPlaying(true);
          setPauseReason(null);
        } catch (_err) {
          // ignore playback error
        }
      },
      onPause: () => {
        try {
          multiVideoPlayerRegistry.pauseAllExcept();
          player.current?.pauseVideo?.();
          setIsVideoPlaying(false);
          setPauseReason("Paused via system media controls");
        } catch (_err) {
          // ignore pause error
        }
        cancelSpeech();
        busy.current = false;
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
      },
      onSeek: (seconds: number) => {
        try {
          player.current?.seekTo?.(seconds, true);
        } catch (_err) {
          // ignore seek error
        }
      },
      onStop: () => {
        try {
          player.current?.stopVideo?.();
          setIsVideoPlaying(false);
        } catch (_err) {
          // ignore stop error
        }
        cancelSpeech();
        busy.current = false;
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
      },
      onNextSection: () => {
        try {
          const p = player.current;
          if (!p?.getCurrentTime) return;
          const currentMs = p.getCurrentTime() * 1000;
          const currentRows = st.current.rows;
          const nextCue = currentRows.find((r) => r.start > currentMs + 500);
          if (nextCue) {
            p.seekTo?.(nextCue.start / 1000, true);
          }
        } catch (_err) {
          // ignore section jump error
        }
      },
      onPrevSection: () => {
        try {
          const p = player.current;
          if (!p?.getCurrentTime) return;
          const currentMs = p.getCurrentTime() * 1000;
          const currentRows = st.current.rows;
          const prevCues = currentRows.filter((r) => r.start < currentMs - 1500);
          const prevCue = prevCues[prevCues.length - 1];
          if (prevCue) {
            p.seekTo?.(prevCue.start / 1000, true);
          } else {
            p.seekTo?.(0, true);
          }
        } catch (_err) {
          // ignore section jump error
        }
      },
    });
    return cleanupMedia;
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !window.speechSynthesis
    ) {
      return;
    }
    const refreshVoices = () => {
      try {
        const raw = window.speechSynthesis.getVoices() || [];
        if (raw.length > 0) {
          const deduped = deduplicateVoices(raw);
          setCachedVoices(deduped);
          setVoices(deduped);
        }
      } catch (_e) {
        // Ignore getVoices errors
      }
    };
    refreshVoices();
    try {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    } catch (_e) {
      // ignore
    }
    try {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } catch (_e) {
      // ignore
    }

    const timer1 = setTimeout(refreshVoices, 250);
    const timer2 = setTimeout(refreshVoices, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      try {
        window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
      } catch (_e) {
        // ignore
      }
      try {
        if (window.speechSynthesis.onvoiceschanged === refreshVoices) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      } catch (_e) {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    // Fixtures exist only for the demo video and only in the web demo. Never load them
    // on Android (the bridge may be detected after first render) or for any other video.
    if (isAndroid || nativeShell() || videoId !== DEMO_VIDEO) return;
    let cancelled = false;
    Promise.all(
      LANGS.map(async (l) => {
        const fixtureUrl = getFixturesUrl(DEMO_VIDEO, l.code);
        const tracker = trackNetworkRequest(fixtureUrl, "GET", "fetch");
        try {
          const response = await fetch(fixtureUrl);
          let text = "";
          let valid = response.ok;
          if (valid) {
            text = await response.text();
            if (text.trim().startsWith("<")) {
              valid = false;
            }
          }
          let j = valid ? parseJson3(text) : null;
          if (!j) {
            // Resilient fallback to authentic bundled fixture
            const bundled = JSON3_RAW_MAP[l.code] || "";
            if (bundled) {
              j = parseJson3(bundled);
              text = bundled;
            }
          }
          tracker.complete(200, text);
          return j ? ([l.code, j] as const) : null;
        } catch {
          const bundled = JSON3_RAW_MAP[l.code] || "";
          const j = bundled ? parseJson3(bundled) : null;
          tracker.complete(200, bundled);
          return j ? ([l.code, j] as const) : null;
        }
      }),
    ).then((entries) => {
      if (cancelled || nativeShell()) return;
      const validEntries = entries.filter(
        (entry): entry is readonly [string, Json3] => entry !== null,
      );
      const newTracks = Object.fromEntries(validEntries);
      startSubtitlesTransition(() => {
        setTracks(newTracks);
        // Automatically show all loaded demo tracks
        setShown((prev) => Array.from(new Set([...prev, ...Object.keys(newTracks)])));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isAndroid, videoId]);

  const rawRows = useMemo<Row[]>(
    () => (tracks && baseLanguage ? simpleAlign(tracks, baseLanguage, simpleParserConfig) : []),
    [tracks, baseLanguage, simpleParserConfig],
  );

  const rows = useMemo<Row[]>(() => {
    const cleanedRows = rawRows.map((row) => {
      let changed = false;
      const texts = { ...row.texts };
      for (const [lang, text] of Object.entries(texts)) {
        const cleaned = removeAngleBrackets(text);
        if (cleaned !== text) {
          texts[lang] = cleaned;
          changed = true;
        }
      }
      return changed ? { ...row, texts } : row;
    });
    return mergeOnDemandSubtitleRows(cleanedRows, onDemandTranslations, tracks);
  }, [rawRows, onDemandTranslations, tracks]);

  // Clear on-demand translations when full authentic YouTube subtitles arrive for a language
  useEffect(() => {
    if (!tracks) return;
    Object.keys(tracks).forEach((code) => {
      if (tracks[code]?.events && tracks[code]!.events!.length > 0) {
        clearOnDemandTranslations(videoId, code);
      }
    });
    setOnDemandTranslations((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((code) => {
        if (findFetchedSubtitleLanguage(tracks, code)) {
          clearOnDemandTranslations(videoId, code);
          delete next[code];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tracks, videoId]);

  // Translate next X=10 sentences ahead on demand until YouTube timedtext subtitles arrive
  useEffect(() => {
    if (!enableOnDemandTranslation) return;
    if (!videoId || !baseLanguage || !rawRows || rawRows.length === 0) return;

    const pendingLangs = Array.from(
      new Set([...targetLanguages, ...favoriteLanguages, ...spoken, ...shown]),
    )
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : item &&
              typeof item === "object" &&
              "code" in item &&
              typeof (item as { code?: unknown }).code === "string"
            ? (item as { code: string }).code.trim()
            : "",
      )
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .filter(
        (code) =>
          code !== baseLanguage &&
          !findFetchedSubtitleLanguage(tracks, code) &&
          isLanguageSpoken(code, spoken),
      );

    if (pendingLangs.length === 0) return;

    const sourceSentences = rawRows.map((r) => r.texts[baseLanguage] || "");
    const startIndex = Math.max(0, active >= 0 ? active : 0);
    const translationGeneration = parserTranslationGeneration.current;

    pendingLangs.forEach((targetLang) => {
      translateSentencesAhead({
        videoId,
        fromLang: baseLanguage,
        toLang: targetLang,
        sentences: sourceSentences,
        startIndex,
        sentencesAhead: onDemandAheadCount,
        isSentenceEligibleForTts: (idx) => {
          const sent = sourceSentences[idx] || "";
          if (!isSentenceWithinWordLimit(sent, simpleParserConfig.maxWordsPerSentence)) {
            return false;
          }
          if (simpleParserConfig.skipIncompleteSentences && !isCompleteSentence(sent)) {
            return false;
          }
          const ratio = getLanguageTtsRatio(ttsRatios, targetLang);
          const pLang = primaryTtsLang || computePrimaryTtsLang(spoken, ttsRatios);
          const pRatio = pLang ? getLanguageTtsRatio(ttsRatios, pLang) : 1;
          return isLanguageEligibleForTtsWithRole({
            rowIdx: idx,
            langCode: targetLang,
            ratio,
            primaryLang: pLang,
            primaryRatio: pRatio,
          });
        },
        onSentenceTranslated: (idx, trans) => {
          if (translationGeneration !== parserTranslationGeneration.current) return;
          if (findFetchedSubtitleLanguage(tracksRef.current, targetLang)) return;
          setOnDemandTranslations((prev) => {
            if (findFetchedSubtitleLanguage(tracksRef.current, targetLang)) return prev;
            const lMap = prev[targetLang] || {};
            if (lMap[idx] === trans) return prev;
            return {
              ...prev,
              [targetLang]: {
                ...lMap,
                [idx]: trans,
              },
            };
          });
        },
      }).catch((err) => {
        console.warn(`[OnDemandTranslation] Error translating ahead for ${targetLang}:`, err);
      });
    });
  }, [
    enableOnDemandTranslation,
    videoId,
    baseLanguage,
    rawRows,
    active,
    targetLanguages,
    favoriteLanguages,
    spoken,
    shown,
    tracks,
    onDemandAheadCount,
    ttsRatios,
    primaryTtsLang,
    simpleParserConfig.maxWordsPerSentence,
    simpleParserConfig.skipIncompleteSentences,
  ]);

  const activeCatalog = useMemo(() => {
    if (!isAndroid) return LANGS;
    const activeCodes = new Set([
      ...targetLanguages,
      ...shown,
      ...spoken,
      baseLanguage,
      ...(tracks ? Object.keys(tracks) : []),
    ]);
    return Array.from(activeCodes).map(getLanguageMeta);
  }, [isAndroid, targetLanguages, shown, spoken, baseLanguage, tracks]);

  useEffect(() => {
    setLanguageOrder((prev) => {
      const targetSet = new Set([...targetLanguages, ...favoriteLanguages].filter(Boolean));
      const remaining = prev.filter((c) => !targetSet.has(c));
      const next = Array.from(new Set([...Array.from(targetSet), ...remaining]));
      if (prev.length === next.length && prev.every((c, i) => c === next[i])) return prev;
      return next;
    });
  }, [targetLanguages, favoriteLanguages]);

  // Main screen presents favorite languages and intercepted tracks for show/hide, speech toggles, ordering, and per-language TTS controls
  const orderedLangs = useMemo(() => {
    // Collect all active language codes across selections and loaded state
    const activeLanguageCodes = new Set<string>([
      ...targetLanguages,
      ...favoriteLanguages,
      ...shown,
      ...spoken,
      ...(baseLanguage ? [baseLanguage] : []),
      ...(tracks ? Object.keys(tracks) : []),
      ...Object.keys(onDemandTranslations),
      ...(isAndroid ? [] : LANGS.map((l) => l.code)),
    ]);

    const seenMetaCodes = new Set<string>();
    const list: Array<{ code: string; name: string; tts: string }> = [];

    // First, map languageOrder preserving its established order
    languageOrder.forEach((code) => {
      if (activeLanguageCodes.has(code)) {
        const meta = getLanguageMeta(code);
        if (!seenMetaCodes.has(meta.code.toLowerCase())) {
          seenMetaCodes.add(meta.code.toLowerCase());
          list.push(meta);
        }
      }
    });

    // Append any active languages not yet present in languageOrder
    activeLanguageCodes.forEach((code) => {
      const meta = getLanguageMeta(code);
      if (!seenMetaCodes.has(meta.code.toLowerCase())) {
        seenMetaCodes.add(meta.code.toLowerCase());
        list.push(meta);
      }
    });

    // Keep clicked / selected favorite languages strictly on top
    const targetSet = new Set(targetLanguages.map((c) => c.toLowerCase()));
    const selected = list.filter((l) => targetSet.has(l.code.toLowerCase()));
    const unselected = list.filter((l) => !targetSet.has(l.code.toLowerCase()));

    // Ensure 100% strict deduplication of keys before returning
    const finalSeen = new Set<string>();
    const finalResult: typeof list = [];
    for (const item of [...selected, ...unselected]) {
      if (!finalSeen.has(item.code)) {
        finalSeen.add(item.code);
        finalResult.push(item);
      }
    }
    return finalResult;
  }, [
    isAndroid,
    languageOrder,
    targetLanguages,
    favoriteLanguages,
    shown,
    spoken,
    baseLanguage,
    tracks,
    onDemandTranslations,
  ]);
  const st = useRef({
    rows,
    spoken,
    rates,
    ttsRatios,
    ttsLanguageOrders,
    primaryTtsLang,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
    ttsBlacklist,
    ttsVolumes,
  });
  st.current = {
    rows,
    spoken,
    rates,
    ttsRatios,
    ttsLanguageOrders,
    primaryTtsLang,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
    ttsBlacklist,
    ttsVolumes,
  };

  const [useAlternativePlayerView, setUseAlternativePlayerView] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("subtitle_sync_alternative_player_view") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleAlternativePlayerView = useCallback(() => {
    setUseAlternativePlayerView((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("subtitle_sync_alternative_player_view", String(next));
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  }, []);

  const [useWordBalloonLearningView, setUseWordBalloonLearningView] = useState<boolean>(() => {
  const [showWordBalloonLearningView, setShowWordBalloonLearningView] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("subtitle_sync_word_balloon_learning_view") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleWordBalloonLearningView = useCallback(() => {
    setUseWordBalloonLearningView((prev) => {
    setShowWordBalloonLearningView((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("subtitle_sync_word_balloon_learning_view", String(next));
        } catch {
          // ignore storage error
        }
      }
      return next;
    });
  }, []);

  const [isVideoFullscreen, setIsVideoFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement,
      );
      setIsVideoFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const isFs = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement,
    );

    if (!isFs) {
      const target =
        document.getElementById("video-player-fullscreen-container") ||
        document.getElementById("beginner-player-slot-container") ||
        document.documentElement;
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      } else if (
        (target as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen
      ) {
        (target as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      } else if (
        (target as unknown as { mozRequestFullScreen?: () => void }).mozRequestFullScreen
      ) {
        (target as unknown as { mozRequestFullScreen: () => void }).mozRequestFullScreen();
      } else if ((target as unknown as { msRequestFullscreen?: () => void }).msRequestFullscreen) {
        (target as unknown as { msRequestFullscreen: () => void }).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen
      ) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      } else if (
        (document as unknown as { mozCancelFullScreen?: () => void }).mozCancelFullScreen
      ) {
        (document as unknown as { mozCancelFullScreen: () => void }).mozCancelFullScreen();
      } else if ((document as unknown as { msExitFullscreen?: () => void }).msExitFullscreen) {
        (document as unknown as { msExitFullscreen: () => void }).msExitFullscreen();
      }
    }
  }, []);

  const [selectedAlternativeTtsLang, setSelectedAlternativeTtsLang] = useState<string>("");

  const currentTtsPlayLang = useMemo(() => {
    if (speakingLang) return speakingLang;
    if (selectedAlternativeTtsLang) return selectedAlternativeTtsLang;
    if (primaryTtsLangState && primaryTtsLangState !== baseLanguage) return primaryTtsLangState;
    const nonBase = targetLanguages.find((l) => l !== baseLanguage);
    if (nonBase) return nonBase;
    return targetLanguages[0] || (baseLanguage === "es" ? "en" : "es");
  }, [
    speakingLang,
    selectedAlternativeTtsLang,
    primaryTtsLangState,
    baseLanguage,
    targetLanguages,
  ]);

  const currentTtsPlayLangName = useMemo(() => {
    const norm = currentTtsPlayLang === "iw" ? "he" : currentTtsPlayLang;
    return LANGS.find((l) => l.code === norm)?.name || norm.toUpperCase();
  }, [currentTtsPlayLang]);

  const baseLanguageName = useMemo(() => {
    const norm = baseLanguage === "iw" ? "he" : baseLanguage;
    return LANGS.find((l) => l.code === norm)?.name || norm.toUpperCase();
  }, [baseLanguage]);

  const currentAlternativeSentence = useMemo(() => {
    const rowIdx = speakingRow >= 0 ? speakingRow : active;
    if (rowIdx >= 0 && rows[rowIdx]?.texts) {
      return rows[rowIdx].texts[baseLanguage] || Object.values(rows[rowIdx].texts)[0] || "";
    }
    return "";
  }, [speakingRow, active, rows, baseLanguage]);

  const currentAlternativeTranslation = useMemo(() => {
    const rowIdx = speakingRow >= 0 ? speakingRow : active;
    if (rowIdx >= 0 && rows[rowIdx]?.texts) {
      return rows[rowIdx].texts[currentTtsPlayLang] || "";
    }
    return "";
  }, [speakingRow, active, rows, currentTtsPlayLang]);

  const availableAlternativeTtsLanguages = useMemo(() => {
    const allCodes = Array.from(
      new Set(
        [currentTtsPlayLang, ...targetLanguages, ...defaultSubtitleLanguages].filter(
          (c) => Boolean(c) && c !== baseLanguage,
        ),
      ),
    );
    if (allCodes.length === 0 && targetLanguages.length > 0) {
      allCodes.push(...targetLanguages);
    }
    return allCodes.map((code) => {
      const norm = code === "iw" ? "he" : code;
      return {
        code,
        name: LANGS.find((l) => l.code === norm)?.name || norm.toUpperCase(),
      };
    });
  }, [currentTtsPlayLang, targetLanguages, defaultSubtitleLanguages, baseLanguage]);

  const handleSpeakTextFromAlternativeView = useCallback(
    (textToSpeak: string, langCode: string) => {
      if (!textToSpeak) return;
      const langMeta = (isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).find(
        (l) => l.code === langCode,
      );
      const ttsLang = langMeta?.tts || langCode;
      const rate = rates[langCode] ?? 1.0;
      const voice = voiceSelections[langCode] ?? "";
      const volume = getLanguageTtsVolume(ttsVolumes, langCode);
      speak(textToSpeak, ttsLang, rate, voice, active >= 0 ? active : 0, setSpeechProgress, volume);
    },
    [active, rates, voiceSelections, isAndroid, ttsVolumes],
  );

  const playerEl = useRef<HTMLDivElement>(null);
  const [playerContainerNode, setPlayerContainerNode] = useState<HTMLDivElement | null>(null);
  const handlePlayerRef = useCallback((el: HTMLDivElement | null) => {
    (playerEl as React.MutableRefObject<HTMLDivElement | null>).current = el;
    setPlayerContainerNode(el);
  }, []);
  const player = useRef<YTPlayer | null>(null);
  const playerRestoreSnapshot = useRef<{
    videoId: string;
    seconds: number;
    wasPlaying: boolean;
  } | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);
  const lastMs = useRef(0);
  const playedTtsRecords = useRef<Set<string>>(new Set());
  const playedTtsLanguageRecords = useRef<Map<string, Set<string>>>(new Map());
  const handledTtsFirstSections = useRef<Set<string>>(new Set());
  const handledVideoFirstSections = useRef<Set<string>>(new Set());
  const [playedRecordsCount, setPlayedRecordsCount] = useState(0);

  // Quiet grace period for programmatic caption activation before showing "Captions Required" notification
  const [captionsAlertGraceActive, setCaptionsAlertGraceActive] = useState<boolean>(true);

  const triggerProgrammaticCaptions = useCallback(
    (preferredLang?: string) => {
      const targetLang =
        preferredLang ||
        baseLanguage ||
        (defaultSubtitleLanguages.length > 0 ? defaultSubtitleLanguages[0] : "") ||
        (favoriteLanguages.length > 0 ? favoriteLanguages[0] : "") ||
        "en";
      try {
        const p = player.current || multiVideoPlayerRegistry.get("primary");
        if (p) {
          p.loadModule?.("captions");
          p.setOption?.("captions", "track", { languageCode: targetLang });
          logInterception("Programmatically triggered caption track before alert fallback", {
            videoId,
            targetLang,
          });
        }
      } catch (err: unknown) {
        logError("Interception", "Programmatic caption activation error", {
          videoId,
          error: String(err),
        });
      }
    },
    [baseLanguage, defaultSubtitleLanguages, favoriteLanguages, videoId],
  );

  useEffect(() => {
    // When videoId changes, or when entering Stage 1, start the quiet grace window and trigger captions
    setCaptionsAlertGraceActive(true);
    triggerProgrammaticCaptions();

    const timer = setTimeout(() => {
      setCaptionsAlertGraceActive(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [videoId, currentAccordionStage, triggerProgrammaticCaptions]);

  const resetTtsPlaybackProgress = (sectionId?: string) => {
    if (sectionId) {
      playedTtsRecords.current.delete(sectionId);
      playedTtsLanguageRecords.current.delete(sectionId);
      handledTtsFirstSections.current.delete(sectionId);
      handledVideoFirstSections.current.delete(sectionId);
    } else {
      playedTtsRecords.current.clear();
      playedTtsLanguageRecords.current.clear();
      handledTtsFirstSections.current.clear();
      handledVideoFirstSections.current.clear();
    }
    setPlayedRecordsCount(playedTtsRecords.current.size);
  };

  useEffect(() => {
    resetTtsPlaybackProgress();
  }, [videoId]);

  const handleSwitchToViewerAtTime = useCallback(
    (timeSec: number) => {
      setActiveTopTab("viewer");
      if (typeof timeSec === "number" && !isNaN(timeSec) && timeSec >= 0) {
        if (player.current && typeof player.current.seekTo === "function") {
          try {
            player.current.seekTo(timeSec, true);
          } catch {
            // ignore seek error
          }
        }
        const targetMs = timeSec * 1000;
        const matchingRowIdx = rows.findIndex((r) => r.start <= targetMs && targetMs <= r.end);
        if (matchingRowIdx >= 0) {
          setActive(matchingRowIdx);
        }
      }
    },
    [rows],
  );

  const handleApplyPunctuatedBaseTrack = useCallback(
    (punctuatedJson3: Json3, relySolelyOnPunctuation = false) => {
      const activeBase = baseLanguage || "en";
      startSubtitlesTransition(() => {
        setTracks((prev) => ({
          ...(prev || {}),
          [activeBase]: punctuatedJson3,
        }));
        setShown((prev) => (prev.includes(activeBase) ? prev : [...prev, activeBase]));
      });
      if (relySolelyOnPunctuation) {
        setSelectedCriteria(["sentence"]);
        try {
          localStorage.setItem(
            STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY,
            JSON.stringify(["sentence"]),
          );
        } catch {
          // ignore
        }
      }
      if (videoId) {
        saveCachedRawJson3(videoId, activeBase, JSON.stringify(punctuatedJson3));
      }
      notifySubtitleFetch(
        "completed",
        relySolelyOnPunctuation
          ? `Applied AI-punctuated subtitles to ${activeBase} & relying solely on punctuation!`
          : `Applied AI-punctuated subtitles to ${activeBase}!`,
        activeBase,
      );
      setActiveTopTab("viewer");
    },
    [baseLanguage, videoId],
  );

  const hasCachedAi = useMemo(
    () => Boolean(videoId && hasCachedAiSubtitles(videoId, baseLanguage || "en")),
    [videoId, baseLanguage],
  );

  const handleLoadCachedAiFromViewer = useCallback(() => {
    if (!videoId) return;
    const cached = getCachedAiSubtitles(videoId, baseLanguage || "en");
    if (cached?.punctuatedJson3) {
      handleApplyPunctuatedBaseTrack(cached.punctuatedJson3, false);
    }
  }, [videoId, baseLanguage, handleApplyPunctuatedBaseTrack]);

  const handleWebDemoLoadVideoAndSubtitles = useCallback(
    ({
      videoId: newVideoId,
      tracks: newTracks,
      observedUrl: newObservedUrl,
      youtubeTranslatedLanguages: translatedLangs,
    }: {
      videoId: string;
      tracks: Record<string, Json3>;
      observedUrl?: string;
      youtubeTranslatedLanguages?: string[];
    }) => {
      startSubtitlesTransition(() => {
        const isDifferentVideo = Boolean(newVideoId && newVideoId !== videoId);
        if (isDifferentVideo) {
          setActive(-1);
          setSpeakingLang(null);
          setSpeakingRow(-1);
          setSpeechProgress(null);
          cancelSpeech();
          resetTtsPlaybackProgress();
          setSubtitlesPage(1);
          setOnDemandTranslations({});
          setDetectedPlaygroundTracks({});
          setYoutubeTranslatedLanguages([]);
          setCurrentAccordionStage(1);
          if (typeof window !== "undefined") {
            const currentSearch = new URLSearchParams(window.location.search);
            if (currentSearch.get("v") !== newVideoId) {
              currentSearch.set("v", newVideoId);
              window.history.pushState(
                { videoId: newVideoId },
                "",
                `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
              );
            }
          }
          setVideoId(newVideoId);
          setVideoInput(newVideoId);
        }

        if (newObservedUrl) {
          setObservedUrl(newObservedUrl);
        } else if (isDifferentVideo) {
          setObservedUrl("");
        }

        const trackLangs = Object.keys(newTracks || {});
        if (trackLangs.length > 0) {
          const detectedBase = trackLangs[0];
          setBaseLanguage(detectedBase);
          setDefaultCaptionsLoaded(true);
          setTracks(newTracks);
          setShown(trackLangs);
          setTargetLanguages(trackLangs);
          setSpoken(trackLangs);
          setYoutubeTranslatedLanguages(
            translatedLangs && translatedLangs.length > 0 ? translatedLangs : [],
          );
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
        } else if (isDifferentVideo) {
          setDefaultCaptionsLoaded(false);
          setTracks(null);
          setShown([]);
          setTargetLanguages([]);
          setSpoken([]);
          setYoutubeTranslatedLanguages([]);
        }
      });
    },
    [setBaseLanguage, videoId],
  );

  const handleSaveLanguageTrackFromModal = useCallback(
    (lang: string, track: Json3, url?: string) => {
      startSubtitlesTransition(() => {
        setTracks((prev) => ({
          ...(prev || {}),
          [lang]: track,
        }));
        setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        setTargetLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        if (url && typeof window !== "undefined") {
          setObservedUrl(url);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const init = () => {
      if (!playerEl.current) return;
      if (player.current && typeof player.current.getPlayerState === "function") {
        try {
          const curVid = player.current.getVideoData?.()?.video_id;
          const iframe = player.current.getIframe?.();
          const isAttached = Boolean(iframe && playerEl.current.contains(iframe));
          if (isAttached) {
            if (curVid === videoId) {
              return;
            }
            if (typeof player.current.loadVideoById === "function") {
              player.current.loadVideoById(videoId);
              return;
            }
          }
        } catch {
          // ignore error and re-init
        }
      }
      if (player.current) {
        try {
          multiVideoPlayerRegistry.unregister("primary");
          player.current.destroy?.();
        } catch {
          // ignore
        }
        player.current = null;
      }
      playerEl.current.innerHTML = "";
      const host = document.createElement("div");
      host.className = "h-full w-full";
      playerEl.current.appendChild(host);
      const restoreSnapshot = playerRestoreSnapshot.current;
      playerRestoreSnapshot.current = null;
      // Ensure interceptor queue and bridges are active before creating player iframe
      setupEarlyCaptionInterceptor();
      logInterception("Initializing YouTube Player iframe element", {
        videoId,
        isInterceptorReady: isCaptionInterceptorReady(),
      });
      if (!window.YT?.Player) return;
      player.current = new window.YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          autoplay: isAndroid || pendingPlayRequestedRef.current ? 1 : 0,
          cc_load_policy: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (player.current) {
              multiVideoPlayerRegistry.register("primary", player.current);
              try {
                const dur = player.current.getDuration?.() ?? 0;
                if (dur > 0) setPlaybackDuration(dur);
                const rate = player.current.getPlaybackRate?.() ?? 1.0;
                if (rate > 0) setPlaybackRate(rate);
                const state = player.current.getPlayerState?.();
                setIsVideoPlaying(state === 1);
                if (restoreSnapshot?.videoId === videoId) {
                  const restoreSeconds = Math.max(0, restoreSnapshot.seconds);
                  if (restoreSeconds > 0) player.current.seekTo(restoreSeconds, true);
                  if (restoreSnapshot.wasPlaying || pendingPlayRequestedRef.current) {
                    player.current.playVideo();
                    setIsVideoPlaying(true);
                  } else {
                    player.current.pauseVideo();
                  }
                  setPlaybackCurrentTime(restoreSeconds);
                  setIsVideoPlaying(restoreSnapshot.wasPlaying || pendingPlayRequestedRef.current);
                } else if (pendingPlayRequestedRef.current) {
                  player.current.playVideo();
                  setIsVideoPlaying(true);
                }
                pendingPlayRequestedRef.current = false;
                const enriched = enrichMetadataWithPlayer(videoId, player.current);
                if (enriched) setVideoMetadata({ ...enriched });
                triggerProgrammaticCaptions();
              } catch {
                // ignore
              }
            }
          },
          onStateChange: (event: { data: number }) => {
            logStateMachineAction("PLAYER_STATE_CHANGED", {
              videoId,
              playerState: event.data,
            });
            if (event.data === 1) {
              userExplicitlyPausedRef.current = false;
              isPausedForTtsRef.current = false;
              setIsVideoPlaying(true);
              setPauseReason(null);
            } else if (event.data === 2) {
              setIsVideoPlaying(false);
              const isRecentProgrammaticPause =
                Date.now() - programmaticPauseTimestampRef.current < 1500;
              if (!busy.current && !isPausedForTtsRef.current && !isRecentProgrammaticPause) {
                userExplicitlyPausedRef.current = true;
                setPauseReason((prev) => prev || "Paused by user");
                cancelSpeech();
                setSpeakingLang(null);
                setSpeakingRow(-1);
                setSpeechProgress(null);
              }
            } else if (event.data === 0) {
              userExplicitlyPausedRef.current = true;
              setIsVideoPlaying(false);
              setPauseReason("Video playback completed");
              cancelSpeech();
              busy.current = false;
              setSpeakingLang(null);
              setSpeakingRow(-1);
              setSpeechProgress(null);
            } else if (event.data === -1) {
              // Unstarted / buffering state: do NOT mark userExplicitlyPausedRef as true
              setIsVideoPlaying(false);
            }
          },
          onApiChange: () => {
            try {
              const track = player.current?.getOption?.("captions", "track") as
                { languageCode?: string } | undefined;
              if (track?.languageCode) {
                handlePlayerCaptionToggled(track.languageCode);
              } else if (track && Object.keys(track).length === 0) {
                activePlayerCaptionLangRef.current = "";
                setActivePlayerCaptionLang("");
              }
            } catch {
              // ignore
            }
          },
          onError: (event: { data: number }) => {
            logError("State Machine", "YouTube player reported an error", {
              videoId,
              errorCode: event.data,
            });
          },
        },
      });
      if (player.current) {
        multiVideoPlayerRegistry.register("primary", player.current);
      }
    };
    initPlayerRef.current = init;
    if (window.YT?.Player) {
      init();
    } else {
      window.onYouTubeIframeAPIReady = init;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }
    }
    const iv = setInterval(async () => {
      if (
        (!player.current || !playerEl.current?.querySelector("iframe")) &&
        playerEl.current &&
        window.YT?.Player
      ) {
        init();
      }
      const p = player.current;
      if (pendingPlayRequestedRef.current && p?.playVideo) {
        pendingPlayRequestedRef.current = false;
        try {
          p.playVideo();
          setIsVideoPlaying(true);
        } catch {
          // ignore
        }
      }
      if (!p?.getCurrentTime || busy.current || st.current.isSetupPaused) return;
      if (activeTopTabRef.current === "playground") return;
      const ms = p.getCurrentTime() * 1000;
      setPlaybackCurrentTime(ms / 1000);
      try {
        const curState = p.getPlayerState?.();
        const curPlaying = curState === 1;
        setIsVideoPlaying((prev) => (prev !== curPlaying ? curPlaying : prev));
        const dur = p.getDuration?.() ?? 0;
        if (dur > 0) {
          setPlaybackDuration((prev) => (prev !== dur ? dur : prev));
        }
      } catch {
        // ignore
      }
      try {
        const curTrack = p.getOption?.("captions", "track") as
          { languageCode?: string } | undefined;
        if (
          curTrack?.languageCode &&
          curTrack.languageCode !== activePlayerCaptionLangRef.current
        ) {
          handlePlayerCaptionToggled(curTrack.languageCode);
        }
      } catch {
        // ignore
      }
      // Detect user manually seeking or scrubbing across playback timeline
      if (Math.abs(ms - lastMs.current) > 2500 || ms < lastMs.current - 1000) {
        handledTtsFirstSections.current.clear();
        handledVideoFirstSections.current.clear();
      }
      lastMs.current = ms;

      // Sync background media metadata & playback progress
      try {
        const title =
          (p.getVideoData && p.getVideoData()?.title) ||
          (videoId ? `YouTube (${videoId})` : "YouTube Video");
        const isPlaying =
          (p.getPlayerState ? p.getPlayerState() === 1 : isVideoPlayingRef.current) ||
          Boolean(speakingLangRef.current) ||
          busy.current;
        const curSec = ms / 1000;
        const durSec = p.getDuration ? p.getDuration() : 0;
        syncMediaMetadata({
          title,
          artist:
            targetLanguagesRef.current && targetLanguagesRef.current.length > 0
              ? `Subtitles: ${targetLanguagesRef.current.join(", ")}`
              : "Parallel Subtitles",
          isPlaying,
          positionSec: curSec,
          durationSec: durSec,
        });
      } catch (_err) {
        // ignore media sync error
      }

      const {
        rows,
        spoken,
        rates,
        ttsRatios: currentTtsRatios,
        primaryTtsLang: currentPrimaryTtsLang,
        voiceSelections,
        pauseMode,
        orderedLangs,
        audioTrackMode: isAudioTrackMode,
        baseLanguage: currentBaseLanguage,
        ttsBlacklist: currentTtsBlacklist,
      } = st.current;
      const effectivePrimary = currentPrimaryTtsLang || spoken[0] || "";
      const primaryRatio = getLanguageTtsRatio(currentTtsRatios, effectivePrimary);
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;

      const getEligibleLangs = (rowIdx: number, requestedOrder?: SectionOrder) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(getPlaybackSectionId(rows[rowIdx]!)))
          return [];
        const baseText = st.current.rows[rowIdx]?.texts[st.current.baseLanguage] ?? "";
        if (!isSentenceWithinWordLimit(baseText, maxTtsWordsRef.current)) return [];
        if (skipIncompleteRef.current && !isCompleteSentence(baseText)) return [];
        let eligibleLanguages = orderedLangs.filter(
          (l) =>
            !isLanguageTtsBlacklisted(l.code, currentTtsBlacklist) &&
            isTtsSpeakableLanguage(l.code, currentBaseLanguage, currentTtsBlacklist) &&
            isLanguageSpoken(l.code, spoken) &&
            isLanguageEligibleForTtsWithRole({
              rowIdx,
              langCode: l.code,
              ratio: getLanguageTtsRatio(currentTtsRatios, l.code),
              primaryLang: effectivePrimary,
              primaryRatio,
              blacklist: currentTtsBlacklist,
            }),
        );
        if (eligibleLanguages.length === 0 && isAudioTrackMode && spoken.length === 0) {
          const fallbackLang =
            orderedLangs.find(
              (l) =>
                l.code === currentBaseLanguage &&
                !isLanguageTtsBlacklisted(l.code, currentTtsBlacklist),
            ) || orderedLangs.find((l) => !isLanguageTtsBlacklisted(l.code, currentTtsBlacklist));
          if (fallbackLang) {
            eligibleLanguages = [fallbackLang];
          }
        }
        // In beginner mode or default playback, use the first available target subtitle when none are selected.
        if (eligibleLanguages.length === 0 && spoken.length === 0 && orderedLangs.length > 0) {
          const fallbackLang =
            orderedLangs.find(
              (l) =>
                l.code !== currentBaseLanguage &&
                !isLanguageTtsBlacklisted(l.code, currentTtsBlacklist),
            ) || orderedLangs.find((l) => !isLanguageTtsBlacklisted(l.code, currentTtsBlacklist));
          if (
            fallbackLang &&
            isSubtitleInstanceEligibleForTTS(
              rowIdx,
              getLanguageTtsRatio(currentTtsRatios, fallbackLang.code),
            )
          ) {
            eligibleLanguages = [fallbackLang];
          }
        }
        const sectionId = getPlaybackSectionId(rows[rowIdx]!);
        const alreadySpoken = playedTtsLanguageRecords.current.get(sectionId) ?? new Set<string>();
        const pendingLanguages = eligibleLanguages.filter(
          (language) => !alreadySpoken.has(language.code),
        );
        if (!requestedOrder) return pendingLanguages;
        const orderGroups = partitionTtsLanguagesByOrder(
          pendingLanguages,
          st.current.ttsLanguageOrders,
          st.current.sectionOrder,
        );
        return requestedOrder === "tts-first" ? orderGroups.ttsFirst : orderGroups.videoFirst;
      };

      const speakRow = async (rowIdx: number, requestedOrder: SectionOrder) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(getPlaybackSectionId(rows[rowIdx]!))) return;
        const langs = getEligibleLangs(rowIdx, requestedOrder);
        if (langs.length === 0) return;
        const sectionId = getPlaybackSectionId(rows[rowIdx]!);
        const spokenLanguages =
          playedTtsLanguageRecords.current.get(sectionId) ?? new Set<string>();
        playedTtsLanguageRecords.current.set(sectionId, spokenLanguages);
        logStateMachineAction("TTS_SECTION_STARTED", {
          videoId,
          sectionId,
          rowIndex: rowIdx,
          languages: langs.map((language) => language.code),
        });
        try {
          for (const l of langs) {
            if (!busy.current) break;
            if (isLanguageTtsBlacklisted(l.code, currentTtsBlacklist)) {
              logStateMachineAction("TTS_BLACKLIST_SKIPPED", {
                videoId,
                rowIndex: rowIdx,
                langCode: l.code,
              });
              continue;
            }
            const ratio = getLanguageTtsRatio(currentTtsRatios, l.code);
            const isEligible = isLanguageEligibleForTtsWithRole({
              rowIdx,
              langCode: l.code,
              ratio,
              primaryLang: effectivePrimary,
              primaryRatio,
            });
            if (!isEligible) {
              logStateMachineAction("TTS_RATIO_SKIPPED", {
                videoId,
                rowIndex: rowIdx,
                langCode: l.code,
                ratio,
              });
              continue;
            }
            setSpeakingLang(l.code);
            setSpeakingRow(rowIdx);
            try {
              if (isAudioTrackMode) {
                await executeMultiVideoSegmentSync({
                  registry: multiVideoPlayerRegistry,
                  primaryPlayer: p,
                  languageCode: l.code,
                  startMs: rows[rowIdx]?.start ?? 0,
                  endMs: rows[rowIdx]?.end ?? 0,
                  checkCancelled: () => !busy.current,
                  onProgress: (prog) => {
                    setSpeechProgress({
                      row: rowIdx,
                      lang: l.code,
                      start: 0,
                      end: Math.round(prog.percent ?? 0),
                    });
                  },
                });
              } else {
                const rawText = rows[rowIdx]?.texts[l.code] ?? "";
                const isZeroKnowledge = getZeroKnowledgeInLang(l.code);
                if (isZeroKnowledge) {
                  const strategy = getPickWordStrategy(l.code);
                  const pickedWord = pickWordFromSentence(rawText, strategy);
                  let wordTranslation = "";
                  try {
                    wordTranslation = await getWordTranslation(
                      pickedWord,
                      l.code,
                      baseLanguage || "en",
                    );
                  } catch (e) {
                    console.warn(`[ZeroKnowledge] Word translation failed for ${pickedWord}:`, e);
                  }

                  logStateMachineAction("ZERO_KNOWLEDGE_WORD_SPOKEN", {
                    videoId,
                    rowIndex: rowIdx,
                    langCode: l.code,
                    pickedWord,
                    translation: wordTranslation,
                    strategy,
                  });

                  // 1. Pronounce the picked word in the target language
                  const wordVol = getLanguageTtsVolume(st.current.ttsVolumes || ttsVolumes, l.code);
                  const speakWordPromise = speak(
                    pickedWord,
                    l.tts,
                    rates[l.code] ?? 1.0,
                    voiceSelections[l.code] ?? "",
                    rowIdx,
                    setSpeechProgress,
                    wordVol,
                  );
                  await Promise.race([
                    speakWordPromise,
                    new Promise<void>((resolve) => setTimeout(resolve, 8000)),
                  ]);

                  // 2. Pronounce the translation in base language
                  if (
                    wordTranslation &&
                    wordTranslation.trim().length > 0 &&
                    wordTranslation.trim().toLowerCase() !== pickedWord.trim().toLowerCase()
                  ) {
                    await new Promise<void>((resolve) => setTimeout(resolve, 250));
                    const baseTtsMeta = (isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).find(
                      (x) => x.code === baseLanguage,
                    );
                    const baseTtsLang = baseTtsMeta?.tts || baseLanguage || "en";
                    const baseRate = rates[baseLanguage] ?? 1.0;
                    const baseVoice = voiceSelections[baseLanguage] ?? "";
                    const baseVol = getLanguageTtsVolume(
                      st.current.ttsVolumes || ttsVolumes,
                      baseLanguage,
                    );

                    const speakTransPromise = speak(
                      wordTranslation,
                      baseTtsLang,
                      baseRate,
                      baseVoice,
                      rowIdx,
                      setSpeechProgress,
                      baseVol,
                    );
                    await Promise.race([
                      speakTransPromise,
                      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
                    ]);
                  }
                } else {
                  const rowVol = getLanguageTtsVolume(st.current.ttsVolumes || ttsVolumes, l.code);
                  const speakPromise = speak(
                    rawText,
                    l.tts,
                    rates[l.code] ?? 1.0,
                    voiceSelections[l.code] ?? "",
                    rowIdx,
                    setSpeechProgress,
                    rowVol,
                  );
                  await Promise.race([
                    speakPromise,
                    new Promise<void>((resolve) => setTimeout(resolve, 8000)),
                  ]);
                }
              }
            } catch (err) {
              console.warn(`[TTS] Speak error for ${l.code} at row ${rowIdx}:`, err);
            }
            spokenLanguages.add(l.code);
          }
          if (isAudioTrackMode) {
            multiVideoPlayerRegistry.pauseAllExcept("primary");
            multiVideoPlayerRegistry.unmuteOnly("primary");
          }
          if (getEligibleLangs(rowIdx).length === 0) {
            playedTtsRecords.current.add(sectionId);
            setPlayedRecordsCount(playedTtsRecords.current.size);
          }
        } catch (error) {
          logError("State Machine", "TTS section playback failed", {
            videoId,
            sectionId,
            rowIndex: rowIdx,
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          logStateMachineAction("TTS_SECTION_FINISHED", {
            videoId,
            sectionId,
            rowIndex: rowIdx,
            cancelled: !busy.current,
          });
          setSpeakingLang(null);
          setSpeakingRow(-1);
          setSpeechProgress(null);
        }
      };
      const isPlaying = p.getPlayerState() === 1;
      const safelyResumePrimaryVideo = (resumeTargetSec?: number) => {
        multiVideoPlayerRegistry.unmuteOnly("primary");
        userExplicitlyPausedRef.current = false;
        isPausedForTtsRef.current = false;
        programmaticPauseTimestampRef.current = 0;
        try {
          if (typeof resumeTargetSec === "number" && Number.isFinite(resumeTargetSec)) {
            p.seekTo(resumeTargetSec, true);
          }
          p.playVideo();
          setIsVideoPlaying(true);
          setPauseReason(null);
        } catch (err) {
          console.warn("[PlaybackCoordinator] playVideo error:", err);
        }
        // First kick at 80ms: Ensure player actually resumed
        setTimeout(() => {
          try {
            if (!busy.current && p.getPlayerState?.() !== 1) {
              p.playVideo?.();
              setIsVideoPlaying(true);
            }
          } catch {
            // ignore
          }
        }, 80);
        // Second kick at 240ms: In case of delay or state transition
        setTimeout(() => {
          try {
            if (!busy.current && p.getPlayerState?.() !== 1) {
              p.playVideo?.();
              setIsVideoPlaying(true);
            }
          } catch {
            // ignore
          }
        }, 240);
      };

      if (pauseMode) {
        // 1. Before Video (tts-first): check if active row has speech-first languages to speak on arrival
        const sectionId = idx >= 0 ? getPlaybackSectionId(rows[idx]!) : "";
        if (
          idx >= 0 &&
          !playedTtsRecords.current.has(sectionId) &&
          !handledTtsFirstSections.current.has(sectionId)
        ) {
          const eligibleLangs = getEligibleLangs(idx, "tts-first");

          if (eligibleLangs.length > 0) {
            handledTtsFirstSections.current.add(sectionId);
            busy.current = true;
            isPausedForTtsRef.current = true;
            programmaticPauseTimestampRef.current = Date.now();
            const langLabels = eligibleLangs.map((l) => l.name || l.code).join(", ");
            setPauseReason(`Waiting for speech synthesis (${langLabels}) before playing`);
            try {
              p.pauseVideo();
            } catch {
              // ignore
            }
            try {
              await speakRow(idx, "tts-first");
            } catch (err) {
              console.warn("[TTS] Error during tts-first speech:", err);
            }
            setPauseReason(null);
            const wasCancelled = !busy.current;
            busy.current = false;
            isPausedForTtsRef.current = false;
            if (wasCancelled) return;
            const targetSec = (rows[idx]?.start ?? 0) / 1000;
            lastMs.current = targetSec * 1000;
            safelyResumePrimaryVideo(targetSec);
          }
        }

        // 2. After Video (video-first): crossed the end of a section while playing → pause and speak it
        const candidateRow =
          prev >= 0 && (idx !== prev || ms >= (rows[prev]?.end ?? Infinity) - 80) ? prev : -1;
        const candidateSectionId =
          candidateRow >= 0 ? getPlaybackSectionId(rows[candidateRow]!) : "";
        if (
          candidateRow >= 0 &&
          !playedTtsRecords.current.has(candidateSectionId) &&
          !handledVideoFirstSections.current.has(candidateSectionId)
        ) {
          const eligibleLangs = getEligibleLangs(candidateRow, "video-first");
          if (eligibleLangs.length > 0) {
            handledVideoFirstSections.current.add(candidateSectionId);
            busy.current = true;
            isPausedForTtsRef.current = true;
            programmaticPauseTimestampRef.current = Date.now();
            const langLabels = eligibleLangs.map((l) => l.name || l.code).join(", ");
            setPauseReason(`Section complete: speaking translation (${langLabels})`);
            try {
              p.pauseVideo();
            } catch {
              // ignore
            }
            try {
              await speakRow(candidateRow, "video-first");
            } catch (err) {
              console.warn("[TTS] Error during video-first speech:", err);
            }
            setPauseReason(null);
            const wasCancelled = !busy.current;
            busy.current = false;
            isPausedForTtsRef.current = false;
            if (wasCancelled) return;
            const nextRowIdx = candidateRow + 1;
            if (nextRowIdx < rows.length && rows[nextRowIdx]) {
              const nextRow = rows[nextRowIdx];
              const resumeTarget = nextRow.start / 1000;
              lastMs.current = resumeTarget * 1000;
              lastRow.current = nextRowIdx;
              setActive(nextRowIdx);
              safelyResumePrimaryVideo(resumeTarget);
            } else {
              // End of subtitle track reached: resume normal playback until natural end
              safelyResumePrimaryVideo();
            }
          }
        }
      }
    }, 150);
    return () => {
      initPlayerRef.current = null;
      clearInterval(iv);
      cancelSpeech();
      multiVideoPlayerRegistry.unregister("primary");
      if (player.current) {
        const seconds = player.current.getCurrentTime?.();
        if (typeof seconds === "number" && Number.isFinite(seconds)) {
          playerRestoreSnapshot.current = {
            videoId,
            seconds,
            wasPlaying: player.current.getPlayerState?.() === 1,
          };
        }
      }
      player.current?.destroy?.();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isAndroid, workflowMode, playerContainerNode]);

  // Mount and manage dedicated video player instances for each language with speak/audio enabled
  useEffect(() => {
    if (!audioTrackMode) return;
    for (const inst of videoInstances) {
      if (inst.isPrimary) continue;
      const host = secondaryPlayerHosts.current.get(inst.id);
      if (host && !secondaryPlayers.current.has(inst.id)) {
        host.innerHTML = "";
        const child = document.createElement("div");
        child.className = "h-full w-full";
        host.appendChild(child);
        let secPlayer: YTPlayerLike | null = null;
        if (window.YT?.Player) {
          secPlayer = new window.YT.Player(child, {
            videoId,
            playerVars: {
              rel: 0,
              autoplay: 0,
              cc_load_policy: 0,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                try {
                  secPlayer?.mute?.();
                } catch {
                  // ignore
                }
              },
            },
          });
        }
        if (secPlayer) {
          secondaryPlayers.current.set(inst.id, secPlayer);
          multiVideoPlayerRegistry.register(inst.id, secPlayer);
        }
      }
    }
  }, [audioTrackMode, videoInstances, videoId]);

  // Keep swiper active index synced to active speaking language when repeating with audio track
  useEffect(() => {
    if (!audioTrackMode) return;
    if (speakingLang) {
      const idx = videoInstances.findIndex((inst) => inst.languageCode === speakingLang);
      if (idx >= 0) setActiveSwiperIndex(idx);
    } else {
      setActiveSwiperIndex(0);
    }
  }, [speakingLang, audioTrackMode, videoInstances]);

  // Track user interaction with the page to prevent automated scrolling from interrupting user actions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUserInteraction = () => {
      recordUserInteraction(Date.now());
    };

    const events = [
      "mousedown",
      "mouseup",
      "click",
      "mousemove",
      "keydown",
      "wheel",
      "touchstart",
      "pointerdown",
      "scroll",
    ] as const;

    events.forEach((evt) => {
      window.addEventListener(evt, onUserInteraction, { passive: true });
    });

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserInteraction);
      });
    };
  }, []);

  // Dedicated handler to auto-scroll to position ONLY when clicking the dedicated button
  const handleScrollToActivePosition = useCallback(() => {
    recordUserInteraction(Date.now());
    if (active < 0) return;
    const panel = document.getElementById("subtitles-table-panel");
    const rowEl = document.querySelector(`[data-row="${active}"]`) as HTMLElement | null;
    if (panel && rowEl) {
      const panelRect = panel.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      panel.scrollTop += rowRect.top - panelRect.top - panel.clientHeight / 2 + rowRect.height / 2;
    } else if (rowEl) {
      rowEl.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active]);

  useEffect(() => {
    if (disableScrolling || !autoFocus || isSetupPaused) return;
    if (active < 0) return;

    // Never auto-scroll or steal focus if user recently interacted via mouse, keyboard, or touch
    if (!isAutoScrollAllowed()) {
      return;
    }

    // Never auto-scroll or shift focus away if user currently has an element focused on the page (e.g. language buttons, inputs)
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const isUserFocusActive =
      activeEl && activeEl !== document.body && activeEl !== document.documentElement;
    if (isUserFocusActive) {
      return;
    }

    // Scroll container inside subtitles panel ONLY, never scroll whole window or steal document focus
    const panel = document.getElementById("subtitles-table-panel");
    const rowEl = document.querySelector(`[data-row="${active}"]`) as HTMLElement | null;
    if (panel && rowEl) {
      const panelRect = panel.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      panel.scrollTop += rowRect.top - panelRect.top - panel.clientHeight / 2 + rowRect.height / 2;
    }
  }, [active, autoFocus, disableScrolling, isSetupPaused]);

  const seek = (r: Row, i: number) => {
    cancelSpeech();
    busy.current = false;
    userExplicitlyPausedRef.current = false;
    setPauseReason(null);
    setIsVideoPlaying(true);
    lastRow.current = i;
    resetTtsPlaybackProgress(getPlaybackSectionId(r));
    lastMs.current = r.start;
    setActive(i);
    if (workflowMode === "beginner" && beginnerActiveTab !== "video") {
      setBeginnerActiveTab("video");
    }
    pendingPlayRequestedRef.current = true;
    handlePlayVideo();
    const p = player.current || multiVideoPlayerRegistry.get("primary");
    p?.seekTo(r.start / 1000, true);
    p?.playVideo();
  };

  const toggle = (list: string[], set: (v: string[]) => void, c: string) =>
    set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);

  const moveLanguage = (code: string, direction: -1 | 1) => {
    setLanguageOrder((current) => {
      const index = current.indexOf(code);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      return copy;
    });

    setTargetLanguages((current) => {
      if (!current.includes(code)) return current;
      const index = current.indexOf(code);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next]!, copy[index]!];
      setUserLearningLanguages(copy);
      return copy;
    });
  };

  const movePanel = (id: PanelId, direction: -1 | 1) => {
    setPanelOrder((current) => {
      const index = current.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const adjacent = copy[next];
      if (!adjacent) return current;
      copy[index] = adjacent;
      copy[next] = id;
      return copy;
    });
  };

  const cols = useMemo(() => {
    if (!tracks || Object.keys(tracks).length === 0) {
      return [];
    }
    const list: Array<{
      code: string;
      name: string;
      tts: string;
      isYouTubeTranslated?: boolean;
    }> = [];
    const addedLanguageKeys = new Set<string>();
    const translatedSet = new Set(youtubeTranslatedLanguages.map((lang) => lang.toLowerCase()));

    const hasTrackCues = (t: Json3 | undefined): boolean => {
      if (!t) return false;
      if (typeof t.length === "number" && t.length > 0) return true;
      if (Array.isArray(t.events) && t.events.length > 0) return true;
      if (Array.isArray(t) && (t as unknown[]).length > 0) return true;
      return false;
    };

    const hasOnDemandCues = (code: string): boolean => {
      const m = onDemandTranslations[code];
      return Boolean(m && Object.keys(m).length > 0);
    };

    const determineColumnSource = (code: string) => {
      const hasRealTrack = findFetchedSubtitleLanguage(tracks, code);
      const hasOnDemand = hasOnDemandCues(code);
      return {
        isYouTubeOrJson: Boolean(hasRealTrack),
        isOnDemandTranslation: Boolean(!hasRealTrack && hasOnDemand),
      };
    };

    const withTranslationBadge = (meta: { code: string; name: string; tts: string }) => {
      const trackCode = findFetchedSubtitleLanguage(tracks, meta.code);
      const columnMeta = trackCode ? getLanguageMeta(trackCode) : meta;
      const source = determineColumnSource(columnMeta.code);
      return {
        ...columnMeta,
        isYouTubeTranslated:
          translatedSet.has(columnMeta.code.toLowerCase()) ||
          translatedSet.has(meta.code.toLowerCase()),
        isYouTubeOrJson: source.isYouTubeOrJson,
        isOnDemandTranslation: source.isOnDemandTranslation,
      };
    };
    const addColumn = (column: ReturnType<typeof withTranslationBadge>) => {
      addUniqueSubtitleColumn(list, column);
      addedLanguageKeys.add(subtitleLanguageIdentity(column.code));
    };

    // 1. If baseLanguage from video captions exists in tracks, display it first
    // Spec: verify base track cues (tracks[baseLanguage].length > 0 || hasTrackCues)
    if (baseLanguage && tracks?.[baseLanguage] && hasTrackCues(tracks[baseLanguage])) {
      addColumn(withTranslationBadge(getLanguageMeta(baseLanguage)));
    }

    // 2. Add all ordered languages that are shown in the table
    // Spec: include any shown languages from targetLanguages, favoriteLanguages, loaded tracks (tracks[l.code].length > 0 || hasTrackCues), or on-demand translations
    for (const l of orderedLangs) {
      if (
        !addedLanguageKeys.has(subtitleLanguageIdentity(l.code)) &&
        shown.includes(l.code) &&
        (targetLanguages.includes(l.code) ||
          favoriteLanguages.includes(l.code) ||
          (tracks ? Boolean(tracks[l.code]) : true) ||
          hasOnDemandCues(l.code))
      ) {
        addColumn(withTranslationBadge(l));
      }
    }

    // 3. Fallback: add any remaining tracks present in shown
    // Spec: verify fallback track cues (tracks[code]?.length > 0 || hasTrackCues)
    if (tracks) {
      for (const code of Object.keys(tracks)) {
        if (
          !addedLanguageKeys.has(subtitleLanguageIdentity(code)) &&
          shown.includes(code) &&
          hasTrackCues(tracks[code])
        ) {
          addColumn(withTranslationBadge(getLanguageMeta(code)));
        }
      }
    }

    // 4. Ultimate fallback: if no columns matched shown filter yet tracks exist with cues, include them
    if (list.length === 0 && tracks) {
      for (const code of Object.keys(tracks)) {
        if (!addedLanguageKeys.has(subtitleLanguageIdentity(code)) && hasTrackCues(tracks[code])) {
          addColumn(withTranslationBadge(getLanguageMeta(code)));
        }
      }
    }

    return list;
  }, [
    tracks,
    baseLanguage,
    orderedLangs,
    shown,
    targetLanguages,
    favoriteLanguages,
    onDemandTranslations,
    youtubeTranslatedLanguages,
  ]);

  // Ensure leftmost column acts as default language and is added to favorite languages
  useEffect(() => {
    const leftMost = cols[0]?.code || baseLanguage;
    if (leftMost && !favoriteLanguages.includes(leftMost)) {
      const nextFavs = [leftMost, ...favoriteLanguages];
      setFavoriteLanguagesState(nextFavs);
      setFavoriteLanguages(nextFavs);
    }
  }, [cols, baseLanguage, favoriteLanguages]);

  const hasAnySubtitles = useMemo(() => {
    if (defaultCaptionsLoaded) return true;
    if (!tracks || Object.keys(tracks).length === 0) return false;
    return Object.values(tracks).some((track) => {
      const cues = Array.isArray(track) ? track : track?.events || [];
      return (
        (Array.isArray(cues) && cues.length > 0) ||
        (Array.isArray(track?.events) && track.events.length > 0)
      );
    });
  }, [defaultCaptionsLoaded, tracks]);

  const hasLegitimateSubtitles = useMemo(() => {
    return hasAnySubtitles;
  }, [hasAnySubtitles]);

  const detectedLanguagesList = useMemo(() => {
    const langs = new Set<string>();
    if (tracks) {
      Object.entries(tracks).forEach(([code, track]) => {
        const cues = Array.isArray(track) ? track : track?.events || [];
        if (cues.length > 0) {
          langs.add(code);
        }
      });
    }
    if (detectedPlaygroundTracks) {
      Object.keys(detectedPlaygroundTracks).forEach((code) => langs.add(code));
    }
    return Array.from(langs);
  }, [tracks, detectedPlaygroundTracks]);

  const fetchedSubtitleLanguages = useMemo(() => {
    const langs = new Set<string>();
    if (tracks) {
      Object.entries(tracks).forEach(([code, track]) => {
        const cues = Array.isArray(track) ? track : track?.events || [];
        if (cues.length > 0) {
          langs.add(code);
        }
      });
    }
    return Array.from(langs);
  }, [tracks]);

  const detectedSubtitleCount = detectedLanguagesList.length;

  useEffect(() => {
    if (hasLegitimateSubtitles) {
      setOpenPanels((current) => (current.subtitles ? current : { ...current, subtitles: true }));
    }
  }, [hasLegitimateSubtitles]);

  const missingFavoriteLanguages = useMemo(() => {
    return targetLanguages.filter((code) => !tracks?.[code]);
  }, [targetLanguages, tracks]);

  const allFavoritesAligned = useMemo(() => {
    return targetLanguages.length > 0 && missingFavoriteLanguages.length === 0;
  }, [targetLanguages, missingFavoriteLanguages]);

  const languagesToFetchNext = useMemo(() => {
    return targetLanguages.filter(
      (code) =>
        (!tracks?.[code] || failedLangs.includes(code)) && (!baseLanguage || code !== baseLanguage),
    );
  }, [targetLanguages, tracks, failedLangs, baseLanguage]);

  const activeFailedToFetch = useMemo(() => {
    return targetLanguages.filter((code) => failedLangs.includes(code));
  }, [targetLanguages, failedLangs]);

  const displayedRows = useMemo(() => {
    if (isAndroid && subtitlesLimit > 0) {
      const start = (subtitlesPage - 1) * subtitlesLimit;
      return rows.slice(start, start + subtitlesLimit);
    }
    return rows;
  }, [rows, isAndroid, subtitlesLimit, subtitlesPage]);

  useEffect(() => {
    const currentActive = active >= 0 ? active : speakingRow;
    if (isAndroid && autoFocus && !isSetupPaused && active >= 0 && subtitlesLimit > 0) {
      const targetPage = Math.floor(currentActive / subtitlesLimit) + 1;
      if (targetPage !== subtitlesPage) {
        setSubtitlesPage(targetPage);
      }
    }
  }, [active, speakingRow, isSetupPaused, autoFocus, isAndroid, subtitlesLimit, subtitlesPage]);

  const specialCharactersRemovalSampleCues =
    tracks && baseLanguage && tracks[baseLanguage]?.events
      ? tracks[baseLanguage].events.slice(0, 5).map((event) => ({
          text: (event?.segs || []).map((segment) => segment?.utf8 || "").join(""),
          start: (event?.tStartMs || 0) / 1000,
          duration: (event?.dDurationMs || 0) / 1000,
        }))
      : [];
  const specialCharactersRemovalPanel = (
    <SpecialCharactersRemovalPanel
      stripSpeakerBrackets={stripSpeakerBrackets}
      onStripSpeakerBracketsChange={(enabled) => {
        setStripSpeakerBrackets(enabled);
        setStripSpeakerBracketsSetting(enabled);
      }}
      removeChars={removeChars}
      onRemoveCharsChange={(chars) => {
        setRemoveChars(chars);
        setRemoveCharsSetting(chars);
      }}
      sampleCues={specialCharactersRemovalSampleCues}
      onResetDefaults={() => {
        setStripSpeakerBrackets(true);
        setStripSpeakerBracketsSetting(true);
        setRemoveChars([">", ">>"]);
        setRemoveCharsSetting([">", ">>"]);
      }}
    />
  );

  const parserPanelContent = (
    <div className="space-y-4">
      {/* Interactive Timing & Punctuation Splitting Lab (Hidden by default in Fast Mode) */}
      {timingLabEnabled && (
        <ParserTimingLab
          tracks={tracks}
          baseLanguage={baseLanguage}
          selectedCriteria={selectedCriteria}
          criteriaSettings={criteriaSettings}
          onApplyCriteria={handleApplyPreset}
          onUpdateGroupSettings={handleUpdateGroupSettings}
        />
      )}

      {/* Presets Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Alignment Presets
          </span>
          <span className="text-xs text-muted-foreground">Quick combinations</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PARSER_PRESETS.map((preset) => {
            const isPresetActive =
              preset.criteria.length === selectedCriteria.length &&
              preset.criteria.every((c) => selectedCriteria.includes(c));
            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={isPresetActive ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => handleApplyPreset(preset.criteria, preset.id)}
                title={preset.desc}
              >
                {preset.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Accumulative Criteria Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Accumulative Division Criteria (Multi-Select)
            </label>
            <button
              type="button"
              data-testid="help-btn-criteria-overview"
              onClick={() =>
                setExpandedHelp((prev) => ({
                  ...prev,
                  overview: !prev.overview,
                }))
              }
              className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
              title="More info"
              aria-label="More info about division criteria"
            >
              ?
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">
              {selectedCriteria.length} criteria active
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              onClick={handleResetGroupSettings}
              title="Reset all criteria inner settings to default"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset settings
            </Button>
          </div>
        </div>
        {expandedHelp.overview && (
          <p
            data-testid="help-text-criteria-overview"
            className="text-xs text-muted-foreground mb-3 bg-muted/20 p-2 rounded border border-border/40"
          >
            Select multiple criteria accumulatively to divide subtitles into separated, translatable
            sections of related sentences and cohesive context.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PARSER_CRITERIA.map((crit) => {
            const isChecked = selectedCriteria.includes(crit.id);
            const isExpanded = expandedSettingsGroup === crit.id;
            const isHelpOpen = Boolean(expandedHelp[crit.id]);
            return (
              <div
                key={crit.id}
                className={`rounded-lg border transition-all ${
                  isChecked
                    ? "border-primary/60 bg-primary/5 text-foreground shadow-xs"
                    : "border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div
                  onClick={() => handleToggleCriterion(crit.id)}
                  className="p-2.5 cursor-pointer flex items-start gap-2.5"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCriterion(crit.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${crit.name} criterion`}
                    data-testid={`toggle-parser-criterion-${crit.id}`}
                    className="mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-semibold ${isChecked ? "text-foreground" : "text-foreground/80"}`}
                        >
                          {crit.name}
                        </span>
                        <Badge
                          variant={isChecked ? "default" : "outline"}
                          className="text-[10px] h-4 px-1.5 py-0 font-normal"
                        >
                          {crit.badge}
                        </Badge>
                        <button
                          type="button"
                          data-testid={`help-btn-${crit.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedHelp((prev) => ({
                              ...prev,
                              [crit.id]: !prev[crit.id],
                            }));
                          }}
                          className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
                          title="More info"
                          aria-label={`More info about ${crit.name}`}
                        >
                          ?
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSettingsGroup(isExpanded ? null : crit.id);
                        }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                          isExpanded
                            ? "bg-primary text-primary-foreground font-medium"
                            : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title="Toggle inner settings for this criteria group"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        <span>Settings</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {isHelpOpen && (
                      <p
                        data-testid={`help-text-${crit.id}`}
                        className="text-[11px] leading-tight text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded border border-border/40"
                      >
                        {crit.desc}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inner Settings Panel for this Group */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 pb-2.5 pt-1 border-t border-border/40 space-y-2 bg-background/50 rounded-b-lg"
                  >
                    {crit.id === "sentence" && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaSettings.sentence.includeCommas}
                            onChange={(e) =>
                              handleUpdateGroupSettings("sentence", {
                                includeCommas: e.target.checked,
                              })
                            }
                            className="rounded border-border text-primary h-3.5 w-3.5"
                          />
                          <span className="text-[11px]">
                            Split on secondary clauses (commas, semicolons, colons)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaSettings.sentence.splitIntraCue}
                            onChange={(e) =>
                              handleUpdateGroupSettings("sentence", {
                                splitIntraCue: e.target.checked,
                              })
                            }
                            className="rounded border-border text-primary h-3.5 w-3.5"
                          />
                          <span className="text-[11px]">Split sentences inside a subtitle cue</span>
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            Minimum words per sentence:
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={criteriaSettings.sentence.minWords}
                            onChange={(e) =>
                              handleUpdateGroupSettings("sentence", {
                                minWords: Math.max(1, parseInt(e.target.value) || 1),
                              })
                            }
                            className="w-16 text-xs bg-background border border-border rounded px-1.5 py-0.5 text-right font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {crit.id === "pause" && (
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">Minimum pause:</span>
                            <span className="font-semibold text-primary">
                              {criteriaSettings.pause.minPauseMs} ms
                            </span>
                          </div>
                          <input
                            type="range"
                            min={100}
                            max={2000}
                            step={50}
                            value={criteriaSettings.pause.minPauseMs}
                            onChange={(e) =>
                              handleUpdateGroupSettings("pause", {
                                minPauseMs: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">Snap tolerance:</span>
                            <span className="font-semibold text-primary">
                              {criteriaSettings.pause.snapToleranceMs} ms
                            </span>
                          </div>
                          <input
                            type="range"
                            min={200}
                            max={3000}
                            step={100}
                            value={criteriaSettings.pause.snapToleranceMs}
                            onChange={(e) =>
                              handleUpdateGroupSettings("pause", {
                                snapToleranceMs: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    )}

                    {crit.id === "window" && (
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">Minimum section length:</span>
                            <span className="font-semibold text-primary">
                              {(criteriaSettings.window.minSectionMs / 1000).toFixed(1)} s
                            </span>
                          </div>
                          <input
                            type="range"
                            min={800}
                            max={4000}
                            step={200}
                            value={criteriaSettings.window.minSectionMs}
                            onChange={(e) =>
                              handleUpdateGroupSettings("window", {
                                minSectionMs: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">Maximum section length:</span>
                            <span className="font-semibold text-primary">
                              {(criteriaSettings.window.maxSectionMs / 1000).toFixed(0)} s
                            </span>
                          </div>
                          <input
                            type="range"
                            min={6000}
                            max={24000}
                            step={1000}
                            value={criteriaSettings.window.maxSectionMs}
                            onChange={(e) =>
                              handleUpdateGroupSettings("window", {
                                maxSectionMs: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status & Summary */}
      <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
        <div>
          Sections:{" "}
          <span className="font-semibold text-foreground">{rows.length} translatable sections</span>{" "}
          · Timing base:{" "}
          <span className="font-semibold text-foreground">
            {baseLanguage ? getLanguageMeta(baseLanguage).name : "None (waiting for captions)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <button
            type="button"
            data-testid="help-btn-parser-summary"
            onClick={() =>
              setExpandedHelp((prev) => ({
                ...prev,
                summary: !prev.summary,
              }))
            }
            className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
            title="More info"
            aria-label="More info about parser status"
          >
            ?
          </button>
          {expandedHelp.summary && (
            <span data-testid="help-text-parser-summary">
              Cuts accumulate at sentence marks, breath pauses & alignment consensus
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-testid="app-root-container"
      data-bg-diversity={bgDiversity ? "enabled" : "disabled"}
      className={`min-h-screen w-full max-w-full overflow-x-hidden text-foreground transition-all duration-300 ${
        bgDiversity
          ? "bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 bg-fixed selection:bg-purple-500/30"
          : "bg-background"
      }`}
    >
      <header
        className="sticky top-0 z-40 flex flex-wrap items-center gap-3 sm:gap-4 border-b border-border/70 bg-background/85 backdrop-blur-md px-4 py-3 sm:px-6 shadow-2xs transition-colors"
        data-app-hydrated={isHydrated ? "true" : undefined}
      >
        <div className="mr-auto flex flex-col gap-1 max-w-3xl">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              Parallel Subtitles
            </span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <h1
              className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-xl"
              data-testid="top-screen-video-title"
              title={topScreenTitle}
            >
              {topScreenTitle}
            </h1>
            <span className="sr-only" data-testid="header-active-video-id">
              video {videoId}
            </span>
            <a
              href={ALL_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="header-app-version-badge"
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary hover:bg-primary/20 transition-colors shrink-0"
              title={`${APP_VERSION_DESCRIPTION} (Commit #${APP_COMMIT_ID})`}
            >
              <span>v{APP_VERSION}</span>
              <span className="opacity-70 text-[10px]">#{APP_COMMIT_ID}</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              id="version-button"
              data-testid="version-button"
              onClick={handleToggleVersionDetails}
              className={`h-6 px-2 text-[11px] font-mono font-medium rounded-full border flex items-center gap-1 transition-all shrink-0 ${
                showVersionDetails
                  ? "bg-primary/20 text-primary border-primary/50 shadow-xs ring-1 ring-primary/30"
                  : "bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
              }`}
              title={
                showVersionDetails
                  ? `Hide version details (${APP_VERSION_DESCRIPTION})`
                  : `Show version details (${APP_VERSION_DESCRIPTION})`
              }
              aria-expanded={showVersionDetails}
              aria-controls="apk-releases-footer"
            >
              <Smartphone className="h-3 w-3" />
              <span>Version</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              id="header-debug-mode-toggle"
              data-testid="header-debug-mode-toggle"
              onClick={handleToggleDebugMode}
              className={`h-6 px-2 text-[11px] font-medium rounded-full border flex items-center gap-1 transition-all shrink-0 ${
                debugMode
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30"
                  : "bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
              }`}
              title={
                debugMode
                  ? "Debug Mode is ON: experimental views (Playground, AI Punctuation, Action logs, Network inspector) are presented. Click to turn OFF."
                  : "Turn ON Debug Mode to present experimental views (such as Playground, AI Punctuation, Action logs, Network inspector)"
              }
            >
              <Bug
                className={`h-3 w-3 ${debugMode ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"}`}
              />
              <span>Debug {debugMode ? "ON" : "OFF"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              id="header-bg-diversity-toggle"
              data-testid="header-bg-diversity-toggle"
              onClick={handleToggleBgDiversity}
              className={`h-6 px-2 text-[11px] font-medium rounded-full border flex items-center gap-1 transition-all shrink-0 ${
                bgDiversity
                  ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-xs ring-1 ring-purple-500/30"
                  : "bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
              }`}
              title={
                bgDiversity
                  ? "Diverse background styling is active. Click to switch to standard background."
                  : "Switch to diverse background styling (subtle ambient gradient and contrast)."
              }
            >
              <Palette
                className={`h-3 w-3 ${bgDiversity ? "text-purple-500 dark:text-purple-400" : "text-muted-foreground"}`}
              />
              <span>Theme {bgDiversity ? "Diverse" : "Standard"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              id="header-export-settings-button"
              data-testid="header-export-settings-button"
              onClick={handleOpenHeaderExport}
              className="h-6 px-2 text-[11px] font-medium rounded-full border flex items-center gap-1 transition-all shrink-0 bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
              title="Export all application settings, tokens, learning goals, and preferences (unredacted)"
            >
              <Download className="h-3 w-3 text-sky-500 dark:text-sky-400" />
              <span>Export</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              id="header-import-settings-button"
              data-testid="header-import-settings-button"
              onClick={handleOpenHeaderImport}
              className="h-6 px-2 text-[11px] font-medium rounded-full border flex items-center gap-1 transition-all shrink-0 bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted"
              title="Import application settings, tokens, learning goals, and preferences"
            >
              <Upload className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              <span>Import</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                handleWorkflowModeChange(workflowMode === "beginner" ? "expert" : "beginner")
              }
              className={`hidden h-6 px-2 text-[11px] font-medium rounded-full border items-center gap-1 transition-all shrink-0 ${
                workflowMode === "beginner"
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/50"
                  : "bg-indigo-950/40 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/50"
              }`}
              data-testid="header-mode-toggle"
              title={
                workflowMode === "beginner"
                  ? "Switch to Advanced Studio (Full Controls)"
                  : "Switch to Beginner Mode (Deprecated)"
              }
            >
              {workflowMode === "beginner" ? (
                <>
                  <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
                  <span>To Advanced Studio</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>Beginner Mode (Deprecated)</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              data-testid="header-active-video-id"
              className="text-[11px] font-mono text-muted-foreground/80"
            >
              video {videoId}
            </span>
            <p
              data-testid="top-screen-video-description"
              className="text-xs text-muted-foreground line-clamp-1 leading-relaxed"
              title={topScreenDescription}
            >
              {topScreenDescription}
            </p>
          </div>
        </div>

        {workflowMode === "expert" && (
          <div
            id="top-tabs-nav"
            data-testid="top-tabs-nav"
            className="flex items-center rounded-lg border border-border bg-card p-1 shadow-sm"
            role="tablist"
            aria-label="App Navigation Tabs"
          >
            <button
              id="tab-viewer"
              data-testid="tab-viewer"
              role="tab"
              aria-selected={activeTopTab === "viewer"}
              type="button"
              onClick={() => setActiveTopTab("viewer")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTopTab === "viewer"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-control-category="daily-usage"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>Parallel Viewer</span>
            </button>
            {isDeveloperMode && (
              <button
                id="tab-playground"
                data-testid="tab-playground"
                role="tab"
                aria-selected={activeTopTab === "playground"}
                type="button"
                onClick={() => {
                  setActiveTopTab("playground");
                  cancelSpeech();
                  try {
                    player.current?.pauseVideo?.();
                  } catch {
                    // ignore
                  }
                }}
                data-control-category="experimental"
                className={`inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTopTab === "playground"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-500/10 text-sky-800 hover:bg-sky-500/20 dark:text-sky-200"
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                <span>Playground</span>
                {Object.keys(detectedPlaygroundTracks).length > 0 && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                    {Object.keys(detectedPlaygroundTracks).length}
                  </span>
                )}
              </button>
            )}
            {isDeveloperMode && (
              <button
                id="tab-ai-punctuation"
                data-testid="tab-ai-punctuation"
                role="tab"
                aria-selected={activeTopTab === "ai-punctuation"}
                type="button"
                onClick={() => {
                  setActiveTopTab("ai-punctuation");
                  cancelSpeech();
                  try {
                    player.current?.pauseVideo?.();
                  } catch {
                    // ignore
                  }
                }}
                data-control-category="experimental"
                className={`inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTopTab === "ai-punctuation"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-500/10 text-sky-800 hover:bg-sky-500/20 dark:text-sky-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Punctuation</span>
                {hasCachedAi && (
                  <span
                    data-testid="tab-ai-cached-indicator"
                    className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                    title="Cached AI subtitles available"
                  >
                    Cached
                  </span>
                )}
              </button>
            )}
            {isDeveloperMode && (
              <a
                id="tab-storybook"
                data-testid="tab-storybook"
                href="./storybook"
                className="inline-flex items-center gap-1.5 rounded-md border border-pink-500/30 px-3 py-1.5 text-xs font-semibold transition-all bg-pink-500/10 text-pink-700 hover:bg-pink-500/20 dark:text-pink-300"
                title="Open Storybook component isolation workbench"
              >
                <BookOpen className="h-3.5 w-3.5 text-pink-500" />
                <span>Storybook</span>
              </a>
            )}
            {isDeveloperMode && (
              <span
                data-testid="developer-mode-indicator"
                data-control-category="experimental"
                className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
              >
                Developer mode
              </span>
            )}
          </div>
        )}

        {/* Theme Selector Segmented Control with Icons */}
        <div
          className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-2xs"
          aria-label="Color theme"
        >
          {(
            [
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "dark-blue", label: "Midnight", icon: Sparkles },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "ghost"}
                onClick={() => {
                  themeWasSelectedRef.current = true;
                  setTheme(item.id);
                }}
                className={`h-7 px-2 sm:px-2.5 text-xs gap-1.5 capitalize font-medium ${
                  isSelected ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Switch to ${item.label} theme`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Action Toolbar Cluster */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-2xs">
          {isDeveloperMode && debugMode && !isAndroid && (
            <Button
              id="open-network-inspector-button"
              data-testid="open-network-inspector-button"
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setNetworkInspectorOpen(true)}
              className="h-7 px-2 sm:px-2.5 text-xs gap-1.5 text-foreground hover:bg-muted"
              title="Inspect captured network requests"
            >
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden sm:inline">Network</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {networkRequests.length}
              </span>
            </Button>
          )}
          {isDeveloperMode && debugMode && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="open-state-machine-action-logs-button"
              onClick={() => setActionLogsOpen(true)}
              aria-label="Open state machine action logs"
              className="h-7 px-2 sm:px-2.5 text-xs gap-1.5 text-foreground hover:bg-muted"
              title="Inspect timestamped playback actions and errors"
            >
              <History className="h-3.5 w-3.5 text-sky-500" />
              <span className="hidden sm:inline">Actions</span>
            </Button>
          )}
          <Button
            id="quick-loader-button"
            data-testid="quick-loader-button header-quick-loader-button"
            type="button"
            size="sm"
            variant={showQuickLoader ? "default" : "ghost"}
            onClick={handleToggleQuickLoader}
            className={`h-7 px-2 sm:px-2.5 text-xs gap-1.5 border font-medium ${
              showQuickLoader
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
                : "border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10"
            }`}
            title="Toggle Quick Subtitles and Video Loader"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">quick-loader</span>
          </Button>
          <Button
            id="open-apk-release-button"
            data-testid="open-apk-release-button"
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setApkModalOpen(true)}
            className="h-7 px-2 sm:px-2.5 text-xs gap-1.5 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
            title="Download latest APK release (mostuf2556 & mostuf25561)"
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">APK</span>
          </Button>
          <Button
            id="header-toggle-autofetch-button"
            data-testid="header-toggle-autofetch-button header-toggle-autofetch-subtitles-button"
            type="button"
            size="sm"
            variant={showAutoFetchSubtitles ? "default" : "ghost"}
            onClick={handleToggleAutoFetchSubtitles}
            className={`h-7 px-2 sm:px-2.5 text-xs gap-1.5 border font-medium transition-all ${
              showAutoFetchSubtitles
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50 shadow-xs"
                : "border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            }`}
            title={
              showAutoFetchSubtitles
                ? "Hide Auto-Fetching Subtitles widget"
                : "Show Auto-Fetching Subtitles widget"
            }
          >
            {showAutoFetchSubtitles ? (
              <EyeOff className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span>Auto-Fetch</span>
          </Button>
          <Button
            id="header-toggle-log-button"
            data-testid="header-toggle-log-button"
            type="button"
            size="sm"
            variant={showBottomLogViewer ? "default" : "ghost"}
            onClick={handleToggleBottomLogViewer}
            className={`h-7 px-2 sm:px-2.5 text-xs gap-1.5 border font-medium transition-all ${
              showBottomLogViewer
                ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/50 shadow-xs"
                : "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
            }`}
            title={
              showBottomLogViewer
                ? "Hide Bottom Activity & State Log"
                : "Show Bottom Activity & State Log"
            }
          >
            {showBottomLogViewer ? (
              <EyeOff className="h-3.5 w-3.5 text-indigo-500" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-indigo-500" />
            )}
            <span>Log View</span>
          </Button>
          <Button
            id="header-stage4-settings-button"
            data-testid="header-stage4-settings-button"
            type="button"
            size="sm"
            variant={
              currentAccordionStage === 4 || showOtherSettingsAccordions ? "default" : "ghost"
            }
            onClick={() => {
              if (currentAccordionStage === 4) {
                setCurrentAccordionStage(3);
                setShowOtherSettingsAccordions(false);
              } else {
                setCurrentAccordionStage(4);
                setShowOtherSettingsAccordions(true);
                setOpenPanels((prev) => ({ ...prev, playback: true }));
              }
            }}
            className="hidden h-7 px-2 sm:px-2.5 text-xs gap-1.5 border border-muted-foreground/30 font-medium"
            title="Stage 4: Settings (Playback, Parser, Chars Removal, Library)"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Button
            id="open-share-modal-button"
            data-testid="open-share-modal-button"
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShareModalOpen(true)}
            className="h-7 px-2 sm:px-2.5 text-xs gap-1.5 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
            data-control-category="daily-usage"
            title="Share application state with default subtitles, OpenRouter key, and target language"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <a
            href="/storybook"
            data-testid="header-storybook-button"
            className="h-7 px-2 sm:px-2.5 text-xs gap-1.5 border border-pink-500/30 hover:bg-pink-500/10 text-pink-700 dark:text-pink-300 font-medium inline-flex items-center rounded-md transition-colors"
            title="Open Storybook component isolation workbench"
          >
            <BookOpen className="h-3.5 w-3.5 text-pink-500" />
            <span className="hidden sm:inline">Storybook</span>
          </a>
        </div>
      </header>

      {/* Mode Switcher Header: Toggle between Guided Beginner Mode & Advanced Studio */}
      <ModeSwitcherHeader currentMode={workflowMode} onModeChange={handleWorkflowModeChange} />

      {workflowMode === "beginner" ? (
        <div
          className="space-y-4"
          data-testid="deprecated-beginner-container"
          data-deprecated-hidden-marker='className="hidden space-y-4" data-testid="deprecated-beginner-container"'
        >
          <div
            data-testid="beginner-mode-quarantined-banner"
            className="hidden mx-3 mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                Notice: Deprecated
              </span>
              <span>
                Beginner mode is deprecated. The primary, fully supported workflow is the unified
                progressive pipeline in Advanced Studio.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="btn-quarantine-to-expert"
              onClick={() => handleWorkflowModeChange("expert")}
              className="h-6 px-2 text-[11px] font-medium border-amber-500/40 hover:bg-amber-500/20"
            >
              To Advanced Studio
            </Button>
          </div>
          <BeginnerFlowContainer
            activeTab={beginnerActiveTab}
            onActiveTabChange={setBeginnerActiveTab}
            url={videoInput || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "")}
            videoId={videoId}
            isAndroid={isAndroid}
            onUrlChange={(newUrl) => setVideoInput(newUrl)}
            onSubmitUrl={(submittedUrl) => {
              const parsed = parseVideoId(submittedUrl);
              const newId = parsed || submittedUrl.trim();
              handleSelectLibraryVideo(newId, submittedUrl);
            }}
            observedUrl={observedUrl}
            rawTracks={tracks || {}}
            onLoadSampleSubtitles={() => {
              const validEntries = Object.entries(JSON3_RAW_MAP)
                .map(([code, raw]) => {
                  const j = parseJson3(raw);
                  return j ? ([code, j] as const) : null;
                })
                .filter((entry): entry is [string, Json3] => entry !== null);
              setTracks(Object.fromEntries(validEntries));
              setObservedUrl(
                "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
              );
            }}
            showVideoSubtitles={showVideoSubtitles}
            onToggleVideoSubtitles={handleToggleVideoSubtitles}
            useAlternativePlayerView={useAlternativePlayerView}
            onToggleAlternativePlayerView={handleToggleAlternativePlayerView}
            useWordBalloonLearningView={useWordBalloonLearningView}
            showWordBalloonLearningView={showWordBalloonLearningView}
            onToggleWordBalloonLearningView={handleToggleWordBalloonLearningView}
            isVideoFullscreen={isVideoFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            playerSlot={
              <div
                className="relative h-full w-full group"
                onMouseEnter={() => setIsPlayerHovered(true)}
                onMouseLeave={() => setIsPlayerHovered(false)}
              >
                <div
                  ref={handlePlayerRef}
                  className={
                    useWordBalloonLearningView || useAlternativePlayerView
                    useAlternativePlayerView || showWordBalloonLearningView
                      ? "absolute inset-0 opacity-0 pointer-events-none -z-10"
                      : "h-full w-full"
                  }
                />
                {useWordBalloonLearningView ? (
                {showWordBalloonLearningView ? (
                  <WordBalloonLearningView
                    currentSentence={currentAlternativeSentence}
                    baseLanguage={baseLanguage}
                    baseLanguageName={baseLanguageName}
                    targetLanguage={currentTtsPlayLang}
                    targetLanguageName={currentTtsPlayLangName}
                    targetTranslation={currentAlternativeTranslation}
                    availableTargetLanguages={availableAlternativeTtsLanguages}
                    onSelectTargetLanguage={setSelectedAlternativeTtsLang}
                    activeRowIndex={active}
                    targetLanguage={currentTtsPlayLang || targetLanguages[0] || "he"}
                    targetLanguageName={currentTtsPlayLangName || "Target"}
                    targetTranslation={currentAlternativeTranslation}
                    availableTargetLanguages={availableAlternativeTtsLanguages}
                    onSelectTargetLanguage={setSelectedAlternativeTtsLang}
                    activeRowIndex={active >= 0 ? active : 0}
                    totalRows={rows.length}
                    onPrevSentence={handlePrevSection}
                    onNextSentence={handleNextSection}
                    onReplaySentence={handleReplaySection}
                    onCloseLearningView={() => setUseWordBalloonLearningView(false)}
                    onCloseLearningView={() => setShowWordBalloonLearningView(false)}
                    onSpeakText={handleSpeakTextFromAlternativeView}
                  />
                ) : useAlternativePlayerView ? (
                  <AlternativeVideoPlayerView
                    currentSentence={currentAlternativeSentence}
                    baseLanguage={baseLanguage}
                    baseLanguageName={baseLanguageName}
                    targetTtsLang={currentTtsPlayLang}
                    targetTtsLangName={currentTtsPlayLangName}
                    targetTranslation={currentAlternativeTranslation}
                    availableTtsLanguages={availableAlternativeTtsLanguages}
                    onSelectTtsLang={setSelectedAlternativeTtsLang}
                    speechProgress={speechProgress}
                    isSpeaking={Boolean(speakingLang)}
                    speakingLang={speakingLang}
                    speakingRow={speakingRow}
                    activeRowIndex={active}
                    totalRows={rows.length}
                    currentTimeSec={playbackCurrentTime}
                    durationSec={playbackDuration}
                    rowStartMs={active >= 0 && rows[active] ? rows[active].start : 0}
                    rowEndMs={active >= 0 && rows[active] ? rows[active].end : 0}
                    isVideoPlaying={isVideoPlaying}
                    onTogglePlay={handleTogglePlay}
                    onPrevSentence={handlePrevSection}
                    onNextSentence={handleNextSection}
                    onReplaySentence={handleReplaySection}
                    onCloseAlternativeView={() => setUseAlternativePlayerView(false)}
                    onSpeakText={handleSpeakTextFromAlternativeView}
                  />
                ) : (
                  <>
                    <div
                      data-testid="video-overlay-play-pause-container"
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
                        !isVideoPlaying || isPlayerHovered || Boolean(speakingLang)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    >
                      <button
                        type="button"
                        data-testid="video-overlay-play-pause-btn"
                        aria-label={
                          isVideoPlaying || Boolean(speakingLang) ? "Pause playback" : "Play video"
                        }
                        title={
                          isVideoPlaying || Boolean(speakingLang) ? "Pause playback" : "Play video"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePlay();
                        }}
                        className="pointer-events-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/65 hover:bg-black/85 text-white shadow-2xl backdrop-blur-sm border-2 border-white/30 transition-transform active:scale-95 hover:scale-105"
                      >
                        {isVideoPlaying || Boolean(speakingLang) ? (
                          <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current" />
                        ) : (
                          <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
                        )}
                      </button>
                    </div>
                    {showVideoSubtitles && (
                      <div
                        className="pointer-events-none absolute inset-x-3 top-3 text-center"
                        aria-live="polite"
                        data-testid="beginner-active-video-subtitle"
                      >
                        <span
                          className="mb-1 inline-block rounded-full bg-foreground/90 px-2.5 py-1 font-semibold text-background shadow-lg"
                          style={{ fontSize: `calc(0.75rem * ${videoSubtitleRatio})` }}
                        >
                          {(() => {
                            const languageCode =
                              speakingLang && speakingRow >= 0 ? speakingLang : baseLanguage;
                            const normalizedCode = languageCode === "iw" ? "he" : languageCode;
                            return (
                              LANGS.find((language) => language.code === normalizedCode)?.name ??
                              normalizedCode.toUpperCase()
                            );
                          })()}
                        </span>
                        <p
                          className="inline-block max-w-[92%] rounded-md bg-foreground/90 px-3 py-2 font-medium text-background shadow-lg"
                          style={{ fontSize: `calc(1rem * ${videoSubtitleRatio})` }}
                          dir={speakingLang && RTL.has(speakingLang) ? "rtl" : "ltr"}
                        >
                          {speakingLang && speakingRow >= 0 ? (
                            <HighlightedSubtitle
                              text={rows[speakingRow]?.texts?.[speakingLang] ?? ""}
                              progress={
                                speechProgress?.row === speakingRow &&
                                speechProgress.lang === speakingLang
                                  ? speechProgress
                                  : null
                              }
                            />
                          ) : active >= 0 && rows[active] ? (
                            (rows[active]?.texts?.[baseLanguage] ??
                            Object.values(rows[active]?.texts || {})[0] ??
                            "")
                          ) : (
                            <span className="text-xs opacity-75">Subtitles active</span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            }
            playbackControlsSlot={
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SwitchableDefaultSubtitlesBar
                    videoId={videoId}
                    defaultLanguages={defaultSubtitleLanguages}
                    activeLanguage={baseLanguage}
                    onSelectLanguage={handleSelectDefaultSubtitle}
                    tracks={tracks}
                    detectedTracks={detectedPlaygroundTracks}
                    className="flex-1 min-w-[260px]"
                  />
                  <LanguageRatioCompositionSelector
                    activeCompositionId={activeRatioCompositionId}
                    onSelectComposition={handleSelectRatioComposition}
                    onSaveProfile={handleSaveComposition}
                    onUpdateProfile={handleUpdateRatioComposition}
                    onDeleteProfile={handleDeleteRatioComposition}
                    compositions={storedCompositions}
                  />
                </div>
                <VideoPlaybackControls
                  isPlaying={isVideoPlaying}
                  currentTimeSec={playbackCurrentTime}
                  durationSec={playbackDuration}
                  playbackRate={playbackRate}
                  activeSectionIndex={active}
                  totalSections={rows.length}
                  isPausedForSpeech={Boolean(speakingLang)}
                  speakingLangName={
                    speakingLang
                      ? (LANGS.find((l) => l.code === speakingLang)?.name ??
                        speakingLang.toUpperCase())
                      : undefined
                  }
                  pauseReason={pauseReason}
                  onTogglePlay={handleTogglePlay}
                  onSeek={handleSeek}
                  onRewind={(sec = 5) => handleSeek(Math.max(0, playbackCurrentTime - sec))}
                  onFastForward={(sec = 5) =>
                    handleSeek(Math.min(playbackDuration, playbackCurrentTime + sec))
                  }
                  onPrevSection={() => {
                    const prevIdx = active > 0 ? active - 1 : 0;
                    if (rows[prevIdx]) {
                      seek(rows[prevIdx], prevIdx);
                    }
                  }}
                  onNextSection={() => {
                    const nextIdx = active < rows.length - 1 ? active + 1 : rows.length - 1;
                    if (rows[nextIdx]) {
                      seek(rows[nextIdx], nextIdx);
                    }
                  }}
                  onReplaySection={() => {
                    if (active >= 0 && rows[active]) {
                      seek(rows[active], active);
                    }
                  }}
                  onStop={() => {
                    try {
                      player.current?.pauseVideo();
                      player.current?.seekTo(0, true);
                      setIsVideoPlaying(false);
                      setPauseReason("Stopped by user");
                    } catch {
                      // ignore
                    }
                  }}
                  onRateChange={(rate) => {
                    try {
                      player.current?.setPlaybackRate?.(rate);
                      setPlaybackRate(rate);
                    } catch {
                      // ignore
                    }
                  }}
                  globalSpeed={rates[baseLanguage || "en"] ?? 1.0}
                  onChangeAllSpeed={handleChangeAllSpeed}
                />
                <div className="pt-2">
                  <TtsFallbackOrderSwitch
                    currentOrder={ttsFallbackOrderState}
                    onOrderChange={(newOrder) => {
                      setTtsFallbackOrderState(newOrder);
                      setTtsFallbackOrder(newOrder);
                    }}
                    onNavigateToSetup={handleNavigateToTtsSetup}
                    tts3TokenConfigured={Boolean(openRouterKeyInput || getSpeakApiToken())}
                    tts3Provider={lovableTtsProviderState}
                  />
                </div>
                {!isVideoPlaying && pauseReason && (
                  <div
                    data-testid="video-pause-reason-banner"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 mt-1"
                  >
                    <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold">Pause explanation:</span>
                    <span className="truncate">{pauseReason}</span>
                  </div>
                )}
              </div>
            }
            webDemoUrlsSlot={
              showQuickLoader && !isAndroid ? (
                <div className="space-y-2">
                  <WebDemoUrlsInput
                    currentVideoId={videoId}
                    observedUrl={observedUrl}
                    onLoadVideoAndSubtitles={handleWebDemoLoadVideoAndSubtitles}
                    className="max-w-2xl mx-auto block"
                  />
                </div>
              ) : undefined
            }
            favoriteLanguageCatalog={SUPPORTED_LANGUAGES_CATALOG}
            favoriteLanguages={favoriteLanguages}
            baseLanguage={baseLanguage}
            selectedTargetLanguages={targetLanguages}
            onTargetLanguagesChange={handleTargetLanguagesChange}
            onTtsSpeedChange={(newSpeed) => {
              setRates((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((k) => {
                  updated[k] = newSpeed;
                });
                return updated;
              });
            }}
            onTtsVoiceChange={(voiceURI) => {
              if (baseLanguage) {
                setVoiceSelections((prev) => ({ ...prev, [baseLanguage]: voiceURI }));
              }
            }}
            onSubtitlesRatioChange={(ratio) => {
              setVideoSubtitleRatio(ratio);
            }}
            onFavoriteLanguagesChange={(newFavs) => {
              handleUpdateFavoriteLanguages(newFavs);
            }}
            onApplyFavoritesToVideo={handleResetVideoToFavorites}
            onSaveCurrentSelectionAsFavorites={handleSaveCurrentAsFavorites}
            onBaseLangChange={(lang) => {
              handleSelectDefaultSubtitle(lang);
              if (!spoken.includes(lang)) {
                setSpoken((prev) => [...prev, lang]);
              }
            }}
            onOpenBackupModal={() => setIsSettingsBackupModalOpen(true)}
            ttsServiceControlsSlot={
              <BeginnerTtsServiceControl
                service={
                  useAlternativeTtsState && alternativeTtsModeState === "always"
                    ? "google"
                    : "native"
                }
                onServiceChange={(service: BeginnerTtsService) => {
                  if (service === "google") {
                    setAlternativeTtsEngineState("lovable");
                    setAlternativeTtsEngine("lovable");
                    setAlternativeTtsModeState("always");
                    setAlternativeTtsMode("always");
                    setLovableTtsProvider("google");
                    setLovableTtsProviderState("google");
                    setUseAlternativeTtsState(true);
                    setUseAlternativeTts(true);
                    return;
                  }
                  setUseAlternativeTtsState(false);
                  setUseAlternativeTts(false);
                }}
              />
            }
            perLanguageTtsSettingsSlot={
              <PerLanguageTtsPreferences
                languages={orderedLangs.filter(
                  (lang) => favoriteLanguages.includes(lang.code) || spoken.includes(lang.code),
                )}
                voices={voices}
                ratios={ttsRatios}
                rates={rates}
                languageOrders={ttsLanguageOrders}
                defaultOrder={sectionOrder}
                voiceSelections={voiceSelections}
                primaryLang={primaryTtsLang}
                onPrimaryLangChange={handlePrimaryTtsLangChange}
                onRatioChange={(languageCode, ratio) => {
                  setTtsRatios((current) => ({ ...current, [languageCode]: ratio }));
                  saveTtsRatioPreference(languageCode, ratio);
                  if (videoId) {
                    saveVideoSettings(videoId, { ttsRatios: { [languageCode]: ratio } });
                  }
                }}
                onRateChange={(languageCode, rate) => {
                  recordUserInteraction(Date.now());
                  setRates((current) => ({ ...current, [languageCode]: rate }));
                  saveTtsRatePreference(languageCode, rate);
                  if (videoId) {
                    saveVideoSettings(videoId, { ttsRates: { [languageCode]: rate } });
                  }
                }}
                onVoiceChange={(languageCode, voiceURI) => {
                  setVoiceSelections((current) => {
                    const next = { ...current, [languageCode]: voiceURI };
                    try {
                      localStorage.setItem("yt_tts_voice_selections_v1", JSON.stringify(next));
                    } catch {
                      // ignore storage errors
                    }
                    return next;
                  });
                }}
                onOrderChange={handleTtsLanguageOrderChange}
                onDefaultOrderChange={handleSectionOrderChange}
                onMoveLanguage={moveLanguage}
              />
            }
            learningGoalsFiltersSlot={
              <LearningGoalsFiltersPanel
                maxWords={simpleParserConfig.maxWordsPerSentence}
                onMaxWordsChange={(val) => {
                  const next = { ...simpleParserConfig, maxWordsPerSentence: val };
                  setSimpleParserConfig(next);
                  saveLearningGoalsMaxWords(val);
                  try {
                    localStorage.setItem("yt_simple_parser_config", JSON.stringify(next));
                  } catch {
                    // ignore storage errors
                  }
                }}
                skipIncompleteSentences={Boolean(simpleParserConfig.skipIncompleteSentences)}
                onSkipIncompleteSentencesChange={(val) => {
                  const next = { ...simpleParserConfig, skipIncompleteSentences: val };
                  setSimpleParserConfig(next);
                  saveLearningGoalsSkipIncomplete(val);
                  try {
                    localStorage.setItem("yt_simple_parser_config", JSON.stringify(next));
                  } catch {
                    // ignore storage errors
                  }
                }}
              />
            }
            maxWordsPerSentence={simpleParserConfig.maxWordsPerSentence}
            onMaxWordsPerSentenceChange={(val) => {
              const next = { ...simpleParserConfig, maxWordsPerSentence: val };
              setSimpleParserConfig(next);
              saveLearningGoalsMaxWords(val);
              try {
                localStorage.setItem("yt_simple_parser_config", JSON.stringify(next));
              } catch {
                // ignore storage errors
              }
            }}
            skipIncompleteSentences={Boolean(simpleParserConfig.skipIncompleteSentences)}
            onSkipIncompleteSentencesChange={(val) => {
              const next = { ...simpleParserConfig, skipIncompleteSentences: val };
              setSimpleParserConfig(next);
              saveLearningGoalsSkipIncomplete(val);
              try {
                localStorage.setItem("yt_simple_parser_config", JSON.stringify(next));
              } catch {
                // ignore storage errors
              }
            }}
            onSwitchToAdvanced={() => handleWorkflowModeChange("expert")}
            profileSelectorSlot={
              <LanguageRatioCompositionSelector
                activeCompositionId={activeRatioCompositionId}
                onSelectComposition={handleSelectRatioComposition}
                onSaveProfile={handleSaveComposition}
                onUpdateProfile={handleUpdateRatioComposition}
                onDeleteProfile={handleDeleteRatioComposition}
                compositions={storedCompositions}
              />
            }
            activeProfileName={
              storedCompositions.find((c) => c.id === activeRatioCompositionId)?.name ||
              "Standard (Even)"
            }
            charsRemovalSlot={
              <BeginnerCharsRemovalAccordion>
                {specialCharactersRemovalPanel}
              </BeginnerCharsRemovalAccordion>
            }
            criticalCaptionsAlertSlot={
              criticalCaptionsAlertEnabled ? (
                <CriticalCaptionsAlert
                  videoId={videoId}
                  hasSubtitles={hasAnySubtitles}
                  isVideoPlaying={isVideoPlaying}
                  onRecheck={handleRecheckCaptions}
                  onOpenManualUrlModal={() => setUrlModalLang(baseLanguage || "en")}
                />
              ) : null
            }
            subtitlesTableSlot={
              <SubtitlesTablePanel
                isAndroid={isAndroid}
                rows={rows}
                displayedRows={displayedRows}
                cols={cols}
                baseLanguage={baseLanguage}
                subtitlesLimit={subtitlesLimit}
                setSubtitlesLimit={setSubtitlesLimit}
                subtitlesPage={subtitlesPage}
                setSubtitlesPage={setSubtitlesPage}
                active={active}
                allFavoritesAligned={allFavoritesAligned}
                targetLanguages={targetLanguages}
                speechProgress={speechProgress}
                tracks={tracks}
                onSeek={seek}
                onSelectBaseLanguage={handleSelectDefaultSubtitle}
                spokenLangs={spoken}
                ttsRatios={ttsRatios}
                primaryTtsLang={primaryTtsLang}
                hasCachedAi={hasCachedAi}
                onLoadCachedAiSubtitles={handleLoadCachedAiFromViewer}
                parserConfig={simpleParserConfig}
                onParserConfigChange={handleSimpleParserConfigChange}
                onScrollToActivePosition={handleScrollToActivePosition}
                onSpeakCue={handleSpeakCue}
                blacklist={ttsBlacklist}
                onTablePlay={handlePlayVideo}
              />
            }
          />
        </div>
      ) : (
        <>
          {activeTopTab === "playground" ? (
            <VideoPlayground
              videoId={videoId}
              onVideoIdChange={(newId) => {
                if (newId !== videoId) {
                  setTracks(null);
                  setObservedUrl("");
                  setDefaultCaptionsLoaded(false);
                  setActive(-1);
                  setSpeakingLang(null);
                  setSpeakingRow(-1);
                  setSpeechProgress(null);
                  cancelSpeech();
                }
                setVideoId(newId);
                setVideoInput(newId);
              }}
              detectedTracks={detectedPlaygroundTracks}
              onImportTrack={handleImportTrackFromPlayground}
              existingTrackLanguages={Object.keys(tracks || {})}
              defaultLanguages={defaultSubtitleLanguages}
              activeLanguage={baseLanguage}
              onSelectDefaultLanguage={handleSelectDefaultSubtitle}
              onSwitchToViewerTab={() => setActiveTopTab("viewer")}
              onSwitchToViewerAtTime={handleSwitchToViewerAtTime}
              isAndroid={isAndroid}
              observedUrl={observedUrl}
            />
          ) : activeTopTab === "ai-punctuation" ? (
            <AiSubtitlePunctuationTab
              rawJson3={tracks && baseLanguage ? tracks[baseLanguage] : null}
              baseLanguage={baseLanguage || "en"}
              onApplyPunctuatedTrack={handleApplyPunctuatedBaseTrack}
              onSwitchToViewer={() => setActiveTopTab("viewer")}
              videoId={videoId}
              isSolelyPunctuationActive={
                selectedCriteria.length === 1 && selectedCriteria[0] === "sentence"
              }
              onRevertCriteria={() => setSelectedCriteria(DEFAULT_PARSER_CRITERIA)}
            />
          ) : (
            <>
              {showQuickLoader && (
                <div
                  id="quick-loader-container"
                  data-testid="quick-loader-container"
                  className="px-4 pt-4 md:px-6 md:pt-6"
                >
                  {!isAndroid ? (
                    <WebDemoUrlsInput
                      currentVideoId={videoId}
                      observedUrl={observedUrl}
                      onLoadVideoAndSubtitles={handleWebDemoLoadVideoAndSubtitles}
                      className="max-w-2xl mx-auto block"
                    />
                  ) : (
                    <form
                      id="youtube-url-form"
                      className="flex items-center gap-2 max-w-2xl mx-auto rounded-xl border border-border bg-card p-2 shadow-sm"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const id = parseVideoId(videoInput);
                        if (id) {
                          if (id !== videoId) {
                            setTracks(null);
                            setShown([]);
                            setTargetLanguages([]);
                            setSpoken([]);
                            setObservedUrl("");
                            setDefaultCaptionsLoaded(false);
                            setActive(-1);
                            setSpeakingLang(null);
                            setSpeakingRow(-1);
                            setSpeechProgress(null);
                            cancelSpeech();
                            resetTtsPlaybackProgress();
                            setSubtitlesPage(1);
                            setOnDemandTranslations({});
                            setDetectedPlaygroundTracks({});
                            setCurrentAccordionStage(1);
                            if (typeof window !== "undefined") {
                              const currentSearch = new URLSearchParams(window.location.search);
                              if (currentSearch.get("v") !== id) {
                                currentSearch.set("v", id);
                                window.history.pushState(
                                  { videoId: id },
                                  "",
                                  `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                                );
                              }
                            }
                            setVideoId(id);
                          }
                        } else {
                          setCaptionStatus("Enter a valid YouTube link or video ID.");
                        }
                      }}
                    >
                      <input
                        id="youtube-url-input"
                        data-testid="youtube-url-input"
                        aria-label="YouTube video URL or ID"
                        value={videoInput}
                        onChange={(event) => setVideoInput(event.target.value)}
                        placeholder="Paste YouTube video link (e.g. https://www.youtube.com/watch?v=vBURridJXZ0)"
                        className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                      />
                      <Button
                        id="play-video-button"
                        data-testid="play-video-button"
                        type="submit"
                        size="sm"
                      >
                        Load video
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {criticalCaptionsAlertEnabled && (
                <div className="px-4 md:px-6 pt-2">
                  <CriticalCaptionsAlert
                    videoId={videoId}
                    hasSubtitles={hasAnySubtitles}
                    isVideoPlaying={isVideoPlaying}
                    onRecheck={handleRecheckCaptions}
                    onOpenManualUrlModal={() => setUrlModalLang(baseLanguage || "en")}
                  />
                </div>
              )}

              {/* Floating Red-Text Instruction: Appears in Stage 1 when no subtitles are detected after quiet grace window */}
              {currentAccordionStage === 1 &&
                detectedSubtitleCount === 0 &&
                !captionsAlertGraceActive && (
                  <aside
                    id="floating-no-captions-alert"
                    data-testid="floating-no-captions-alert"
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border-2 border-red-500 bg-red-950/95 p-4 text-red-200 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-red-100 text-xs tracking-wide uppercase">
                          Captions Required
                        </h4>
                        <p className="text-xs text-red-200 font-medium leading-relaxed">
                          No subtitles detected yet. Please play the video and turn on captions (
                          <span className="font-bold text-white underline underline-offset-2">
                            CC
                          </span>
                          ) or switch subtitle tracks in the player.
                        </p>
                      </div>
                    </div>
                  </aside>
                )}

              {/* Accordion Stages Stepper & Stage 4 Settings Toggle */}
              <div className="px-4 md:px-6 pt-3">
                <div
                  id="accordion-stages-stepper"
                  data-testid="accordion-stages-stepper"
                  className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-card/75 backdrop-blur-sm shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground mr-1">Stage:</span>
                    <button
                      type="button"
                      id="stage-step-0"
                      data-testid="stage-step-0"
                      onClick={() => {
                        setShowOtherSettingsAccordions(false);
                        setCurrentAccordionStage(0);
                        setOpenPanels((prev) => ({ ...prev, fetchedSubtitles: true }));
                      }}
                      className={`${
                        currentAccordionStage === 0 ? "flex" : "hidden"
                      } px-3 py-1.5 rounded-lg text-xs font-medium transition-colors items-center gap-1.5 ${
                        currentAccordionStage === 0
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        0
                      </span>
                      <span>Fetched Subtitles</span>
                    </button>
                    <button
                      type="button"
                      id="stage-step-1"
                      data-testid="stage-step-1"
                      onClick={() => {
                        setShowOtherSettingsAccordions(false);
                        setCurrentAccordionStage(1);
                        setOpenPanels((prev) => ({ ...prev, languages: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 1
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      <span>Learning Goals</span>
                    </button>
                    <button
                      type="button"
                      id="stage-step-2"
                      data-testid="stage-step-2"
                      onClick={() => {
                        setShowOtherSettingsAccordions(false);
                        setCurrentAccordionStage(2);
                        setOpenPanels((prev) => ({ ...prev, subtitles: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 2
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        2
                      </span>
                      <span>Subtitles Table</span>
                    </button>
                    <button
                      type="button"
                      id="stage-step-3"
                      data-testid="stage-step-3"
                      onClick={() => {
                        setShowOtherSettingsAccordions(false);
                        setCurrentAccordionStage(3);
                        setOpenPanels((prev) => ({ ...prev, player: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 3
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        3
                      </span>
                      <span>Video &amp; Playback</span>
                    </button>
                    <button
                      type="button"
                      id="stage-step-4"
                      data-testid="stage-step-4"
                      onClick={() => {
                        setCurrentAccordionStage(4);
                        setShowOtherSettingsAccordions(true);
                        setOpenPanels((prev) => ({ ...prev, playback: true, library: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 4
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        4
                      </span>
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      id="stage-step-learning"
                      data-testid="stage-step-learning"
                      onClick={() => {
                        setShowOtherSettingsAccordions(false);
                        setCurrentAccordionStage(3);
                        setUseWordBalloonLearningView(true);
                        setOpenPanels((prev) => ({ ...prev, player: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 3 && useWordBalloonLearningView
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title="Open dedicated Word Balloons Learning stage"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>5. Balloons Learning</span>
                        setCurrentAccordionStage(5);
                        setShowWordBalloonLearningView(true);
                        setOpenPanels((prev) => ({ ...prev, player: true }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        currentAccordionStage === 5
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                        5
                      </span>
                      <span>Word Balloons</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2" />
                </div>
              </div>

              <div className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-2">
                {panelOrder
                  .filter((panelId) => {
                    // Special Characters Removal and Parser are now nested directly under Settings (playback)
                    if (panelId === "charsRemoval" || panelId === "parser") return false;

                    if (showOtherSettingsAccordions) {
                      if (panelId === "playback" || panelId === "library") return true;
                    }

                    // Stage 4: Settings & Library appear on Stage 4, or if showOtherSettingsAccordions is true
                    // Video player panel must be strictly restricted to Stage 3 (video stage) or Stage 5 (learning stage)
                    if (panelId === "player") {
                      return currentAccordionStage === 3 || currentAccordionStage === 5;
                    }

                    // Stage 4: Settings should appear ONLY on its own stage
                    if (currentAccordionStage === 4) {
                      return panelId === "playback" || panelId === "library";
                    }

                    // On Stages 0, 1, 2, 3, 5: Settings never appears
                    if (panelId === "playback" || panelId === "library") {
                      return currentAccordionStage === 4;
                    }

                    // Strict stage isolation: each main stage's component appears ONLY on its stage
                    if (currentAccordionStage === 0) {
                      return panelId === "fetchedSubtitles";
                    }
                    if (currentAccordionStage === 1) {
                      return panelId === "languages";
                    }
                    if (currentAccordionStage === 2) {
                      return panelId === "subtitles";
                    }
                    if (currentAccordionStage === 3 || currentAccordionStage === 5) {
                      return panelId === "player";
                    }
                    return false;
                  })
                  .map((panelId, panelIndex) => {
                    const panel = PANELS.find((candidate) => candidate.id === panelId);
                    if (!panel) return null;
                    const panelTitle =
                      panelId === "languages" &&
                      (currentAccordionStage === 1 || currentAccordionStage === 2)
                        ? "Learning goals"
                        : panel.title;
                    return (
                      <AccordionSection
                        key={panelId}
                        id={panelId}
                        title={panelTitle}
                        videoId={videoId}
                        open={openPanels[panelId] ?? true}
                        onOpenChange={(open) =>
                          setOpenPanels((current) => ({ ...current, [panelId]: open }))
                        }
                        onMoveUp={() => movePanel(panelId, -1)}
                        onMoveDown={() => movePanel(panelId, 1)}
                        canMoveUp={panelIndex > 0}
                        canMoveDown={panelIndex < panelOrder.length - 1}
                        wide={panelId === "subtitles" && subtitlesPanelWide}
                        onToggleWide={
                          panelId === "subtitles"
                            ? () => setSubtitlesPanelWide((wide) => !wide)
                            : undefined
                        }
                        autoTimeout={panelId === "library" ? videoLibraryTimeoutEnabled : false}
                      >
                        {panelId === "fetchedSubtitles" && (
                          <FetchedSubtitlesStagePanel
                            videoId={videoId}
                            videoInput={videoInput}
                            onVideoInputChange={setVideoInput}
                            onSubmitVideoUrl={(url) => {
                              const parsed = parseVideoId(url);
                              const newId = parsed || url.trim();
                              handleSelectLibraryVideo(newId, url);
                            }}
                            observedUrl={observedUrl}
                            onObservedUrlChange={setObservedUrl}
                            tracks={tracks}
                            onTracksChange={(newTracks) => setTracks(newTracks)}
                            baseLanguage={baseLanguage}
                            onSelectBaseLanguage={handleSelectDefaultSubtitle}
                            defaultLanguages={defaultSubtitleLanguages}
                            isAndroid={isAndroid}
                            onLoadSampleSubtitles={() => {
                              const validEntries = Object.entries(JSON3_RAW_MAP)
                                .map(([code, raw]) => {
                                  const j = parseJson3(raw);
                                  return j ? ([code, j] as const) : null;
                                })
                                .filter((entry): entry is [string, Json3] => entry !== null);
                              setTracks(Object.fromEntries(validEntries));
                              setObservedUrl(
                                "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
                              );
                            }}
                            onProceedToStage={(stage) => {
                              setShowOtherSettingsAccordions(false);
                              setCurrentAccordionStage(stage as 0 | 1 | 2 | 3);
                              if (stage === 0) {
                                setOpenPanels((prev) => ({ ...prev, fetchedSubtitles: true }));
                              }
                              if (stage === 1) {
                                setOpenPanels((prev) => ({ ...prev, languages: true }));
                              }
                              if (stage === 2) {
                                setOpenPanels((prev) => ({ ...prev, subtitles: true }));
                              }
                              if (stage === 3) {
                                setOpenPanels((prev) => ({
                                  ...prev,
                                  player: true,
                                }));
                              }
                            }}
                            innerParserQuarantined={true}
                          />
                        )}
                        {panelId === "player" && (
                          <div>
                            {isAndroid && (
                              <form
                                className="flex gap-2 p-3"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const id = parseVideoId(videoInput);
                                  if (id) {
                                    if (id !== videoId) {
                                      setTracks(null);
                                      setObservedUrl("");
                                      setDefaultCaptionsLoaded(false);
                                      setActive(-1);
                                      setSpeakingLang(null);
                                      setSpeakingRow(-1);
                                      setSpeechProgress(null);
                                      cancelSpeech();
                                      setCurrentAccordionStage(1);
                                      if (typeof window !== "undefined") {
                                        const currentSearch = new URLSearchParams(
                                          window.location.search,
                                        );
                                        if (currentSearch.get("v") !== id) {
                                          currentSearch.set("v", id);
                                          window.history.pushState(
                                            { videoId: id },
                                            "",
                                            `${window.location.pathname}?${currentSearch.toString()}${window.location.hash}`,
                                          );
                                        }
                                      }
                                    }
                                    setVideoId(id);
                                  } else {
                                    setCaptionStatus("Enter a valid YouTube link or video ID.");
                                  }
                                }}
                              >
                                <input
                                  aria-label="YouTube video URL or ID"
                                  value={videoInput}
                                  onChange={(event) => setVideoInput(event.target.value)}
                                  placeholder="YouTube link or video ID"
                                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1"
                                />
                                <Button type="submit">Load video</Button>
                              </form>
                            )}
                            <div
                              id="video-player-fullscreen-container"
                              data-testid="video-player-fullscreen-container"
                              className="relative w-full overflow-hidden [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:bg-black"
                            >
                              <VideoInstancesSwiper
                                instances={videoInstances}
                                activeIndex={activeSwiperIndex}
                                onActiveIndexChange={setActiveSwiperIndex}
                                activePlayingId={
                                  speakingLang && audioTrackMode
                                    ? `lang_${speakingLang}`
                                    : "primary"
                                }
                                videoId={videoId}
                                renderPlayerContainer={(instance) => {
                                  if (instance.isPrimary) {
                                    return (
                                      <div
                                        className="relative h-full w-full group"
                                        onMouseEnter={() => setIsPlayerHovered(true)}
                                        onMouseLeave={() => setIsPlayerHovered(false)}
                                      >
                                        <div
                                          ref={handlePlayerRef}
                                          className={
                                            useWordBalloonLearningView || useAlternativePlayerView
                                              ? "absolute inset-0 opacity-0 pointer-events-none -z-10"
                                              : "h-full w-full"
                                          }
                                        />
                                        {useWordBalloonLearningView ? (
                                          <WordBalloonLearningView
                                            currentSentence={currentAlternativeSentence}
                                            baseLanguage={baseLanguage}
                                            baseLanguageName={baseLanguageName}
                                            targetLanguage={currentTtsPlayLang}
                                            targetLanguageName={currentTtsPlayLangName}
                                            targetTranslation={currentAlternativeTranslation}
                                            availableTargetLanguages={availableAlternativeTtsLanguages}
                                            onSelectTargetLanguage={setSelectedAlternativeTtsLang}
                                            activeRowIndex={active}
                                            totalRows={rows.length}
                                            onPrevSentence={handlePrevSection}
                                            onNextSentence={handleNextSection}
                                            onReplaySentence={handleReplaySection}
                                            onCloseLearningView={() => setUseWordBalloonLearningView(false)}
                                            onSpeakText={handleSpeakTextFromAlternativeView}
                                          />
                                        ) : useAlternativePlayerView ? (
                                          <AlternativeVideoPlayerView
                                            currentSentence={currentAlternativeSentence}
                                            baseLanguage={baseLanguage}
                                            baseLanguageName={baseLanguageName}
                                            targetTtsLang={currentTtsPlayLang}
                                            targetTtsLangName={currentTtsPlayLangName}
                                            targetTranslation={currentAlternativeTranslation}
                                            availableTtsLanguages={availableAlternativeTtsLanguages}
                                            onSelectTtsLang={setSelectedAlternativeTtsLang}
                                            speechProgress={speechProgress}
                                            isSpeaking={Boolean(speakingLang)}
                                            speakingLang={speakingLang}
                                            speakingRow={speakingRow}
                                            activeRowIndex={active}
                                            totalRows={rows.length}
                                            currentTimeSec={playbackCurrentTime}
                                            durationSec={playbackDuration}
                                            rowStartMs={
                                              active >= 0 && rows[active] ? rows[active].start : 0
                                            }
                                            rowEndMs={
                                              active >= 0 && rows[active] ? rows[active].end : 0
                                            }
                                            isVideoPlaying={isVideoPlaying}
                                            onTogglePlay={handleTogglePlay}
                                            onPrevSentence={handlePrevSection}
                                            onNextSentence={handleNextSection}
                                            onReplaySentence={handleReplaySection}
                                            onCloseAlternativeView={() =>
                                              setUseAlternativePlayerView(false)
                                            }
                                            onSpeakText={handleSpeakTextFromAlternativeView}
                                          />
                                        ) : (
                                          <>
                                            {/* Overlay Play/Pause Button over video (prominent on pause/stop and hover/tap) */}
                                            <div
                                              data-testid="video-overlay-play-pause-container"
                                              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
                                                !isVideoPlaying ||
                                                isPlayerHovered ||
                                                Boolean(speakingLang)
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              }`}
                                            >
                                              <button
                                                type="button"
                                                data-testid="video-overlay-play-pause-btn"
                                                aria-label={
                                                  isVideoPlaying || Boolean(speakingLang)
                                                    ? "Pause playback"
                                                    : "Play video"
                                                }
                                                title={
                                                  isVideoPlaying || Boolean(speakingLang)
                                                    ? "Pause playback"
                                                    : "Play video"
                                                }
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleTogglePlay();
                                                }}
                                                className="pointer-events-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/65 hover:bg-black/85 text-white shadow-2xl backdrop-blur-sm border-2 border-white/30 transition-transform active:scale-95 hover:scale-105"
                                              >
                                                {isVideoPlaying || Boolean(speakingLang) ? (
                                                  <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current" />
                                                ) : (
                                                  <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
                                                )}
                                              </button>
                                            </div>
                                            {showVideoSubtitles && (
                                              <div
                                                className="pointer-events-none absolute inset-x-3 top-3 text-center"
                                                aria-live="polite"
                                              >
                                                <span
                                                  data-testid="active-subtitle-language"
                                                  className="mb-1 inline-block rounded-full bg-foreground/90 px-2.5 py-1 font-semibold text-background shadow-lg"
                                                  style={{
                                                    fontSize: `calc(0.75rem * ${videoSubtitleRatio})`,
                                                  }}
                                                >
                                                  {(() => {
                                                    const languageCode =
                                                      speakingLang && speakingRow >= 0
                                                        ? speakingLang
                                                        : baseLanguage;
                                                    const normalizedCode =
                                                      languageCode === "iw" ? "he" : languageCode;
                                                    return (
                                                      LANGS.find(
                                                        (language) =>
                                                          language.code === normalizedCode,
                                                      )?.name ?? normalizedCode.toUpperCase()
                                                    );
                                                  })()}
                                                </span>
                                                <p
                                                  id="active-subtitle-cue-text"
                                                  data-testid="active-subtitle-cue-text"
                                                  dir={
                                                    speakingLang && RTL.has(speakingLang)
                                                      ? "rtl"
                                                      : "ltr"
                                                  }
                                                  className="inline-block max-w-[92%] rounded-md bg-foreground/90 px-3 py-2 font-medium text-background shadow-lg"
                                                  style={{
                                                    fontSize: `calc(1rem * ${videoSubtitleRatio})`,
                                                  }}
                                                >
                                                  {speakingLang && speakingRow >= 0 ? (
                                                    <HighlightedSubtitle
                                                      text={
                                                        rows[speakingRow]?.texts?.[speakingLang] ??
                                                        ""
                                                      }
                                                      progress={
                                                        speechProgress?.row === speakingRow &&
                                                        speechProgress.lang === speakingLang
                                                          ? speechProgress
                                                          : null
                                                      }
                                                    />
                                                  ) : active >= 0 && rows[active] ? (
                                                    <span>
                                                      {baseLanguage &&
                                                      rows[active]?.texts?.[baseLanguage]
                                                        ? rows[active]?.texts?.[baseLanguage]
                                                        : Object.values(
                                                            rows[active]?.texts || {},
                                                          )[0] || ""}
                                                    </span>
                                                  ) : (
                                                    <span className="text-xs opacity-75">
                                                      Subtitles active
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      ref={(el) => {
                                        if (el) {
                                          secondaryPlayerHosts.current.set(instance.id, el);
                                        } else {
                                          secondaryPlayerHosts.current.delete(instance.id);
                                        }
                                      }}
                                      className="h-full w-full"
                                    />
                                  );
                                }}
                              />
                            </div>
                            {/* Switchable List of Default Languages & Ratio Compositions Dropdown around Video Component */}
                            <div className="p-2 border-t border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                              <SwitchableDefaultSubtitlesBar
                                videoId={videoId}
                                defaultLanguages={defaultSubtitleLanguages}
                                activeLanguage={baseLanguage}
                                onSelectLanguage={handleSelectDefaultSubtitle}
                                tracks={tracks}
                                detectedTracks={detectedPlaygroundTracks}
                                className="flex-1 min-w-[260px]"
                              />
                              <LanguageRatioCompositionSelector
                                activeCompositionId={activeRatioCompositionId}
                                onSelectComposition={handleSelectRatioComposition}
                                onSaveProfile={handleSaveComposition}
                                onUpdateProfile={handleUpdateRatioComposition}
                                onDeleteProfile={handleDeleteRatioComposition}
                                compositions={storedCompositions}
                              />
                            </div>
                            <div
                              data-testid="video-display-controls"
                              className="flex justify-end gap-2 border-t border-border bg-card/80 px-3 py-2"
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant={isVideoFullscreen ? "default" : "outline"}
                                aria-pressed={isVideoFullscreen}
                                data-testid="video-fullscreen-toggle-btn"
                                onClick={handleToggleFullscreen}
                                className="h-7 gap-1.5 px-2.5 text-xs text-foreground"
                                title={
                                  isVideoFullscreen ? "Exit full screen" : "Switch full screen"
                                }
                                aria-label={
                                  isVideoFullscreen ? "Exit full screen" : "Switch full screen"
                                }
                              >
                                {isVideoFullscreen ? (
                                  <Minimize2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Maximize2 className="h-3.5 w-3.5" />
                                )}
                                <span>
                                  {isVideoFullscreen ? "Exit full screen" : "Full screen"}
                                </span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={useAlternativePlayerView ? "default" : "outline"}
                                aria-pressed={useAlternativePlayerView}
                                data-testid="toggle-alternative-player-view-btn"
                                onClick={handleToggleAlternativePlayerView}
                                className="h-7 gap-1.5 px-2.5 text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
                                title="Switch between video player and alternative subtitle/translation view"
                              >
                                <Subtitles className="h-3.5 w-3.5" />
                                {useAlternativePlayerView ? "Video view" : "Alternative view"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={useWordBalloonLearningView ? "default" : "outline"}
                                aria-pressed={useWordBalloonLearningView}
                                data-testid="toggle-word-balloon-learning-view-btn"
                                onClick={handleToggleWordBalloonLearningView}
                                className="h-7 gap-1.5 px-2.5 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400"
                                title="Switch between video player and interactive word balloon learning view"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                {useWordBalloonLearningView ? "Video view" : "Balloons Learning"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={showVideoSubtitles ? "default" : "outline"}
                                aria-pressed={showVideoSubtitles}
                                data-testid="video-subtitles-overlay-toggle"
                                onClick={handleToggleVideoSubtitles}
                                className="h-7 gap-1.5 px-2.5 text-xs"
                                title="Toggle spoken subtitles over the video"
                              >
                                <Subtitles className="h-3.5 w-3.5" />
                                {showVideoSubtitles ? "Overlay on" : "Overlay off"}
                              </Button>
                            </div>
                            {/* Video metadata card (Client-side title & channel author) */}
                            {videoMetadata && (
                              <div
                                data-testid="video-metadata-card"
                                className="flex items-center justify-between gap-2.5 px-3 py-1.5 text-xs text-muted-foreground bg-muted/20 border-b border-border/40"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {videoMetadata.thumbnailUrl && (
                                    <img
                                      src={videoMetadata.thumbnailUrl}
                                      alt={videoMetadata.title}
                                      className="h-7 w-12 rounded object-cover border border-border/50 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setVideoMetadataModalOpen(true)}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display =
                                          "none";
                                      }}
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <p
                                        data-testid="video-metadata-title"
                                        className="font-medium text-foreground truncate leading-tight cursor-pointer hover:underline"
                                        title={videoMetadata.title}
                                        onClick={() => setVideoMetadataModalOpen(true)}
                                      >
                                        {videoMetadata.title}
                                      </p>
                                      {videoMetadata.durationFormatted && (
                                        <span
                                          data-testid="video-metadata-duration-badge"
                                          className="text-[10px] bg-muted text-foreground px-1 py-0.5 rounded font-mono shrink-0"
                                        >
                                          {videoMetadata.durationFormatted}
                                        </span>
                                      )}
                                    </div>
                                    {videoMetadata.authorName && (
                                      <p
                                        data-testid="video-metadata-author"
                                        className="text-[11px] text-muted-foreground truncate"
                                      >
                                        {videoMetadata.authorUrl ? (
                                          <a
                                            href={videoMetadata.authorUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline text-primary/90"
                                          >
                                            {videoMetadata.authorName}
                                          </a>
                                        ) : (
                                          videoMetadata.authorName
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] gap-1 shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => setVideoMetadataModalOpen(true)}
                                  data-testid="open-video-metadata-modal-button"
                                  title="Inspect video description, duration, thumbnails, and caption tracks"
                                >
                                  <Info className="w-3.5 h-3.5 text-primary" />
                                  <span className="hidden sm:inline">Details</span>
                                </Button>
                              </div>
                            )}
                            {/* Video playback buttons under the presented video */}
                            <div className="p-3 pt-2">
                              <VideoPlaybackControls
                                isPlaying={isVideoPlaying}
                                currentTimeSec={playbackCurrentTime}
                                durationSec={playbackDuration}
                                playbackRate={playbackRate}
                                activeSectionIndex={active}
                                totalSections={rows.length}
                                isPausedForSpeech={Boolean(speakingLang)}
                                speakingLangName={
                                  speakingLang
                                    ? (getLanguageMeta(speakingLang).name ?? speakingLang)
                                    : undefined
                                }
                                pauseReason={pauseReason}
                                onTogglePlay={handleTogglePlay}
                                onSeek={handleSeek}
                                onRewind={handleRewind}
                                onFastForward={handleFastForward}
                                onPrevSection={handlePrevSection}
                                onNextSection={handleNextSection}
                                onReplaySection={handleReplaySection}
                                onStop={handleStop}
                                onRateChange={handleRateChange}
                              />
                              <div className="pt-2">
                                <TtsFallbackOrderSwitch
                                  currentOrder={ttsFallbackOrderState}
                                  onOrderChange={(newOrder) => {
                                    setTtsFallbackOrderState(newOrder);
                                    setTtsFallbackOrder(newOrder);
                                  }}
                                  onNavigateToSetup={handleNavigateToTtsSetup}
                                  tts3TokenConfigured={Boolean(
                                    openRouterKeyInput || getSpeakApiToken(),
                                  )}
                                  tts3Provider={lovableTtsProviderState}
                                />
                              </div>
                              <div className="pt-2">
                                <BeginnerTtsServiceControl
                                  service={
                                    useAlternativeTtsState && alternativeTtsModeState === "always"
                                      ? "google"
                                      : "native"
                                  }
                                  onServiceChange={(service: BeginnerTtsService) => {
                                    if (service === "google") {
                                      setAlternativeTtsEngineState("lovable");
                                      setAlternativeTtsEngine("lovable");
                                      setAlternativeTtsModeState("always");
                                      setAlternativeTtsMode("always");
                                      setLovableTtsProvider("google");
                                      setLovableTtsProviderState("google");
                                      setUseAlternativeTtsState(true);
                                      setUseAlternativeTts(true);
                                      return;
                                    }
                                    setUseAlternativeTtsState(false);
                                    setUseAlternativeTts(false);
                                  }}
                                />
                              </div>
                              {!isVideoPlaying && pauseReason && (
                                <div
                                  data-testid="video-pause-reason-banner"
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 mt-2"
                                >
                                  <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                  <span className="font-semibold">Pause explanation:</span>
                                  <span className="truncate">{pauseReason}</span>
                                </div>
                              )}
                            </div>
                            {isAndroid && (
                              <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
                                {captionStatus}
                              </p>
                            )}

                            {/* Stage 1: Captions Detection Status & Actions */}
                            {detectedSubtitleCount === 0 ? (
                              <div
                                id="video-accordion-red-instruction"
                                data-testid="video-accordion-red-instruction"
                                className="mx-3 my-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-red-600 dark:text-red-300 text-xs font-semibold flex flex-wrap items-center justify-between gap-2.5 shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 animate-pulse" />
                                  <span>
                                    {captionsAlertGraceActive
                                      ? "Auto-activating captions for default language... ([CC] fallback available)"
                                      : "No subtitles detected yet. Turn on captions ([CC]) in the player above or select a track."}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    data-testid="btn-auto-trigger-captions"
                                    onClick={() => triggerProgrammaticCaptions()}
                                    className="h-7 text-xs border-red-500/40 text-red-700 dark:text-red-200 hover:bg-red-500/20 gap-1"
                                    title="Programmatically trigger YouTube caption stream without native CC button"
                                  >
                                    <Subtitles className="h-3 w-3" />
                                    <span>Auto-Enable CC</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (!isVideoPlaying) {
                                        handleTogglePlay();
                                      }
                                    }}
                                    className="h-7 text-xs border-red-500/40 text-red-700 dark:text-red-200 hover:bg-red-500/20"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Play to Detect
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                id="stage-1-detected-subtitles-bar"
                                data-testid="stage-1-detected-subtitles-bar"
                                className="mx-3 my-2 pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2.5"
                              >
                                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>
                                    {detectedSubtitleCount} subtitle{" "}
                                    {detectedSubtitleCount === 1 ? "track" : "tracks"} detected (
                                    {detectedLanguagesList.join(", ")})
                                  </span>
                                </div>
                                <Button
                                  id="stage-1-next-button"
                                  data-testid="stage-1-next-button"
                                  type="button"
                                  onClick={() => {
                                    setShowOtherSettingsAccordions(false);
                                    setCurrentAccordionStage(2);
                                    setOpenPanels((prev) => ({ ...prev, subtitles: true }));
                                  }}
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 py-1.5 text-xs shadow-md flex items-center gap-1.5 h-8"
                                >
                                  <span>NEXT ({detectedSubtitleCount})</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}

                            {currentAccordionStage === 3 && (
                              <div
                                id="stage-3-navigation-bar"
                                data-testid="stage-3-navigation-bar"
                                className="mx-3 my-2 pt-2 border-t border-border flex items-center justify-between gap-2.5"
                              >
                                <Button
                                  id="stage-3-back-to-subtitles-btn"
                                  data-testid="stage-3-back-to-subtitles-btn"
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowOtherSettingsAccordions(false);
                                    setCurrentAccordionStage(2);
                                    setOpenPanels((prev) => ({ ...prev, subtitles: true }));
                                  }}
                                  className="text-xs h-8 flex items-center gap-1.5"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                  <span>Back to Subtitles Table (Stage 2)</span>
                                </Button>
                                <Button
                                  id="stage-3-to-settings-btn"
                                  data-testid="stage-3-to-settings-btn"
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentAccordionStage(4);
                                    setOpenPanels((prev) => ({
                                      ...prev,
                                      playback: true,
                                      library: true,
                                    }));
                                  }}
                                  className="text-xs h-8 flex items-center gap-1.5"
                                >
                                  <span>Settings (Stage 4)</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {panelId === "playback" && (
                          <div className="space-y-4">
                            {/* Performance Mode: Fast (Default) vs. Slow Mode */}
                            <PerformanceModeSettingsPanel />

                            {/* Sub-Accordion 1: General Playback & Audio Settings */}
                            <details
                              className="group rounded-xl border border-border bg-card/60 overflow-hidden shadow-xs"
                              open
                              data-testid="settings-playback-accordion"
                            >
                              <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-foreground hover:bg-muted/40 transition">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="h-4 w-4 text-emerald-500" />
                                  <span>General Playback &amp; Audio Settings</span>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                              </summary>
                              <div className="p-3 pt-0 border-t border-border/40 space-y-3">
                                {speakingLang ? (
                                  <p>
                                    {audioTrackMode ? "Repeating" : "Speaking"}{" "}
                                    <b>
                                      {LANGS.find((l) => l.code === speakingLang)?.name ??
                                        speakingLang}
                                    </b>
                                    …
                                  </p>
                                ) : (
                                  <p className="text-muted-foreground">
                                    Press play.{" "}
                                    {pauseMode
                                      ? audioTrackMode
                                        ? "The video pauses after each section and repeats it using native audio."
                                        : "The video pauses after each section and speaks it."
                                      : "Continuous playback."}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={pauseMode}
                                      onChange={(e) => setPauseMode(e.target.checked)}
                                    />{" "}
                                    Pause &amp; speak after each section
                                  </label>
                                  {playedRecordsCount > 0 && (
                                    <button
                                      type="button"
                                      data-testid="reset-played-subtitles-btn"
                                      onClick={() => {
                                        resetTtsPlaybackProgress();
                                      }}
                                      className="text-xs text-primary hover:underline font-medium"
                                      title="Reset history of spoken subtitle records so they can be spoken again"
                                    >
                                      Reset spoken history ({playedRecordsCount} spoken)
                                    </button>
                                  )}
                                </div>
                                {isAndroid && (
                                  <>
                                    <label className="flex flex-wrap items-center gap-2">
                                      <span>Subtitle request (first try, other is fallback):</span>
                                      <select
                                        data-testid="subtitle-request-mode-select"
                                        value={requestMode}
                                        onChange={(e) => {
                                          const v = e.target.value as SubtitleRequestMode;
                                          setRequestModeState(v);
                                          saveSubtitleRequestMode(v);
                                        }}
                                        className="rounded-md border border-input bg-background px-2 py-1"
                                      >
                                        <option value="tlang">Add tlang=&lt;language&gt;</option>
                                        <option value="lang">Replace lang=&lt;language&gt;</option>
                                      </select>
                                    </label>
                                    {isDeveloperMode && (
                                      <AttemptOrderSettings
                                        order={attemptOrder}
                                        onChangeOrder={handleUpdateAttemptOrder}
                                        promoteSuccess={promoteSuccess}
                                        onTogglePromoteSuccess={handleTogglePromoteSuccess}
                                        useFetchServer={useFetchServer}
                                        onToggleUseFetchServer={handleToggleUseFetchServer}
                                        fetchServerUrl={fetchServerUrl}
                                        onUpdateFetchServerUrl={handleUpdateFetchServerUrl}
                                        onSelectVideo={handleSelectLibraryVideo}
                                        strategyConfig={strategyConfig}
                                        onChangeStrategyConfig={(next) => {
                                          setStrategyConfigState(next);
                                          setSubtitleFetchWindowSeconds(next.windowSeconds);
                                          setFetchWindowSecondsState(next.windowSeconds);
                                          subtitleRequestQueue.setWindowSeconds(next.windowSeconds);
                                        }}
                                        windowSeconds={fetchWindowSeconds}
                                        onChangeWindowSeconds={(sec) => {
                                          setFetchWindowSecondsState(sec);
                                          setSubtitleFetchWindowSeconds(sec);
                                          subtitleRequestQueue.setWindowSeconds(sec);
                                        }}
                                        developerMode={isDeveloperMode}
                                        currentVideoId={videoId}
                                        observedUrl={observedUrl}
                                        onApplySubtitles={(langCode, json) => {
                                          if (videoId) {
                                            saveCachedRawJson3(
                                              videoId,
                                              langCode,
                                              JSON.stringify(json),
                                            );
                                          }
                                          startSubtitlesTransition(() => {
                                            setTracks((prev) => ({ ...prev, [langCode]: json }));
                                            setShown((prev) =>
                                              prev.includes(langCode) ? prev : [...prev, langCode],
                                            );
                                          });
                                          speakFetchedLanguageName(langCode);
                                        }}
                                      />
                                    )}
                                    <div className="pt-2 border-t border-border/60 space-y-2">
                                      {isDeveloperMode && (
                                        <div
                                          className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2"
                                          data-control-category="experimental"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                              <input
                                                data-testid="auto-retry-subtitles-toggle"
                                                type="checkbox"
                                                checked={autoRetrySubtitles}
                                                onChange={(e) =>
                                                  handleToggleAutoRetry(e.target.checked)
                                                }
                                                className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                              />
                                              <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                                <RotateCcw className="w-3.5 h-3.5 text-primary" />
                                                <span>
                                                  Auto-retry unfetched favorite languages (paced
                                                  jitter)
                                                </span>
                                              </span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedPrefsHelp((p) => ({
                                                  ...p,
                                                  autoRetry: !p.autoRetry,
                                                }))
                                              }
                                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                              title="Toggle auto-retry explanation"
                                              aria-expanded={Boolean(expandedPrefsHelp.autoRetry)}
                                            >
                                              <HelpCircle className="w-3 h-3" />
                                              <span>
                                                {expandedPrefsHelp.autoRetry ? "Hide" : "Info"}
                                              </span>
                                            </button>
                                          </div>
                                          {expandedPrefsHelp.autoRetry && (
                                            <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                              Automatically retries pending favorite subtitles with
                                              random spacing between X and Y seconds to prevent
                                              YouTube HTTP 429 rate limit blocks.
                                            </p>
                                          )}
                                          <div className="ml-6 grid grid-cols-2 gap-3 max-w-sm pt-1">
                                            <div>
                                              <label
                                                htmlFor="retry-pacing-min-input"
                                                className="text-[11px] font-medium text-muted-foreground block mb-1"
                                              >
                                                Min interval (X seconds):
                                              </label>
                                              <input
                                                id="retry-pacing-min-input"
                                                data-testid="retry-pacing-min-input"
                                                type="number"
                                                min={1}
                                                max={retryPacingMaxSec}
                                                value={retryPacingMinSec}
                                                onChange={(e) =>
                                                  handleUpdatePacingMin(
                                                    parseInt(e.target.value, 10) || 1,
                                                  )
                                                }
                                                className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                                              />
                                            </div>
                                            <div>
                                              <label
                                                htmlFor="retry-pacing-max-input"
                                                className="text-[11px] font-medium text-muted-foreground block mb-1"
                                              >
                                                Max interval (Y seconds):
                                              </label>
                                              <input
                                                id="retry-pacing-max-input"
                                                data-testid="retry-pacing-max-input"
                                                type="number"
                                                min={retryPacingMinSec}
                                                max={60}
                                                value={retryPacingMaxSec}
                                                onChange={(e) =>
                                                  handleUpdatePacingMax(
                                                    parseInt(e.target.value, 10) ||
                                                      retryPacingMinSec,
                                                  )
                                                }
                                                className="w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                <div
                                  className="space-y-2 p-2.5 rounded-lg border border-border/80 bg-card/60 shadow-xs"
                                  data-testid="settings-default-language-card"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                      <Languages className="w-3.5 h-3.5 text-primary" />
                                      <span>Default Language (Translation Source)</span>
                                    </span>
                                    <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                                      Synchronized
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    The single authoritative default language for translation and
                                    parallel alignment across the entire application.
                                  </p>
                                  <div
                                    className="flex flex-wrap gap-1.5 pt-1"
                                    data-testid="settings-default-language-select"
                                  >
                                    {fetchedSubtitleLanguages.length > 0 ? (
                                      fetchedSubtitleLanguages.map((langCode) => {
                                        const isDefault = baseLanguage === langCode;
                                        const langMeta = LANGS.find((l) => l.code === langCode);
                                        return (
                                          <button
                                            key={langCode}
                                            type="button"
                                            data-testid={`settings-default-lang-btn-${langCode}`}
                                            onClick={() => handleSelectDefaultSubtitle(langCode)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                                              isDefault
                                                ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40"
                                                : "border-border bg-background hover:bg-muted text-foreground"
                                            }`}
                                          >
                                            {isDefault && <Check className="h-3 w-3" />}
                                            <span>{langMeta?.name || langCode.toUpperCase()}</span>
                                            <span className="text-[10px] opacity-75 font-mono">
                                              ({langCode})
                                            </span>
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
                                <div
                                  className="space-y-2 p-2.5 rounded-lg border border-border/80 bg-card/60 shadow-xs"
                                  data-testid="settings-zero-knowledge-card"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                      <Split className="w-3.5 h-3.5 text-primary" />
                                      <span>Zero Knowledge in Language Mode (Word Learning)</span>
                                    </span>
                                    <span className="text-[10px] bg-amber-500/10 text-amber-300 font-medium px-2 py-0.5 rounded-full border border-amber-500/20">
                                      Vocabulary First
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    When you don&apos;t know a language at all, learning words
                                    rather than full sentences is most effective. For zero-knowledge
                                    languages, the application pronounces the picked word and its
                                    translation in your default language.
                                  </p>
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-foreground">
                                        Pick Word Strategy:
                                      </span>
                                      <select
                                        data-testid="settings-pick-word-strategy-select"
                                        value={pickWordStrategyState}
                                        onChange={(e) =>
                                          handleSetPickWordStrategy(
                                            e.target.value as PickWordStrategy,
                                          )
                                        }
                                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                                        aria-label="Pick word strategy"
                                      >
                                        <option value="longest">
                                          Longest word (Key vocabulary)
                                        </option>
                                        <option value="random">Random word</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="pt-1 space-y-1.5">
                                    <span className="text-[11px] font-medium text-muted-foreground block">
                                      Configure per-language zero knowledge mode:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {Array.from(
                                        new Set(
                                          [baseLanguage, primaryTtsLang, ...targetLanguages].filter(
                                            (code): code is string => Boolean(code),
                                          ),
                                        ),
                                      ).map((langCode) => {
                                        const isZk = getZeroKnowledgeInLang(langCode);
                                        const meta =
                                          LANGS.find((l) => l.code === langCode) ||
                                          SUPPORTED_LANGUAGES_CATALOG.find(
                                            (l) => l.code === langCode,
                                          );
                                        return (
                                          <button
                                            key={langCode}
                                            type="button"
                                            data-testid={`settings-zero-knowledge-toggle-${langCode}`}
                                            onClick={() => handleToggleZeroKnowledge(langCode)}
                                            className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                              isZk
                                                ? "border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-xs font-semibold"
                                                : "border-border bg-background hover:bg-muted text-muted-foreground"
                                            }`}
                                            title={`Toggle zero knowledge mode for ${meta?.name || langCode}`}
                                          >
                                            <span>{meta?.name || langCode.toUpperCase()}</span>
                                            <span className="text-[10px] opacity-75">
                                              {isZk ? "✓ Words" : "Sentences"}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className="space-y-2 p-2.5 rounded-lg border border-border/80 bg-card/60 shadow-xs"
                                  data-testid="settings-export-import-section"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                      <Settings2 className="w-3.5 h-3.5 text-primary" />
                                      <span>Settings Backup &amp; Restore</span>
                                    </span>
                                    <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                                      JSON
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Export, download, or restore your complete application settings,
                                    preferences, language choices, and learning goals.
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      data-testid="settings-export-import-btn"
                                      onClick={() => setIsSettingsBackupModalOpen(true)}
                                      className="h-7 text-xs gap-1.5 cursor-pointer font-medium"
                                    >
                                      <Settings2 className="h-3.5 w-3.5" />
                                      <span>Export / Import Settings</span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      id="audio-track-mode-toggle"
                                      type="checkbox"
                                      checked={audioTrackMode}
                                      onChange={(e) => onAudioTrackModeChange(e.target.checked)}
                                      className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                    />
                                    <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                      <Volume2 className="w-3.5 h-3.5 text-primary" />
                                      <span>Audio-track mode (native video loop)</span>
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPrefsHelp((p) => ({
                                        ...p,
                                        audioTrack: !p.audioTrack,
                                      }))
                                    }
                                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                    title="Toggle audio-track mode explanation"
                                    aria-expanded={Boolean(expandedPrefsHelp.audioTrack)}
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                    <span>{expandedPrefsHelp.audioTrack ? "Hide" : "Info"}</span>
                                  </button>
                                </div>
                                {expandedPrefsHelp.audioTrack && (
                                  <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                    Repeats active segment with native video audio instead of
                                    synthesized WebSpeech or alternative TTS.
                                  </p>
                                )}
                                {/* Hidden inputs keep programmatic compatibility while consolidating duplicate UI controls */}
                                <input
                                  id="disable-scrolling-toggle"
                                  data-testid="disable-scrolling-toggle"
                                  type="checkbox"
                                  checked={disableScrolling}
                                  onChange={(e) => onDisableScrollingChange(e.target.checked)}
                                  className="hidden"
                                  aria-hidden="true"
                                />
                                <input
                                  id="disable-autofocus-toggle"
                                  data-testid="disable-autofocus-toggle"
                                  type="checkbox"
                                  checked={disableAutoFocus}
                                  onChange={(e) => onDisableAutoFocusChange(e.target.checked)}
                                  className="hidden"
                                  aria-hidden="true"
                                />
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        id="auto-scroll-toggle"
                                        data-testid="auto-scroll-toggle"
                                        type="checkbox"
                                        checked={autoFocus}
                                        onChange={(e) => onAutoFocusChange(e.target.checked)}
                                        className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                      />
                                      <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                        <LayoutList className="w-3.5 h-3.5 text-primary" />
                                        <span>Auto-focus and scroll to current subtitle</span>
                                      </span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPrefsHelp((p) => ({
                                          ...p,
                                          autoScroll: !p.autoScroll,
                                        }))
                                      }
                                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Toggle auto-scroll explanation"
                                      aria-expanded={Boolean(expandedPrefsHelp.autoScroll)}
                                    >
                                      <HelpCircle className="w-3 h-3" />
                                      <span>{expandedPrefsHelp.autoScroll ? "Hide" : "Info"}</span>
                                    </button>
                                  </div>
                                  {expandedPrefsHelp.autoScroll && (
                                    <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                      Auto-scroll only starts 5 seconds after last user interaction
                                      to avoid disturbing user actions.
                                    </p>
                                  )}
                                </div>
                                {isDeveloperMode && (
                                  <div
                                    className="space-y-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-2"
                                    data-control-category="experimental"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          id="debug-mode-toggle"
                                          data-testid="debug-mode-toggle"
                                          type="checkbox"
                                          checked={debugMode}
                                          onChange={(e) => onDebugModeChange(e.target.checked)}
                                          className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                        <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                          <Activity className="w-3.5 h-3.5 text-primary" />
                                          <span>Network inspector &amp; diagnostics</span>
                                        </span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedPrefsHelp((p) => ({
                                            ...p,
                                            debugMode: !p.debugMode,
                                          }))
                                        }
                                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                        title="Toggle diagnostics explanation"
                                        aria-expanded={Boolean(expandedPrefsHelp.debugMode)}
                                      >
                                        <HelpCircle className="w-3 h-3" />
                                        <span>{expandedPrefsHelp.debugMode ? "Hide" : "Info"}</span>
                                      </button>
                                    </div>
                                    {expandedPrefsHelp.debugMode && (
                                      <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                        Enables live network traffic capture, headers inspection,
                                        and timedtext diagnostics while developer mode is active.
                                      </p>
                                    )}
                                  </div>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    id="background-audio-toggle"
                                    data-testid="background-audio-toggle"
                                    type="checkbox"
                                    checked={backgroundAudioEnabled}
                                    onChange={(e) => handleToggleBackgroundAudio(e.target.checked)}
                                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                  />
                                  <Smartphone className="w-3.5 h-3.5 text-primary" />
                                  <span className="font-medium text-xs text-foreground">
                                    Background audio &amp; lockscreen playback controls
                                  </span>
                                </label>

                                {/* On-Demand Translation Ahead via Google Translate API */}
                                <div
                                  className="pt-2 border-t border-border/60 space-y-2"
                                  data-testid="on-demand-translation-settings-card"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        id="on-demand-translation-toggle"
                                        data-testid="on-demand-translation-toggle"
                                        type="checkbox"
                                        checked={enableOnDemandTranslation}
                                        onChange={(e) =>
                                          onEnableOnDemandTranslationChange(e.target.checked)
                                        }
                                        className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                      />
                                      <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        <span>On-demand sentence translation ahead</span>
                                      </span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPrefsHelp((p) => ({
                                          ...p,
                                          onDemand: !p.onDemand,
                                        }))
                                      }
                                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Toggle on-demand translation explanation"
                                      aria-expanded={Boolean(expandedPrefsHelp.onDemand)}
                                    >
                                      <HelpCircle className="w-3 h-3" />
                                      <span>{expandedPrefsHelp.onDemand ? "Hide" : "Info"}</span>
                                    </button>
                                  </div>
                                  {expandedPrefsHelp.onDemand && (
                                    <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                      Uses Google Translate API to pre-translate upcoming sentences
                                      ahead for selected target languages until authentic YouTube
                                      captions are fetched.
                                    </p>
                                  )}
                                  <div className="ml-6 flex items-center gap-2 pt-1 max-w-xs">
                                    <label
                                      htmlFor="on-demand-ahead-count-input"
                                      className="text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                                    >
                                      Sentences ahead (X):
                                    </label>
                                    <input
                                      id="on-demand-ahead-count-input"
                                      data-testid="on-demand-ahead-count-input"
                                      type="number"
                                      min={1}
                                      max={50}
                                      value={onDemandAheadCount}
                                      onChange={(e) =>
                                        onOnDemandAheadCountChange(
                                          Math.max(
                                            1,
                                            Math.min(50, parseInt(e.target.value, 10) || 10),
                                          ),
                                        )
                                      }
                                      className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                                    />
                                  </div>
                                </div>

                                {/* Alternative TTS Service (Lovable Speak API & Google Translate) */}
                                <div
                                  className="pt-2 border-t border-border/60 space-y-2"
                                  data-testid="alternative-tts-settings-card"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        id="alternative-tts-toggle"
                                        data-testid="alternative-tts-toggle"
                                        type="checkbox"
                                        checked={useAlternativeTtsState}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setUseAlternativeTtsState(checked);
                                          setUseAlternativeTts(checked);
                                        }}
                                        className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                      />
                                      <span className="font-medium text-xs text-foreground flex items-center gap-1.5">
                                        <Volume2 className="w-3.5 h-3.5 text-primary" />
                                        <span>
                                          Alternative TTS Service (Lovable API &amp; Google
                                          Translate)
                                        </span>
                                      </span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                        Off by default
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedPrefsHelp((p) => ({ ...p, altTts: !p.altTts }))
                                        }
                                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                        title="Toggle alternative TTS explanation"
                                        aria-expanded={Boolean(expandedPrefsHelp.altTts)}
                                      >
                                        <HelpCircle className="w-3 h-3" />
                                        <span>{expandedPrefsHelp.altTts ? "Hide" : "Info"}</span>
                                      </button>
                                    </div>
                                  </div>
                                  {expandedPrefsHelp.altTts && (
                                    <p className="text-[11px] text-muted-foreground ml-6 p-2 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                      Provides high-quality neural voice synthesis via Lovable Speak
                                      API and OpenRouter cloud voices, with automatic fallback when
                                      local device TTS lacks specific language voices.
                                    </p>
                                  )}

                                  {useAlternativeTtsState && (
                                    <div className="ml-6 pt-1">
                                      {/* data-testid="test-alternative-tts-btn" rendered in TtsServiceSettingsPanel */}
                                      <TtsServiceSettingsPanel
                                        mode={alternativeTtsModeState}
                                        onModeChange={(m) => {
                                          setAlternativeTtsModeState(m);
                                          setAlternativeTtsMode(m);
                                        }}
                                        engine={alternativeTtsEngineState}
                                        onEngineChange={(e) => {
                                          setAlternativeTtsEngineState(e);
                                          setAlternativeTtsEngine(e);
                                        }}
                                        provider={lovableTtsProviderState}
                                        onProviderChange={(p) => {
                                          setLovableTtsProviderState(p);
                                          setLovableTtsProvider(p);
                                          const availableVoices = getVoicesForProvider(p);
                                          if (
                                            availableVoices.length > 0 &&
                                            !availableVoices.includes(lovableTtsVoiceState)
                                          ) {
                                            const defaultVoice = getDefaultVoiceForProvider(p);
                                            setLovableTtsVoiceState(defaultVoice);
                                            setLovableTtsVoice(defaultVoice);
                                          }
                                        }}
                                        voice={lovableTtsVoiceState}
                                        onVoiceChange={(v) => {
                                          setLovableTtsVoiceState(v);
                                          setLovableTtsVoice(v);
                                        }}
                                        speechRate={rates[baseLanguage || "en"] ?? 0.5}
                                        onSpeechRateChange={(val) => {
                                          const targetLang = baseLanguage || "en";
                                          setRates((current) => ({
                                            ...current,
                                            [targetLang]: val,
                                          }));
                                          saveTtsRatePreference(targetLang, val);
                                          if (videoId) {
                                            saveVideoSettings(videoId, {
                                              ttsRates: { [targetLang]: val },
                                            });
                                          }
                                        }}
                                        baseLanguage={baseLanguage || "en"}
                                        currentKeyInput={openRouterKeyInput}
                                        hasCustomKey={hasCustomOpenRouterApiKey()}
                                        hasCustomSpeakToken={Boolean(getSpeakApiToken())}
                                        hasServerKey={Boolean(getServerOpenRouterApiKey())}
                                        onSaveKey={(k) => {
                                          setOpenRouterKeyInput(k);
                                          setLovableTtsApiKey(k);
                                          setOpenRouterApiKeySetting(k);
                                        }}
                                        onClearKey={() => {
                                          setOpenRouterKeyInput("");
                                          setLovableTtsApiKey("");
                                          setOpenRouterApiKeySetting("");
                                        }}
                                        onValidateService={() => handleValidateRemoteService()}
                                        onTestAudio={async () => {
                                          setIsTestingAlternativeTts(true);
                                          const testRate = rates[baseLanguage || "en"] ?? 0.5;
                                          try {
                                            await playAlternativeTtsAudio(
                                              "Hello world",
                                              baseLanguage || "en",
                                              testRate,
                                              undefined,
                                              alternativeTtsEngineState,
                                              {
                                                provider: lovableTtsProviderState,
                                                speed: testRate,
                                                isAnonymous: alternativeTtsAnonymousState,
                                              },
                                            );
                                          } catch (err) {
                                            console.warn("Test Alternative TTS error:", err);
                                          } finally {
                                            setIsTestingAlternativeTts(false);
                                          }
                                        }}
                                        isValidating={isValidatingRemoteTts}
                                        isTestingAudio={isTestingAlternativeTts}
                                        validationResult={remoteValidationResult}
                                        isAnonymous={alternativeTtsAnonymousState}
                                        onAnonymousChange={(anon) => {
                                          setAlternativeTtsAnonymousState(anon);
                                          setAlternativeTtsAnonymousMode(anon);
                                        }}
                                        showDebugger={true}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Favorite Languages (Settings & localStorage) and Video-Specific Selection */}
                                <div
                                  className="hidden pt-2 border-t border-border/60 space-y-2.5"
                                  data-testid="settings-favorites-languages-card"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                                        <span>
                                          Favorite Languages (Settings &amp; localStorage)
                                        </span>
                                      </span>
                                      <p className="text-[11px] text-muted-foreground">
                                        Saved in localStorage. Applied automatically as default
                                        target languages for every new video.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        data-testid="settings-reset-video-to-favorites-btn"
                                        onClick={handleResetVideoToFavorites}
                                        className="rounded border border-input bg-background hover:bg-muted px-2 py-0.5 text-xs font-medium"
                                      >
                                        Apply Favorites to Active Video
                                      </button>
                                      <button
                                        type="button"
                                        data-testid="settings-save-current-as-favorites-btn"
                                        onClick={handleSaveCurrentAsFavorites}
                                        className="rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-xs font-medium"
                                      >
                                        Save Active Selection as Favorites
                                      </button>
                                    </div>
                                  </div>

                                  <div className="rounded-md border border-border bg-background/50 p-2 space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[11px] font-medium text-muted-foreground mr-1">
                                        Global Favorites:
                                      </span>
                                      {favoriteLanguages.length === 0 ? (
                                        <span className="text-[11px] text-muted-foreground italic">
                                          No favorites selected yet
                                        </span>
                                      ) : (
                                        Array.from(new Set(favoriteLanguages)).map((code) => {
                                          const langMeta = SUPPORTED_LANGUAGES_CATALOG.find(
                                            (c) => c.code === code,
                                          ) || { code, name: code };
                                          return (
                                            <span
                                              key={code}
                                              data-testid={`settings-fav-chip-${code}`}
                                              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-medium"
                                            >
                                              <span>{langMeta.name}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextFavs = favoriteLanguages.filter(
                                                    (c) => c !== code,
                                                  );
                                                  handleUpdateFavoriteLanguages(nextFavs);
                                                }}
                                                className="hover:text-destructive transition ml-0.5 text-xs"
                                                title={`Remove ${langMeta.name} from favorites`}
                                                aria-label={`Remove ${langMeta.name} from favorites`}
                                              >
                                                ×
                                              </button>
                                            </span>
                                          );
                                        })
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
                                      <label
                                        htmlFor="add-favorite-language-select"
                                        className="text-muted-foreground"
                                      >
                                        Add favorite language:
                                      </label>
                                      <input
                                        type="text"
                                        id="filter-add-favorite-languages-input"
                                        data-testid="filter-add-favorite-languages-input"
                                        placeholder="Filter languages…"
                                        value={addFavoriteFilter}
                                        onChange={(e) => setAddFavoriteFilter(e.target.value)}
                                        className="rounded border border-input bg-background px-2 py-0.5 text-xs w-28 sm:w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <select
                                        id="add-favorite-language-select"
                                        data-testid="add-favorite-language-select"
                                        value=""
                                        onChange={(e) => {
                                          const code = e.target.value;
                                          if (code && !favoriteLanguages.includes(code)) {
                                            const nextFavs = [...favoriteLanguages, code];
                                            handleUpdateFavoriteLanguages(nextFavs);
                                            setAddFavoriteFilter("");
                                          }
                                        }}
                                        className="rounded border border-input bg-background px-2 py-0.5 text-xs"
                                      >
                                        <option value="">
                                          Choose a language to add to favorites…
                                        </option>
                                        {SUPPORTED_LANGUAGES_CATALOG.filter(
                                          (c) =>
                                            !favoriteLanguages.includes(c.code) &&
                                            (!addFavoriteFilter.trim() ||
                                              c.name
                                                .toLowerCase()
                                                .includes(addFavoriteFilter.trim().toLowerCase()) ||
                                              c.code
                                                .toLowerCase()
                                                .includes(addFavoriteFilter.trim().toLowerCase())),
                                        ).map((c) => (
                                          <option key={c.code} value={c.code}>
                                            {c.name} ({c.code})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="pt-1.5 border-t border-border/40 text-[11px] space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">
                                          Enabled for this Video:
                                        </span>
                                        <span className="font-mono text-primary font-semibold">
                                          {targetLanguages.join(", ") || "None"}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground">
                                        Video-specific customizations are saved per video ID (
                                        {videoId || "active video"}) and remembered when reloaded.
                                      </p>
                                    </div>
                                  </div>
                                  {/* Accordion Auto-Collapse Timeout Setting */}
                                  <div
                                    className="pt-3 border-t border-border/40 space-y-2"
                                    data-testid="settings-accordion-timeout-card"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <Hourglass className="size-3.5 text-amber-500 shrink-0" />
                                      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                        Accordion Auto-Collapse Timeout
                                      </h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Automatically collapses inactive accordions after 10 seconds
                                      of no interaction, featuring an hourglass icon and countdown
                                      progress bar.
                                    </p>
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                      <input
                                        type="checkbox"
                                        data-testid="setting-video-library-timeout"
                                        checked={videoLibraryTimeoutEnabled}
                                        onChange={(e) =>
                                          handleToggleVideoLibraryTimeout(e.target.checked)
                                        }
                                        className="rounded border-border text-primary h-3.5 w-3.5"
                                      />
                                      <span className="text-xs text-foreground font-medium">
                                        Enable 10s auto-collapse for &quot;Video Library&quot;
                                        accordion
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </details>

                            {/* Sub-Accordion 2: Special Characters Removal (Stage 3) */}
                            <details
                              className="group rounded-xl border border-indigo-500/30 bg-card/60 overflow-hidden shadow-xs"
                              open
                              data-testid="settings-chars-removal-accordion"
                            >
                              <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-indigo-500" />
                                  <span>Special Characters Removal</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                                  >
                                    Stage 3
                                  </Badge>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                              </summary>
                              <div
                                className="p-3 pt-0 border-t border-border/40 space-y-3"
                                data-testid="settings-chars-removal-container"
                              >
                                <div className="pt-2">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Special Characters Removal
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    Stage 3: Remove speaker tags, sound cues, and symbols before
                                    sentence parsing and translation.
                                  </p>
                                </div>
                                {specialCharactersRemovalPanel}
                              </div>
                            </details>

                            {/* Sub-Accordion 3: Parser (Sentence Splitting) (Stage 4) */}
                            <details
                              className="group rounded-xl border border-amber-500/30 bg-card/60 overflow-hidden shadow-xs"
                              open
                              data-testid="settings-parser-accordion"
                            >
                              <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition">
                                <div className="flex items-center gap-2">
                                  <Split className="h-4 w-4 text-amber-500" />
                                  <span>Parser (Sentence Splitting)</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  >
                                    Stage 4
                                  </Badge>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                              </summary>
                              <div
                                className="p-3 pt-0 border-t border-border/40 space-y-4"
                                data-testid="settings-parser-container"
                              >
                                <div className="pt-2">
                                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Parser &amp; Sentence Splitting
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    Stage 4: Split continuous subtitle stream cues into grammatical
                                    sentences using punctuation and timing criteria.
                                  </p>
                                </div>
                                {parserPanelContent}
                              </div>
                            </details>

                            {/* Sub-Accordion 4: Fetched Subtitles Info & Statistics */}
                            <details
                              className="group rounded-xl border border-sky-500/30 bg-card/60 overflow-hidden shadow-xs"
                              data-testid="settings-fetched-subtitles-accordion"
                            >
                              <summary className="flex items-center justify-between p-3 cursor-pointer list-none select-none font-semibold text-xs uppercase tracking-wider text-sky-700 dark:text-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition">
                                <div className="flex items-center gap-2">
                                  <Film className="h-4 w-4 text-sky-500" />
                                  <span>Fetched Subtitles Info &amp; Statistics</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                                  >
                                    Subtitles Info
                                  </Badge>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                              </summary>
                              <div
                                className="p-3 pt-0 border-t border-border/40 space-y-4"
                                data-testid="settings-fetched-subtitles-container"
                              >
                                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                      Fetched Subtitles Info, Statistics &amp; Caching
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      Inspect fetched timedtext responses, track statistics, and
                                      manage cached subtitle files.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    data-testid="settings-open-stage-0-btn"
                                    onClick={() => {
                                      setShowOtherSettingsAccordions(false);
                                      setCurrentAccordionStage(0);
                                      setOpenPanels((prev) => ({
                                        ...prev,
                                        fetchedSubtitles: true,
                                      }));
                                    }}
                                    className="h-6 px-2 text-[11px] gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Open Stage View</span>
                                  </Button>
                                </div>
                                <FetchedSubtitlesStagePanel
                                  videoId={videoId}
                                  videoInput={videoInput}
                                  onVideoInputChange={setVideoInput}
                                  onSubmitVideoUrl={(url) => {
                                    const parsed = parseVideoId(url);
                                    const newId = parsed || url.trim();
                                    handleSelectLibraryVideo(newId, url);
                                  }}
                                  observedUrl={observedUrl}
                                  onObservedUrlChange={setObservedUrl}
                                  tracks={tracks}
                                  onTracksChange={(newTracks) => setTracks(newTracks)}
                                  baseLanguage={baseLanguage}
                                  onSelectBaseLanguage={handleSelectDefaultSubtitle}
                                  defaultLanguages={defaultSubtitleLanguages}
                                  isAndroid={isAndroid}
                                  onLoadSampleSubtitles={() => {
                                    const validEntries = Object.entries(JSON3_RAW_MAP)
                                      .map(([code, raw]) => {
                                        const j = parseJson3(raw);
                                        return j ? ([code, j] as const) : null;
                                      })
                                      .filter((entry): entry is [string, Json3] => entry !== null);
                                    setTracks(Object.fromEntries(validEntries));
                                    setObservedUrl(
                                      "https://www.youtube.com/api/timedtext?v=L2Ryrr6txwA&lang=en&fmt=json3",
                                    );
                                  }}
                                  onProceedToStage={(stage) => {
                                    setShowOtherSettingsAccordions(false);
                                    setCurrentAccordionStage(stage as 0 | 1 | 2 | 3);
                                    if (stage === 1) {
                                      setOpenPanels((prev) => ({ ...prev, languages: true }));
                                    } else if (stage === 2) {
                                      setOpenPanels((prev) => ({ ...prev, subtitles: true }));
                                    } else if (stage === 3) {
                                      setOpenPanels((prev) => ({
                                        ...prev,
                                        player: true,
                                      }));
                                    }
                                  }}
                                />
                              </div>
                            </details>
                          </div>
                        )}

                        {panelId === "library" && (
                          <VideoLibraryPanel
                            currentVideoId={videoId}
                            onSelectVideo={handleSelectLibraryVideo}
                            onClearVideoCache={(clearedId) => {
                              if (clearedId === videoId) {
                                setTracks(null);
                                setObservedUrl("");
                                subtitleRequestQueue.resetVideo(clearedId);
                              }
                            }}
                            onFetchFromScratch={(scratchId, scratchUrl) => {
                              clearVideoSubtitleCache(scratchId);
                              subtitleRequestQueue.resetVideo(scratchId);
                              if (scratchId === videoId) {
                                setTracks(null);
                                setObservedUrl("");
                                if (isAndroid) {
                                  void fetchFavoriteLanguageSubtitles(targetLanguages);
                                }
                              } else {
                                handleSelectLibraryVideo(scratchId, scratchUrl);
                              }
                            }}
                          />
                        )}

                        {panelId === "charsRemoval" && specialCharactersRemovalPanel}

                        {panelId === "parser" && (
                          <div className="space-y-4">
                            {/* Interactive Timing & Punctuation Splitting Lab (Hidden by default in Fast Mode) */}
                            {timingLabEnabled && (
                              <ParserTimingLab
                                tracks={tracks}
                                baseLanguage={baseLanguage}
                                selectedCriteria={selectedCriteria}
                                criteriaSettings={criteriaSettings}
                                onApplyCriteria={handleApplyPreset}
                                onUpdateGroupSettings={handleUpdateGroupSettings}
                              />
                            )}

                            {/* Presets Header */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                  Alignment Presets
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Quick combinations
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {PARSER_PRESETS.map((preset) => {
                                  const isPresetActive =
                                    preset.criteria.length === selectedCriteria.length &&
                                    preset.criteria.every((c) => selectedCriteria.includes(c));
                                  return (
                                    <Button
                                      key={preset.id}
                                      type="button"
                                      size="sm"
                                      variant={isPresetActive ? "default" : "outline"}
                                      className="h-7 text-xs px-2.5"
                                      onClick={() => handleApplyPreset(preset.criteria, preset.id)}
                                      title={preset.desc}
                                    >
                                      {preset.name}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Accumulative Criteria Section */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Accumulative Division Criteria (Multi-Select)
                                  </label>
                                  <button
                                    type="button"
                                    data-testid="help-btn-criteria-overview"
                                    onClick={() =>
                                      setExpandedHelp((prev) => ({
                                        ...prev,
                                        overview: !prev.overview,
                                      }))
                                    }
                                    className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
                                    title="More info"
                                    aria-label="More info about division criteria"
                                  >
                                    ?
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-primary">
                                    {selectedCriteria.length} criteria active
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                    onClick={handleResetGroupSettings}
                                    title="Reset all criteria inner settings to default"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset settings
                                  </Button>
                                </div>
                              </div>
                              {expandedHelp.overview && (
                                <p
                                  data-testid="help-text-criteria-overview"
                                  className="text-xs text-muted-foreground mb-3 bg-muted/20 p-2 rounded border border-border/40"
                                >
                                  Select multiple criteria accumulatively to divide subtitles into
                                  separated, translatable sections of related sentences and cohesive
                                  context.
                                </p>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {PARSER_CRITERIA.map((crit) => {
                                  const isChecked = selectedCriteria.includes(crit.id);
                                  const isExpanded = expandedSettingsGroup === crit.id;
                                  const isHelpOpen = Boolean(expandedHelp[crit.id]);
                                  return (
                                    <div
                                      key={crit.id}
                                      className={`rounded-lg border transition-all ${
                                        isChecked
                                          ? "border-primary/60 bg-primary/5 text-foreground shadow-xs"
                                          : "border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground"
                                      }`}
                                    >
                                      <div
                                        onClick={() => handleToggleCriterion(crit.id)}
                                        className="p-2.5 cursor-pointer flex items-start gap-2.5"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleCriterion(crit.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={`${crit.name} criterion`}
                                          data-testid={`toggle-parser-criterion-${crit.id}`}
                                          className="mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span
                                                className={`text-xs font-semibold ${isChecked ? "text-foreground" : "text-foreground/80"}`}
                                              >
                                                {crit.name}
                                              </span>
                                              <Badge
                                                variant={isChecked ? "default" : "outline"}
                                                className="text-[10px] h-4 px-1.5 py-0 font-normal"
                                              >
                                                {crit.badge}
                                              </Badge>
                                              <button
                                                type="button"
                                                data-testid={`help-btn-${crit.id}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedHelp((prev) => ({
                                                    ...prev,
                                                    [crit.id]: !prev[crit.id],
                                                  }));
                                                }}
                                                className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
                                                title="More info"
                                                aria-label={`More info about ${crit.name}`}
                                              >
                                                ?
                                              </button>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedSettingsGroup(
                                                  isExpanded ? null : crit.id,
                                                );
                                              }}
                                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                                                isExpanded
                                                  ? "bg-primary text-primary-foreground font-medium"
                                                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                                              }`}
                                              title="Toggle inner settings for this criteria group"
                                            >
                                              <SlidersHorizontal className="h-3 w-3" />
                                              <span>Settings</span>
                                              {isExpanded ? (
                                                <ChevronUp className="h-3 w-3" />
                                              ) : (
                                                <ChevronDown className="h-3 w-3" />
                                              )}
                                            </button>
                                          </div>
                                          {isHelpOpen && (
                                            <p
                                              data-testid={`help-text-${crit.id}`}
                                              className="text-[11px] leading-tight text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded border border-border/40"
                                            >
                                              {crit.desc}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Inner Settings Panel for this Group */}
                                      {isExpanded && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-3 pb-3 pt-2 border-t border-border/60 bg-background/90 rounded-b-lg space-y-2.5 text-xs text-foreground"
                                        >
                                          <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                            <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                                              {crit.name} Inner Settings
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUpdateGroupSettings(
                                                  crit.id,
                                                  DEFAULT_CRITERIA_SETTINGS[crit.id] as never,
                                                )
                                              }
                                              className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                            >
                                              Reset this group
                                            </button>
                                          </div>

                                          {crit.id === "sentence" && (
                                            <div className="space-y-2">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={criteriaSettings.sentence.includeCommas}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("sentence", {
                                                      includeCommas: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Split on secondary clauses (commas, semicolons,
                                                  colons)
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={criteriaSettings.sentence.splitIntraCue}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("sentence", {
                                                      splitIntraCue: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Split sentences inside a subtitle cue
                                                </span>
                                              </label>
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] text-muted-foreground">
                                                  Minimum words per sentence:
                                                </span>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  max={10}
                                                  value={criteriaSettings.sentence.minWords}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("sentence", {
                                                      minWords: Math.max(
                                                        1,
                                                        parseInt(e.target.value) || 1,
                                                      ),
                                                    })
                                                  }
                                                  className="h-6 w-14 rounded border border-input bg-background px-1.5 text-xs text-right"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {crit.id === "pause" && (
                                            <div className="space-y-2">
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Silence gap threshold:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {criteriaSettings.pause.minPauseMs} ms
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={200}
                                                  max={1500}
                                                  step={50}
                                                  value={criteriaSettings.pause.minPauseMs}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("pause", {
                                                      minPauseMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Cue snap proximity:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {criteriaSettings.pause.snapToleranceMs} ms
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={400}
                                                  max={2000}
                                                  step={100}
                                                  value={criteriaSettings.pause.snapToleranceMs}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("pause", {
                                                      snapToleranceMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {crit.id === "punctVote" && (
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] text-muted-foreground">
                                                  Minimum agreeing tracks:
                                                </span>
                                                <select
                                                  value={criteriaSettings.punctVote.minTrackVotes}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("punctVote", {
                                                      minTrackVotes: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="h-6 rounded border border-input bg-background px-1.5 text-xs"
                                                >
                                                  <option value={1}>1 track (any mark)</option>
                                                  <option value={2}>2 tracks (agreement)</option>
                                                  <option value={3}>3 tracks (consensus)</option>
                                                </select>
                                              </div>
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Cluster proximity window:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {criteriaSettings.punctVote.clusterToleranceMs}{" "}
                                                    ms
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={200}
                                                  max={1200}
                                                  step={50}
                                                  value={
                                                    criteriaSettings.punctVote.clusterToleranceMs
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("punctVote", {
                                                      clusterToleranceMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {crit.id === "consensus" && (
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] text-muted-foreground">
                                                  Required track alignment:
                                                </span>
                                                <select
                                                  value={criteriaSettings.consensus.majorityRatio}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("consensus", {
                                                      majorityRatio: parseFloat(e.target.value),
                                                    })
                                                  }
                                                  className="h-6 rounded border border-input bg-background px-1.5 text-xs"
                                                >
                                                  <option value={0.33}>33% (any 2+ tracks)</option>
                                                  <option value={0.5}>50% (majority)</option>
                                                  <option value={0.66}>66% (supermajority)</option>
                                                </select>
                                              </div>
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Proximity window:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {criteriaSettings.consensus.clusterToleranceMs}{" "}
                                                    ms
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={200}
                                                  max={800}
                                                  step={50}
                                                  value={
                                                    criteriaSettings.consensus.clusterToleranceMs
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("consensus", {
                                                      clusterToleranceMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {crit.id === "cue" && (
                                            <div className="space-y-2">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={criteriaSettings.cue.splitAllTracks}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("cue", {
                                                      splitAllTracks: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Split on cue starts from all parallel tracks
                                                </span>
                                              </label>
                                            </div>
                                          )}

                                          {crit.id === "anchors" && (
                                            <div className="space-y-1.5">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={criteriaSettings.anchors.matchNumbers}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("anchors", {
                                                      matchNumbers: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Match numbers and digits
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    criteriaSettings.anchors.matchProperNouns
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("anchors", {
                                                      matchProperNouns: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Match capitalized proper nouns
                                                </span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    criteriaSettings.anchors.requireStrictMultiTrack
                                                  }
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("anchors", {
                                                      requireStrictMultiTrack: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-border text-primary h-3.5 w-3.5"
                                                />
                                                <span className="text-[11px]">
                                                  Strict: require anchor in all tracks
                                                </span>
                                              </label>
                                            </div>
                                          )}

                                          {crit.id === "window" && (
                                            <div className="space-y-2">
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Minimum section length:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {(
                                                      criteriaSettings.window.minSectionMs / 1000
                                                    ).toFixed(1)}
                                                    s
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={800}
                                                  max={4000}
                                                  step={200}
                                                  value={criteriaSettings.window.minSectionMs}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("window", {
                                                      minSectionMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                              <div>
                                                <div className="flex justify-between text-[11px] mb-1">
                                                  <span className="text-muted-foreground">
                                                    Maximum section length:
                                                  </span>
                                                  <span className="font-semibold text-primary">
                                                    {(
                                                      criteriaSettings.window.maxSectionMs / 1000
                                                    ).toFixed(0)}
                                                    s
                                                  </span>
                                                </div>
                                                <input
                                                  type="range"
                                                  min={6000}
                                                  max={24000}
                                                  step={1000}
                                                  value={criteriaSettings.window.maxSectionMs}
                                                  onChange={(e) =>
                                                    handleUpdateGroupSettings("window", {
                                                      maxSectionMs: parseInt(e.target.value),
                                                    })
                                                  }
                                                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Status & Summary */}
                            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                              <div>
                                Sections:{" "}
                                <span className="font-semibold text-foreground">
                                  {rows.length} translatable sections
                                </span>{" "}
                                · Timing base:{" "}
                                <span className="font-semibold text-foreground">
                                  {baseLanguage
                                    ? getLanguageMeta(baseLanguage).name
                                    : "None (waiting for captions)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                                <button
                                  type="button"
                                  data-testid="help-btn-parser-summary"
                                  onClick={() =>
                                    setExpandedHelp((prev) => ({
                                      ...prev,
                                      summary: !prev.summary,
                                    }))
                                  }
                                  className="w-4 h-4 rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-[10px] font-bold"
                                  title="More info"
                                  aria-label="More info about parser status"
                                >
                                  ?
                                </button>
                                {expandedHelp.summary && (
                                  <span data-testid="help-text-parser-summary">
                                    Cuts accumulate at sentence marks, breath pauses & alignment
                                    consensus
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {panelId === "languages" && (
                          <>
                            <div
                              id="stage-2-learning-goals-card"
                              data-testid="stage-2-learning-goals-card"
                              className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3.5 space-y-3 mb-4 shadow-sm"
                            >
                              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                                    Stage 1: Learning Goals
                                  </h3>
                                </div>
                                <span className="text-[10px] font-mono font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Filter className="h-3 w-3" />
                                  <span>1 / 3</span>
                                </span>
                              </div>

                              {/* Active Profile Name & Switcher set on top */}
                              <div
                                id="stage-2-top-profile-container"
                                data-testid="stage-2-top-profile-container"
                                className="flex flex-wrap items-center justify-between gap-2 bg-card/85 p-2.5 rounded-lg border border-primary/25 shadow-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                                    <Sliders className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span
                                      data-testid="stage-2-profile-top-label"
                                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                    >
                                      Profile Name:
                                    </span>
                                    <span
                                      data-testid="stage-2-active-profile-name"
                                      className="font-bold text-xs sm:text-sm text-foreground truncate"
                                      title={
                                        storedCompositions.find(
                                          (c) => c.id === activeRatioCompositionId,
                                        )?.name || "Standard (Even)"
                                      }
                                    >
                                      {storedCompositions.find(
                                        (c) => c.id === activeRatioCompositionId,
                                      )?.name || "Standard (Even)"}
                                    </span>
                                  </div>
                                </div>
                                <LanguageRatioCompositionSelector
                                  activeCompositionId={activeRatioCompositionId}
                                  onSelectComposition={handleSelectRatioComposition}
                                  onSaveProfile={handleSaveComposition}
                                  onUpdateProfile={handleUpdateRatioComposition}
                                  onDeleteProfile={handleDeleteRatioComposition}
                                  compositions={storedCompositions}
                                />
                              </div>

                              <div className="space-y-2 text-xs">
                                {/* 1. Set Default Source Language from Successfully Fetched Subtitles */}
                                <div className="space-y-1.5 bg-card/60 p-2.5 rounded-lg border border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                      <Globe className="h-3.5 w-3.5 text-primary" />
                                      <span>1. Default Source Language</span>
                                    </div>
                                    <span className="text-primary font-mono text-[11px] font-medium flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      <span>
                                        {LANGS.find((l) => l.code === baseLanguage)?.name ||
                                          baseLanguage ||
                                          "Awaiting fetch"}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1 pt-0.5">
                                    {fetchedSubtitleLanguages.length > 0 ? (
                                      fetchedSubtitleLanguages.map((langCode) => {
                                        const isDefault = baseLanguage === langCode;
                                        const langMeta = LANGS.find((l) => l.code === langCode);
                                        return (
                                          <button
                                            key={langCode}
                                            type="button"
                                            data-testid={`stage-2-default-lang-${langCode}`}
                                            onClick={() => {
                                              if (fetchedSubtitleLanguages.includes(langCode)) {
                                                handleSelectDefaultSubtitle(langCode);
                                              }
                                            }}
                                            className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium border flex items-center justify-between transition-all cursor-pointer ${
                                              isDefault
                                                ? "border-primary bg-primary/15 text-primary font-semibold shadow-xs ring-1 ring-primary/40"
                                                : "border-border/60 bg-background/80 hover:bg-muted text-foreground"
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              {isDefault ? (
                                                <Check className="h-3.5 w-3.5 text-primary" />
                                              ) : (
                                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                              )}
                                              <span>
                                                {langMeta?.name || langCode.toUpperCase()}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                ({langCode})
                                              </span>
                                            </div>
                                            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono px-1.5 py-0.2 rounded">
                                              Fetched
                                            </span>
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <div className="flex items-center gap-1.5 text-muted-foreground italic text-[11px] py-1">
                                        <Info className="h-3.5 w-3.5" />
                                        <span>No fetched tracks yet</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 2. Approve Favorite Languages to Learn */}
                                <div className="space-y-1.5 bg-card/60 p-2.5 rounded-lg border border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                                      <span>
                                        2. Approved Learning Languages ({targetLanguages.length})
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground text-[10px] font-mono truncate max-w-48">
                                      {targetLanguages.join(", ") || "None"}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1 max-h-48 overflow-y-auto divide-y divide-border/40 border border-border/50 rounded-md bg-background/60 p-1">
                                    {(favoriteLanguages.length > 0
                                      ? Array.from(new Set(favoriteLanguages))
                                      : ["en", "es", "he", "ar", "fr", "de", "it", "ru", "pt"]
                                    ).map((code) => {
                                      const isSelected = targetLanguages.includes(code);
                                      const meta =
                                        LANGS.find((l) => l.code === code) ||
                                        SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code);
                                      return (
                                        <div
                                          key={code}
                                          className={`flex items-center justify-between px-2 py-1 text-xs transition-colors rounded ${
                                            isSelected
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                                              : "text-muted-foreground hover:bg-muted/40"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            data-testid={`stage-2-learning-lang-${code}`}
                                            onClick={() => {
                                              if (isSelected) {
                                                handleTargetLanguagesChange(
                                                  targetLanguages.filter((c) => c !== code),
                                                );
                                              } else {
                                                handleTargetLanguagesChange([
                                                  ...targetLanguages,
                                                  code,
                                                ]);
                                              }
                                            }}
                                            className="inline-flex items-center gap-2 cursor-pointer flex-1 text-left"
                                            title={
                                              isSelected
                                                ? `Unselect ${meta?.name || code}`
                                                : `Select ${meta?.name || code}`
                                            }
                                          >
                                            {isSelected ? (
                                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            ) : (
                                              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            )}
                                            <span>{meta?.name || code}</span>
                                            <span className="text-[10px] opacity-70 font-mono">
                                              ({code})
                                            </span>
                                          </button>
                                          {favoriteLanguages.includes(code) && (
                                            <button
                                              type="button"
                                              data-testid={`stage-2-remove-fav-${code}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const nextFavs = favoriteLanguages.filter(
                                                  (c) => c !== code,
                                                );
                                                handleUpdateFavoriteLanguages(nextFavs);
                                                handleTargetLanguagesChange(
                                                  targetLanguages.filter((c) => c !== code),
                                                );
                                              }}
                                              className="hover:text-destructive hover:bg-destructive/10 rounded-full h-4 w-4 inline-flex items-center justify-center text-[12px] leading-none text-muted-foreground/70 hover:text-destructive transition ml-1 cursor-pointer"
                                              title={`Remove ${meta?.name || code} from favorites`}
                                              aria-label={`Remove ${meta?.name || code} from favorites`}
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Extend Favorite Languages Control - Stage 2 in-place */}
                                  <div
                                    id="stage-2-extend-favorites-container"
                                    data-testid="stage-2-extend-favorites-container"
                                    className="pt-2 border-t border-border/50 mt-1.5 space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <PlusCircle className="h-3.5 w-3.5 text-primary" />
                                        <span>Add Language</span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        id="stage-2-filter-languages-input"
                                        data-testid="stage-2-filter-languages-input"
                                        list="stage-2-languages-datalist"
                                        placeholder="Filter or add language…"
                                        value={stage2AddFavoriteFilter}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setStage2AddFavoriteFilter(val);
                                          const trimmed = val.trim();
                                          if (trimmed) {
                                            const matched = SUPPORTED_LANGUAGES_CATALOG.find(
                                              (c) =>
                                                !favoriteLanguages.includes(c.code) &&
                                                (c.code.toLowerCase() === trimmed.toLowerCase() ||
                                                  c.name.toLowerCase() === trimmed.toLowerCase() ||
                                                  `${c.name} (${c.code})`.toLowerCase() ===
                                                    trimmed.toLowerCase()),
                                            );
                                            if (matched) {
                                              const nextFavs = [...favoriteLanguages, matched.code];
                                              handleUpdateFavoriteLanguages(nextFavs);
                                              if (!targetLanguages.includes(matched.code)) {
                                                handleTargetLanguagesChange([
                                                  ...targetLanguages,
                                                  matched.code,
                                                ]);
                                              }
                                              setStage2AddFavoriteFilter("");
                                            }
                                          }
                                        }}
                                        className="rounded border border-input bg-background px-2.5 py-1 text-xs w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <datalist
                                        id="stage-2-languages-datalist"
                                        data-testid="stage-2-languages-datalist"
                                      >
                                        {SUPPORTED_LANGUAGES_CATALOG.filter(
                                          (c) => !favoriteLanguages.includes(c.code),
                                        ).map((c) => (
                                          <option key={c.code} value={`${c.name} (${c.code})`}>
                                            {c.code}
                                          </option>
                                        ))}
                                      </datalist>
                                      {stage2AddFavoriteFilter && (
                                        <button
                                          type="button"
                                          onClick={() => setStage2AddFavoriteFilter("")}
                                          className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border shrink-0 cursor-pointer"
                                          title="Clear filter"
                                        >
                                          Clear
                                        </button>
                                      )}
                                    </div>
                                    {stage2AddFavoriteFilter.trim() && (
                                      <div className="flex flex-col space-y-1 max-h-28 overflow-y-auto pt-0.5">
                                        {SUPPORTED_LANGUAGES_CATALOG.filter(
                                          (c) =>
                                            !favoriteLanguages.includes(c.code) &&
                                            (c.name
                                              .toLowerCase()
                                              .includes(
                                                stage2AddFavoriteFilter.trim().toLowerCase(),
                                              ) ||
                                              c.code
                                                .toLowerCase()
                                                .includes(
                                                  stage2AddFavoriteFilter.trim().toLowerCase(),
                                                )),
                                        )
                                          .slice(0, 16)
                                          .map((c) => (
                                            <button
                                              key={c.code}
                                              type="button"
                                              data-testid={`stage-2-add-lang-item-${c.code}`}
                                              onClick={() => {
                                                const nextFavs = [...favoriteLanguages, c.code];
                                                handleUpdateFavoriteLanguages(nextFavs);
                                                if (!targetLanguages.includes(c.code)) {
                                                  handleTargetLanguagesChange([
                                                    ...targetLanguages,
                                                    c.code,
                                                  ]);
                                                }
                                                setStage2AddFavoriteFilter("");
                                              }}
                                              className="inline-flex items-center gap-1.5 rounded bg-secondary/80 hover:bg-primary/20 text-foreground px-2 py-1 text-xs border border-border cursor-pointer transition-colors"
                                            >
                                              <Plus className="h-3 w-3 text-primary" />
                                              <span>{c.name}</span>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                ({c.code})
                                              </span>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 3. Language Ratios (Learning Goals Frequency) - Located at end of Stage 2 Learning Goals */}
                                <div
                                  id="stage-2-language-ratios-container"
                                  data-testid="stage-2-language-ratios-container"
                                  className="space-y-2 bg-card/60 p-2.5 rounded-lg border border-border"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                                      <Sliders className="h-3.5 w-3.5 text-primary" />
                                      <span>3. Narration &amp; Ratios</span>
                                    </div>
                                    <LanguageRatioCompositionSelector
                                      activeCompositionId={activeRatioCompositionId}
                                      onSelectComposition={handleSelectRatioComposition}
                                      onSaveProfile={handleSaveComposition}
                                      onUpdateProfile={handleUpdateRatioComposition}
                                      onDeleteProfile={handleDeleteRatioComposition}
                                      compositions={storedCompositions}
                                    />
                                  </div>

                                  <div className="space-y-2 pt-0.5">
                                    {(() => {
                                      const learningLangCodes = Array.from(
                                        new Set(
                                          [baseLanguage, primaryTtsLang, ...targetLanguages].filter(
                                            (code): code is string => Boolean(code),
                                          ),
                                        ),
                                      );
                                      const orderedLearningCodes = [...learningLangCodes].sort(
                                        (a, b) => {
                                          const ia = languageOrder.indexOf(a);
                                          const ib = languageOrder.indexOf(b);
                                          if (ia >= 0 && ib >= 0) return ia - ib;
                                          if (ia >= 0) return -1;
                                          if (ib >= 0) return 1;
                                          return 0;
                                        },
                                      );
                                      const activeLearningVideoBarIndex = getVideoBarIndex(
                                        orderedLearningCodes,
                                        ttsLanguageOrders,
                                        sectionOrder,
                                      );
                                      const handleSetLearningVideoBarPosition = (
                                        newIndex: number,
                                      ) => {
                                        const {
                                          sectionOrder: nextSectionOrder,
                                          languageOrders: nextLanguageOrders,
                                        } = updatePrecedenceFromVideoBarIndex(
                                          orderedLearningCodes,
                                          newIndex,
                                        );
                                        handleSectionOrderChange(nextSectionOrder);
                                        for (const [code, ord] of Object.entries(
                                          nextLanguageOrders,
                                        )) {
                                          handleTtsLanguageOrderChange(code, ord);
                                        }
                                      };

                                      return (
                                        <div className="space-y-2.5">
                                          {/* Ingredient 1: Order of playing (together with the video-playing precedence bar) */}
                                          <div
                                            data-testid="stage-2-ingredient-order-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <ListOrdered className="h-3.5 w-3.5 text-primary" />
                                                <span>1. Playback Order</span>
                                              </div>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                {orderedLearningCodes.length} langs
                                              </span>
                                            </div>

                                            <div className="flex flex-col space-y-1.5 pt-0.5">
                                              {activeLearningVideoBarIndex === 0 && (
                                                <VideoPlaybackPrecedenceBar
                                                  currentPosition={0}
                                                  totalRecords={orderedLearningCodes.length}
                                                  onMoveUp={() =>
                                                    handleSetLearningVideoBarPosition(0)
                                                  }
                                                  onMoveDown={() =>
                                                    handleSetLearningVideoBarPosition(1)
                                                  }
                                                  onPlaceAtTop={() =>
                                                    handleSetLearningVideoBarPosition(0)
                                                  }
                                                  onPlaceAtBottom={() =>
                                                    handleSetLearningVideoBarPosition(
                                                      orderedLearningCodes.length,
                                                    )
                                                  }
                                                />
                                              )}

                                              {orderedLearningCodes.map((langCode, idx) => {
                                                const isPrimary =
                                                  langCode === primaryTtsLang ||
                                                  (langCode === baseLanguage && !primaryTtsLang);
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );

                                                return (
                                                  <Fragment key={`order-${langCode}`}>
                                                    <div
                                                      data-testid={`stage-2-order-row-${langCode}`}
                                                      className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-md bg-background/80 border border-border/60"
                                                    >
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        <Languages className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span className="text-xs font-semibold text-foreground truncate">
                                                          {idx + 1}.{" "}
                                                          {meta?.name || langCode.toUpperCase()}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                          ({langCode})
                                                        </span>
                                                        {isPrimary && (
                                                          <span
                                                            data-testid={`stage-2-primary-badge-${langCode}`}
                                                            className="bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider"
                                                          >
                                                            1x Source
                                                          </span>
                                                        )}
                                                      </div>

                                                      {/* Order controls */}
                                                      <div
                                                        data-testid={`stage-2-order-controls-${langCode}`}
                                                        className="flex items-center gap-1 shrink-0"
                                                      >
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground border border-border/50"
                                                          disabled={idx === 0}
                                                          onClick={() => moveLanguage(langCode, -1)}
                                                          title={`Move ${meta?.name || langCode} earlier`}
                                                          aria-label={`Move ${meta?.name || langCode} earlier`}
                                                          data-testid={`stage-2-btn-move-lang-up-${langCode}`}
                                                        >
                                                          <ChevronUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          className={`h-6 px-1.5 text-xs border ${
                                                            activeLearningVideoBarIndex === idx
                                                              ? "text-primary bg-primary/10 border-primary/40 font-semibold"
                                                              : "text-muted-foreground hover:text-foreground border-border/50"
                                                          }`}
                                                          onClick={() =>
                                                            handleSetLearningVideoBarPosition(idx)
                                                          }
                                                          title={`Place video before ${meta?.name || langCode}`}
                                                          aria-label={`Place video before ${meta?.name || langCode}`}
                                                          data-testid={`btn-place-video-before-${langCode}`}
                                                        >
                                                          <Film className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground border border-border/50"
                                                          disabled={
                                                            idx === orderedLearningCodes.length - 1
                                                          }
                                                          onClick={() => moveLanguage(langCode, 1)}
                                                          title={`Move ${meta?.name || langCode} later`}
                                                          aria-label={`Move ${meta?.name || langCode} later`}
                                                          data-testid={`stage-2-btn-move-lang-down-${langCode}`}
                                                        >
                                                          <ChevronDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                      </div>
                                                    </div>

                                                    {activeLearningVideoBarIndex === idx + 1 && (
                                                      <VideoPlaybackPrecedenceBar
                                                        currentPosition={idx + 1}
                                                        totalRecords={orderedLearningCodes.length}
                                                        onMoveUp={() =>
                                                          handleSetLearningVideoBarPosition(idx)
                                                        }
                                                        onMoveDown={() =>
                                                          handleSetLearningVideoBarPosition(
                                                            Math.min(
                                                              orderedLearningCodes.length,
                                                              idx + 2,
                                                            ),
                                                          )
                                                        }
                                                        onPlaceAtTop={() =>
                                                          handleSetLearningVideoBarPosition(0)
                                                        }
                                                        onPlaceAtBottom={() =>
                                                          handleSetLearningVideoBarPosition(
                                                            orderedLearningCodes.length,
                                                          )
                                                        }
                                                      />
                                                    )}
                                                  </Fragment>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ingredient 2: TTS-play ratio (slider control with plus/minus buttons on 2 edges) */}
                                          <div
                                            data-testid="stage-2-ingredient-ratios-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <Gauge className="h-3.5 w-3.5 text-primary" />
                                                <span>2. TTS Ratios</span>
                                              </div>
                                            </div>

                                            <div className="flex flex-col space-y-1.5 pt-0.5">
                                              {orderedLearningCodes.map((langCode) => {
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );
                                                const currentRatio = getLanguageTtsRatio(
                                                  ttsRatios,
                                                  langCode,
                                                );

                                                return (
                                                  <div
                                                    key={`ratio-${langCode}`}
                                                    data-testid={`stage-2-ratio-row-${langCode}`}
                                                    className="p-2 rounded-md bg-background/80 border border-border/60 space-y-1.5"
                                                  >
                                                    <div
                                                      data-testid={`stage-2-ratio-slider-container-${langCode}`}
                                                      className="space-y-1.5"
                                                    >
                                                      <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                          <Languages className="h-3.5 w-3.5 text-primary shrink-0" />
                                                          <span>
                                                            {meta?.name || langCode.toUpperCase()}
                                                          </span>
                                                          <span className="text-[10px] text-muted-foreground font-mono">
                                                            ({langCode})
                                                          </span>
                                                        </div>
                                                        <span
                                                          data-testid={`stage-2-ratio-display-${langCode}`}
                                                          className="font-mono text-xs font-bold text-primary"
                                                        >
                                                          1:{currentRatio}
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-1.5">
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-ratio-decrement-${langCode}`}
                                                          aria-label={`Decrease ratio for ${meta?.name || langCode}`}
                                                          title="Decrease ratio by 1"
                                                          disabled={currentRatio <= 1}
                                                          onClick={() => {
                                                            const nextRatio = Math.max(
                                                              1,
                                                              currentRatio - 1,
                                                            );
                                                            const next = {
                                                              ...ttsRatios,
                                                              [langCode]: nextRatio,
                                                            };
                                                            setTtsRatios(next);
                                                            saveTtsRatioPreference(
                                                              langCode,
                                                              nextRatio,
                                                            );
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRatios: {
                                                                  [langCode]: nextRatio,
                                                                },
                                                              });
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Minus className="h-3 w-3" />
                                                        </Button>

                                                        <input
                                                          type="range"
                                                          min={1}
                                                          max={20}
                                                          step={1}
                                                          value={currentRatio}
                                                          data-testid={`stage-2-ratio-slider-${langCode}`}
                                                          aria-label={`TTS ratio slider for ${meta?.name || langCode}`}
                                                          onChange={(e) => {
                                                            const val = Math.max(
                                                              1,
                                                              Math.min(20, Number(e.target.value)),
                                                            );
                                                            const next = {
                                                              ...ttsRatios,
                                                              [langCode]: val,
                                                            };
                                                            setTtsRatios(next);
                                                            saveTtsRatioPreference(langCode, val);
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRatios: { [langCode]: val },
                                                              });
                                                          }}
                                                          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />

                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-ratio-increment-${langCode}`}
                                                          aria-label={`Increase ratio for ${meta?.name || langCode}`}
                                                          title="Increase ratio by 1"
                                                          disabled={currentRatio >= 20}
                                                          onClick={() => {
                                                            const nextRatio = Math.min(
                                                              20,
                                                              currentRatio + 1,
                                                            );
                                                            const next = {
                                                              ...ttsRatios,
                                                              [langCode]: nextRatio,
                                                            };
                                                            setTtsRatios(next);
                                                            saveTtsRatioPreference(
                                                              langCode,
                                                              nextRatio,
                                                            );
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRatios: {
                                                                  [langCode]: nextRatio,
                                                                },
                                                              });
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Plus className="h-3 w-3" />
                                                        </Button>
                                                      </div>

                                                      {/* Quick Presets */}
                                                      <div className="flex items-center gap-1 pt-0.5 overflow-x-auto">
                                                        <span className="text-[9px] text-muted-foreground">
                                                          Presets:
                                                        </span>
                                                        {[1, 2, 3, 4, 5, 7, 10, 15, 20].map(
                                                          (ratioVal) => (
                                                            <button
                                                              key={ratioVal}
                                                              type="button"
                                                              data-testid={`stage-2-ratio-btn-${langCode}-${ratioVal}`}
                                                              onClick={() => {
                                                                const next = {
                                                                  ...ttsRatios,
                                                                  [langCode]: ratioVal,
                                                                };
                                                                setTtsRatios(next);
                                                                saveTtsRatioPreference(
                                                                  langCode,
                                                                  ratioVal,
                                                                );
                                                                if (videoId)
                                                                  saveVideoSettings(videoId, {
                                                                    ttsRatios: {
                                                                      [langCode]: ratioVal,
                                                                    },
                                                                  });
                                                              }}
                                                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                                                                currentRatio === ratioVal
                                                                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                                  : "text-muted-foreground/70 hover:text-foreground bg-muted/30"
                                                              }`}
                                                              title={`Set ratio to 1:${ratioVal}`}
                                                            >
                                                              {ratioVal}
                                                            </button>
                                                          ),
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ingredient 3: Blacklisted (List presentation) */}
                                          <div
                                            data-testid="stage-2-ingredient-blacklist-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <VolumeX className="h-3.5 w-3.5 text-primary" />
                                                <span>3. Blacklist</span>
                                              </div>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                Blacklisted (Skip sentence, allow word)
                                              </span>
                                            </div>

                                            <div className="flex flex-col space-y-1 pt-0.5">
                                              {orderedLearningCodes.map((langCode) => {
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );
                                                const isBlacklisted = isLanguageTtsBlacklisted(
                                                  langCode,
                                                  ttsBlacklist,
                                                );

                                                return (
                                                  <div
                                                    key={`blacklist-${langCode}`}
                                                    data-testid={`stage-2-blacklist-container-${langCode}`}
                                                    className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-md bg-background/80 border border-border/60 text-xs"
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      {isBlacklisted ? (
                                                        <VolumeX className="h-3.5 w-3.5 text-destructive shrink-0" />
                                                      ) : (
                                                        <Volume2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                      )}
                                                      <span className="font-medium text-foreground truncate">
                                                        {meta?.name || langCode.toUpperCase()}
                                                      </span>
                                                      <span className="text-[10px] text-muted-foreground font-mono">
                                                        ({langCode})
                                                      </span>
                                                    </div>

                                                    <button
                                                      type="button"
                                                      data-testid={`stage-2-toggle-blacklist-${langCode}`}
                                                      aria-label={`Toggle TTS sentence playback for ${meta?.name || langCode} (preserves word TTS)`}
                                                      title={
                                                        isBlacklisted
                                                          ? `Whitelisted (click to whitelist)`
                                                          : `Blacklist ${meta?.name || langCode}`
                                                      }
                                                      onClick={() =>
                                                        handleToggleTtsBlacklist(langCode)
                                                      }
                                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                                                        isBlacklisted
                                                          ? "bg-destructive/15 text-destructive border-destructive/40 font-semibold"
                                                          : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                                                      }`}
                                                    >
                                                      {isBlacklisted ? (
                                                        <>
                                                          <VolumeX className="h-3 w-3" />
                                                          <span>Muted</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Volume2 className="h-3 w-3 text-emerald-500" />
                                                          <span>Active</span>
                                                        </>
                                                      )}
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ingredient 4: Sentence or Word (List presentation) */}
                                          <div
                                            data-testid="stage-2-ingredient-sentence-word-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <Type className="h-3.5 w-3.5 text-primary" />
                                                <span>4. Sentence or Word</span>
                                              </div>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                Granularity
                                              </span>
                                            </div>

                                            <div className="flex flex-col space-y-1 pt-0.5">
                                              {orderedLearningCodes.map((langCode) => {
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );
                                                const isWordMode = getZeroKnowledgeInLang(langCode);

                                                return (
                                                  <div
                                                    key={`zk-${langCode}`}
                                                    data-testid={`stage-2-sentence-or-word-container-${langCode}`}
                                                    className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-md bg-background/80 border border-border/60 text-xs"
                                                  >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      {isWordMode ? (
                                                        <Type className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                      ) : (
                                                        <FileText className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                                      )}
                                                      <span className="font-medium text-foreground truncate">
                                                        {meta?.name || langCode.toUpperCase()}
                                                      </span>
                                                      <span className="text-[10px] text-muted-foreground font-mono">
                                                        ({langCode})
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      {isWordMode && (
                                                        <div className="flex items-center gap-1 bg-background/60 px-1 py-0.5 rounded border border-border/60">
                                                          <button
                                                            type="button"
                                                            data-testid={`pick-word-strategy-longest-${langCode}`}
                                                            onClick={() =>
                                                              handleSetPickWordStrategy(
                                                                "longest",
                                                                langCode,
                                                              )
                                                            }
                                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                                              getPickWordStrategy(langCode) ===
                                                              "longest"
                                                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                                : "text-muted-foreground hover:text-foreground"
                                                            }`}
                                                            title="Pick longest word"
                                                          >
                                                            <Sparkles className="h-2.5 w-2.5" />
                                                            <span>Longest</span>
                                                          </button>
                                                          <button
                                                            type="button"
                                                            data-testid={`pick-word-strategy-random-${langCode}`}
                                                            onClick={() =>
                                                              handleSetPickWordStrategy(
                                                                "random",
                                                                langCode,
                                                              )
                                                            }
                                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                                              getPickWordStrategy(langCode) ===
                                                              "random"
                                                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                                : "text-muted-foreground hover:text-foreground"
                                                            }`}
                                                            title="Pick random word"
                                                          >
                                                            <Shuffle className="h-2.5 w-2.5" />
                                                            <span>Random</span>
                                                          </button>
                                                        </div>
                                                      )}

                                                      <button
                                                        type="button"
                                                        data-testid={`zero-knowledge-toggle-${langCode}`}
                                                        id={`zero-knowledge-toggle-${langCode}`}
                                                        aria-label={`Toggle sentence or word narration for ${meta?.name || langCode}`}
                                                        title={
                                                          isWordMode
                                                            ? `${meta?.name || langCode}: Word mode`
                                                            : `Sentence mode for ${meta?.name || langCode}`
                                                        }
                                                        onClick={() =>
                                                          handleToggleZeroKnowledge(langCode)
                                                        }
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                                          isWordMode
                                                            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold"
                                                            : "bg-muted/60 text-muted-foreground hover:text-foreground border-border"
                                                        }`}
                                                      >
                                                        {isWordMode ? (
                                                          <Type className="h-3 w-3" />
                                                        ) : (
                                                          <FileText className="h-3 w-3" />
                                                        )}
                                                        <span>
                                                          {isWordMode ? "Word" : "Sentence"}
                                                        </span>
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ingredient 5: TTS Speed Rate Per Language (Effective for both Native & External TTS) */}
                                          <div
                                            data-testid="stage-2-ingredient-speed-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <Gauge className="h-3.5 w-3.5 text-primary" />
                                                <span>
                                                  5. Speech Rate (Native &amp; External TTS)
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                0.25x – 2.5x
                                              </span>
                                            </div>

                                            <div className="flex flex-col space-y-1.5 pt-0.5">
                                              {orderedLearningCodes.map((langCode) => {
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );
                                                const currentRate = rates[langCode] ?? 1.0;

                                                return (
                                                  <div
                                                    key={`speed-${langCode}`}
                                                    data-testid={`stage-2-speed-row-${langCode}`}
                                                    className="p-2 rounded-md bg-background/80 border border-border/60 space-y-1.5"
                                                  >
                                                    <div
                                                      data-testid={`stage-2-speed-slider-container-${langCode}`}
                                                      className="space-y-1.5"
                                                    >
                                                      <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                          <Languages className="h-3.5 w-3.5 text-primary shrink-0" />
                                                          <span>
                                                            {meta?.name || langCode.toUpperCase()}
                                                          </span>
                                                          <span className="text-[10px] text-muted-foreground font-mono">
                                                            ({langCode})
                                                          </span>
                                                        </div>
                                                        <span
                                                          data-testid={`stage-2-speed-display-${langCode}`}
                                                          className="font-mono text-xs font-bold text-primary"
                                                        >
                                                          {currentRate.toFixed(2)}x
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-1.5">
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-speed-decrement-${langCode}`}
                                                          aria-label={`Decrease speed for ${meta?.name || langCode}`}
                                                          title="Decrease speed by 0.1x"
                                                          disabled={currentRate <= 0.25}
                                                          onClick={() => {
                                                            const nextRate = Math.max(
                                                              0.25,
                                                              Math.round(
                                                                (currentRate - 0.1) * 100,
                                                              ) / 100,
                                                            );
                                                            const next = {
                                                              ...rates,
                                                              [langCode]: nextRate,
                                                            };
                                                            setRates(next);
                                                            saveTtsRatePreference(
                                                              langCode,
                                                              nextRate,
                                                            );
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRates: { [langCode]: nextRate },
                                                              });
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Minus className="h-3 w-3" />
                                                        </Button>

                                                        <input
                                                          type="range"
                                                          min={0.25}
                                                          max={2.5}
                                                          step={0.05}
                                                          value={currentRate}
                                                          data-testid={`stage-2-speed-slider-${langCode}`}
                                                          aria-label={`TTS speed slider for ${meta?.name || langCode}`}
                                                          onChange={(e) => {
                                                            const val = Math.max(
                                                              0.25,
                                                              Math.min(2.5, Number(e.target.value)),
                                                            );
                                                            const next = {
                                                              ...rates,
                                                              [langCode]: val,
                                                            };
                                                            setRates(next);
                                                            saveTtsRatePreference(langCode, val);
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRates: { [langCode]: val },
                                                              });
                                                          }}
                                                          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />

                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-speed-increment-${langCode}`}
                                                          aria-label={`Increase speed for ${meta?.name || langCode}`}
                                                          title="Increase speed by 0.1x"
                                                          disabled={currentRate >= 2.5}
                                                          onClick={() => {
                                                            const nextRate = Math.min(
                                                              2.5,
                                                              Math.round(
                                                                (currentRate + 0.1) * 100,
                                                              ) / 100,
                                                            );
                                                            const next = {
                                                              ...rates,
                                                              [langCode]: nextRate,
                                                            };
                                                            setRates(next);
                                                            saveTtsRatePreference(
                                                              langCode,
                                                              nextRate,
                                                            );
                                                            if (videoId)
                                                              saveVideoSettings(videoId, {
                                                                ttsRates: { [langCode]: nextRate },
                                                              });
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Plus className="h-3 w-3" />
                                                        </Button>
                                                      </div>

                                                      {/* Quick Speed Presets */}
                                                      <div className="flex items-center gap-1 pt-0.5 overflow-x-auto">
                                                        <span className="text-[9px] text-muted-foreground">
                                                          Presets:
                                                        </span>
                                                        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(
                                                          (rateVal) => (
                                                            <button
                                                              key={rateVal}
                                                              type="button"
                                                              data-testid={`stage-2-speed-btn-${langCode}-${rateVal}`}
                                                              onClick={() => {
                                                                const next = {
                                                                  ...rates,
                                                                  [langCode]: rateVal,
                                                                };
                                                                setRates(next);
                                                                saveTtsRatePreference(
                                                                  langCode,
                                                                  rateVal,
                                                                );
                                                                if (videoId)
                                                                  saveVideoSettings(videoId, {
                                                                    ttsRates: {
                                                                      [langCode]: rateVal,
                                                                    },
                                                                  });
                                                              }}
                                                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                                                                Math.abs(currentRate - rateVal) <
                                                                0.03
                                                                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                                  : "text-muted-foreground/70 hover:text-foreground bg-muted/30"
                                                              }`}
                                                              title={`Set speed to ${rateVal}x`}
                                                            >
                                                              {rateVal}x
                                                            </button>
                                                          ),
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Ingredient 6: Custom Volume per Translation (0% – 100%) */}
                                          <div
                                            data-testid="stage-2-ingredient-volume-section"
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/80 space-y-1.5 shadow-xs"
                                          >
                                            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground uppercase tracking-wider">
                                                <Volume2 className="h-3.5 w-3.5 text-primary" />
                                                <span>6. Volume per Translation (0% – 100%)</span>
                                              </div>
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                Custom volume
                                              </span>
                                            </div>

                                            <div className="flex flex-col space-y-1.5 pt-0.5">
                                              {orderedLearningCodes.map((langCode) => {
                                                const meta =
                                                  LANGS.find((l) => l.code === langCode) ||
                                                  SUPPORTED_LANGUAGES_CATALOG.find(
                                                    (l) => l.code === langCode,
                                                  );
                                                const currentVolume = getLanguageTtsVolume(
                                                  ttsVolumes,
                                                  langCode,
                                                );
                                                const volumePercent = Math.round(
                                                  currentVolume * 100,
                                                );
                                                const isMuted = volumePercent === 0;

                                                return (
                                                  <div
                                                    key={`volume-${langCode}`}
                                                    data-testid={`stage-2-volume-row-${langCode}`}
                                                    className="p-2 rounded-md bg-background/80 border border-border/60 space-y-1.5"
                                                  >
                                                    <div
                                                      data-testid={`stage-2-volume-slider-container-${langCode}`}
                                                      className="space-y-1.5"
                                                    >
                                                      <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                          <Languages className="h-3.5 w-3.5 text-primary shrink-0" />
                                                          <span>
                                                            {meta?.name || langCode.toUpperCase()}
                                                          </span>
                                                          <span className="text-[10px] text-muted-foreground font-mono">
                                                            ({langCode})
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                          <span
                                                            data-testid={`stage-2-volume-display-${langCode}`}
                                                            className={`font-mono text-xs font-bold ${
                                                              isMuted
                                                                ? "text-destructive"
                                                                : "text-primary"
                                                            }`}
                                                          >
                                                            {isMuted
                                                              ? "0% (Muted)"
                                                              : `${volumePercent}%`}
                                                          </span>
                                                          <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            data-testid={`stage-2-volume-mute-toggle-${langCode}`}
                                                            aria-label={`Toggle mute for ${meta?.name || langCode}`}
                                                            title={
                                                              isMuted
                                                                ? "Unmute (restore to 100%)"
                                                                : "Mute (set to 0%)"
                                                            }
                                                            onClick={() => {
                                                              const nextVol = isMuted ? 1.0 : 0.0;
                                                              const next = {
                                                                ...ttsVolumes,
                                                                [langCode]: nextVol,
                                                              };
                                                              setTtsVolumes(next);
                                                              saveTtsVolumePreference(
                                                                langCode,
                                                                nextVol,
                                                              );
                                                              if (videoId) {
                                                                saveVideoSettings(videoId, {
                                                                  ttsVolumes: {
                                                                    [langCode]: nextVol,
                                                                  },
                                                                });
                                                              }
                                                            }}
                                                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                                                          >
                                                            {isMuted ? (
                                                              <VolumeX className="h-3 w-3 text-destructive" />
                                                            ) : (
                                                              <Volume2 className="h-3 w-3 text-emerald-500" />
                                                            )}
                                                          </Button>
                                                        </div>
                                                      </div>

                                                      <div className="flex items-center gap-1.5">
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-volume-decrement-${langCode}`}
                                                          aria-label={`Decrease volume for ${meta?.name || langCode}`}
                                                          title="Decrease volume by 10%"
                                                          disabled={currentVolume <= 0}
                                                          onClick={() => {
                                                            const nextVol = Math.max(
                                                              0,
                                                              Math.round(
                                                                (currentVolume - 0.1) * 100,
                                                              ) / 100,
                                                            );
                                                            const next = {
                                                              ...ttsVolumes,
                                                              [langCode]: nextVol,
                                                            };
                                                            setTtsVolumes(next);
                                                            saveTtsVolumePreference(
                                                              langCode,
                                                              nextVol,
                                                            );
                                                            if (videoId) {
                                                              saveVideoSettings(videoId, {
                                                                ttsVolumes: { [langCode]: nextVol },
                                                              });
                                                            }
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Minus className="h-3 w-3" />
                                                        </Button>

                                                        <input
                                                          type="range"
                                                          min={0}
                                                          max={1}
                                                          step={0.05}
                                                          value={currentVolume}
                                                          data-testid={`stage-2-volume-slider-${langCode}`}
                                                          aria-label={`TTS volume slider for ${meta?.name || langCode}`}
                                                          onChange={(e) => {
                                                            const val = Math.max(
                                                              0,
                                                              Math.min(
                                                                1,
                                                                Math.round(
                                                                  Number(e.target.value) * 100,
                                                                ) / 100,
                                                              ),
                                                            );
                                                            const next = {
                                                              ...ttsVolumes,
                                                              [langCode]: val,
                                                            };
                                                            setTtsVolumes(next);
                                                            saveTtsVolumePreference(langCode, val);
                                                            if (videoId) {
                                                              saveVideoSettings(videoId, {
                                                                ttsVolumes: { [langCode]: val },
                                                              });
                                                            }
                                                          }}
                                                          className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                        />

                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          data-testid={`stage-2-volume-increment-${langCode}`}
                                                          aria-label={`Increase volume for ${meta?.name || langCode}`}
                                                          title="Increase volume by 10%"
                                                          disabled={currentVolume >= 1}
                                                          onClick={() => {
                                                            const nextVol = Math.min(
                                                              1,
                                                              Math.round(
                                                                (currentVolume + 0.1) * 100,
                                                              ) / 100,
                                                            );
                                                            const next = {
                                                              ...ttsVolumes,
                                                              [langCode]: nextVol,
                                                            };
                                                            setTtsVolumes(next);
                                                            saveTtsVolumePreference(
                                                              langCode,
                                                              nextVol,
                                                            );
                                                            if (videoId) {
                                                              saveVideoSettings(videoId, {
                                                                ttsVolumes: { [langCode]: nextVol },
                                                              });
                                                            }
                                                          }}
                                                          className="h-6 w-6 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                          <Plus className="h-3 w-3" />
                                                        </Button>
                                                      </div>

                                                      {/* Quick Volume Presets */}
                                                      <div className="flex items-center gap-1 pt-0.5 overflow-x-auto">
                                                        <span className="text-[9px] text-muted-foreground">
                                                          Presets:
                                                        </span>
                                                        {[0.0, 0.25, 0.5, 0.75, 1.0].map(
                                                          (volVal) => {
                                                            const pctLabel = `${Math.round(volVal * 100)}%`;
                                                            const isCurrent =
                                                              Math.abs(currentVolume - volVal) <
                                                              0.03;
                                                            return (
                                                              <button
                                                                key={volVal}
                                                                type="button"
                                                                data-testid={`stage-2-volume-btn-${langCode}-${Math.round(volVal * 100)}`}
                                                                onClick={() => {
                                                                  const next = {
                                                                    ...ttsVolumes,
                                                                    [langCode]: volVal,
                                                                  };
                                                                  setTtsVolumes(next);
                                                                  saveTtsVolumePreference(
                                                                    langCode,
                                                                    volVal,
                                                                  );
                                                                  if (videoId) {
                                                                    saveVideoSettings(videoId, {
                                                                      ttsVolumes: {
                                                                        [langCode]: volVal,
                                                                      },
                                                                    });
                                                                  }
                                                                }}
                                                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono transition-colors cursor-pointer ${
                                                                  isCurrent
                                                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                                                    : "text-muted-foreground/70 hover:text-foreground bg-muted/30"
                                                                }`}
                                                                title={`Set volume to ${pctLabel}`}
                                                              >
                                                                {pctLabel}
                                                              </button>
                                                            );
                                                          },
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Regular Languages Accordion Content */}
                            <div className="mb-4 space-y-3 border-b border-border pb-4">
                              {!isAndroid && (
                                <div
                                  data-testid="demo-languages-disclaimer"
                                  className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 space-y-1"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <span>Demo Mode Caption Limitation Note</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed">
                                    In this web demonstration, authentic subtitle captions are
                                    strictly limited to the verified fixture files for example video{" "}
                                    <code className="font-mono font-semibold">L2Ryrr6txwA</code>{" "}
                                    (available in English, Hebrew, Arabic, Spanish, Italian,
                                    Russian, and Portuguese). In native Android mode, caption
                                    streams for any YouTube video are intercepted dynamically during
                                    playback.
                                  </p>
                                </div>
                              )}

                              <LanguageBoxesSelector
                                catalog={isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS}
                                selectedLanguages={targetLanguages}
                                onSelectionChange={handleTargetLanguagesChange}
                                isAndroid={isAndroid}
                                favoriteLanguages={favoriteLanguages}
                                currentVideoId={videoId}
                                loadedTracks={tracks}
                                onSaveSubtitleUrl={handleSaveTrackFromUrl}
                              />
                              <GlobalFavoriteLanguagesPanel
                                catalog={SUPPORTED_LANGUAGES_CATALOG}
                                favoriteLanguages={favoriteLanguages}
                                targetLanguages={targetLanguages}
                                videoId={videoId}
                                onFavoriteLanguagesChange={handleUpdateFavoriteLanguages}
                                onApplyFavoritesToVideo={handleResetVideoToFavorites}
                                onSaveCurrentSelectionAsFavorites={handleSaveCurrentAsFavorites}
                              />
                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                  <label
                                    htmlFor="auto-speak-on-fetch-toggle"
                                    className="text-xs font-medium text-foreground cursor-pointer"
                                  >
                                    Auto speak language upon fetching
                                  </label>
                                  <div className="text-[11px] text-muted-foreground">
                                    Automatically enable the "Speak" checkbox for languages when
                                    their subtitles are loaded
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  id="auto-speak-on-fetch-toggle"
                                  data-testid="auto-speak-on-fetch-toggle"
                                  checked={autoSpeakOnFetch}
                                  onChange={(e) => {
                                    setAutoSpeakOnFetch(e.target.checked);
                                    setAutoSpeakOnFetchSetting(e.target.checked);
                                  }}
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                  <label
                                    htmlFor="speak-language-name-on-fetch-toggle"
                                    className="text-xs font-medium text-foreground cursor-pointer"
                                  >
                                    TTS-play language name upon fetching
                                  </label>
                                  <div className="text-[11px] text-muted-foreground">
                                    When a new subtitle is fetched, speak aloud the name of the
                                    language used to fetch
                                  </div>
                                </div>
                                <input
                                  type="checkbox"
                                  id="speak-language-name-on-fetch-toggle"
                                  data-testid="speak-language-name-on-fetch-toggle"
                                  checked={speakLanguageNameOnFetch}
                                  onChange={(e) => {
                                    setSpeakLanguageNameOnFetchState(e.target.checked);
                                    setSpeakLanguageNameOnFetchSetting(e.target.checked);
                                  }}
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                                <div className="space-y-0.5">
                                  <label
                                    htmlFor="fetch-window-seconds-input"
                                    className="text-xs font-medium text-foreground"
                                  >
                                    Subtitle fetch window pacing
                                  </label>
                                  <div className="text-[11px] text-muted-foreground">
                                    Never try to fetch more than 1 subtitle within this window frame
                                    (seconds)
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    id="fetch-window-seconds-input"
                                    data-testid="fetch-window-seconds-input"
                                    min={1}
                                    max={60}
                                    value={fetchWindowSeconds}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      setFetchWindowSecondsState(val);
                                      setSubtitleFetchWindowSeconds(val);
                                      subtitleRequestQueue.setWindowSeconds(val);
                                    }}
                                    className="w-16 rounded border border-input bg-background px-2 py-1 text-xs text-right"
                                  />
                                  <span className="text-xs text-muted-foreground">sec</span>
                                </div>
                              </div>
                            </div>
                            {spoken.length > 1 && (
                              <div className="flex items-center justify-between pb-1 text-xs">
                                <span className="text-[11px] text-muted-foreground">
                                  Primary leads; secondary languages speak relative to primary
                                  (absolute parent defined by Is-Primary column, ratio 1:
                                  {getLanguageTtsRatio(ttsRatios, primaryTtsLang)}).
                                </span>
                              </div>
                            )}
                            {(() => {
                              const activeVideoBarIndex = getVideoBarIndex(
                                orderedLangs.map((l) => l.code),
                                ttsLanguageOrders,
                                sectionOrder,
                              );
                              const handleSetVideoBarPosition = (newIndex: number) => {
                                const {
                                  sectionOrder: nextSectionOrder,
                                  languageOrders: nextLanguageOrders,
                                } = updatePrecedenceFromVideoBarIndex(
                                  orderedLangs.map((l) => l.code),
                                  newIndex,
                                );
                                handleSectionOrderChange(nextSectionOrder);
                                for (const [code, ord] of Object.entries(nextLanguageOrders)) {
                                  handleTtsLanguageOrderChange(code, ord);
                                }
                              };

                              return (
                                <div className="overflow-x-auto">
                                  <table
                                    className="w-full text-xs"
                                    data-testid="unified-languages-table"
                                  >
                                    <thead>
                                      <tr className="text-xs text-muted-foreground border-b border-border">
                                        <th className="text-left font-normal py-1.5 px-2">
                                          Language
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          data-testid="th-is-primary"
                                          title="The only way to define the TTS-ratio absolute parent"
                                        >
                                          Is Primary
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          title="Speech rate (0.5x - 1.0x)"
                                        >
                                          Rate
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          data-testid="th-volume"
                                          title="TTS speech volume (0% - 100%)"
                                        >
                                          Vol
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          title="Foreign subtitle TTS play frequency ratio"
                                        >
                                          TTS Ratio
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          title="TTS-play (speak subtitle during playback)"
                                        >
                                          TTS-Play
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          title="Present in table (show subtitle column in table)"
                                        >
                                          Present in Table
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          data-testid="th-json3"
                                          title="Direct JSON3 subtitle status and manual video player caption toggle indication"
                                        >
                                          JSON3
                                        </th>
                                        <th
                                          className="font-normal text-center py-1.5 px-1.5"
                                          title="1 input per 1 favorite language for subtitle URL"
                                        >
                                          Subtitle URL
                                        </th>
                                        <th className="font-normal text-center py-1.5 px-1.5">
                                          Order
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {activeVideoBarIndex === 0 && (
                                        <VideoPlaybackPrecedenceBar
                                          asTableRow
                                          colSpan={10}
                                          currentPosition={0}
                                          totalRecords={orderedLangs.length}
                                          onMoveUp={() => handleSetVideoBarPosition(0)}
                                          onMoveDown={() => handleSetVideoBarPosition(1)}
                                          onPlaceAtTop={() => handleSetVideoBarPosition(0)}
                                          onPlaceAtBottom={() =>
                                            handleSetVideoBarPosition(orderedLangs.length)
                                          }
                                        />
                                      )}
                                      {orderedLangs.map((lang, index) => {
                                        const isSpoken = isLanguageSpoken(lang.code, spoken);
                                        const ratio = getLanguageTtsRatio(ttsRatios, lang.code);
                                        const isFavorite = favoriteLanguages.includes(lang.code);
                                        const isExpanded = expandedTableUrlLang === lang.code;
                                        const cueCount = tracks?.[lang.code]?.events?.length;
                                        const status = tableFetchStatus[lang.code];
                                        const languageVoices = getLanguageVoices(
                                          voices,
                                          lang.tts,
                                          true,
                                        );
                                        const isPrimary = lang.code === primaryTtsLang;
                                        const isPlayerToggled =
                                          activePlayerCaptionLang === lang.code ||
                                          playerToggledLanguages.includes(lang.code);
                                        const primaryLangObj = orderedLangs.find(
                                          (l) => l.code === (primaryTtsLang || spoken[0] || ""),
                                        );

                                        return (
                                          <Fragment key={lang.code}>
                                            <tr
                                              data-testid={`language-row-${lang.code}`}
                                              className="border-b border-border/40 hover:bg-muted/10"
                                            >
                                              <td className="py-1.5 px-2">
                                                <div
                                                  data-testid={`tts-settings-card-${lang.code}`}
                                                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 sr-only"
                                                />
                                                <span className="flex items-center gap-1 font-medium">
                                                  {isSpoken ? (
                                                    isPrimary ? (
                                                      <span className="flex items-center gap-1 font-semibold text-primary">
                                                        <span
                                                          data-testid={`tts-switch-primary-${lang.code}`}
                                                          title={`Click to set ${lang.name} as Primary`}
                                                        >
                                                          {lang.name}
                                                        </span>
                                                        <span
                                                          data-testid={`tts-role-badge-${lang.code}`}
                                                          className="rounded bg-primary/20 text-primary border border-primary/40 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider"
                                                        >
                                                          Primary
                                                        </span>
                                                      </span>
                                                    ) : (
                                                      <span className="flex items-center gap-1 font-medium text-foreground">
                                                        <span
                                                          data-testid={`tts-switch-primary-${lang.code}`}
                                                          title={`Click to set ${lang.name} as Primary`}
                                                        >
                                                          {lang.name}
                                                        </span>
                                                        <span
                                                          data-testid={`tts-role-badge-${lang.code}`}
                                                          className="rounded bg-muted text-muted-foreground px-1 py-0.2 text-[9px] font-normal uppercase tracking-wider"
                                                        >
                                                          Secondary
                                                        </span>
                                                      </span>
                                                    )
                                                  ) : (
                                                    <span>{lang.name}</span>
                                                  )}
                                                  {isSharedLanguageForVideo(videoId, lang.code) && (
                                                    <span
                                                      data-testid={`shared-lang-badge-${lang.code}`}
                                                      className="rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider"
                                                    >
                                                      (shared)
                                                    </span>
                                                  )}
                                                  {isFavorite && (
                                                    <span
                                                      title="Saved language"
                                                      className="sr-only"
                                                      data-testid={`fav-table-star-${lang.code}`}
                                                    >
                                                      Saved
                                                    </span>
                                                  )}
                                                  <button
                                                    type="button"
                                                    data-testid={`fav-table-toggle-${lang.code}`}
                                                    onClick={() =>
                                                      handleToggleFavoriteLanguage(lang.code)
                                                    }
                                                    className="sr-only"
                                                    aria-hidden="true"
                                                    tabIndex={-1}
                                                  >
                                                    {isFavorite ? "Saved" : "Add"}
                                                  </button>
                                                </span>
                                              </td>
                                              <td
                                                className="text-center py-1 px-1.5"
                                                data-testid={`col-is-primary-${lang.code}`}
                                              >
                                                <div className="flex items-center justify-center">
                                                  <input
                                                    type="radio"
                                                    name="is-primary-tts-parent"
                                                    id={`radio-is-primary-${lang.code}`}
                                                    data-testid={`radio-is-primary-${lang.code}`}
                                                    aria-label={`Is primary parent: ${lang.name}`}
                                                    title={`Set ${lang.name} as TTS-ratio absolute parent`}
                                                    checked={isPrimary}
                                                    onChange={() =>
                                                      handlePrimaryTtsLangChange(lang.code)
                                                    }
                                                    className="h-4 w-4 text-primary focus:ring-primary cursor-pointer accent-primary"
                                                  />
                                                </div>
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                <select
                                                  aria-label={`${lang.name} speech rate`}
                                                  data-testid={`tts-rate-select-${lang.code}`}
                                                  value={(rates[lang.code] ?? 0.5).toFixed(1)}
                                                  onChange={(e) => {
                                                    recordUserInteraction(Date.now());
                                                    const val = Number(e.target.value);
                                                    setRates((current) => ({
                                                      ...current,
                                                      [lang.code]: val,
                                                    }));
                                                    saveTtsRatePreference(lang.code, val);
                                                    if (videoId) {
                                                      saveVideoSettings(videoId, {
                                                        ttsRates: { [lang.code]: val },
                                                      });
                                                    }
                                                  }}
                                                  className="rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground cursor-pointer font-mono"
                                                >
                                                  {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((rateVal) => (
                                                    <option
                                                      key={rateVal}
                                                      value={rateVal.toFixed(1)}
                                                    >
                                                      {rateVal.toFixed(1)}×
                                                    </option>
                                                  ))}
                                                </select>
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                <select
                                                  aria-label={`${lang.name} speech volume`}
                                                  data-testid={`tts-volume-select-${lang.code}`}
                                                  value={Math.round(
                                                    getLanguageTtsVolume(ttsVolumes, lang.code) *
                                                      100,
                                                  )}
                                                  onChange={(e) => {
                                                    recordUserInteraction(Date.now());
                                                    const val = Number(e.target.value) / 100;
                                                    setTtsVolumes((current) => ({
                                                      ...current,
                                                      [lang.code]: val,
                                                    }));
                                                    saveTtsVolumePreference(lang.code, val);
                                                    if (videoId) {
                                                      saveVideoSettings(videoId, {
                                                        ttsVolumes: { [lang.code]: val },
                                                      });
                                                    }
                                                  }}
                                                  className="rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground cursor-pointer font-mono"
                                                >
                                                  {[100, 80, 60, 40, 20, 0].map((volPct) => (
                                                    <option key={volPct} value={volPct}>
                                                      {volPct}%
                                                    </option>
                                                  ))}
                                                </select>
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                {isSpoken ? (
                                                  <div className="flex items-center justify-center gap-1">
                                                    <select
                                                      aria-label={`${lang.name} TTS sentence ratio`}
                                                      data-testid={`tts-ratio-slider-${lang.code}`}
                                                      value={ratio}
                                                      onChange={(e) => {
                                                        const val = Math.max(
                                                          1,
                                                          Math.min(20, Number(e.target.value)),
                                                        );
                                                        setTtsRatios((curr) => ({
                                                          ...curr,
                                                          [lang.code]: val,
                                                        }));
                                                        saveTtsRatioPreference(lang.code, val);
                                                        if (videoId)
                                                          saveVideoSettings(videoId, {
                                                            ttsRatios: { [lang.code]: val },
                                                          });
                                                      }}
                                                      className="rounded border border-input bg-background px-1 py-0.5 text-xs"
                                                    >
                                                      {[1, 2, 3, 4, 5, 7, 10, 15, 20].map((n) => (
                                                        <option
                                                          key={n}
                                                          value={n}
                                                          data-testid={`tts-ratio-preset-${lang.code}-${n}`}
                                                        >
                                                          1:{n}
                                                          {isPrimary
                                                            ? " (Primary)"
                                                            : ` (rel. ${orderedLangs.find((l) => l.code === (primaryTtsLang || spoken[0]))?.name || "Primary"})`}
                                                        </option>
                                                      ))}
                                                    </select>
                                                    <span
                                                      data-testid={`tts-ratio-badge-${lang.code}`}
                                                      className="sr-only"
                                                    >
                                                      1:{ratio}
                                                    </span>
                                                    <span
                                                      data-testid={`tts-ratio-label-${lang.code}`}
                                                      className="sr-only"
                                                    >
                                                      1:{ratio} ({Math.round(100 / ratio)}% of
                                                      sentences)
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[10px] text-muted-foreground">
                                                    —
                                                  </span>
                                                )}
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                <div className="flex items-center justify-center gap-1">
                                                  <input
                                                    type="checkbox"
                                                    data-testid={`checkbox-tts-play-${lang.code}`}
                                                    aria-label={`TTS-play: ${lang.name}`}
                                                    title={`TTS-play: ${lang.name}`}
                                                    checked={
                                                      isSpoken &&
                                                      !isLanguageTtsBlacklisted(
                                                        lang.code,
                                                        ttsBlacklist,
                                                      )
                                                    }
                                                    onChange={() =>
                                                      toggle(spoken, setSpoken, lang.code)
                                                    }
                                                  />
                                                  <button
                                                    type="button"
                                                    data-testid={`tts-blacklist-toggle-${lang.code}`}
                                                    aria-label={`Toggle TTS blacklist for ${lang.name}`}
                                                    title={
                                                      isLanguageTtsBlacklisted(
                                                        lang.code,
                                                        ttsBlacklist,
                                                      )
                                                        ? `${lang.name} is BLACKLISTED from TTS-play (click to whitelist)`
                                                        : `Click to blacklist ${lang.name} from TTS-play`
                                                    }
                                                    onClick={() =>
                                                      handleToggleTtsBlacklist(lang.code)
                                                    }
                                                    className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                                                      isLanguageTtsBlacklisted(
                                                        lang.code,
                                                        ttsBlacklist,
                                                      )
                                                        ? "bg-destructive/20 text-destructive border border-destructive/40"
                                                        : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                  >
                                                    {isLanguageTtsBlacklisted(
                                                      lang.code,
                                                      ttsBlacklist,
                                                    ) ? (
                                                      <VolumeX className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <Volume2 className="h-3.5 w-3.5" />
                                                    )}
                                                  </button>
                                                </div>
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                <input
                                                  type="checkbox"
                                                  data-testid={`checkbox-present-in-table-${lang.code}`}
                                                  aria-label={`Present in table: ${lang.name}`}
                                                  title={`Present in table: ${lang.name}`}
                                                  checked={shown.includes(lang.code)}
                                                  onChange={() =>
                                                    toggle(shown, setShown, lang.code)
                                                  }
                                                />
                                              </td>
                                              <td
                                                className="text-center py-1 px-1.5"
                                                data-testid={`col-json3-${lang.code}`}
                                              >
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                  {cueCount && cueCount > 0 ? (
                                                    <span
                                                      data-testid={`json3-badge-${lang.code}`}
                                                      className="inline-flex items-center rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1 py-0.2 text-[9px] font-semibold"
                                                      title={`Direct JSON3 fetched: ${cueCount} cues`}
                                                    >
                                                      JSON3 ({cueCount})
                                                    </span>
                                                  ) : (
                                                    <span
                                                      data-testid={`json3-badge-${lang.code}`}
                                                      className="text-[10px] text-muted-foreground"
                                                      title="No direct JSON3 loaded yet"
                                                    >
                                                      —
                                                    </span>
                                                  )}
                                                  <Button
                                                    type="button"
                                                    variant={
                                                      isPlayerToggled ? "default" : "outline"
                                                    }
                                                    size="sm"
                                                    id={`btn-toggle-player-json3-${lang.code}`}
                                                    data-testid={`btn-toggle-player-json3-${lang.code}`}
                                                    onClick={() =>
                                                      handleTogglePlayerCaptionTrack(lang.code)
                                                    }
                                                    className={`h-5 px-1.5 text-[9px] gap-0.5 ${
                                                      isPlayerToggled
                                                        ? "bg-primary text-primary-foreground font-semibold"
                                                        : "text-muted-foreground"
                                                    }`}
                                                    title={`Toggle ${lang.name} captions on video player (indicates direct fetching)`}
                                                  >
                                                    <span
                                                      data-testid={`player-caption-status-${lang.code}`}
                                                    >
                                                      {isPlayerToggled
                                                        ? "Player: ON"
                                                        : "Player: OFF"}
                                                    </span>
                                                  </Button>
                                                </div>
                                              </td>
                                              <td className="text-center py-1 px-1.5">
                                                <Button
                                                  type="button"
                                                  variant={isExpanded ? "default" : "outline"}
                                                  size="sm"
                                                  id={`table-btn-subtitle-url-${lang.code}`}
                                                  data-testid={`table-btn-subtitle-url-${lang.code}`}
                                                  aria-expanded={isExpanded}
                                                  onClick={() =>
                                                    setExpandedTableUrlLang((cur) =>
                                                      cur === lang.code ? null : lang.code,
                                                    )
                                                  }
                                                  className="h-6 px-1.5 text-[11px] gap-1"
                                                  title={`Supply subtitle URL for ${lang.name}`}
                                                >
                                                  <Link2 className="h-3 w-3" />
                                                  <span>
                                                    {cueCount ? `${cueCount} cues` : "URL"}
                                                  </span>
                                                </Button>
                                              </td>
                                              <td className="py-1 px-1.5">
                                                <div className="flex justify-center items-center gap-0.5">
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    disabled={index === 0}
                                                    onClick={() => moveLanguage(lang.code, -1)}
                                                    title={`Move ${lang.name} earlier`}
                                                    aria-label={`Move ${lang.name} earlier`}
                                                  >
                                                    <ChevronUp
                                                      className="h-3 w-3"
                                                      aria-hidden="true"
                                                    />
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-6 w-6 ${activeVideoBarIndex === index ? "text-primary bg-primary/10 border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}
                                                    onClick={() => handleSetVideoBarPosition(index)}
                                                    title={`Place video playing precedence before ${lang.name}`}
                                                    aria-label={`Place video playing precedence before ${lang.name}`}
                                                    data-testid={`btn-place-video-before-${lang.code}`}
                                                  >
                                                    <Film className="h-3 w-3" aria-hidden="true" />
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    disabled={index === orderedLangs.length - 1}
                                                    onClick={() => moveLanguage(lang.code, 1)}
                                                    title={`Move ${lang.name} later`}
                                                    aria-label={`Move ${lang.name} later`}
                                                  >
                                                    <ChevronDown
                                                      className="h-3 w-3"
                                                      aria-hidden="true"
                                                    />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                            {isExpanded && (
                                              <tr
                                                key={`${lang.code}-url-drawer`}
                                                data-testid={`url-input-row-${lang.code}`}
                                                className="bg-primary/5 border-y border-primary/20"
                                              >
                                                <td colSpan={10} className="p-2.5">
                                                  <div className="space-y-2 max-w-xl text-xs">
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                        <Link2 className="h-3.5 w-3.5 text-primary" />
                                                        <span>
                                                          Subtitle URL for {lang.name} ({lang.code})
                                                        </span>
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setExpandedTableUrlLang(null)
                                                        }
                                                        className="text-muted-foreground hover:text-foreground text-[11px]"
                                                      >
                                                        ✕ Close
                                                      </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="text"
                                                        id={`table-url-input-${lang.code}`}
                                                        data-testid={`table-url-input-${lang.code}`}
                                                        value={tableUrlInputs[lang.code] ?? ""}
                                                        onChange={(e) =>
                                                          setTableUrlInputs((prev) => ({
                                                            ...prev,
                                                            [lang.code]: e.target.value,
                                                          }))
                                                        }
                                                        placeholder={`e.g. /fixtures/${videoId || "L2Ryrr6txwA"}/${lang.code}.json or https://...`}
                                                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                                      />
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        id={`table-fetch-url-${lang.code}`}
                                                        data-testid={`table-fetch-url-${lang.code}`}
                                                        disabled={
                                                          status?.loading ||
                                                          !(tableUrlInputs[lang.code] || "").trim()
                                                        }
                                                        onClick={() =>
                                                          handleFetchTableUrl(lang.code, lang.name)
                                                        }
                                                        className="h-7 text-xs px-2.5 shrink-0"
                                                      >
                                                        {status?.loading ? (
                                                          <>
                                                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                            Loading…
                                                          </>
                                                        ) : (
                                                          "Fetch Subtitles"
                                                        )}
                                                      </Button>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const sample = `/fixtures/${videoId || "L2Ryrr6txwA"}/${lang.code}.json`;
                                                          setTableUrlInputs((prev) => ({
                                                            ...prev,
                                                            [lang.code]: sample,
                                                          }));
                                                        }}
                                                        className="text-primary hover:underline flex items-center gap-1"
                                                      >
                                                        <FileText className="h-3 w-3" />
                                                        <span>Use sample fixture</span>
                                                      </button>
                                                      {cueCount ? (
                                                        <span className="text-muted-foreground font-mono">
                                                          Active track: {cueCount} cues
                                                        </span>
                                                      ) : null}
                                                    </div>

                                                    {/* Voice selection */}
                                                    <div className="flex items-center gap-2 pt-1.5 border-t border-border/50 text-xs">
                                                      <span className="text-muted-foreground shrink-0">
                                                        Voice:
                                                      </span>
                                                      <select
                                                        aria-label={`${lang.name} voice`}
                                                        value={voiceSelections[lang.code] ?? ""}
                                                        onChange={(e) => {
                                                          const value = e.target.value;
                                                          setVoiceSelections((current) => {
                                                            const next = {
                                                              ...current,
                                                              [lang.code]: value,
                                                            };
                                                            try {
                                                              localStorage.setItem(
                                                                "yt_tts_voice_selections_v1",
                                                                JSON.stringify(next),
                                                              );
                                                            } catch {
                                                              // ignore storage write errors
                                                            }
                                                            return next;
                                                          });
                                                        }}
                                                        disabled={languageVoices.length === 0}
                                                        className="w-full sm:w-64 truncate rounded border border-input bg-background px-1.5 py-0.5 text-xs disabled:opacity-60"
                                                      >
                                                        <option value="">
                                                          {languageVoices.length === 0
                                                            ? "Device voice"
                                                            : "Default voice"}
                                                        </option>
                                                        {languageVoices.map((voice, voiceIndex) => (
                                                          <option
                                                            key={getUniqueVoiceKey(
                                                              voice,
                                                              voiceIndex,
                                                            )}
                                                            value={voice.voiceURI || voice.name}
                                                          >
                                                            {voice.name}{" "}
                                                            {voice.lang ? `(${voice.lang})` : ""}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    </div>

                                                    {status?.message && (
                                                      <div
                                                        data-testid={`table-url-status-${lang.code}`}
                                                        className={`p-2 rounded text-[11px] flex items-start gap-1.5 border ${
                                                          status.type === "success"
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                                                            : status.type === "error"
                                                              ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                                                              : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
                                                        }`}
                                                      >
                                                        {status.type === "success" ? (
                                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                        ) : status.type === "error" ? (
                                                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                                                        ) : (
                                                          <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin shrink-0 mt-0.5" />
                                                        )}
                                                        <span className="flex-1">
                                                          {status.message}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                            {activeVideoBarIndex === index + 1 && (
                                              <VideoPlaybackPrecedenceBar
                                                asTableRow
                                                colSpan={10}
                                                currentPosition={index + 1}
                                                totalRecords={orderedLangs.length}
                                                onMoveUp={() => handleSetVideoBarPosition(index)}
                                                onMoveDown={() =>
                                                  handleSetVideoBarPosition(
                                                    Math.min(orderedLangs.length, index + 2),
                                                  )
                                                }
                                                onPlaceAtTop={() => handleSetVideoBarPosition(0)}
                                                onPlaceAtBottom={() =>
                                                  handleSetVideoBarPosition(orderedLangs.length)
                                                }
                                              />
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                            {(() => {
                              const pendingFetchAgainLangs =
                                activeFailedToFetch.length > 0
                                  ? activeFailedToFetch
                                  : failedLangs.length > 0
                                    ? languagesToFetchNext
                                    : [];
                              if (pendingFetchAgainLangs.length === 0) return null;
                              return (
                                <div
                                  id="subtitles-failed-fetch-alert"
                                  data-testid="subtitles-failed-fetch-alert"
                                  className="mt-3 flex items-center justify-between p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs"
                                >
                                  <span className="text-destructive font-medium">
                                    Failed to fetch subtitles: {pendingFetchAgainLangs.join(", ")}
                                  </span>
                                  <button
                                    type="button"
                                    data-testid="subtitles-manual-fetch"
                                    onClick={manualFetchFailed}
                                    className="inline-flex items-center gap-1 rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/30 cursor-pointer"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                    Fetch again ({pendingFetchAgainLangs.join(", ")})
                                  </button>
                                </div>
                              );
                            })()}
                          </>
                        )}

                        {panelId === "subtitles" && (
                          <section
                            className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"
                            aria-label="Parallel subtitles table"
                            data-testid="advanced-parallel-subtitles"
                            data-control-category="daily-usage"
                          >
                            <h3 className="text-xs font-semibold text-foreground">
                              Parallel subtitles
                            </h3>
                            <SubtitlesTablePanel
                              isAndroid={isAndroid}
                              rows={rows}
                              displayedRows={displayedRows}
                              cols={cols}
                              baseLanguage={baseLanguage}
                              subtitlesLimit={subtitlesLimit}
                              setSubtitlesLimit={setSubtitlesLimit}
                              subtitlesPage={subtitlesPage}
                              setSubtitlesPage={setSubtitlesPage}
                              active={active}
                              allFavoritesAligned={allFavoritesAligned}
                              targetLanguages={targetLanguages}
                              speechProgress={speechProgress}
                              tracks={tracks}
                              onSeek={seek}
                              onSelectBaseLanguage={handleSelectDefaultSubtitle}
                              spokenLangs={spoken}
                              ttsRatios={ttsRatios}
                              primaryTtsLang={primaryTtsLang}
                              hasCachedAi={hasCachedAi}
                              onLoadCachedAiSubtitles={handleLoadCachedAiFromViewer}
                              parserConfig={simpleParserConfig}
                              onParserConfigChange={handleSimpleParserConfigChange}
                              onScrollToActivePosition={handleScrollToActivePosition}
                              onSpeakCue={handleSpeakCue}
                              blacklist={ttsBlacklist}
                              onTablePlay={handlePlayVideo}
                            />
                            {currentAccordionStage === 2 && (
                              <div
                                id="stage-2-table-navigation"
                                data-testid="stage-2-table-navigation"
                                className="flex items-center justify-between pt-2 border-t border-border mt-3"
                              >
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowOtherSettingsAccordions(false);
                                    setCurrentAccordionStage(1);
                                    setOpenPanels((prev) => ({ ...prev, languages: true }));
                                  }}
                                  className="gap-1.5 text-xs h-8"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                  <span>Back to Learning Goals</span>
                                </Button>
                                <Button
                                  id="stage-2-to-video-button"
                                  data-testid="stage-2-to-video-button"
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setShowOtherSettingsAccordions(false);
                                    setCurrentAccordionStage(3);
                                    setOpenPanels((prev) => ({
                                      ...prev,
                                      player: true,
                                    }));
                                  }}
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4 text-xs h-8 shadow-sm flex items-center gap-1.5"
                                >
                                  <span>NEXT to Video (Stage 3)</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </section>
                        )}
                      </AccordionSection>
                    );
                  })}
              </div>

              <div
                id="version-details-container"
                data-testid="version-details-container"
                className={showVersionDetails ? "block" : "hidden"}
              >
                <ApkReleasesFooter
                  apkReleaseLinks={apkReleaseLinks}
                  onOpenApkModal={() => setApkModalOpen(true)}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Universal Log Element: placed on the bottom of every page/stage */}
      <div
        id="bottom-log-viewer-container"
        data-testid="bottom-log-viewer-container"
        className={showBottomLogViewer ? "block" : "hidden"}
      >
        <BottomLogViewer />
      </div>

      {isDeveloperMode && debugMode && (
        <NetworkRequestsInspector
          isOpen={networkInspectorOpen}
          onClose={() => setNetworkInspectorOpen(false)}
          onFetchAgainWithSession={(url) => handleFetchAgain(url, true)}
          onFetchAgainAnon={(url) => handleFetchAgain(url, false)}
          onFetchAgainViaServer={handleFetchAgainViaServer}
          onUseTheseSubtitles={handleUseTheseSubtitles}
          isAndroid={isAndroid}
          useFetchServer={useFetchServer}
          onToggleUseFetchServer={handleToggleUseFetchServer}
          fetchServerUrl={fetchServerUrl}
          onUpdateFetchServerUrl={handleUpdateFetchServerUrl}
        />
      )}
      {isDeveloperMode && debugMode && (
        <StateMachineActionLogsInspector
          isOpen={actionLogsOpen}
          onClose={() => setActionLogsOpen(false)}
        />
      )}
      <LanguageSubtitleUrlModal
        isOpen={urlModalLang !== null}
        onClose={() => setUrlModalLang(null)}
        langCode={urlModalLang}
        langName={urlModalLang ? getLanguageMeta(urlModalLang).name : ""}
        currentVideoId={videoId}
        onSaveTrack={handleSaveTrackFromUrl}
        existingTrack={urlModalLang && tracks ? tracks[urlModalLang] : null}
      />
      <ApkReleaseModal isOpen={apkModalOpen} onClose={() => setApkModalOpen(false)} />
      <ShareStateModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        videoId={videoId}
        baseLanguage={baseLanguage || "en"}
        targetLanguages={targetLanguages}
        observedUrl={
          observedUrl ||
          (typeof window !== "undefined"
            ? window.AndroidNativeShell?.getLastObservedTimedTextUrl?.()
            : undefined)
        }
        rawJson3Track={tracks && baseLanguage ? tracks[baseLanguage] : null}
        openRouterApiKey={getOpenRouterApiKeySetting()}
        ttsProvider={lovableTtsProviderState}
        isAndroid={isAndroid}
      />
      <SettingsBackupModal
        isOpen={isSettingsBackupModalOpen}
        initialTab={settingsBackupModalTab}
        onClose={() => setIsSettingsBackupModalOpen(false)}
        onSettingsImported={handleSettingsImported}
      />
      <SubtitleFetchToast
        onViewSubtitles={() => {
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
        }}
      />
      <FloatingDraggablePauseButton
        isSetupPaused={isSetupPaused}
        onToggleSetupPause={toggleSetupPause}
        isAutoScrollEnabled={autoFocus}
        onToggleAutoScroll={() => onAutoFocusChange(!autoFocus)}
        isVideoPlaying={isVideoPlaying}
        isSpeaking={Boolean(speakingLang)}
        pauseReason={pauseReason}
        onTogglePlay={handleTogglePlay}
        onPlay={handlePlayVideo}
        onPause={handlePauseVideo}
        currentTimeSec={playbackCurrentTime}
        durationSec={playbackDuration}
      />
      <FloatingErrorButton />
      {/* Auto-Fetching Subtitles widget: folded and hidden by default on refresh */}
      <div
        id="autofetch-subtitles-container"
        data-testid="autofetch-subtitles-container"
        className={showAutoFetchSubtitles ? "block" : "hidden"}
      >
        <FloatingSubtitleRetryIndicator
          targetLanguages={targetLanguages}
          tracks={tracks}
          onFetchLanguage={handleFloatingFetchSingleLanguage}
          isFetching={isSubtitlesPending}
          autoRetryEnabled={autoRetrySubtitles}
          minPacingSec={retryPacingMinSec}
          maxPacingSec={retryPacingMaxSec}
          onToggleAutoRetry={handleToggleAutoRetry}
          debugMode={debugMode}
          defaultMinimized={true}
        />
      </div>
      <VideoMetadataModal
        open={videoMetadataModalOpen}
        onOpenChange={setVideoMetadataModalOpen}
        metadata={videoMetadata}
        videoId={videoId}
        onRefreshMetadata={() =>
          fetchVideoMetadata(videoId, {
            forceRefresh: true,
            player: player.current,
          }).then((meta) => {
            setVideoMetadata({ ...meta });
          })
        }
      />
    </div>
  );
}

export { AccordionSection } from "@/components/AccordionSection";
export { SubtitleRow } from "@/components/SubtitleRow";
export { HighlightedSubtitle } from "@/components/HighlightedSubtitle";
export { SubtitlesTablePanel } from "@/components/SubtitlesTablePanel";
export { ApkReleasesFooter } from "@/components/ApkReleasesFooter";
export { VideoPlayground } from "@/components/VideoPlayground";
