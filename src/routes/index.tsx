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
  Smartphone,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  align,
  fmt,
  LANGS,
  RTL,
  STRATEGIES,
  type Json3,
  type Row,
  type Strategy,
} from "@/lib/subtitles";
import {
  buildTranslatedCaptionUrl,
  decodeInterceptedCaption,
  getCachedTrack,
  hasCachedTrack,
  nativeShell,
  parseJson3,
  parseVideoId,
  setCachedTrack,
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
} from "@/utils/appSettings";
import {
  getAudioTrackMode,
  setAudioTrackMode,
  repeatSegmentWithAudioTrack,
} from "@/utils/audioTrackManager";
import { trackNetworkRequest, useNetworkRequests } from "@/utils/networkTracker";
import { NetworkRequestsInspector } from "@/components/NetworkRequestsInspector";
import { ApkReleaseModal } from "@/components/ApkReleaseModal";
import { SubtitleFetchToast } from "@/components/SubtitleFetchToast";
import { notifySubtitleFetch } from "@/utils/subtitleNotificationManager";
import { getApkReleaseLinks } from "@/utils/apkUpdater";
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
    YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
    onNativeCaptionsInterceptedBase64?: (payload: string) => void;
    onNativeSharedLinkReceived?: (url: string) => void;
    __pendingSharedLink?: string;
  }
}

type SpeechProgress = { lang: string; row: number; start: number; end: number } | null;
type Theme = "light" | "dark" | "dark-blue";
type PanelId = "player" | "playback" | "parser" | "languages" | "subtitles";

const PANELS: { id: PanelId; title: string }[] = [
  { id: "player", title: "Video" },
  { id: "playback", title: "Playback" },
  { id: "parser", title: "Parser" },
  { id: "languages", title: "Languages" },
  { id: "subtitles", title: "Parallel subtitles" },
];

