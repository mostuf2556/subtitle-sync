import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  Moon,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  align,
  fmt,
  LANGS,
  RTL,
  STRATEGIES,
  PARSER_CRITERIA,
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
} from "@/lib/native-captions";
import {
  SUPPORTED_LANGUAGES_CATALOG,
  getUserLearningLanguages,
  setUserLearningLanguages,
  getAutoScrollSetting,
  setAutoScrollSetting,
  getDebugModeSetting,
  setDebugModeSetting,
  loadVideoSettings,
  saveVideoSettings,
} from "@/utils/appSettings";
import {
  getAudioTrackMode,
  setAudioTrackMode,
  repeatSegmentWithAudioTrack,
} from "@/utils/audioTrackManager";
import { deduplicateVoices, getLanguageVoices, getUniqueVoiceKey } from "@/utils/speechVoiceUtils";
import {
  computeVideoInstances,
  multiVideoPlayerRegistry,
  executeMultiVideoSegmentSync,
  type VideoInstanceConfig,
  type YTPlayerLike,
} from "@/utils/multiVideoPlayerManager";
import { VideoInstancesSwiper } from "@/components/VideoInstancesSwiper";
import { FloatingDraggablePauseButton } from "@/components/FloatingDraggablePauseButton";
import { trackNetworkRequest, useNetworkRequests } from "@/utils/networkTracker";
import { NetworkRequestsInspector } from "@/components/NetworkRequestsInspector";
import { createIframePlayer } from "@/lib/iframe-player";
import {
  getPlayerKind,
  getSectionOrder,
  getSubtitleRequestMode,
  getTtsRatiosPreference,
  isSubtitleInstanceEligibleForTTS,
  shouldHighlightSentenceForTTS,
  setPlayerKind as savePlayerKind,
  setSectionOrder as saveSectionOrder,
  setSubtitleRequestMode as saveSubtitleRequestMode,
  setTtsRatioPreference as saveTtsRatioPreference,
  subtitleRequestModeOrder,
  type PlayerKind,
  type SectionOrder,
  type SubtitleRequestMode,
} from "@/lib/playback-preferences";
import { ApkReleaseModal } from "@/components/ApkReleaseModal";
import { SubtitleFetchToast } from "@/components/SubtitleFetchToast";
import { VideoLibraryPanel } from "@/components/VideoLibraryPanel";
import { recordVideoWatch } from "@/utils/videoLibraryManager";
import { notifySubtitleFetch } from "@/utils/subtitleNotificationManager";
import { getApkReleaseLinks } from "@/utils/apkUpdater";
import { isValidJsonSubtitleResponse } from "@/utils/subtitleCache";
import { STORAGE_KEYS, APP_VERSION, ALL_RELEASES_URL } from "@/config/appConfig";
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
  getAvailableAudioTracks?(): unknown[];
  setAudioTrack?(trackId: string): void;
  getAudioTrack?(): unknown;
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
type PanelId = "player" | "playback" | "library" | "parser" | "languages" | "subtitles";

const PANELS: { id: PanelId; title: string }[] = [
  { id: "player", title: "Video" },
  { id: "playback", title: "Playback" },
  { id: "library", title: "Video library" },
  { id: "parser", title: "Parser" },
  { id: "languages", title: "Languages" },
  { id: "subtitles", title: "Parallel subtitles" },
];

function cancelSpeech() {
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
) {
  return new Promise<void>((res) => {
    if (!text) return res();

    if (typeof window !== "undefined" && window.AndroidNativeShell?.speak) {
      try {
        const handled = window.AndroidNativeShell.speak(text, lang, rate, `row-${row}-${lang}`);
        if (handled) {
          onProgress({
            lang: lang.slice(0, 2),
            row,
            start: 0,
            end: text.length,
          });
          const estDurationMs = Math.max(800, (text.length / 10) * (1000 / (rate || 1)));
          setTimeout(() => {
            onProgress(null);
            res();
          }, estDurationMs);
          return;
        }
      } catch (e) {
        console.warn("Android native TTS bridge failed, falling back to Web Speech", e);
      }
    }

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !window.speechSynthesis
    ) {
      return res();
    }

    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const v =
        voices.find((x) => x.voiceURI === voiceURI) ??
        voices.find((x) => x.lang?.replace("_", "-").startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
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
      const done = () => {
        if (resolved) return;
        resolved = true;
        if (typeof window !== "undefined") {
          (
            window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
          )._activeUtterance = null;
        }
        onProgress(null);
        res();
      };
      u.onend = u.onerror = done;
      if (typeof window !== "undefined") {
        (
          window as Window & { _activeUtterance?: SpeechSynthesisUtterance | null }
        )._activeUtterance = u;
      }
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      onProgress(null);
      res();
    }
  });
}

function getLanguageMeta(code: string): { code: string; name: string; tts: string } {
  const fromLangs = LANGS.find((l) => l.code === code);
  if (fromLangs) return fromLangs;
  const fromCatalog = SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code);
  if (fromCatalog) {
    const tts = code.includes("-") ? code : `${code}-${code.toUpperCase()}`;
    return { code, name: fromCatalog.name, tts };
  }
  return { code, name: code.toUpperCase(), tts: code };
}

function Index() {
  const [isAndroid, setIsAndroid] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      Boolean(nativeShell()) ||
      new URLSearchParams(window.location.search).get("android") === "true"
    );
  });
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
    }
    return DEMO_VIDEO;
  });
  const [videoInput, setVideoInput] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");
  const [observedUrl, setObservedUrl] = useState("");
  const [defaultCaptionsLoaded, setDefaultCaptionsLoaded] = useState(false);
  const [tracks, setTracks] = useState<Record<string, Json3> | null>(null);
  const [isSubtitlesPending, startSubtitlesTransition] = useTransition();
  const [strategy, setStrategy] = useState<Strategy>("sentence");
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaId[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore storage error
      }
    }
    return ["sentence", "pause"];
  });

  const handleToggleCriterion = (id: CriteriaId) => {
    setSelectedCriteria((prev) => {
      let updated: CriteriaId[];
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        updated = prev.filter((c) => c !== id);
      } else {
        updated = [...prev, id];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage error
      }
      return updated;
    });
  };

  const handleApplyPreset = (presetCriteria: CriteriaId[]) => {
    setSelectedCriteria(presetCriteria);
    try {
      localStorage.setItem(
        STORAGE_KEYS.PARSER_CRITERIA_STORAGE_KEY,
        JSON.stringify(presetCriteria),
      );
    } catch {
      // ignore storage error
    }
  };

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

  const handleResetGroupSettings = () => {
    setCriteriaSettings(DEFAULT_CRITERIA_SETTINGS);
    try {
      localStorage.setItem(
        STORAGE_KEYS.PARSER_SETTINGS_STORAGE_KEY,
        JSON.stringify(DEFAULT_CRITERIA_SETTINGS),
      );
    } catch {
      // ignore storage error
    }
  };
  const [shown, setShown] = useState<string[]>([]);
  const [spoken, setSpoken] = useState<string[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = getUserLearningLanguages();
      if (saved && saved.length > 0) return saved;
    }
    return [];
  });

  const baseLanguage = useMemo(() => {
    if (observedUrl) {
      try {
        const l = new URL(observedUrl).searchParams.get("lang");
        if (l) return l;
      } catch {
        // ignore malformed URL
      }
    }
    if (tracks && Object.keys(tracks).length > 0) {
      return Object.keys(tracks)[0];
    }
    return "";
  }, [observedUrl, tracks]);

  const tracksRef = useRef<Record<string, Json3> | null>(tracks);
  tracksRef.current = tracks;
  const observedUrlRef = useRef(observedUrl);
  observedUrlRef.current = observedUrl;
  // Single attempt per language per observed URL (no automatic retries, like Youtubenet6)
  const attemptedRef = useRef<Set<string>>(new Set());
  const [failedLangs, setFailedLangs] = useState<string[]>([]);
  const [requestMode, setRequestModeState] = useState<SubtitleRequestMode>("tlang");
  useEffect(() => {
    // Load device-saved preferences after hydration
    setRequestModeState(getSubtitleRequestMode());
    setSectionOrderState(getSectionOrder());
    setPlayerKindState(getPlayerKind());
  }, []);
  const requestModeRef = useRef(requestMode);
  requestModeRef.current = requestMode;

  const [networkInspectorOpen, setNetworkInspectorOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState(false);
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
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        let raw = "";
        let json: Json3 | null = null;
        let tracker: ReturnType<typeof trackNetworkRequest> | null = null;
        try {
          for (const mode of subtitleRequestModeOrder(requestModeRef.current)) {
            const requestUrl =
              mode === "lang"
                ? buildLangReplacedCaptionUrl(activeUrl, code, "json3")
                : buildTranslatedCaptionUrl(activeUrl, code, "json3");
            tracker = trackNetworkRequest(requestUrl, "GET", "native_bridge");
            raw = shell.fetchTranslatedCaptionsWithUrl(requestUrl, code, "json3");
            if (raw && isValidJsonSubtitleResponse(raw)) {
              json = parseJson3(raw);
              if (json) break;
            }
            tracker.fail(
              raw
                ? `${mode}: invalid caption response (not valid JSON)`
                : `${mode}: empty caption response`,
            );
          }
          if (json) {
            tracker?.complete(200, raw);
            const loaded = json;
            next[code] = loaded;
            startSubtitlesTransition(() => {
              setTracks((prev) => ({ ...prev, [code]: loaded }));
              setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
            });
          } else {
            failed.push(code);
          }
        } catch (err) {
          tracker?.fail(String(err));
          failed.push(code);
        }
      }
      if (failed.length > 0) {
        setFailedLangs((prev) => Array.from(new Set([...prev, ...failed])));
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
      }
    },
    [isAndroid],
  );

  const manualFetchFailed = () => {
    const url = observedUrlRef.current;
    failedLangs.forEach((code) => attemptedRef.current.delete(`${url}|${code}`));
    void fetchFavoriteLanguageSubtitles(failedLangs, url);
  };

  const handleTargetLanguagesChange = (newTargetLangs: string[]) => {
    const newlyAdded = newTargetLangs.filter((lang) => !targetLanguages.includes(lang));
    setTargetLanguages(newTargetLangs);
    setUserLearningLanguages(newTargetLangs);
    setShown((prev) => Array.from(new Set([...prev, ...newTargetLangs])));
    if (newlyAdded.length > 0 && isAndroid) {
      setCaptionStatus(
        `Fetching live subtitles for added favorite language: ${newlyAdded.join(", ")}…`,
      );
      void fetchFavoriteLanguageSubtitles(newlyAdded);
    }
  };
  const [languageOrder, setLanguageOrder] = useState(() => LANGS.map((lang) => lang.code));
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(LANGS.map((lang) => [lang.code, 1])),
  );
  const [ttsRatios, setTtsRatios] = useState<Record<string, number>>(() => {
    const saved = getTtsRatiosPreference();
    const defaults = Object.fromEntries(LANGS.map((lang) => [lang.code, 1]));
    return { ...defaults, ...saved };
  });

  useEffect(() => {
    if (!videoId) return;
    const settings = loadVideoSettings(videoId);
    if (settings?.ttsRatios) {
      setTtsRatios((curr) => ({
        ...curr,
        ...settings.ttsRatios,
      }));
    }
  }, [videoId]);
  const [voiceSelections, setVoiceSelections] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const themeWasSelectedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [pauseMode, setPauseMode] = useState(true);
  const [sectionOrder, setSectionOrderState] = useState<SectionOrder>("video-first");
  const [playerKind, setPlayerKindState] = useState<PlayerKind>("youtube-api");
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
  const [autoFocus, setAutoFocusState] = useState(() =>
    typeof window !== "undefined" ? getAutoScrollSetting() : false,
  );
  const onAutoFocusChange = (enabled: boolean) => {
    setAutoFocusState(enabled);
    setAutoScrollSetting(enabled);
  };
  const [debugMode, setDebugModeState] = useState(() =>
    typeof window !== "undefined" ? getDebugModeSetting() : false,
  );
  const onDebugModeChange = (enabled: boolean) => {
    setDebugModeState(enabled);
    setDebugModeSetting(enabled);
    if (!enabled) {
      setNetworkInspectorOpen(false);
    }
  };
  const [isSetupPaused, setIsSetupPaused] = useState(false);
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
      }
      return next;
    });
  }, []);
  const [showVideoSubtitles, setShowVideoSubtitles] = useState(true);
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => PANELS.map((panel) => panel.id));
  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
    player: true,
    playback: true,
    library: true,
    parser: true,
    languages: true,
    subtitles: true,
  });

  const handleSelectLibraryVideo = (newId: string, customUrl?: string) => {
    if (!newId || newId === videoId) return;
    cancelSpeech();
    setTracks(null);
    setObservedUrl("");
    setDefaultCaptionsLoaded(false);
    setActive(-1);
    setSpeakingLang(null);
    setSpeakingRow(-1);
    setSpeechProgress(null);
    setPlayedRecordsCount(0);
    playedTtsRecords.current.clear();
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

  useEffect(() => {
    if (videoId) {
      recordVideoWatch({
        id: videoId,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }, [videoId]);
  const [active, setActive] = useState(-1);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [speakingRow, setSpeakingRow] = useState(-1);
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>(null);
  const [subtitlesLimit, setSubtitlesLimit] = useState<number>(() => (isAndroid ? 10 : 0));
  const [subtitlesPage, setSubtitlesPage] = useState<number>(1);

  useEffect(() => {
    const openLink = (link: string) => {
      const id = parseVideoId(link);
      if (id) {
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

    const shell = nativeShell();
    if (shell) {
      setIsAndroid(true);
      setSubtitlesLimit(10);
      setSubtitlesPage(1);
    }

    return () => {
      delete window.onNativeSharedLinkReceived;
    };
  }, []);

  // Handle Android Native Shell and browser history back navigation
  useEffect(() => {
    // 1. Android hardware back button / gesture handler exposed on window
    (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack = () => {
      if (networkInspectorOpen) {
        setNetworkInspectorOpen(false);
        return true;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
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
      if (apkModalOpen) {
        setApkModalOpen(false);
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
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      delete (window as Window & { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [networkInspectorOpen, apkModalOpen]);

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
          const json = parseJson3(raw);
          if (json) {
            setTracks((prev) => ({ ...prev, [defaultLang]: json }));
            setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
          }
        } catch (_e) {
          // ignore native bridge fetch error
        }
      }
    }
    window.onNativeCaptionsInterceptedBase64 = (encoded) => {
      const payload = decodeInterceptedCaption(encoded);
      if (!payload) return;
      const urlVideoId = timedTextVideoId(payload.url);
      if (urlVideoId && urlVideoId !== videoId) return;
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
        startSubtitlesTransition(() => {
          setTracks((prev) => ({ ...prev, [lang]: json }));
          setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        });
      }
    };
    return () => {
      delete window.onNativeCaptionsInterceptedBase64;
    };
  }, [isAndroid, videoId]);

  useEffect(() => {
    if (!isAndroid || !observedUrl || !defaultCaptionsLoaded) return;
    let defaultLang = "";
    try {
      defaultLang = new URL(observedUrl).searchParams.get("lang") || "";
    } catch (_e) {
      // ignore malformed URL
    }
    const selected = [
      ...new Set(targetLanguages.filter((code) => code && (!defaultLang || code !== defaultLang))),
    ];
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

  // Keep shown columns synchronized with favorite languages (no fetching here)
  useEffect(() => {
    const missingInShown = targetLanguages.filter((l) => !shown.includes(l));
    if (missingInShown.length > 0) {
      setShown((prev) => Array.from(new Set([...prev, ...missingInShown])));
    }
  }, [targetLanguages, shown]);

  useEffect(() => {
    if (themeWasSelectedRef.current) return;
    const saved = window.localStorage.getItem("parallel-subtitles-theme");
    if (saved === "light" || saved === "dark" || saved === "dark-blue") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark", "dark-blue");
    if (theme !== "light") document.documentElement.classList.add(theme);
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
    }
    setAudioTrackModeState(getAudioTrackMode());
    setAutoFocusState(getAutoScrollSetting());
    setDebugModeState(getDebugModeSetting());

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
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !window.speechSynthesis
    ) {
      return;
    }
    const refreshVoices = () => {
      try {
        setVoices(deduplicateVoices(window.speechSynthesis.getVoices() || []));
      } catch (_e) {
        // Ignore getVoices errors
      }
    };
    refreshVoices();
    try {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
      return () => {
        try {
          window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
        } catch (_e) {
          // Ignore removeEventListener errors
        }
      };
    } catch (_e) {
      // Ignore addEventListener errors
    }
  }, []);

  useEffect(() => {
    if (isAndroid) return;
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
      const validEntries = entries.filter(
        (entry): entry is readonly [string, Json3] => entry !== null,
      );
      const newTracks = Object.fromEntries(validEntries);
      startSubtitlesTransition(() => {
        setTracks(newTracks);
        // Automatically show loaded demo tracks
        setShown((prev) => (prev.length === 0 ? Object.keys(newTracks) : prev));
      });
    });
  }, [isAndroid]);

  const rows = useMemo<Row[]>(
    () =>
      tracks && baseLanguage ? align(tracks, baseLanguage, selectedCriteria, criteriaSettings) : [],
    [tracks, baseLanguage, selectedCriteria, criteriaSettings],
  );

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
      const existing = new Set(prev);
      const toAdd = targetLanguages.filter((c) => !existing.has(c));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, [targetLanguages]);

  // Main screen presents favorite languages and intercepted tracks for show/hide, speech toggles, ordering, and per-language TTS controls
  const orderedLangs = useMemo(() => {
    if (!isAndroid) {
      return languageOrder
        .filter((code) => LANGS.some((l) => l.code === code))
        .map((code) => getLanguageMeta(code));
    }
    const favoriteSet = new Set(targetLanguages);
    const combinedSet = new Set([
      ...favoriteSet,
      ...(baseLanguage ? [baseLanguage] : []),
      ...(tracks ? Object.keys(tracks) : []),
    ]);
    return languageOrder
      .filter((code) => combinedSet.has(code))
      .map((code) => getLanguageMeta(code));
  }, [isAndroid, languageOrder, targetLanguages, baseLanguage, tracks]);
  const st = useRef({
    rows,
    spoken,
    rates,
    ttsRatios,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
  });
  st.current = {
    rows,
    spoken,
    rates,
    ttsRatios,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
    sectionOrder,
    isSetupPaused,
    baseLanguage,
  };

  const playerEl = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);
  const handledRow = useRef(-1);
  const lastMs = useRef(0);
  const playedTtsRecords = useRef<Set<number>>(new Set());
  const [playedRecordsCount, setPlayedRecordsCount] = useState(0);

  useEffect(() => {
    playedTtsRecords.current.clear();
    handledRow.current = -1;
    setPlayedRecordsCount(0);
  }, [videoId, rows]);

  useEffect(() => {
    const init = () => {
      if (!playerEl.current) return;
      // Fresh host node per init so the YouTube API (which replaces its node) never touches the ref
      playerEl.current.innerHTML = "";
      const host = document.createElement("div");
      host.className = "h-full w-full";
      playerEl.current.appendChild(host);
      if (playerKind === "iframe") {
        player.current = createIframePlayer(host, videoId, { autoplay: isAndroid });
        if (player.current) {
          multiVideoPlayerRegistry.register("primary", player.current);
        }
        return;
      }
      if (!window.YT) return;
      player.current = new window.YT.Player(host, {
        videoId,
        playerVars: {
          rel: 0,
          autoplay: isAndroid ? 1 : 0,
          cc_load_policy: isAndroid ? 1 : 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (player.current) {
              multiVideoPlayerRegistry.register("primary", player.current);
            }
          },
        },
      });
      if (player.current) {
        multiVideoPlayerRegistry.register("primary", player.current);
      }
    };
    if (playerKind === "iframe" || window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const iv = setInterval(async () => {
      const p = player.current;
      if (!p?.getCurrentTime || busy.current || st.current.isSetupPaused) return;
      const ms = p.getCurrentTime() * 1000;
      // Detect user manually seeking or scrubbing across playback timeline
      if (Math.abs(ms - lastMs.current) > 2500 || ms < lastMs.current - 1000) {
        handledRow.current = -1;
      }
      lastMs.current = ms;

      const {
        rows,
        spoken,
        rates,
        ttsRatios: currentTtsRatios,
        voiceSelections,
        pauseMode,
        orderedLangs,
        audioTrackMode: isAudioTrackMode,
        baseLanguage: currentBaseLanguage,
      } = st.current;
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;

      const getEligibleLangs = (rowIdx: number) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(rowIdx)) return [];
        const matched = orderedLangs.filter(
          (l) =>
            spoken.includes(l.code) &&
            isSubtitleInstanceEligibleForTTS(
              rowIdx,
              currentTtsRatios?.[l.code] ?? 1,
              playedTtsRecords.current,
            ),
        );
        // When audioTrackMode is enabled with no spoken languages selected,
        // fallback to base / primary language so the original video repeats the section with native audio
        if (matched.length === 0 && isAudioTrackMode && spoken.length === 0) {
          const fallbackLang = orderedLangs.find((l) => l.code === currentBaseLanguage) ||
            orderedLangs[0] || { code: "primary", tts: "en-US", name: "Primary" };
          return [fallbackLang];
        }
        return matched;
      };

      const speakRow = async (rowIdx: number) => {
        if (rowIdx < 0 || playedTtsRecords.current.has(rowIdx)) return;
        const langs = getEligibleLangs(rowIdx);
        if (langs.length === 0) return;
        // Strictly skip this subtitles record from being TTS-played more than once
        playedTtsRecords.current.add(rowIdx);
        setPlayedRecordsCount(playedTtsRecords.current.size);
        for (const l of langs) {
          if (!busy.current) break;
          setSpeakingLang(l.code);
          setSpeakingRow(rowIdx);
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
            await speak(
              rows[rowIdx]?.texts[l.code] ?? "",
              l.tts,
              rates[l.code] ?? 1,
              voiceSelections[l.code] ?? "",
              rowIdx,
              setSpeechProgress,
            );
          }
        }
        if (isAudioTrackMode) {
          multiVideoPlayerRegistry.pauseAllExcept("primary");
          multiVideoPlayerRegistry.unmuteOnly("primary");
        }
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
      };
      const isPlaying = p.getPlayerState() === 1;
      if (pauseMode && st.current.sectionOrder === "tts-first") {
        // Speech first: on entering a section, pause, speak it, then play that section's video.
        if (
          idx >= 0 &&
          isPlaying &&
          !playedTtsRecords.current.has(idx) &&
          handledRow.current !== idx
        ) {
          handledRow.current = idx;
          const eligibleLangs = getEligibleLangs(idx);
          if (eligibleLangs.length > 0) {
            busy.current = true;
            p.pauseVideo();
            await speakRow(idx);
            const wasCancelled = !busy.current;
            busy.current = false;
            handledRow.current = idx;
            if (wasCancelled) return;
            const targetSec = (rows[idx]?.start ?? 0) / 1000;
            lastMs.current = targetSec * 1000;
            multiVideoPlayerRegistry.unmuteOnly("primary");
            p.seekTo(targetSec, true);
            p.playVideo();
          }
        }
        return;
      }
      // Video first: crossed the end of a section while playing → pause and speak it.
      if (pauseMode && isPlaying) {
        const candidateRow =
          prev >= 0 && (idx !== prev || ms >= (rows[prev]?.end ?? Infinity) - 80) ? prev : -1;
        if (
          candidateRow >= 0 &&
          !playedTtsRecords.current.has(candidateRow) &&
          handledRow.current !== candidateRow
        ) {
          handledRow.current = candidateRow;
          const eligibleLangs = getEligibleLangs(candidateRow);
          if (eligibleLangs.length > 0) {
            busy.current = true;
            p.pauseVideo();
            await speakRow(candidateRow);
            busy.current = false;
            handledRow.current = candidateRow;
            const nextRowIdx = candidateRow + 1;
            if (nextRowIdx < rows.length && rows[nextRowIdx]) {
              const nextRow = rows[nextRowIdx];
              const resumeTarget = nextRow.start / 1000;
              lastMs.current = resumeTarget * 1000;
              lastRow.current = nextRowIdx;
              multiVideoPlayerRegistry.unmuteOnly("primary");
              p.seekTo(resumeTarget, true);
              p.playVideo();
            } else {
              multiVideoPlayerRegistry.unmuteOnly("primary");
              p.pauseVideo();
            }
          }
        }
      }
    }, 150);
    return () => {
      clearInterval(iv);
      cancelSpeech();
      multiVideoPlayerRegistry.unregister("primary");
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId, isAndroid, playerKind]);

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
        if (playerKind === "iframe") {
          secPlayer = createIframePlayer(child, videoId, { autoplay: false });
        } else if (window.YT?.Player) {
          secPlayer = new window.YT.Player(child, {
            videoId,
            playerVars: {
              rel: 0,
              autoplay: 0,
              cc_load_policy: 0,
              playsinline: 1,
            },
            events: {
              onReady: () => {
                try {
                  secPlayer.mute?.();
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
  }, [audioTrackMode, videoInstances, videoId, playerKind]);

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

  useEffect(() => {
    if (!autoFocus || isSetupPaused) return;
    document
      .querySelector(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, autoFocus, isSetupPaused]);

  const seek = (r: Row, i: number) => {
    cancelSpeech();
    busy.current = false;
    lastRow.current = i;
    handledRow.current = -1;
    playedTtsRecords.current.delete(i);
    lastMs.current = r.start;
    player.current?.seekTo(r.start / 1000, true);
    player.current?.playVideo();
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
    if (isAndroid && videoId !== DEMO_VIDEO && (!tracks || Object.keys(tracks).length === 0)) {
      return [];
    }
    const list: { code: string; name: string; tts: string }[] = [];
    const addedCodes = new Set<string>();

    // 1. If baseLanguage from video captions exists in tracks and is shown, display it first
    if (baseLanguage && tracks?.[baseLanguage] && shown.includes(baseLanguage)) {
      list.push(getLanguageMeta(baseLanguage));
      addedCodes.add(baseLanguage);
    }

    // 2. Add all ordered languages that have tracks or are favorite languages, and are shown
    for (const l of orderedLangs) {
      if (
        !addedCodes.has(l.code) &&
        shown.includes(l.code) &&
        (targetLanguages.includes(l.code) || (tracks ? Boolean(tracks[l.code]) : true))
      ) {
        list.push(l);
        addedCodes.add(l.code);
      }
    }

    // 3. Fallback: add any remaining tracks present in shown
    if (tracks) {
      for (const code of Object.keys(tracks)) {
        if (!addedCodes.has(code) && shown.includes(code)) {
          list.push(getLanguageMeta(code));
          addedCodes.add(code);
        }
      }
    }

    return list;
  }, [isAndroid, videoId, tracks, baseLanguage, orderedLangs, shown, targetLanguages]);

  const missingFavoriteLanguages = useMemo(() => {
    return targetLanguages.filter((code) => !tracks?.[code]);
  }, [targetLanguages, tracks]);

  const allFavoritesAligned = useMemo(() => {
    return targetLanguages.length > 0 && missingFavoriteLanguages.length === 0;
  }, [targetLanguages, missingFavoriteLanguages]);

  const displayedRows = useMemo(() => {
    if (isAndroid && subtitlesLimit > 0) {
      const start = (subtitlesPage - 1) * subtitlesLimit;
      return rows.slice(start, start + subtitlesLimit);
    }
    return rows;
  }, [rows, isAndroid, subtitlesLimit, subtitlesPage]);

  useEffect(() => {
    if (isAndroid && autoFocus && !isSetupPaused && active >= 0 && subtitlesLimit > 0) {
      const targetPage = Math.floor(active / subtitlesLimit) + 1;
      if (targetPage !== subtitlesPage) {
        setSubtitlesPage(targetPage);
      }
    }
  }, [active, autoFocus, isSetupPaused, isAndroid, subtitlesLimit, subtitlesPage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4"
        data-app-hydrated={isHydrated ? "true" : undefined}
      >
        <div className="mr-auto flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-2xl">Parallel Subtitles</h1>
          <a
            href={ALL_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="header-app-version-badge"
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary hover:bg-primary/20 transition-colors"
            title="Browse All GitHub Releases & Versions"
          >
            v{APP_VERSION}
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </a>
          <span className="text-sm text-muted-foreground">
            video {videoId} · {rows.length} sections ·{" "}
            {isAndroid ? "live Android captions" : "fixture demo"}
          </span>
        </div>
        <div
          className="flex items-center gap-1 rounded-md border border-border bg-card p-1"
          aria-label="Color theme"
        >
          {(["light", "dark", "dark-blue"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={theme === option ? "default" : "ghost"}
              onClick={() => {
                themeWasSelectedRef.current = true;
                setTheme(option);
              }}
              aria-pressed={theme === option}
              title={`${option === "dark-blue" ? "Dark blue" : option === "light" ? "Light" : "Dark"} theme`}
              className="gap-1.5 capitalize"
            >
              {option === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              {option === "dark-blue" ? "Blue" : option}
            </Button>
          ))}
        </div>
        {debugMode && (
          <Button
            id="open-network-inspector-button"
            data-testid="open-network-inspector-button"
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setNetworkInspectorOpen(true)}
            className="gap-1.5"
            title="Inspect live network requests and response body preview"
          >
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Network</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {networkRequests.length}
            </span>
          </Button>
        )}
        <Button
          id="open-apk-release-button"
          data-testid="open-apk-release-button"
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setApkModalOpen(true)}
          className="gap-1.5 border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          title="Download latest APK release (mostuf2556 & mostuf25561)"
        >
          <Smartphone className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Latest APK</span>
        </Button>
      </header>

      <div className="grid items-start gap-4 p-4 md:p-6 lg:grid-cols-2">
        {panelOrder.map((panelId, panelIndex) => {
          const panel = PANELS.find((candidate) => candidate.id === panelId);
          if (!panel) return null;
          return (
            <AccordionSection
              key={panelId}
              title={panel.title}
              open={openPanels[panelId]}
              onOpenChange={(open) => setOpenPanels((current) => ({ ...current, [panelId]: open }))}
              onMoveUp={() => movePanel(panelId, -1)}
              onMoveDown={() => movePanel(panelId, 1)}
              canMoveUp={panelIndex > 0}
              canMoveDown={panelIndex < panelOrder.length - 1}
              wide={panelId === "subtitles"}
            >
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
                  <VideoInstancesSwiper
                    instances={videoInstances}
                    activeIndex={activeSwiperIndex}
                    onActiveIndexChange={setActiveSwiperIndex}
                    activePlayingId={
                      speakingLang && audioTrackMode ? `lang_${speakingLang}` : "primary"
                    }
                    videoId={videoId}
                    renderPlayerContainer={(instance) => {
                      if (instance.isPrimary) {
                        return (
                          <div className="relative h-full w-full">
                            <div ref={playerEl} className="h-full w-full" />
                            {showVideoSubtitles && speakingLang && speakingRow >= 0 && (
                              <div
                                className="pointer-events-none absolute inset-x-3 top-3 text-center"
                                aria-live="polite"
                              >
                                <p
                                  dir={RTL.has(speakingLang) ? "rtl" : "ltr"}
                                  className="inline-block max-w-[92%] rounded-md bg-foreground/90 px-3 py-2 text-base font-medium text-background shadow-lg md:text-lg"
                                >
                                  <HighlightedSubtitle
                                    text={rows[speakingRow]?.texts[speakingLang] ?? ""}
                                    progress={
                                      speechProgress?.row === speakingRow &&
                                      speechProgress.lang === speakingLang
                                        ? speechProgress
                                        : null
                                    }
                                  />
                                </p>
                              </div>
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
                  {isAndroid && (
                    <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
                      {captionStatus}
                    </p>
                  )}
                </div>
              )}

              {panelId === "playback" && (
                <div className="space-y-3">
                  {speakingLang ? (
                    <p>
                      {audioTrackMode ? "Repeating" : "Speaking"}{" "}
                      <b>{LANGS.find((l) => l.code === speakingLang)?.name ?? speakingLang}</b>…
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
                          playedTtsRecords.current.clear();
                          handledRow.current = -1;
                          setPlayedRecordsCount(0);
                        }}
                        className="text-xs text-primary hover:underline font-medium"
                        title="Reset history of spoken subtitle records so they can be spoken again"
                      >
                        Reset spoken history ({playedRecordsCount} spoken)
                      </button>
                    )}
                  </div>
                  <label className="flex flex-wrap items-center gap-2">
                    <span>For each section, play first:</span>
                    <select
                      data-testid="section-order-select"
                      value={sectionOrder}
                      onChange={(e) => {
                        const v = e.target.value as SectionOrder;
                        setSectionOrderState(v);
                        saveSectionOrder(v);
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1"
                    >
                      <option value="video-first">Video, then speech</option>
                      <option value="tts-first">Speech, then video</option>
                    </select>
                  </label>
                  <label className="flex flex-wrap items-center gap-2">
                    <span>Player:</span>
                    <select
                      data-testid="player-kind-select"
                      value={playerKind}
                      onChange={(e) => {
                        const v = e.target.value as PlayerKind;
                        setPlayerKindState(v);
                        savePlayerKind(v);
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1"
                    >
                      <option value="youtube-api">YouTube player</option>
                      <option value="iframe">Plain iframe (controlled by messages)</option>
                    </select>
                  </label>
                  {isAndroid && (
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
                  )}
                  <label className="flex items-center gap-2">
                    <input
                      id="audio-track-mode-toggle"
                      type="checkbox"
                      checked={audioTrackMode}
                      onChange={(e) => onAudioTrackModeChange(e.target.checked)}
                    />{" "}
                    Audio-track mode (repeat segment with native video audio instead of synthesized
                    TTS)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      id="auto-scroll-toggle"
                      type="checkbox"
                      checked={autoFocus}
                      onChange={(e) => onAutoFocusChange(e.target.checked)}
                    />{" "}
                    Auto-focus and scroll to current subtitle
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      id="debug-mode-toggle"
                      data-testid="debug-mode-toggle"
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => onDebugModeChange(e.target.checked)}
                    />{" "}
                    Debug mode (show network traffic inspector and diagnostics)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showVideoSubtitles}
                      onChange={(e) => setShowVideoSubtitles(e.target.checked)}
                    />{" "}
                    Show spoken subtitle over video
                  </label>
                </div>
              )}

              {panelId === "library" && (
                <VideoLibraryPanel
                  currentVideoId={videoId}
                  onSelectVideo={handleSelectLibraryVideo}
                />
              )}

              {panelId === "parser" && (
                <div className="space-y-4">
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
                            onClick={() => handleApplyPreset(preset.criteria)}
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
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Accumulative Division Criteria (Multi-Select)
                      </label>
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
                    <p className="text-xs text-muted-foreground mb-3">
                      Select multiple criteria accumulatively to divide subtitles into separated,
                      translatable sections of related sentences and cohesive context. Click
                      settings to tune inner parameters for each group.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PARSER_CRITERIA.map((crit) => {
                        const isChecked = selectedCriteria.includes(crit.id);
                        const isExpanded = expandedSettingsGroup === crit.id;
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
                                <p className="text-[11px] leading-tight text-muted-foreground mt-1">
                                  {crit.desc}
                                </p>
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
                                        Split on secondary clauses (commas, semicolons, colons)
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
                                            minWords: Math.max(1, parseInt(e.target.value) || 1),
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
                                          {criteriaSettings.punctVote.clusterToleranceMs} ms
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={200}
                                        max={1200}
                                        step={50}
                                        value={criteriaSettings.punctVote.clusterToleranceMs}
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
                                          {criteriaSettings.consensus.clusterToleranceMs} ms
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={200}
                                        max={800}
                                        step={50}
                                        value={criteriaSettings.consensus.clusterToleranceMs}
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
                                      <span className="text-[11px]">Match numbers and digits</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={criteriaSettings.anchors.matchProperNouns}
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
                                        checked={criteriaSettings.anchors.requireStrictMultiTrack}
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
                                          {(criteriaSettings.window.minSectionMs / 1000).toFixed(1)}
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
                                          {(criteriaSettings.window.maxSectionMs / 1000).toFixed(0)}
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
                    <div className="text-[11px] text-muted-foreground/80">
                      Cuts accumulate at sentence marks, breath pauses & alignment consensus
                    </div>
                  </div>
                </div>
              )}

              {panelId === "languages" && (
                <>
                  <div className="mb-4 space-y-2 border-b border-border pb-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="target-language-select" className="font-medium text-sm">
                        Favorite languages
                      </label>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {targetLanguages.length} selected
                      </span>
                    </div>
                    <select
                      id="target-language-select"
                      aria-label="Target languages"
                      suppressHydrationWarning
                      multiple
                      size={
                        isAndroid ? Math.min(SUPPORTED_LANGUAGES_CATALOG.length, 6) : LANGS.length
                      }
                      value={targetLanguages}
                      onChange={(event) => {
                        const next = Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        );
                        handleTargetLanguagesChange(next);
                      }}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      {(isAndroid ? SUPPORTED_LANGUAGES_CATALOG : LANGS).map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {isAndroid
                        ? "Select desired favorite languages to learn from all 84 supported languages. Android fetches each translation track via tlang."
                        : `Select favorite languages from available demo tracks (${LANGS.length} available). Main screen controls present only favorite languages.`}
                    </p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left font-normal">Language</th>
                        <th className="font-normal text-center">Show</th>
                        <th className="font-normal text-center">Speak</th>
                        <th
                          className="font-normal text-center"
                          title="Foreign subtitle TTS play frequency ratio"
                        >
                          TTS Ratio
                        </th>
                        <th className="font-normal text-center">Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedLangs.map((l, index) => {
                        const isSpoken = spoken.includes(l.code);
                        const ratio = ttsRatios[l.code] ?? 1;
                        return (
                          <tr key={l.code}>
                            <td className="py-1">{l.name}</td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={shown.includes(l.code)}
                                onChange={() => toggle(shown, setShown, l.code)}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={isSpoken}
                                onChange={() => toggle(spoken, setSpoken, l.code)}
                              />
                            </td>
                            <td className="text-center">
                              {isSpoken ? (
                                <span
                                  data-testid={`tts-ratio-badge-${l.code}`}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20"
                                  title={`1:${ratio} ratio (${ratio === 1 ? "All sentences" : `${Math.round(100 / ratio)}% of sentences`})`}
                                >
                                  1:{ratio}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td>
                              <div className="flex justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === 0}
                                  onClick={() => moveLanguage(l.code, -1)}
                                  title={`Move ${l.name} earlier`}
                                  aria-label={`Move ${l.name} earlier`}
                                >
                                  <ChevronUp aria-hidden="true" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === orderedLangs.length - 1}
                                  onClick={() => moveLanguage(l.code, 1)}
                                  title={`Move ${l.name} later`}
                                  aria-label={`Move ${l.name} later`}
                                >
                                  <ChevronDown aria-hidden="true" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 space-y-4 border-t border-border pt-3">
                    {orderedLangs
                      .filter((lang) => spoken.includes(lang.code))
                      .map((lang) => {
                        const languageVoices = getLanguageVoices(voices, lang.tts);
                        const ratio = ttsRatios[lang.code] ?? 1;
                        return (
                          <div
                            key={lang.code}
                            data-testid={`tts-settings-card-${lang.code}`}
                            className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-foreground">
                                {lang.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  data-testid={`tts-ratio-summary-${lang.code}`}
                                  className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-primary/10 text-primary border border-primary/20"
                                >
                                  Ratio 1:{ratio}
                                </span>
                                <span className="tabular-nums text-xs text-muted-foreground">
                                  {(rates[lang.code] ?? 1).toFixed(1)}×
                                </span>
                              </div>
                            </div>

                            {/* Foreign Subtitles TTS Playback Ratio / Language Level */}
                            <div className="space-y-2 rounded-md bg-background/80 p-2.5 border border-border/50">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground">
                                  Foreign Subtitle TTS Ratio (Comprehension Level)
                                </span>
                                <span
                                  data-testid={`tts-ratio-label-${lang.code}`}
                                  className="font-mono text-primary font-semibold text-xs"
                                >
                                  1:{ratio} (
                                  {ratio === 1
                                    ? "100% • All sentences"
                                    : `${Math.round(100 / ratio)}% of sentences`}
                                  )
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-normal">
                                Adjust video-to-TTS ratio based on your {lang.name} level. Plays
                                speech for 1 out of every {ratio} sentence{ratio > 1 ? "s" : ""} so
                                you can listen to the video with periodic speech.
                              </p>

                              {/* Quick Level Presets */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mr-1">
                                  Level:
                                </span>
                                {[
                                  {
                                    label: "Advanced (1:1)",
                                    value: 1,
                                    title: "Hear every sentence (100% - advanced)",
                                  },
                                  {
                                    label: "Proficient (1:2)",
                                    value: 2,
                                    title: "Hear 1 in 2 sentences (50%)",
                                  },
                                  {
                                    label: "Intermediate (1:4)",
                                    value: 4,
                                    title: "Hear 1 in 4 sentences (25%)",
                                  },
                                  {
                                    label: "Beginner (1:7)",
                                    value: 7,
                                    title: "Hear 1 sentence per every 7 sentences (beginner)",
                                  },
                                ].map((preset) => (
                                  <button
                                    key={preset.value}
                                    type="button"
                                    data-testid={`tts-ratio-preset-${lang.code}-${preset.value}`}
                                    onClick={() => {
                                      setTtsRatios((curr) => ({
                                        ...curr,
                                        [lang.code]: preset.value,
                                      }));
                                      saveTtsRatioPreference(lang.code, preset.value);
                                      if (videoId) {
                                        saveVideoSettings(videoId, {
                                          ttsRatios: { [lang.code]: preset.value },
                                        });
                                      }
                                    }}
                                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                                      ratio === preset.value
                                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                    }`}
                                    title={preset.title}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  aria-label={`${lang.name} TTS sentence ratio`}
                                  data-testid={`tts-ratio-slider-${lang.code}`}
                                  type="range"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={ratio}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(10, Number(e.target.value)));
                                    setTtsRatios((curr) => ({ ...curr, [lang.code]: val }));
                                    saveTtsRatioPreference(lang.code, val);
                                    if (videoId) {
                                      saveVideoSettings(videoId, {
                                        ttsRatios: { [lang.code]: val },
                                      });
                                    }
                                  }}
                                  className="w-full h-1.5 cursor-pointer accent-primary"
                                />
                                <span className="text-xs font-mono font-medium tabular-nums text-muted-foreground w-8 text-right">
                                  1:{ratio}
                                </span>
                              </div>
                            </div>

                            {/* Speech rate slider */}
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">
                                  Speech rate
                                </span>
                                <span className="tabular-nums font-mono text-muted-foreground">
                                  {(rates[lang.code] ?? 1).toFixed(1)}×
                                </span>
                              </div>
                              <input
                                aria-label={`${lang.name} speech rate`}
                                type="range"
                                min={0.6}
                                max={1.4}
                                step={0.1}
                                value={rates[lang.code] ?? 1}
                                onChange={(e) =>
                                  setRates((current) => ({
                                    ...current,
                                    [lang.code]: Number(e.target.value),
                                  }))
                                }
                                className="w-full h-1.5 cursor-pointer"
                              />
                            </div>

                            {/* Voice selector */}
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground font-medium">
                                Voice
                              </label>
                              <select
                                aria-label={`${lang.name} voice`}
                                value={voiceSelections[lang.code] ?? ""}
                                onChange={(e) =>
                                  setVoiceSelections((current) => ({
                                    ...current,
                                    [lang.code]: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                              >
                                <option value="">Device default</option>
                                {languageVoices.map((voice, voiceIndex) => (
                                  <option
                                    key={getUniqueVoiceKey(voice, voiceIndex)}
                                    value={voice.voiceURI}
                                  >
                                    {voice.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {panelId === "subtitles" &&
                (!tracks || (isAndroid && videoId !== DEMO_VIDEO && cols.length === 0) ? (
                  <p className="p-2 text-muted-foreground">
                    {isAndroid && videoId !== DEMO_VIDEO
                      ? "Waiting for subtitles… Play the video and ensure captions are enabled."
                      : "Loading subtitles…"}
                  </p>
                ) : (
                  <div className="max-h-[calc(100vh-8rem)] overflow-auto">
                    {isAndroid && rows.length > 0 && (
                      <div
                        data-testid="android-subtitles-pagination-bar"
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            Lines{" "}
                            {subtitlesLimit > 0
                              ? `${(subtitlesPage - 1) * subtitlesLimit + 1}–${Math.min(
                                  subtitlesPage * subtitlesLimit,
                                  rows.length,
                                )}`
                              : `1–${rows.length}`}{" "}
                            of {rows.length}
                          </span>
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                            First 10 lines of favorite languages
                          </span>
                          {isSubtitlesPending && (
                            <span
                              data-testid="subtitles-progressive-indicator"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse"
                            >
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              Loading subtitles smoothly…
                            </span>
                          )}
                          {allFavoritesAligned && targetLanguages.length > 0 && (
                            <span
                              data-testid="subtitles-sync-aligned"
                              className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                            >
                              <Check className="h-3 w-3" />
                              Favorites Aligned ({targetLanguages.length})
                            </span>
                          )}
                          {isAndroid && failedLangs.length > 0 && (
                            <button
                              type="button"
                              data-testid="subtitles-manual-fetch"
                              onClick={manualFetchFailed}
                              className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Fetch again ({failedLangs.join(", ")})
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor="subtitles-limit-select"
                              className="text-muted-foreground"
                            >
                              Lines per view:
                            </label>
                            <select
                              id="subtitles-limit-select"
                              value={subtitlesLimit}
                              onChange={(e) => {
                                setSubtitlesLimit(Number(e.target.value));
                                setSubtitlesPage(1);
                              }}
                              className="rounded border border-input bg-background px-2 py-1 text-xs"
                            >
                              <option value={10}>10 (Default)</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={0}>All ({rows.length})</option>
                            </select>
                          </div>
                          {subtitlesLimit > 0 && Math.ceil(rows.length / subtitlesLimit) > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={subtitlesPage <= 1}
                                onClick={() => setSubtitlesPage((p) => Math.max(1, p - 1))}
                                className="rounded border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-40"
                              >
                                Prev
                              </button>
                              <span className="px-1 tabular-nums">
                                {subtitlesPage} / {Math.ceil(rows.length / subtitlesLimit)}
                              </span>
                              <button
                                type="button"
                                disabled={subtitlesPage >= Math.ceil(rows.length / subtitlesLimit)}
                                onClick={() =>
                                  setSubtitlesPage((p) =>
                                    Math.min(Math.ceil(rows.length / subtitlesLimit), p + 1),
                                  )
                                }
                                className="rounded border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-secondary">
                        <tr>
                          <th className="w-24 px-3 py-2 text-left font-medium">Time</th>
                          {cols.map((l) => (
                            <th key={l.code} className="px-3 py-2 text-left font-medium">
                              {l.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.map((r, i) => {
                          const actualIndex =
                            isAndroid && subtitlesLimit > 0
                              ? (subtitlesPage - 1) * subtitlesLimit + i
                              : i;
                          return (
                            <SubtitleRow
                              key={actualIndex}
                              r={r}
                              actualIndex={actualIndex}
                              isActive={actualIndex === active}
                              cols={cols}
                              speechProgress={speechProgress}
                              tracks={tracks}
                              onSeek={seek}
                              spokenLangs={spoken}
                              ttsRatios={ttsRatios}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
            </AccordionSection>
          );
        })}
      </div>

      {/* Latest APK Release Footer Banner with Links for both repo owners */}
      <footer
        id="apk-releases-footer"
        data-testid="apk-releases-footer"
        className="mt-8 border-t border-border px-6 py-4 bg-muted/20 text-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-foreground">Latest Android APK Releases:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {apkReleaseLinks.map((link) => (
              <div
                key={link.owner}
                data-testid={`apk-footer-link-group-${link.owner}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 shadow-sm"
              >
                <span className="font-mono font-bold text-foreground">{link.owner}</span>
                <span className="text-muted-foreground">·</span>
                <a
                  href={link.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`apk-footer-download-${link.owner}`}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  title={`Direct APK download from ${link.owner}`}
                >
                  <Download className="h-3 w-3" />
                  <span>APK</span>
                </a>
                <span className="text-muted-foreground">·</span>
                <a
                  href={link.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`apk-footer-release-${link.owner}`}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title={`Latest GitHub release page for ${link.owner}`}
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Release</span>
                </a>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApkModalOpen(true)}
              className="text-xs h-8 px-2.5 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
              <span>All Options & CLI</span>
            </Button>
            <a
              href={ALL_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="footer-all-releases-link"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-1 py-1"
              title="Browse All GitHub Releases & Versions"
            >
              <span>All Releases (v{APP_VERSION})</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>

      {debugMode && (
        <NetworkRequestsInspector
          isOpen={networkInspectorOpen}
          onClose={() => setNetworkInspectorOpen(false)}
        />
      )}
      <ApkReleaseModal isOpen={apkModalOpen} onClose={() => setApkModalOpen(false)} />
      <SubtitleFetchToast
        onViewSubtitles={() => {
          setOpenPanels((prev) => ({ ...prev, subtitles: true }));
          const el =
            document.getElementById("subtitles-table-panel") ||
            document.getElementById("accordion-section-subtitles");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
      />
      <FloatingDraggablePauseButton
        isSetupPaused={isSetupPaused}
        onToggleSetupPause={toggleSetupPause}
      />
    </div>
  );
}

interface SubtitleRowProps {
  r: Row;
  actualIndex: number;
  isActive: boolean;
  cols: { code: string; name: string; tts: string }[];
  speechProgress: SpeechProgress;
  tracks: Record<string, Json3> | null;
  onSeek: (r: Row, index: number) => void;
  spokenLangs?: string[];
  ttsRatios?: Record<string, number>;
}

const SubtitleRow = memo(function SubtitleRow({
  r,
  actualIndex,
  isActive,
  cols,
  speechProgress,
  tracks,
  onSeek,
  spokenLangs,
  ttsRatios,
}: SubtitleRowProps) {
  return (
    <tr
      key={actualIndex}
      data-row={actualIndex}
      onClick={() => onSeek(r, actualIndex)}
      className={`cursor-pointer border-t border-border align-top ${isActive ? "bg-accent" : "hover:bg-muted"}`}
    >
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
        {fmt(r.start)}–{fmt(r.end)}
      </td>
      {cols.map((l) => {
        const isSpoken = Boolean(spokenLangs?.includes(l.code));
        const ratio = ttsRatios?.[l.code] ?? 1;
        const isEligible = isSubtitleInstanceEligibleForTTS(actualIndex, ratio);
        const isPronouncedHighlight = shouldHighlightSentenceForTTS(actualIndex, ratio, isSpoken);
        return (
          <td
            key={l.code}
            dir={RTL.has(l.code) ? "rtl" : "ltr"}
            data-testid={`subtitle-cell-${actualIndex}-${l.code}`}
            data-tts-pronounced={isPronouncedHighlight ? "true" : undefined}
            className={`px-3 py-2 leading-relaxed transition-colors ${
              isPronouncedHighlight
                ? "bg-primary/10 border-s-2 border-primary/60 dark:bg-primary/15 dark:border-primary/80"
                : ""
            }`}
          >
            {tracks && !tracks[l.code] ? (
              <span className="text-xs text-muted-foreground italic">Loading subtitles…</span>
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
                <div className="flex-1">
                  <HighlightedSubtitle
                    text={r.texts[l.code] ?? ""}
                    progress={
                      speechProgress?.row === actualIndex && speechProgress.lang === l.code
                        ? speechProgress
                        : null
                    }
                    isPronouncedHighlighted={isPronouncedHighlight}
                  />
                </div>
                {isSpoken && ratio > 1 && (
                  <span
                    data-testid={`row-${actualIndex}-tts-status-${l.code}`}
                    className={`shrink-0 inline-flex items-center px-1 py-0.2 rounded text-[9px] font-mono select-none ${
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
            )}
          </td>
        );
      })}
    </tr>
  );
});

function HighlightedSubtitle({
  text,
  progress,
  isPronouncedHighlighted,
}: {
  text: string;
  progress: Exclude<SpeechProgress, null> | null;
  isPronouncedHighlighted?: boolean;
}) {
  if (!progress) {
    if (isPronouncedHighlighted) {
      return (
        <span
          data-testid="pronounced-sentence-text"
          className="bg-primary/10 dark:bg-primary/20 px-1 py-0.5 rounded-sm"
        >
          {text}
        </span>
      );
    }
    return text;
  }
  return (
    <>
      {text.slice(0, progress.start)}
      <mark className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">
        {text.slice(progress.start, progress.end)}
      </mark>
      {text.slice(progress.end)}
    </>
  );
}

function AccordionSection({
  title,
  children,
  open,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  wide?: boolean;
}) {
  return (
    <details
      data-panel={title.toLowerCase().replace(/\s+/g, "-")}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      className={`overflow-hidden rounded-lg border border-border bg-card text-sm ${wide ? "lg:col-span-2" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 marker:hidden">
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <h2 className="mr-auto text-xs uppercase tracking-wider text-muted-foreground">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.preventDefault();
            onMoveUp();
          }}
          aria-label={`Move ${title} earlier`}
          title={`Move ${title} earlier`}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.preventDefault();
            onMoveDown();
          }}
          aria-label={`Move ${title} later`}
          title={`Move ${title} later`}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