function cancelSpeech() {
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
      u.onend = u.onerror = () => {
        onProgress(null);
        res();
      };
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
  const retriesRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

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
      const vid = videoId || "current";
      const needed = langsToFetch.filter(
        (code) =>
          code &&
          (!defaultLang || code !== defaultLang) &&
          !tracksRef.current?.[code] &&
          !hasCachedTrack(vid, code),
      );

      // Hydrate any already-cached tracks without making native bridge calls
      const cachedToRestore: Record<string, Json3> = {};
      for (const code of langsToFetch) {
        if (!tracksRef.current?.[code] && hasCachedTrack(vid, code)) {
          const cached = getCachedTrack(vid, code);
          if (cached) {
            cachedToRestore[code] = cached;
            if (tracksRef.current) {
              tracksRef.current[code] = cached;
            }
          }
        }
      }
      if (Object.keys(cachedToRestore).length > 0) {
        startSubtitlesTransition(() => {
          setTracks((prev) => ({ ...prev, ...cachedToRestore }));
          setShown((prev) => Array.from(new Set([...prev, ...Object.keys(cachedToRestore)])));
        });
      }

      if (needed.length === 0) return;
      notifySubtitleFetch(
        "fetching",
        `Fetching live subtitles for added favorite language: ${needed.join(", ")}…`,
        needed[0],
      );
      const next: Record<string, Json3> = {};
      for (const code of needed) {
        const cacheKey = `${vid}:${code}`;
        if (hasCachedTrack(vid, code)) {
          const cached = getCachedTrack(vid, code);
          if (cached) {
            next[code] = cached;
            if (tracksRef.current) {
              tracksRef.current[code] = cached;
            }
            startSubtitlesTransition(() => {
              setTracks((prev) => ({ ...prev, [code]: cached }));
              setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
            });
          }
          continue;
        }

        if (inFlightRef.current.has(cacheKey)) {
          continue;
        }
        inFlightRef.current.add(cacheKey);

        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const translatedUrl = buildTranslatedCaptionUrl(activeUrl, code, "json3");
        const tracker = trackNetworkRequest(translatedUrl, "GET", "native_bridge");
        try {
          let raw = shell.fetchTranslatedCaptionsWithUrl(translatedUrl, code, "json3");
          let json = parseJson3(raw);
          if (!json && shell.fetchTranslatedCaptions) {
            raw = shell.fetchTranslatedCaptions(code, "json3");
            json = parseJson3(raw);
          }
          if (json) {
            tracker.complete(200, raw);
            setCachedTrack(vid, code, json);
            next[code] = json;
            retriesRef.current[code] = 0;
            if (tracksRef.current) {
              tracksRef.current[code] = json;
            }
            startSubtitlesTransition(() => {
              setTracks((prev) => ({ ...prev, [code]: json! }));
              setShown((prev) => (prev.includes(code) ? prev : [...prev, code]));
            });
          } else {
            tracker.fail(
              raw ? "Invalid or non-JSON3/XML caption response" : "Empty caption response",
            );
            retriesRef.current[code] = (retriesRef.current[code] || 0) + 1;
            if (retriesRef.current[code] <= 3) {
              const delay = 1000 * Math.pow(2, retriesRef.current[code] - 1);
              setTimeout(() => {
                if (!hasCachedTrack(vid, code) && !tracksRef.current?.[code]) {
                  void fetchFavoriteLanguageSubtitles([code], activeUrl);
                }
              }, delay);
            }
          }
        } catch (err) {
          tracker.fail(String(err));
          retriesRef.current[code] = (retriesRef.current[code] || 0) + 1;
          if (retriesRef.current[code] <= 3) {
            const delay = 1000 * Math.pow(2, retriesRef.current[code] - 1);
            setTimeout(() => {
              if (!hasCachedTrack(vid, code) && !tracksRef.current?.[code]) {
                void fetchFavoriteLanguageSubtitles([code], activeUrl);
              }
            }, delay);
          }
        } finally {
          inFlightRef.current.delete(cacheKey);
        }
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
    [isAndroid, videoId],
  );

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
  const [voiceSelections, setVoiceSelections] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [theme, setTheme] = useState<Theme>("light");
  const themeWasSelectedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [pauseMode, setPauseMode] = useState(true);
  const [audioTrackMode, setAudioTrackModeState] = useState(false);
  const onAudioTrackModeChange = (enabled: boolean) => {
    setAudioTrackModeState(enabled);
    setAudioTrackMode(enabled);
  };
  const [autoFocus, setAutoFocusState] = useState(false);
  const onAutoFocusChange = (enabled: boolean) => {
    setAutoFocusState(enabled);
    setAutoScrollSetting(enabled);
  };
  const [debugMode, setDebugModeState] = useState(false);
  const onDebugModeChange = (enabled: boolean) => {
    setDebugModeState(enabled);
    setDebugModeSetting(enabled);
    if (!enabled) {
      setNetworkInspectorOpen(false);
    }
  };
  const [showVideoSubtitles, setShowVideoSubtitles] = useState(true);
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => PANELS.map((panel) => panel.id));
  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
    player: true,
    playback: true,
    parser: true,
    languages: true,
    subtitles: true,
  });
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
    (
      window as Window & {
        __handleAndroidBack?: () => boolean;
        __handleInspectorBack?: () => boolean;
      }
    ).__handleAndroidBack = () => {
      if (networkInspectorOpen) {
        if (
          (window as Window & { __handleInspectorBack?: () => boolean }).__handleInspectorBack?.()
        ) {
          return true;
        }
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
          const raw = shell.fetchTranslatedCaptionsWithUrl(captured, defaultLang, "json3");
          const json = parseJson3(raw);
          if (json) {
            setTracks((prev) => ({ ...prev, [defaultLang]: json }));
            setShown((prev) => (prev.includes(defaultLang) ? prev : [defaultLang, ...prev]));
          }
        } catch (_e) {
          // ignore native bridge fetch error
        }
      }
      if (targetLanguages.length > 0) {
        void fetchFavoriteLanguageSubtitles(targetLanguages, captured);
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
        const vid = videoId || "current";
        setCachedTrack(vid, lang, json);
        if (tracksRef.current) {
          tracksRef.current[lang] = json;
        }
        startSubtitlesTransition(() => {
          setTracks((prev) => ({ ...prev, [lang]: json }));
          setShown((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
        });
      }
    };
    return () => {
      delete window.onNativeCaptionsInterceptedBase64;
    };
  }, [isAndroid, videoId, targetLanguages, fetchFavoriteLanguageSubtitles]);

  useEffect(() => {
    if (!isAndroid || !observedUrl || !defaultCaptionsLoaded) return;
    let defaultLang = "";
    try {
      defaultLang = new URL(observedUrl).searchParams.get("lang") || "";
    } catch (_e) {
      // ignore malformed URL
    }
    const vid = videoId || "current";
    const selected = [
      ...new Set(
        [...targetLanguages, ...shown, ...spoken].filter(
          (code) =>
            code &&
            (!defaultLang || code !== defaultLang) &&
            !hasCachedTrack(vid, code) &&
            !tracksRef.current?.[code],
        ),
      ),
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
    shown,
    spoken,
    videoId,
    fetchFavoriteLanguageSubtitles,
  ]);

  // Continuous synchronization between favorites view, language selection, and subtitles view with auto-fetch-retry
  useEffect(() => {
    // 1. Keep shown synchronized with targetLanguages
    const missingInShown = targetLanguages.filter((l) => !shown.includes(l));
    if (missingInShown.length > 0) {
      setShown((prev) => Array.from(new Set([...prev, ...missingInShown])));
    }

    // 2. Auto-fetch-retry for missing favorite tracks
    if (!isAndroid || !observedUrl) return;
    const vid = videoId || "current";
    const missingTracks = targetLanguages.filter(
      (code) =>
        !hasCachedTrack(vid, code) &&
        !tracksRef.current?.[code] &&
        (retriesRef.current[code] || 0) < 5,
    );
    if (missingTracks.length === 0) return;

    const retryTimer = setTimeout(() => {
      void fetchFavoriteLanguageSubtitles(missingTracks, observedUrl);
    }, 1500);

    return () => clearTimeout(retryTimer);
  }, [
    isAndroid,
    observedUrl,
    targetLanguages,
    tracks,
    shown,
    videoId,
    fetchFavoriteLanguageSubtitles,
  ]);

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
        setVoices(window.speechSynthesis.getVoices());
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
    () => (tracks && baseLanguage ? align(tracks, baseLanguage, strategy) : []),
    [tracks, baseLanguage, strategy],
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
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
  });
  st.current = {
    rows,
    spoken,
    rates,
    voiceSelections,
    pauseMode,
    orderedLangs,
    audioTrackMode,
  };

  const playerEl = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const busy = useRef(false);
  const lastRow = useRef(-1);

  useEffect(() => {
    const init = () => {
      if (!playerEl.current || !window.YT) return;
      player.current = new window.YT.Player(playerEl.current, {
        videoId,
        playerVars: {
          rel: 0,
          autoplay: isAndroid ? 1 : 0,
          cc_load_policy: isAndroid ? 1 : 0,
          playsinline: 1,
        },
      });
    };
    if (window.YT?.Player) init();
    else {
      window.onYouTubeIframeAPIReady = init;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const iv = setInterval(async () => {
      const p = player.current;
      if (!p?.getCurrentTime || busy.current) return;
      const ms = p.getCurrentTime() * 1000;
      const {
        rows,
        spoken,
        rates,
        voiceSelections,
        pauseMode,
        orderedLangs,
        audioTrackMode: isAudioTrackMode,
      } = st.current;
      const idx = rows.findIndex((r) => ms >= r.start && ms < r.end);
      setActive(idx);
      const prev = lastRow.current;
      lastRow.current = idx;
      // Crossed the end of a section while playing → pause and speak or repeat with native audio track.
      if (pauseMode && prev >= 0 && idx === prev + 1 && p.getPlayerState() === 1) {
        busy.current = true;
        p.pauseVideo();
        const langs = orderedLangs.filter((l) => spoken.includes(l.code));
        for (const l of langs) {
          setSpeakingLang(l.code);
          setSpeakingRow(prev);
          if (isAudioTrackMode) {
            await repeatSegmentWithAudioTrack({
              player: p,
              startMs: rows[prev]?.start ?? 0,
              endMs: rows[prev]?.end ?? 0,
              targetLangCode: l.code,
              checkCancelled: () => !busy.current,
              onProgress: (prog) => {
                setSpeechProgress({
                  row: prev,
                  lang: l.code,
                  start: 0,
                  end: Math.round(prog.percent ?? 0),
                });
              },
            });
          } else {
            await speak(
              rows[prev]?.texts[l.code] ?? "",
              l.tts,
              rates[l.code] ?? 1,
              voiceSelections[l.code] ?? "",
              prev,
              setSpeechProgress,
            );
          }
        }
        setSpeakingLang(null);
        setSpeakingRow(-1);
        setSpeechProgress(null);
        busy.current = false;
        p.seekTo(rows[idx]?.start ? rows[idx].start / 1000 : p.getCurrentTime(), true);
        p.playVideo();
      }
    }, 150);
    return () => {
      clearInterval(iv);
      cancelSpeech();
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId, isAndroid]);

  useEffect(() => {
    if (!autoFocus) return;
    document
      .querySelector(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, autoFocus]);

  const seek = (r: Row, i: number) => {
    cancelSpeech();
    busy.current = false;
    lastRow.current = i;
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
    if (isAndroid && autoFocus && active >= 0 && subtitlesLimit > 0) {
      const targetPage = Math.floor(active / subtitlesLimit) + 1;
      if (targetPage !== subtitlesPage) {
        setSubtitlesPage(targetPage);
      }
    }
  }, [active, autoFocus, isAndroid, subtitlesLimit, subtitlesPage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4"
        data-app-hydrated={isHydrated ? "true" : undefined}
      >
        <div className="mr-auto flex items-baseline gap-4">
          <h1 className="font-display text-2xl">Parallel Subtitles</h1>
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
                  <div className="relative aspect-video overflow-hidden bg-muted">
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
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pauseMode}
                      onChange={(e) => setPauseMode(e.target.checked)}
                    />{" "}
                    Pause &amp; speak after each section
                  </label>
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

              {panelId === "parser" && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {STRATEGIES.map((s) => (
                      <Button
                        key={s.id}
                        type="button"
                        size="sm"
                        variant={strategy === s.id ? "default" : "outline"}
                        onClick={() => setStrategy(s.id)}
                        title={s.desc}
                      >
                        {s.name}
                        {s.parallel ? " ⇄" : ""}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {STRATEGIES.find((s) => s.id === strategy)?.desc} · {rows.length} rows
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ⇄ = uses all parallel subtitles, not just one.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Timing base:{" "}
                    <span className="font-medium text-foreground">
                      {baseLanguage
                        ? getLanguageMeta(baseLanguage).name
                        : "None (waiting for captions)"}
                    </span>{" "}
                    {baseLanguage ? "(video subtitles)" : ""}
                  </p>
                </>
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
                        <th className="font-normal">Show</th>
                        <th className="font-normal">Speak</th>
                        <th className="font-normal">Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedLangs.map((l, index) => (
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
                              checked={spoken.includes(l.code)}
                              onChange={() => toggle(spoken, setSpoken, l.code)}
                            />
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
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 space-y-3 border-t border-border pt-3">
                    {orderedLangs
                      .filter((lang) => spoken.includes(lang.code))
                      .map((lang) => {
                        const languageVoices = voices.filter((voice) =>
                          voice.lang.replace("_", "-").startsWith(lang.tts.slice(0, 2)),
                        );
                        return (
                          <div key={lang.code} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{lang.name}</span>
                              <span className="tabular-nums text-muted-foreground">
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
                              className="w-full"
                            />
                            <select
                              aria-label={`${lang.name} voice`}
                              value={voiceSelections[lang.code] ?? ""}
                              onChange={(e) =>
                                setVoiceSelections((current) => ({
                                  ...current,
                                  [lang.code]: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5"
                            >
                              <option value="">Device default</option>
                              {languageVoices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                  {voice.name}
                                </option>
                              ))}
                            </select>
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
                          {missingFavoriteLanguages.length > 0 && targetLanguages.length > 0 && (
                            <span
                              data-testid="subtitles-sync-retrying"
                              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 animate-pulse"
                            >
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Auto-syncing favorites ({missingFavoriteLanguages.length})…
                            </span>
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
          </div>
        </div>
      </footer>

      {debugMode && (
        <NetworkRequestsInspector
          isOpen={networkInspectorOpen}
          onClose={() => setNetworkInspectorOpen(false)}
          isAndroid={isAndroid}
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
}

const SubtitleRow = memo(function SubtitleRow({
  r,
  actualIndex,
  isActive,
  cols,
  speechProgress,
  tracks,
  onSeek,
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
      {cols.map((l) => (
        <td
          key={l.code}
          dir={RTL.has(l.code) ? "rtl" : "ltr"}
          className="px-3 py-2 leading-relaxed"
        >
          {tracks && !tracks[l.code] ? (
            <span className="text-xs text-muted-foreground italic">Loading subtitles…</span>
          ) : (
            <HighlightedSubtitle
              text={r.texts[l.code] ?? ""}
              progress={
                speechProgress?.row === actualIndex && speechProgress.lang === l.code
                  ? speechProgress
                  : null
              }
            />
          )}
        </td>
      ))}
    </tr>
  );
});

function HighlightedSubtitle({
  text,
  progress,
}: {
  text: string;
  progress: Exclude<SpeechProgress, null> | null;
}) {
  if (!progress) return text;
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
