import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  Gauge,
  Headphones,
  Languages,
  ListChecks,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAlternativeTtsPlaying, unlockTtsAudioPlayback } from "@/lib/alternative-tts";
import { RTL } from "@/lib/subtitles";
import { normalizeLanguage } from "@/utils/onDemandTranslationManager";
import {
  getCachedWordTranslation,
  getWordTranslation,
  getWordTranslationCacheKey,
} from "@/utils/zeroKnowledgeWordManager";
import {
  archiveListeningWord,
  buildListeningLanguageOptions,
  clampListeningTtsRate,
  clearArchivedListeningWords,
  extractListeningSentences,
  extractListeningWords,
  filterArchivedListeningWords,
  LISTENING_ARCHIVED_WORDS_UPDATED_EVENT,
  LISTENING_RATE_PRESETS,
  loadArchivedListeningWords,
  loadListeningLanguagesConfig,
  loadListeningTtsRateOverride,
  loadListeningWordSortConfig,
  MAX_LISTENING_TTS_RATE,
  MIN_LISTENING_TTS_RATE,
  moveListeningLanguage,
  reconcileListeningLanguagesConfig,
  saveArchivedListeningWords,
  saveListeningLanguagesConfig,
  saveListeningTtsRateOverride,
  saveListeningWordSortConfig,
  sortListeningWords,
  splitSentenceHighlightParts,
  toggleListeningLanguageEnabled,
  unquarantineListeningWord,
  type ArchivedListeningWordEntry,
  type ListeningGameSentenceItem,
  type ListeningGameWordItem,
  type ListeningLanguageOption,
  type ListeningLanguagesConfig,
  type ListeningSortDirection,
  type ListeningWordSortBy,
  type SubtitleRowLike,
} from "@/utils/listeningGame";

export interface ListeningSpeakOptions {
  rateOverride?: number;
}

export interface ListeningGamePanelProps {
  rows: SubtitleRowLike[];
  currentSentence?: string;
  targetTranslation?: string;
  baseLanguage: string;
  baseLanguageName: string;
  targetLanguage: string;
  targetLanguageName: string;
  availableLanguages?: ListeningLanguageOption[];
  configuredRates?: Record<string, number>;
  onSpeakText?: (
    text: string,
    langCode: string,
    options?: ListeningSpeakOptions,
  ) => void | Promise<void>;
  onStopSpeaking?: () => void;
  initialWithTranslations?: boolean;
  onWithTranslationsChange?: (withTranslations: boolean) => void;
  initialMinLetters?: number;
  initialMaxWords?: number;
  onCreateSentencesWithOpenRouter?: (words: string[]) => void;
  className?: string;
}

export const ListeningGamePanel: React.FC<ListeningGamePanelProps> = ({
  rows,
  currentSentence = "",
  targetTranslation = "",
  baseLanguage,
  baseLanguageName,
  targetLanguage,
  targetLanguageName,
  availableLanguages = [],
  configuredRates,
  onSpeakText,
  onStopSpeaking,
  initialWithTranslations = true,
  onWithTranslationsChange,
  initialMinLetters = 4,
  initialMaxWords = 8,
  onCreateSentencesWithOpenRouter,
  className = "",
}) => {
  const [withTranslations, setWithTranslations] = useState<boolean>(initialWithTranslations);
  const [minLetters, setMinLetters] = useState<number>(Math.max(1, initialMinLetters));
  const [maxWords, setMaxWords] = useState<number>(Math.max(1, initialMaxWords));
  const [activeListFilter, setActiveListFilter] = useState<"both" | "words" | "sentences">("both");
  const [wordSortBy, setWordSortBy] = useState<ListeningWordSortBy>(
    () => loadListeningWordSortConfig()?.sortBy ?? "default",
  );
  const [wordSortDirection, setWordSortDirection] = useState<ListeningSortDirection>(
    () => loadListeningWordSortConfig()?.direction ?? "asc",
  );
  const [ttsRateOverride, setTtsRateOverride] = useState<number | null>(() =>
    loadListeningTtsRateOverride(),
  );
  const [lastCustomRate, setLastCustomRate] = useState<number>(
    () => loadListeningTtsRateOverride() ?? 1.0,
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<"words" | "sentences" | "both" | null>(null);
  const [playingProgress, setPlayingProgress] = useState<{
    list: "words" | "sentences" | "both";
    current: number;
    total: number;
  } | null>(null);
  const [wordTranslations, setWordTranslations] = useState<Record<string, string>>({});
  const [loadingWordKeys, setLoadingWordKeys] = useState<Record<string, boolean>>({});
  const [archivedWords, setArchivedWords] = useState<ArchivedListeningWordEntry[]>(() =>
    loadArchivedListeningWords(),
  );
  const [showArchivedPanel, setShowArchivedPanel] = useState<boolean>(false);
  const [swipeDragState, setSwipeDragState] = useState<{ itemId: string; dx: number } | null>(null);
  const swipeGestureRef = useRef<{
    itemId: string;
    word: string;
    pointerId: number;
    startX: number;
    startY: number;
    dx: number;
    swiping: boolean;
  } | null>(null);
  const playbackRunIdRef = useRef<number>(0);
  const autoAdjustedRef = useRef<boolean>(false);
  const onStopSpeakingRef = useRef(onStopSpeaking);
  onStopSpeakingRef.current = onStopSpeaking;
  const wordsListRef = useRef<HTMLDivElement | null>(null);
  const wordTranslationsRef = useRef<Record<string, string>>(wordTranslations);
  wordTranslationsRef.current = wordTranslations;
  const queuedKeysRef = useRef<Set<string>>(new Set());
  const translationQueueRef = useRef<
    Array<{ key: string; word: string; fromLang: string; toLang: string }>
  >([]);
  const activeWorkersRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const hasCustomizedLanguagesRef = useRef<boolean>(false);

  const languageOptions = useMemo(
    () =>
      buildListeningLanguageOptions({
        baseLanguage,
        baseLanguageName,
        targetLanguage,
        targetLanguageName,
        availableLanguages,
        rows,
      }),
    [baseLanguage, baseLanguageName, targetLanguage, targetLanguageName, availableLanguages, rows],
  );

  const languageOptionMap = useMemo(
    () => new Map(languageOptions.map((opt) => [opt.code, opt])),
    [languageOptions],
  );

  const [listeningLangConfig, setListeningLangConfig] = useState<ListeningLanguagesConfig>(() =>
    reconcileListeningLanguagesConfig(
      languageOptions,
      baseLanguage,
      targetLanguage,
      loadListeningLanguagesConfig(),
    ),
  );

  useEffect(() => {
    const saved = loadListeningLanguagesConfig();
    if (saved) {
      hasCustomizedLanguagesRef.current = true;
    }
    setListeningLangConfig((prev) =>
      reconcileListeningLanguagesConfig(
        languageOptions,
        baseLanguage,
        targetLanguage,
        hasCustomizedLanguagesRef.current ? prev : saved,
      ),
    );
  }, [languageOptions, baseLanguage, targetLanguage]);

  const orderedEnabledLanguages = useMemo(
    () =>
      listeningLangConfig.orderedLanguages.filter((code) =>
        listeningLangConfig.enabledLanguages.includes(code),
      ),
    [listeningLangConfig],
  );

  const effectivePlaybackLanguages = useMemo(() => {
    if (!withTranslations) {
      return baseLanguage ? [baseLanguage] : [];
    }
    return orderedEnabledLanguages.length > 0
      ? orderedEnabledLanguages
      : baseLanguage
        ? [baseLanguage]
        : [];
  }, [withTranslations, orderedEnabledLanguages, baseLanguage]);

  const enabledNonBaseLanguages = useMemo(
    () =>
      effectivePlaybackLanguages.filter(
        (code) => normalizeLanguage(code) !== normalizeLanguage(baseLanguage),
      ),
    [effectivePlaybackLanguages, baseLanguage],
  );

  const isBaseRtl = RTL.has(baseLanguage);
  const isTargetRtl = RTL.has(targetLanguage);
  const hasDifferentTargetLang = Boolean(
    baseLanguage &&
    targetLanguage &&
    normalizeLanguage(baseLanguage) !== normalizeLanguage(targetLanguage),
  );

  const handleToggleWithTranslations = useCallback(
    (next: boolean) => {
      setWithTranslations(next);
      onWithTranslationsChange?.(next);
    },
    [onWithTranslationsChange],
  );

  const updateListeningLangConfig = useCallback((next: ListeningLanguagesConfig) => {
    hasCustomizedLanguagesRef.current = true;
    setListeningLangConfig(next);
    saveListeningLanguagesConfig(next);
  }, []);

  const handleToggleListeningLanguage = useCallback(
    (code: string) => {
      const nextEnabled = toggleListeningLanguageEnabled(
        listeningLangConfig.enabledLanguages,
        code,
        listeningLangConfig.orderedLanguages,
      );
      const nextConfig: ListeningLanguagesConfig = {
        orderedLanguages: listeningLangConfig.orderedLanguages,
        enabledLanguages: nextEnabled,
      };
      updateListeningLangConfig(nextConfig);
      if (
        !withTranslations &&
        nextEnabled.includes(code) &&
        normalizeLanguage(code) !== normalizeLanguage(baseLanguage)
      ) {
        handleToggleWithTranslations(true);
      }
    },
    [
      listeningLangConfig,
      updateListeningLangConfig,
      withTranslations,
      baseLanguage,
      handleToggleWithTranslations,
    ],
  );

  const handleMoveListeningLanguage = useCallback(
    (code: string, direction: "up" | "down") => {
      const nextOrder = moveListeningLanguage(
        listeningLangConfig.orderedLanguages,
        code,
        direction,
      );
      const nextEnabledSet = new Set(listeningLangConfig.enabledLanguages);
      const nextConfig: ListeningLanguagesConfig = {
        orderedLanguages: nextOrder,
        enabledLanguages: nextOrder.filter((c) => nextEnabledSet.has(c)),
      };
      updateListeningLangConfig(nextConfig);
    },
    [listeningLangConfig, updateListeningLangConfig],
  );

  const handleResetListeningLanguages = useCallback(() => {
    hasCustomizedLanguagesRef.current = false;
    const defaultConfig = reconcileListeningLanguagesConfig(
      languageOptions,
      baseLanguage,
      targetLanguage,
      null,
    );
    setListeningLangConfig(defaultConfig);
    saveListeningLanguagesConfig(defaultConfig);
  }, [languageOptions, baseLanguage, targetLanguage]);

  const handleWordSortByChange = useCallback(
    (nextSortBy: ListeningWordSortBy) => {
      setWordSortBy(nextSortBy);
      saveListeningWordSortConfig({ sortBy: nextSortBy, direction: wordSortDirection });
    },
    [wordSortDirection],
  );

  const handleToggleWordSortDirection = useCallback(() => {
    const nextDir: ListeningSortDirection = wordSortDirection === "asc" ? "desc" : "asc";
    setWordSortDirection(nextDir);
    saveListeningWordSortConfig({ sortBy: wordSortBy, direction: nextDir });
  }, [wordSortBy, wordSortDirection]);

  const configuredBaseRate = useMemo(() => {
    const raw = configuredRates?.[baseLanguage];
    return typeof raw === "number" && Number.isFinite(raw) ? clampListeningTtsRate(raw) : 1.0;
  }, [configuredRates, baseLanguage]);

  const applyTtsRateOverride = useCallback((nextRate: number | null) => {
    if (nextRate === null) {
      setTtsRateOverride(null);
      saveListeningTtsRateOverride(null);
      return;
    }
    const clamped = clampListeningTtsRate(nextRate);
    setLastCustomRate(clamped);
    setTtsRateOverride(clamped);
    saveListeningTtsRateOverride(clamped);
  }, []);

  const handleToggleRateOverride = useCallback(() => {
    if (ttsRateOverride !== null) {
      applyTtsRateOverride(null);
    } else {
      applyTtsRateOverride(lastCustomRate || configuredBaseRate || 1.0);
    }
  }, [ttsRateOverride, applyTtsRateOverride, lastCustomRate, configuredBaseRate]);

  useEffect(() => {
    const syncArchived = () => {
      setArchivedWords(loadArchivedListeningWords());
    };
    window.addEventListener(LISTENING_ARCHIVED_WORDS_UPDATED_EVENT, syncArchived);
    window.addEventListener("storage", syncArchived);
    return () => {
      window.removeEventListener(LISTENING_ARCHIVED_WORDS_UPDATED_EVENT, syncArchived);
      window.removeEventListener("storage", syncArchived);
    };
  }, []);

  const handleArchiveWord = useCallback((word: string) => {
    setArchivedWords((prev) => {
      const next = archiveListeningWord(prev, word);
      saveArchivedListeningWords(next);
      return next;
    });
  }, []);

  const handleUnquarantineWord = useCallback((wordOrNormalized: string) => {
    setArchivedWords((prev) => {
      const next = unquarantineListeningWord(prev, wordOrNormalized);
      saveArchivedListeningWords(next);
      return next;
    });
  }, []);

  const handleUnquarantineAll = useCallback(() => {
    const next = clearArchivedListeningWords();
    setArchivedWords(next);
    saveArchivedListeningWords(next);
  }, []);

  const SWIPE_ARCHIVE_THRESHOLD_PX = 56;

  const handleWordCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: ListeningGameWordItem) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest("button, input, select, a")) return;
      swipeGestureRef.current = {
        itemId: item.id,
        word: item.word,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        swiping: false,
      };
    },
    [],
  );

  const handleWordCardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeGestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    if (!gesture.swiping) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.1) {
        swipeGestureRef.current = null;
        setSwipeDragState(null);
        return;
      }
      gesture.swiping = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture failures in synthetic test environments
      }
    }
    gesture.dx = dx;
    setSwipeDragState({ itemId: gesture.itemId, dx });
  }, []);

  const handleWordCardPointerFinish = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const gesture = swipeGestureRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      swipeGestureRef.current = null;
      setSwipeDragState(null);
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      if (!cancelled && gesture.swiping && Math.abs(gesture.dx) >= SWIPE_ARCHIVE_THRESHOLD_PX) {
        handleArchiveWord(gesture.word);
      }
    },
    [handleArchiveWord],
  );

  const allAvailableWords = useMemo(
    () =>
      extractListeningWords(rows, {
        baseLanguage,
        targetLanguage,
        minLetters: 1,
        fallbackSentence: currentSentence,
        fallbackTranslation: targetTranslation,
      }),
    [rows, baseLanguage, targetLanguage, currentSentence, targetTranslation],
  );

  const allAvailableSentences = useMemo(
    () =>
      extractListeningSentences(rows, {
        baseLanguage,
        targetLanguage,
        maxWords: 100,
        fallbackSentence: currentSentence,
        fallbackTranslation: targetTranslation,
      }),
    [rows, baseLanguage, targetLanguage, currentSentence, targetTranslation],
  );

  const rawFilteredWords = useMemo(
    () =>
      extractListeningWords(rows, {
        baseLanguage,
        targetLanguage,
        minLetters,
        fallbackSentence: currentSentence,
        fallbackTranslation: targetTranslation,
      }),
    [rows, baseLanguage, targetLanguage, minLetters, currentSentence, targetTranslation],
  );

  const filteredWords = useMemo(
    () => filterArchivedListeningWords(rawFilteredWords, archivedWords),
    [rawFilteredWords, archivedWords],
  );

  const nonArchivedAvailableWords = useMemo(
    () => filterArchivedListeningWords(allAvailableWords, archivedWords),
    [allAvailableWords, archivedWords],
  );

  const sortedWords = useMemo(
    () => sortListeningWords(filteredWords, wordSortBy, wordSortDirection, baseLanguage),
    [filteredWords, wordSortBy, wordSortDirection, baseLanguage],
  );

  const filteredSentences = useMemo(
    () =>
      extractListeningSentences(rows, {
        baseLanguage,
        targetLanguage,
        maxWords,
        fallbackSentence: currentSentence,
        fallbackTranslation: targetTranslation,
      }),
    [rows, baseLanguage, targetLanguage, maxWords, currentSentence, targetTranslation],
  );

  // Prevent landing on an empty list when subtitles contain shorter words or longer sentences
  useEffect(() => {
    if (allAvailableWords.length === 0 && allAvailableSentences.length === 0) {
      autoAdjustedRef.current = false;
      return;
    }
    if (autoAdjustedRef.current) return;

    autoAdjustedRef.current = true;
    if (rawFilteredWords.length === 0 && nonArchivedAvailableWords.length > 0) {
      const bestThreshold = Math.max(
        1,
        Math.min(minLetters, Math.max(...nonArchivedAvailableWords.map((w) => w.letterCount))),
      );
      if (bestThreshold !== minLetters) {
        setMinLetters(bestThreshold);
      }
    }
    if (filteredSentences.length === 0 && allAvailableSentences.length > 0) {
      const shortestSentenceWords = Math.min(...allAvailableSentences.map((s) => s.wordCount));
      const nextMaxWords = Math.max(maxWords, Math.min(40, shortestSentenceWords + 2));
      if (nextMaxWords !== maxWords) {
        setMaxWords(nextMaxWords);
      }
    }
  }, [
    allAvailableWords,
    allAvailableSentences,
    rawFilteredWords.length,
    nonArchivedAvailableWords,
    filteredSentences.length,
    minLetters,
    maxWords,
  ]);

  const stopSequentialPlayback = useCallback((notifyHost: boolean = true) => {
    playbackRunIdRef.current += 1;
    setIsPlayingAll(null);
    setPlayingProgress(null);
    setActiveItemId(null);
    if (notifyHost) {
      onStopSpeakingRef.current?.();
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const queuedKeys = queuedKeysRef.current;
    return () => {
      isMountedRef.current = false;
      playbackRunIdRef.current += 1;
      translationQueueRef.current = [];
      queuedKeys.clear();
      onStopSpeakingRef.current?.();
    };
  }, []);

  const pumpTranslationQueue = useCallback(() => {
    const MAX_CONCURRENT = 2;
    while (activeWorkersRef.current < MAX_CONCURRENT && translationQueueRef.current.length > 0) {
      const next = translationQueueRef.current.shift();
      if (!next) break;
      const { key, word, fromLang, toLang } = next;
      const cached =
        wordTranslationsRef.current[key] || getCachedWordTranslation(word, fromLang, toLang);
      if (cached) {
        queuedKeysRef.current.delete(key);
        if (!wordTranslationsRef.current[key] && isMountedRef.current) {
          setWordTranslations((prev) => (prev[key] ? prev : { ...prev, [key]: cached }));
        }
        continue;
      }

      activeWorkersRef.current += 1;
      if (isMountedRef.current) {
        setLoadingWordKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
      }
      void getWordTranslation(word, fromLang, toLang)
        .then((translated) => {
          if (translated && isMountedRef.current) {
            setWordTranslations((prev) =>
              prev[key] === translated ? prev : { ...prev, [key]: translated },
            );
          }
        })
        .finally(() => {
          queuedKeysRef.current.delete(key);
          activeWorkersRef.current = Math.max(0, activeWorkersRef.current - 1);
          if (isMountedRef.current) {
            setLoadingWordKeys((prev) => {
              if (!prev[key]) return prev;
              const nextMap = { ...prev };
              delete nextMap[key];
              return nextMap;
            });
            pumpTranslationQueue();
          }
        });
    }
  }, []);

  const enqueueWordTranslation = useCallback(
    (word: string, toLang: string = targetLanguage) => {
      if (!toLang || !word.trim()) return;
      if (normalizeLanguage(baseLanguage) === normalizeLanguage(toLang)) return;
      const key = getWordTranslationCacheKey(word, baseLanguage, toLang);
      if (!key) return;
      const cached =
        wordTranslationsRef.current[key] || getCachedWordTranslation(word, baseLanguage, toLang);
      if (cached) {
        if (!wordTranslationsRef.current[key] && isMountedRef.current) {
          setWordTranslations((prev) => (prev[key] ? prev : { ...prev, [key]: cached }));
        }
        return;
      }
      if (queuedKeysRef.current.has(key)) return;
      queuedKeysRef.current.add(key);
      translationQueueRef.current.push({
        key,
        word,
        fromLang: baseLanguage,
        toLang,
      });
      pumpTranslationQueue();
    },
    [baseLanguage, targetLanguage, pumpTranslationQueue],
  );

  const resolveWordTranslationNow = useCallback(
    async (word: string, toLang: string = targetLanguage): Promise<string> => {
      if (!toLang || !word.trim()) return "";
      if (normalizeLanguage(baseLanguage) === normalizeLanguage(toLang)) return word.trim();
      const key = getWordTranslationCacheKey(word, baseLanguage, toLang);
      if (!key) return "";
      const existing =
        wordTranslationsRef.current[key] || getCachedWordTranslation(word, baseLanguage, toLang);
      if (existing) {
        if (!wordTranslationsRef.current[key] && isMountedRef.current) {
          setWordTranslations((prev) => (prev[key] ? prev : { ...prev, [key]: existing }));
        }
        return existing;
      }
      if (isMountedRef.current) {
        setLoadingWordKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
      }
      try {
        const translated = await getWordTranslation(word, baseLanguage, toLang);
        if (translated && isMountedRef.current) {
          setWordTranslations((prev) =>
            prev[key] === translated ? prev : { ...prev, [key]: translated },
          );
        }
        return translated;
      } finally {
        if (isMountedRef.current) {
          setLoadingWordKeys((prev) => {
            if (!prev[key]) return prev;
            const nextMap = { ...prev };
            delete nextMap[key];
            return nextMap;
          });
        }
      }
    },
    [baseLanguage, targetLanguage],
  );

  // Hydrate cached word translations synchronously and enqueue initial visible batch
  useEffect(() => {
    translationQueueRef.current = [];
    queuedKeysRef.current.clear();
    if (sortedWords.length === 0) return;

    const targetLangsToWarm = withTranslations
      ? Array.from(
          new Set([
            ...(hasDifferentTargetLang ? [targetLanguage] : []),
            ...enabledNonBaseLanguages,
          ]),
        )
      : [];
    if (targetLangsToWarm.length === 0) return;

    const hydrated: Record<string, string> = {};
    for (const item of sortedWords) {
      for (const toLang of targetLangsToWarm) {
        const key = getWordTranslationCacheKey(item.word, baseLanguage, toLang);
        if (!key) continue;
        const cached = getCachedWordTranslation(item.word, baseLanguage, toLang);
        if (cached) {
          hydrated[key] = cached;
        }
      }
    }
    if (Object.keys(hydrated).length > 0) {
      setWordTranslations((prev) => ({ ...hydrated, ...prev }));
    }

    for (const item of sortedWords.slice(0, 14)) {
      for (const toLang of targetLangsToWarm) {
        enqueueWordTranslation(item.word, toLang);
      }
    }
  }, [
    sortedWords,
    baseLanguage,
    targetLanguage,
    hasDifferentTargetLang,
    enabledNonBaseLanguages,
    withTranslations,
    enqueueWordTranslation,
  ]);

  // Observe visible word cards as the user scrolls inside listening-words-list (e.g. down to item #73)
  useEffect(() => {
    const container = wordsListRef.current;
    const targetLangsToWarm = withTranslations
      ? Array.from(
          new Set([
            ...(hasDifferentTargetLang ? [targetLanguage] : []),
            ...enabledNonBaseLanguages,
          ]),
        )
      : [];
    if (
      !container ||
      !withTranslations ||
      targetLangsToWarm.length === 0 ||
      sortedWords.length === 0 ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const wordText = entry.target.getAttribute("data-word-item");
          if (wordText) {
            for (const toLang of targetLangsToWarm) {
              enqueueWordTranslation(wordText, toLang);
            }
          }
          observer.unobserve(entry.target);
        }
      },
      {
        root: container,
        rootMargin: "160px 0px",
        threshold: 0.01,
      },
    );

    const children = container.querySelectorAll("[data-word-item]");
    children.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [
    sortedWords,
    withTranslations,
    hasDifferentTargetLang,
    targetLanguage,
    enabledNonBaseLanguages,
    activeListFilter,
    enqueueWordTranslation,
  ]);

  const speakSingleEntry = useCallback(
    async (
      baseText: string,
      translationText: string,
      itemId: string,
      runId?: number,
      translationsByLang?: Record<string, string>,
    ) => {
      setActiveItemId(itemId);
      if (!onSpeakText) return;

      const trimmedBase = baseText.trim();
      const trimmedTrans = translationText.trim();

      let spokeCount = 0;
      for (const langCode of effectivePlaybackLanguages) {
        if (runId !== undefined && playbackRunIdRef.current !== runId) {
          return;
        }
        const isBaseLang = normalizeLanguage(langCode) === normalizeLanguage(baseLanguage);
        let textToSpeak = "";

        if (isBaseLang) {
          textToSpeak = trimmedBase;
        } else {
          const directMatch =
            translationsByLang?.[langCode] ||
            translationsByLang?.[normalizeLanguage(langCode)] ||
            (normalizeLanguage(langCode) === normalizeLanguage(targetLanguage) ? trimmedTrans : "");
          textToSpeak = directMatch ? directMatch.trim() : "";
          if (!textToSpeak && trimmedBase) {
            textToSpeak = (await resolveWordTranslationNow(trimmedBase, langCode)).trim();
          }
          if (!textToSpeak || textToSpeak.toLowerCase() === trimmedBase.toLowerCase()) {
            continue;
          }
        }

        if (!textToSpeak) continue;

        if (spokeCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 60));
          if (runId !== undefined && playbackRunIdRef.current !== runId) {
            return;
          }
        }

        try {
          await Promise.resolve(
            onSpeakText(
              textToSpeak,
              langCode,
              ttsRateOverride !== null ? { rateOverride: ttsRateOverride } : undefined,
            ),
          );
          spokeCount += 1;
        } catch (err) {
          console.warn("ListeningGamePanel speech error:", err);
        }
      }
    },
    [
      onSpeakText,
      effectivePlaybackLanguages,
      baseLanguage,
      targetLanguage,
      ttsRateOverride,
      resolveWordTranslationNow,
    ],
  );

  const speakWordEntry = useCallback(
    async (item: ListeningGameWordItem, runId?: number) => {
      setActiveItemId(item.id);
      if (!onSpeakText) return;

      const trimmedBase = item.word.trim();
      const translationPromises = new Map<string, Promise<string>>();
      if (withTranslations && trimmedBase) {
        for (const langCode of effectivePlaybackLanguages) {
          if (normalizeLanguage(langCode) !== normalizeLanguage(baseLanguage)) {
            translationPromises.set(langCode, resolveWordTranslationNow(trimmedBase, langCode));
          }
        }
      }

      let spokeCount = 0;
      for (const langCode of effectivePlaybackLanguages) {
        if (runId !== undefined && playbackRunIdRef.current !== runId) {
          return;
        }
        const isBaseLang = normalizeLanguage(langCode) === normalizeLanguage(baseLanguage);
        let textToSpeak = "";

        if (isBaseLang) {
          textToSpeak = trimmedBase;
        } else {
          const promise = translationPromises.get(langCode);
          const onDemandWordTrans = promise ? (await promise).trim() : "";
          if (runId !== undefined && playbackRunIdRef.current !== runId) {
            return;
          }
          const fallbackTargetTrans =
            normalizeLanguage(langCode) === normalizeLanguage(targetLanguage)
              ? item.sourceTranslation.trim()
              : "";
          textToSpeak = onDemandWordTrans || fallbackTargetTrans;
          if (!textToSpeak || textToSpeak.toLowerCase() === trimmedBase.toLowerCase()) {
            continue;
          }
        }

        if (!textToSpeak) continue;

        if (spokeCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 60));
          if (runId !== undefined && playbackRunIdRef.current !== runId) {
            return;
          }
        }

        try {
          await Promise.resolve(
            onSpeakText(
              textToSpeak,
              langCode,
              ttsRateOverride !== null ? { rateOverride: ttsRateOverride } : undefined,
            ),
          );
          spokeCount += 1;
        } catch (err) {
          console.warn("ListeningGamePanel word speech error:", err);
        }
      }
    },
    [
      onSpeakText,
      effectivePlaybackLanguages,
      baseLanguage,
      targetLanguage,
      withTranslations,
      ttsRateOverride,
      resolveWordTranslationNow,
    ],
  );

  const isAnyPlaybackActive = useCallback(() => {
    const nativeSpeechActive =
      typeof window !== "undefined" &&
      Boolean(window.speechSynthesis?.speaking || window.speechSynthesis?.pending);
    return (
      isPlayingAll !== null ||
      activeItemId !== null ||
      isAlternativeTtsPlaying() ||
      nativeSpeechActive
    );
  }, [isPlayingAll, activeItemId]);

  const handlePlayWord = useCallback(
    async (item: ListeningGameWordItem) => {
      unlockTtsAudioPlayback();
      const wasAlreadySpeaking = isAnyPlaybackActive();
      stopSequentialPlayback(wasAlreadySpeaking);
      const runId = playbackRunIdRef.current;
      if (wasAlreadySpeaking) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (playbackRunIdRef.current !== runId) return;
      }
      await speakWordEntry(item, runId);
      if (isMountedRef.current && playbackRunIdRef.current === runId) {
        setActiveItemId((prev) => (prev === item.id ? null : prev));
      }
    },
    [isAnyPlaybackActive, speakWordEntry, stopSequentialPlayback],
  );

  const handlePlayWordSentence = useCallback(
    async (item: ListeningGameWordItem) => {
      if (!item.sourceSentence.trim()) return;
      unlockTtsAudioPlayback();
      const wasAlreadySpeaking = isAnyPlaybackActive();
      stopSequentialPlayback(wasAlreadySpeaking);
      const runId = playbackRunIdRef.current;
      if (wasAlreadySpeaking) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (playbackRunIdRef.current !== runId) return;
      }
      const sentenceItemId = `${item.id}-sentence`;
      await speakSingleEntry(
        item.sourceSentence,
        item.sourceTranslation,
        sentenceItemId,
        runId,
        item.translationsByLang,
      );
      if (isMountedRef.current && playbackRunIdRef.current === runId) {
        setActiveItemId((prev) => (prev === sentenceItemId ? null : prev));
      }
    },
    [isAnyPlaybackActive, speakSingleEntry, stopSequentialPlayback],
  );

  const handlePlaySentence = useCallback(
    async (item: ListeningGameSentenceItem) => {
      unlockTtsAudioPlayback();
      const wasAlreadySpeaking = isAnyPlaybackActive();
      stopSequentialPlayback(wasAlreadySpeaking);
      const runId = playbackRunIdRef.current;
      if (wasAlreadySpeaking) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (playbackRunIdRef.current !== runId) return;
      }
      await speakSingleEntry(
        item.sentence,
        item.translation,
        item.id,
        runId,
        item.translationsByLang,
      );
      if (isMountedRef.current && playbackRunIdRef.current === runId) {
        setActiveItemId((prev) => (prev === item.id ? null : prev));
      }
    },
    [isAnyPlaybackActive, speakSingleEntry, stopSequentialPlayback],
  );

  const handlePlayAllWords = useCallback(async () => {
    if (isPlayingAll === "words") {
      stopSequentialPlayback(true);
      return;
    }
    if (sortedWords.length === 0) return;

    unlockTtsAudioPlayback();

    const wasAlreadySpeaking = isAnyPlaybackActive();
    if (wasAlreadySpeaking) {
      onStopSpeaking?.();
    }

    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;
    setIsPlayingAll("words");
    setPlayingProgress({ list: "words", current: 1, total: sortedWords.length });

    if (wasAlreadySpeaking) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (playbackRunIdRef.current !== runId) return;
    }

    for (let idx = 0; idx < sortedWords.length; idx++) {
      if (playbackRunIdRef.current !== runId) break;
      const item = sortedWords[idx];
      if (withTranslations && sortedWords[idx + 1]) {
        for (const toLang of enabledNonBaseLanguages) {
          enqueueWordTranslation(sortedWords[idx + 1].word, toLang);
        }
      }
      setPlayingProgress({ list: "words", current: idx + 1, total: sortedWords.length });
      await speakWordEntry(item, runId);
      if (playbackRunIdRef.current !== runId) break;
      await new Promise((resolve) => setTimeout(resolve, withTranslations ? 550 : 350));
    }

    if (playbackRunIdRef.current === runId) {
      setIsPlayingAll(null);
      setPlayingProgress(null);
      setActiveItemId(null);
    }
  }, [
    sortedWords,
    isPlayingAll,
    isAnyPlaybackActive,
    onStopSpeaking,
    speakWordEntry,
    enqueueWordTranslation,
    enabledNonBaseLanguages,
    stopSequentialPlayback,
    withTranslations,
  ]);

  const handlePlayAllSentences = useCallback(async () => {
    if (isPlayingAll === "sentences") {
      stopSequentialPlayback(true);
      return;
    }
    if (filteredSentences.length === 0) return;

    unlockTtsAudioPlayback();

    const wasAlreadySpeaking = isAnyPlaybackActive();
    if (wasAlreadySpeaking) {
      onStopSpeaking?.();
    }

    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;
    setIsPlayingAll("sentences");
    setPlayingProgress({ list: "sentences", current: 1, total: filteredSentences.length });

    if (wasAlreadySpeaking) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (playbackRunIdRef.current !== runId) return;
    }

    for (let idx = 0; idx < filteredSentences.length; idx++) {
      if (playbackRunIdRef.current !== runId) break;
      const item = filteredSentences[idx];
      setPlayingProgress({ list: "sentences", current: idx + 1, total: filteredSentences.length });
      await speakSingleEntry(
        item.sentence,
        item.translation,
        item.id,
        runId,
        item.translationsByLang,
      );
      if (playbackRunIdRef.current !== runId) break;
      await new Promise((resolve) => setTimeout(resolve, withTranslations ? 650 : 400));
    }

    if (playbackRunIdRef.current === runId) {
      setIsPlayingAll(null);
      setPlayingProgress(null);
      setActiveItemId(null);
    }
  }, [
    filteredSentences,
    isPlayingAll,
    isAnyPlaybackActive,
    onStopSpeaking,
    speakSingleEntry,
    stopSequentialPlayback,
    withTranslations,
  ]);

  const handlePlayAllBoth = useCallback(async () => {
    if (isPlayingAll === "both") {
      stopSequentialPlayback(true);
      return;
    }
    const hasWords = sortedWords.length > 0;
    const hasSentences = filteredSentences.length > 0;
    if (!hasWords && !hasSentences) return;

    unlockTtsAudioPlayback();

    const wasAlreadySpeaking = isAnyPlaybackActive();
    if (wasAlreadySpeaking) {
      onStopSpeaking?.();
    }

    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;
    setIsPlayingAll("both");
    const total = hasWords ? sortedWords.length : filteredSentences.length;
    setPlayingProgress({ list: "both", current: 1, total });

    if (wasAlreadySpeaking) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (playbackRunIdRef.current !== runId) return;
    }

    if (hasWords) {
      for (let idx = 0; idx < sortedWords.length; idx++) {
        if (playbackRunIdRef.current !== runId) break;
        const item = sortedWords[idx];
        if (withTranslations && sortedWords[idx + 1]) {
          for (const toLang of enabledNonBaseLanguages) {
            enqueueWordTranslation(sortedWords[idx + 1].word, toLang);
          }
        }
        setPlayingProgress({ list: "both", current: idx + 1, total: sortedWords.length });
        await speakWordEntry(item, runId);
        if (playbackRunIdRef.current !== runId) break;

        if (item.sourceSentence.trim()) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (playbackRunIdRef.current !== runId) break;
          await speakSingleEntry(
            item.sourceSentence,
            item.sourceTranslation,
            `${item.id}-sentence`,
            runId,
            item.translationsByLang,
          );
          if (playbackRunIdRef.current !== runId) break;
        }

        await new Promise((resolve) => setTimeout(resolve, withTranslations ? 550 : 350));
      }
    } else {
      for (let idx = 0; idx < filteredSentences.length; idx++) {
        if (playbackRunIdRef.current !== runId) break;
        const item = filteredSentences[idx];
        setPlayingProgress({ list: "both", current: idx + 1, total: filteredSentences.length });
        await speakSingleEntry(
          item.sentence,
          item.translation,
          item.id,
          runId,
          item.translationsByLang,
        );
        if (playbackRunIdRef.current !== runId) break;
        await new Promise((resolve) => setTimeout(resolve, withTranslations ? 650 : 400));
      }
    }

    if (playbackRunIdRef.current === runId) {
      setIsPlayingAll(null);
      setPlayingProgress(null);
      setActiveItemId(null);
    }
  }, [
    isPlayingAll,
    sortedWords,
    filteredSentences,
    isAnyPlaybackActive,
    onStopSpeaking,
    withTranslations,
    enabledNonBaseLanguages,
    enqueueWordTranslation,
    speakWordEntry,
    speakSingleEntry,
    stopSequentialPlayback,
  ]);

  return (
    <div data-testid="listening-game-panel" className={`space-y-4 ${className}`}>
      {/* Top Controls: Translations Mode Toggle & List View Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl border border-border/80 bg-muted/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Headphones className="h-4 w-4 text-indigo-500" />
            <span>Listening Mode:</span>
          </span>

          <div
            data-testid="listening-game-translations-toggle"
            className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs"
            role="group"
            aria-label="Listening translation mode"
          >
            <button
              type="button"
              data-testid="listening-with-translations-btn"
              aria-pressed={withTranslations}
              onClick={() => handleToggleWithTranslations(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                withTranslations
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>With Translations</span>
            </button>
            <button
              type="button"
              data-testid="listening-without-translations-btn"
              aria-pressed={!withTranslations}
              onClick={() => handleToggleWithTranslations(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                !withTranslations
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <VolumeX className="h-3.5 w-3.5" />
              <span>Without Translations</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[11px]">
            <button
              type="button"
              data-testid="listening-list-both-tab"
              aria-pressed={activeListFilter === "both"}
              onClick={() => {
                unlockTtsAudioPlayback();
                setActiveListFilter("both");
                void handlePlayAllBoth();
              }}
              title={
                isPlayingAll === "both"
                  ? "Stop listening to both words and sentences"
                  : "Show both lists and listen to both words and their sentences"
              }
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold cursor-pointer ${
                activeListFilter === "both"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isPlayingAll === "both" ? (
                <Square className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span>Both Lists</span>
            </button>
            <button
              type="button"
              data-testid="listening-list-words-tab"
              onClick={() => setActiveListFilter("words")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                activeListFilter === "words"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1. Words ({filteredWords.length})
            </button>
            <button
              type="button"
              data-testid="listening-list-sentences-tab"
              onClick={() => setActiveListFilter("sentences")}
              className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                activeListFilter === "sentences"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              2. Sentences ({filteredSentences.length})
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            variant={isPlayingAll === "both" ? "destructive" : "outline"}
            data-testid="listening-play-all-both-btn"
            disabled={sortedWords.length === 0 && filteredSentences.length === 0}
            onClick={() => {
              unlockTtsAudioPlayback();
              setActiveListFilter("both");
              void handlePlayAllBoth();
            }}
            className="h-7 px-2 text-[11px] gap-1"
            title="Listen to both words and their sentences"
          >
            {isPlayingAll === "both" ? (
              <>
                <Square className="h-3 w-3" />
                <span>
                  Stop Both
                  {playingProgress?.list === "both"
                    ? ` (${playingProgress.current}/${playingProgress.total})`
                    : ""}
                </span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span>Listen Both</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Listening Languages & Playback Order */}
      {languageOptions.length > 0 && (
        <div
          data-testid="listening-languages-order-panel"
          className="rounded-xl border border-border/80 bg-card/50 p-2.5 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Languages className="h-3.5 w-3.5 text-indigo-500" />
              <span>Listen Languages &amp; Order:</span>
              <span
                data-testid="listening-languages-active-sequence"
                className="font-mono text-[10px] text-indigo-600 dark:text-indigo-300"
              >
                {effectivePlaybackLanguages
                  .map(
                    (code, i) => `${i + 1}. ${languageOptionMap.get(code)?.name || code} (${code})`,
                  )
                  .join(" → ")}
              </span>
            </div>

            <button
              type="button"
              data-testid="listening-lang-reset-btn"
              onClick={handleResetListeningLanguages}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              title="Reset listening languages and order to default"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {listeningLangConfig.orderedLanguages.map((code, idx) => {
              const opt = languageOptionMap.get(code);
              const isEnabled = listeningLangConfig.enabledLanguages.includes(code);
              const enabledPos = orderedEnabledLanguages.indexOf(code);
              return (
                <div
                  key={code}
                  data-testid={`listening-lang-chip-${code}`}
                  className={`inline-flex items-center rounded-lg border text-[11px] transition-colors ${
                    isEnabled
                      ? "border-indigo-500/50 bg-indigo-500/10 text-foreground"
                      : "border-border/60 bg-background/50 text-muted-foreground opacity-75"
                  }`}
                >
                  <button
                    type="button"
                    data-testid={`listening-lang-move-up-${code}`}
                    aria-label={`Move ${opt?.name || code} earlier`}
                    disabled={idx === 0}
                    onClick={() => handleMoveListeningLanguage(code, "up")}
                    className="px-1.5 py-1 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-l-lg"
                    title="Move earlier in listening order"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>

                  <button
                    type="button"
                    data-testid={`listening-lang-toggle-${code}`}
                    aria-pressed={isEnabled}
                    onClick={() => handleToggleListeningLanguage(code)}
                    className="inline-flex items-center gap-1 px-1.5 py-1 font-medium cursor-pointer"
                    title={
                      isEnabled
                        ? "Click to exclude from listening"
                        : "Click to include in listening"
                    }
                  >
                    <span
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-xs border text-[9px] font-bold ${
                        isEnabled
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-muted-foreground/50 bg-transparent text-transparent"
                      }`}
                    >
                      {enabledPos >= 0 ? enabledPos + 1 : <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span>{opt?.name || code}</span>
                    <span className="font-mono text-[10px] opacity-70">({code})</span>
                  </button>

                  <button
                    type="button"
                    data-testid={`listening-lang-move-down-${code}`}
                    aria-label={`Move ${opt?.name || code} later`}
                    disabled={idx === listeningLangConfig.orderedLanguages.length - 1}
                    onClick={() => handleMoveListeningLanguage(code, "down")}
                    className="px-1.5 py-1 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-r-lg"
                    title="Move later in listening order"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TTS-Play Speed Override Bar */}
      <div
        data-testid="listening-speed-override-control"
        className="rounded-xl border border-border/80 bg-card/50 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="listening-speed-override-toggle"
            aria-pressed={ttsRateOverride !== null}
            onClick={handleToggleRateOverride}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold transition-colors cursor-pointer ${
              ttsRateOverride !== null
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-border bg-background text-foreground hover:bg-muted/60"
            }`}
            title={
              ttsRateOverride !== null
                ? "Overriding configured per-language TTS speed (click to use configured)"
                : "Using configured per-language TTS speed (click to override)"
            }
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>
              {ttsRateOverride !== null
                ? `TTS Speed Override (${ttsRateOverride.toFixed(2).replace(/\.?0+$/, "")}x)`
                : `TTS Speed: Configured (${configuredBaseRate}x)`}
            </span>
          </button>

          <div className="inline-flex items-center border border-border rounded-md bg-background">
            <button
              type="button"
              data-testid="listening-speed-dec-btn"
              aria-label="Decrease TTS speed override"
              onClick={() =>
                applyTtsRateOverride((ttsRateOverride ?? configuredBaseRate ?? 1.0) - 0.25)
              }
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              data-testid="listening-speed-input"
              aria-label="TTS speed override"
              min={MIN_LISTENING_TTS_RATE}
              max={MAX_LISTENING_TTS_RATE}
              step={0.05}
              value={ttsRateOverride ?? configuredBaseRate}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                if (!Number.isNaN(parsed)) {
                  applyTtsRateOverride(parsed);
                }
              }}
              className="w-14 text-center text-xs font-mono font-bold bg-transparent text-foreground focus:outline-hidden"
            />
            <button
              type="button"
              data-testid="listening-speed-inc-btn"
              aria-label="Increase TTS speed override"
              onClick={() =>
                applyTtsRateOverride((ttsRateOverride ?? configuredBaseRate ?? 1.0) + 0.25)
              }
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {LISTENING_RATE_PRESETS.map((preset) => {
              const isSelected =
                ttsRateOverride !== null && Math.abs(ttsRateOverride - preset) < 0.01;
              return (
                <button
                  key={preset}
                  type="button"
                  data-testid={`listening-speed-preset-${preset}`}
                  onClick={() => applyTtsRateOverride(preset)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-semibold cursor-pointer ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset}x
                </button>
              );
            })}
          </div>
        </div>

        {ttsRateOverride !== null && (
          <button
            type="button"
            data-testid="listening-speed-reset-btn"
            onClick={() => applyTtsRateOverride(null)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
            title="Revert to configured per-language TTS speed"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Use Configured</span>
          </button>
        )}
      </div>

      {/* Mode Banner */}
      <div className="text-[11px] text-muted-foreground px-1 flex flex-wrap items-center justify-between gap-2">
        <span>
          {withTranslations
            ? `Playing in order: ${effectivePlaybackLanguages
                .map((code) => languageOptionMap.get(code)?.name || code.toUpperCase())
                .join(" → ")}.`
            : `Audio-only immersion in ${baseLanguageName} (translations hidden and skipped).`}
        </span>
        {isPlayingAll && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            data-testid="listening-stop-all-btn"
            onClick={() => stopSequentialPlayback(true)}
            className="h-6 px-2 text-[11px] gap-1"
          >
            <Square className="h-3 w-3" />
            <span>
              Stop
              {playingProgress ? ` (${playingProgress.current}/${playingProgress.total})` : ""}
            </span>
          </Button>
        )}
      </div>

      {/* Dual / Single List Workspace */}
      <div
        className={`grid gap-4 ${
          activeListFilter === "both" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {/* 1. List of Subtitles' Words (Min Letters Filter) */}
        {(activeListFilter === "both" || activeListFilter === "words") && (
          <section
            data-testid="listening-words-section"
            className="rounded-xl border border-border bg-card/60 p-3.5 space-y-3 flex flex-col"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Type className="h-4 w-4 text-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  1. Subtitles&apos; Words
                </h3>
                <span
                  data-testid="listening-words-count"
                  className="rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 px-2 py-0.5 text-[10px] font-mono font-bold"
                >
                  {filteredWords.length}
                </span>
                {archivedWords.length > 0 && (
                  <button
                    type="button"
                    data-testid="listening-archived-toggle-btn"
                    aria-expanded={showArchivedPanel}
                    onClick={() => setShowArchivedPanel((prev) => !prev)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                      showArchivedPanel
                        ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                    }`}
                    title="View and unquarantine archived words"
                  >
                    <Archive className="h-3 w-3" />
                    <span>Archived ({archivedWords.length})</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px]">
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                  <select
                    data-testid="listening-words-sort-select"
                    aria-label="Sort words by"
                    value={wordSortBy}
                    onChange={(e) => handleWordSortByChange(e.target.value as ListeningWordSortBy)}
                    className="bg-transparent text-[11px] font-medium text-foreground focus:outline-hidden cursor-pointer"
                    title="Sort words list"
                  >
                    <option value="default" className="bg-popover text-popover-foreground">
                      Default order
                    </option>
                    <option value="alphabet" className="bg-popover text-popover-foreground">
                      Alphabet (A–Z)
                    </option>
                    <option value="word_size" className="bg-popover text-popover-foreground">
                      Word size (letters)
                    </option>
                    <option value="sentence_length" className="bg-popover text-popover-foreground">
                      Sentence length (words)
                    </option>
                  </select>
                  <button
                    type="button"
                    data-testid="listening-words-sort-direction-btn"
                    onClick={handleToggleWordSortDirection}
                    aria-label={wordSortDirection === "asc" ? "Sort ascending" : "Sort descending"}
                    title={
                      wordSortDirection === "asc"
                        ? "Ascending (click to reverse)"
                        : "Descending (click to reverse)"
                    }
                    className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  >
                    {wordSortDirection === "asc" ? (
                      <>
                        <ArrowUp className="h-3 w-3" />
                        <span>Asc</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3 w-3" />
                        <span>Desc</span>
                      </>
                    )}
                  </button>
                </div>

                <label
                  htmlFor="listening-min-letters-input"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Min letters:
                </label>
                <div className="inline-flex items-center border border-border rounded-md bg-background">
                  <button
                    type="button"
                    data-testid="listening-min-letters-dec"
                    aria-label="Decrease minimum letters"
                    onClick={() => setMinLetters((n) => Math.max(1, n - 1))}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    id="listening-min-letters-input"
                    data-testid="listening-min-letters-input"
                    type="number"
                    min={1}
                    max={20}
                    value={minLetters}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        setMinLetters(Math.max(1, Math.min(20, val)));
                      }
                    }}
                    className="w-10 text-center text-xs font-mono font-bold bg-transparent text-foreground focus:outline-hidden"
                  />
                  <button
                    type="button"
                    data-testid="listening-min-letters-inc"
                    aria-label="Increase minimum letters"
                    onClick={() => setMinLetters((n) => Math.min(20, n + 1))}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isPlayingAll === "words" ? "destructive" : "outline"}
                  data-testid="listening-play-all-words-btn"
                  disabled={sortedWords.length === 0}
                  onClick={() => void handlePlayAllWords()}
                  className="h-7 px-2 text-[11px] gap-1"
                >
                  {isPlayingAll === "words" ? (
                    <>
                      <Square className="h-3 w-3" />
                      <span>
                        Stop
                        {playingProgress?.list === "words"
                          ? ` (${playingProgress.current}/${playingProgress.total})`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      <span>Listen All</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground px-0.5">
              <span>
                Click Archive or swipe left / right on any word card to exclude it from the next
                game.
              </span>
            </div>

            {onCreateSentencesWithOpenRouter && (
              <div
                data-testid="listening-words-openrouter-section"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="font-medium text-foreground">
                    Create more sentences from this words list ({Math.min(sortedWords.length, 30)}w)
                    with OpenRouter
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="listening-words-openrouter-btn"
                  disabled={sortedWords.length === 0}
                  onClick={() => {
                    stopSequentialPlayback(true);
                    onCreateSentencesWithOpenRouter(sortedWords.map((w) => w.word).slice(0, 30));
                  }}
                  className="h-7 px-2.5 text-[11px] gap-1.5 border-indigo-500/40 bg-background hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 shrink-0 cursor-pointer"
                  title="Use OpenRouter to create more practice sentences from this list of words"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>OpenRouter Sentences (5x)</span>
                </Button>
              </div>
            )}

            {archivedWords.length > 0 && showArchivedPanel && (
              <div
                data-testid="listening-archived-words-panel"
                className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 text-[11px]">
                    <Archive className="h-3.5 w-3.5" />
                    <span>Quarantined / Archived Words ({archivedWords.length})</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="listening-unquarantine-all-btn"
                    onClick={handleUnquarantineAll}
                    className="h-6 px-2 text-[10px] gap-1 border-amber-500/40 hover:bg-amber-500/15"
                  >
                    <ArchiveRestore className="h-3 w-3" />
                    <span>Unquarantine All</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {archivedWords.map((entry) => (
                    <div
                      key={entry.normalized}
                      data-testid={`listening-archived-item-${entry.normalized}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-background/90 px-2 py-1 text-[11px]"
                    >
                      <span
                        dir={isBaseRtl ? "rtl" : "ltr"}
                        className="font-semibold text-foreground"
                      >
                        {entry.word}
                      </span>
                      <button
                        type="button"
                        data-testid={`listening-unquarantine-word-${entry.normalized}`}
                        data-unquarantine-word={entry.word}
                        onClick={() => handleUnquarantineWord(entry.normalized)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 cursor-pointer"
                        title={`Unquarantine "${entry.word}" back into Listening Game`}
                      >
                        <ArchiveRestore className="h-2.5 w-2.5" />
                        <span>Unquarantine</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              ref={wordsListRef}
              data-testid="listening-words-list"
              className="max-h-[26rem] overflow-y-auto space-y-2 pr-1"
            >
              {sortedWords.length === 0 ? (
                <div
                  data-testid="listening-words-empty"
                  className="text-xs text-muted-foreground py-6 text-center space-y-2"
                >
                  <p className="italic">
                    {rawFilteredWords.length > 0 && filteredWords.length === 0
                      ? `All ${rawFilteredWords.length} matching word${rawFilteredWords.length === 1 ? " is" : "s are"} currently archived.`
                      : `No subtitle words found with at least ${minLetters} letter${minLetters === 1 ? "" : "s"}.`}
                  </p>
                  {archivedWords.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="listening-empty-unquarantine-btn"
                      onClick={() => setShowArchivedPanel(true)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <ArchiveRestore className="h-3 w-3" />
                      <span>Review &amp; Unquarantine ({archivedWords.length})</span>
                    </Button>
                  )}
                  {nonArchivedAvailableWords.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="listening-autofit-words-btn"
                      onClick={() => setMinLetters(1)}
                      className="h-7 text-[11px]"
                    >
                      Show all {nonArchivedAvailableWords.length} available words (min 1 letter)
                    </Button>
                  )}
                </div>
              ) : (
                sortedWords.map((item, idx) => {
                  const sentenceItemId = `${item.id}-sentence`;
                  const isWordActive = activeItemId === item.id;
                  const isSentenceActive = activeItemId === sentenceItemId;
                  const isActive = isWordActive || isSentenceActive;
                  const dragDx = swipeDragState?.itemId === item.id ? swipeDragState.dx : 0;
                  const isSwipingArchiveReady = Math.abs(dragDx) >= SWIPE_ARCHIVE_THRESHOLD_PX;
                  const cacheKey = getWordTranslationCacheKey(
                    item.word,
                    baseLanguage,
                    targetLanguage,
                  );
                  const onDemandWordTrans = cacheKey
                    ? wordTranslations[cacheKey] ||
                      getCachedWordTranslation(item.word, baseLanguage, targetLanguage) ||
                      ""
                    : "";
                  const isTranslatingWord = Boolean(
                    cacheKey && loadingWordKeys[cacheKey] && !onDemandWordTrans,
                  );
                  const sentenceParts = item.sourceSentence
                    ? splitSentenceHighlightParts(item.sourceSentence, item.word)
                    : [];
                  return (
                    <div
                      key={item.id}
                      data-testid={`listening-word-item-${idx}`}
                      data-word-item={item.word}
                      onPointerDown={(e) => handleWordCardPointerDown(e, item)}
                      onPointerMove={handleWordCardPointerMove}
                      onPointerUp={(e) => handleWordCardPointerFinish(e, false)}
                      onPointerCancel={(e) => handleWordCardPointerFinish(e, true)}
                      style={
                        dragDx !== 0
                          ? {
                              transform: `translateX(${Math.max(-140, Math.min(140, dragDx))}px)`,
                              opacity: Math.max(0.45, 1 - Math.abs(dragDx) / 220),
                            }
                          : undefined
                      }
                      className={`rounded-lg border px-3 py-2.5 text-xs transition-colors space-y-2 touch-pan-y select-none ${
                        isSwipingArchiveReady
                          ? "border-amber-500 bg-amber-500/15"
                          : isActive
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-border/60 bg-background/70 hover:bg-muted/40"
                      }`}
                    >
                      {/* Band 1: Word + On-Demand Translations + Archive & Listen Rail */}
                      <div
                        data-testid={`listening-word-band-${idx}`}
                        className="flex items-start justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1 flex items-baseline gap-x-2.5 gap-y-1 flex-wrap pt-0.5">
                          <span
                            dir={isBaseRtl ? "rtl" : "ltr"}
                            className="font-bold text-sm text-foreground shrink-0 leading-snug"
                          >
                            {item.word}
                          </span>
                          {withTranslations && onDemandWordTrans && (
                            <span
                              dir={isTargetRtl ? "rtl" : "ltr"}
                              data-testid={`listening-word-ondemand-translation-${idx}`}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 leading-snug break-words"
                              title={`On-demand word translation (${targetLanguageName})`}
                            >
                              → {onDemandWordTrans}
                            </span>
                          )}
                          {withTranslations &&
                            enabledNonBaseLanguages
                              .filter(
                                (langCode) =>
                                  normalizeLanguage(langCode) !== normalizeLanguage(targetLanguage),
                              )
                              .map((extraLang) => {
                                const extraKey = getWordTranslationCacheKey(
                                  item.word,
                                  baseLanguage,
                                  extraLang,
                                );
                                const extraTrans = extraKey
                                  ? wordTranslations[extraKey] ||
                                    getCachedWordTranslation(item.word, baseLanguage, extraLang) ||
                                    ""
                                  : "";
                                if (!extraTrans) return null;
                                return (
                                  <span
                                    key={extraLang}
                                    dir={RTL.has(extraLang) ? "rtl" : "ltr"}
                                    data-testid={`listening-word-extra-translation-${idx}-${extraLang}`}
                                    className="text-[11px] font-medium text-sky-600 dark:text-sky-300 leading-snug break-words"
                                    title={`${languageOptionMap.get(extraLang)?.name || extraLang} translation`}
                                  >
                                    · {extraLang}: {extraTrans}
                                  </span>
                                );
                              })}
                          {withTranslations && isTranslatingWord && (
                            <span
                              data-testid={`listening-word-translating-${idx}`}
                              className="text-[10px] italic text-indigo-500/80"
                            >
                              translating…
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            data-testid={`listening-archive-word-${idx}`}
                            data-archive-word={item.word}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveWord(item.word);
                            }}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2 text-[10px] font-medium text-muted-foreground hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                            title="Archive word (or swipe left/right) — filter out from next game & quarantine"
                            aria-label={`Archive word ${item.word}`}
                          >
                            <Archive className="h-3 w-3" />
                            <span className="hidden sm:inline">Archive</span>
                          </button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isWordActive ? "default" : "outline"}
                            data-testid={`listening-play-word-${idx}`}
                            onClick={() => handlePlayWord(item)}
                            className="h-7 min-w-[5.25rem] justify-center px-2.5 text-[11px] gap-1 shrink-0 whitespace-nowrap"
                            title={
                              withTranslations
                                ? "Listen to word + on-demand translation"
                                : "Listen to word only"
                            }
                          >
                            <Volume2
                              className={`h-3.5 w-3.5 ${isWordActive ? "" : "text-indigo-500"}`}
                            />
                            <span>Listen</span>
                          </Button>
                        </div>
                      </div>

                      {/* Band 2: Derived Original Sentence + Translation + Sentence Rail */}
                      {item.sourceSentence && (
                        <div
                          data-testid={`listening-word-sentence-band-${idx}`}
                          className="flex items-start justify-between gap-2.5 border-t border-border/40 pt-2"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start gap-1.5">
                              <span
                                data-testid={`listening-word-sentence-wordcount-${idx}`}
                                className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground leading-none"
                                title={`Sentence length: ${item.sourceSentenceWordCount} words`}
                              >
                                {item.sourceSentenceWordCount}w
                              </span>
                              <p
                                dir={isBaseRtl ? "rtl" : "ltr"}
                                data-testid={`listening-word-source-sentence-${idx}`}
                                className="min-w-0 flex-1 text-[11px] leading-relaxed text-foreground/90 break-words"
                              >
                                {sentenceParts.map((part, partIdx) =>
                                  part.isMatch ? (
                                    <mark
                                      key={partIdx}
                                      className="rounded-xs bg-sky-500/15 px-0.5 font-semibold text-sky-700 dark:text-sky-300"
                                    >
                                      {part.text}
                                    </mark>
                                  ) : (
                                    <React.Fragment key={partIdx}>{part.text}</React.Fragment>
                                  ),
                                )}
                              </p>
                            </div>
                            {withTranslations && item.sourceTranslation && (
                              <p
                                dir={isTargetRtl ? "rtl" : "ltr"}
                                data-testid={`listening-word-translation-${idx}`}
                                className="text-[11px] leading-relaxed text-muted-foreground break-words pl-7"
                              >
                                {item.sourceTranslation}
                              </p>
                            )}
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={isSentenceActive ? "default" : "outline"}
                            data-testid={`listening-play-word-sentence-${idx}`}
                            onClick={() => handlePlayWordSentence(item)}
                            className="h-7 min-w-[5.25rem] justify-center px-2.5 text-[10px] gap-1 shrink-0 whitespace-nowrap"
                            title={
                              withTranslations && item.sourceTranslation
                                ? "Play original sentence + translation"
                                : "Play original sentence"
                            }
                          >
                            <Volume2
                              className={`h-3 w-3 ${isSentenceActive ? "" : "text-emerald-500"}`}
                            />
                            <span>Sentence</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* 2. List of Subtitles' Punctuation Sentences (Max X Words Filter) */}
        {(activeListFilter === "both" || activeListFilter === "sentences") && (
          <section
            data-testid="listening-sentences-section"
            className="rounded-xl border border-border bg-card/60 p-3.5 space-y-3 flex flex-col"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  2. Subtitles&apos; Sentences
                </h3>
                <span
                  data-testid="listening-sentences-count"
                  className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-mono font-bold"
                >
                  {filteredSentences.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="listening-max-words-input"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  Max words (X):
                </label>
                <div className="inline-flex items-center border border-border rounded-md bg-background">
                  <button
                    type="button"
                    data-testid="listening-max-words-dec"
                    aria-label="Decrease max words per sentence"
                    onClick={() => setMaxWords((n) => Math.max(1, n - 1))}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    id="listening-max-words-input"
                    data-testid="listening-max-words-input"
                    type="number"
                    min={1}
                    max={40}
                    value={maxWords}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) {
                        setMaxWords(Math.max(1, Math.min(40, val)));
                      }
                    }}
                    className="w-10 text-center text-xs font-mono font-bold bg-transparent text-foreground focus:outline-hidden"
                  />
                  <button
                    type="button"
                    data-testid="listening-max-words-inc"
                    aria-label="Increase max words per sentence"
                    onClick={() => setMaxWords((n) => Math.min(40, n + 1))}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={isPlayingAll === "sentences" ? "destructive" : "outline"}
                  data-testid="listening-play-all-sentences-btn"
                  disabled={filteredSentences.length === 0}
                  onClick={() => void handlePlayAllSentences()}
                  className="h-7 px-2 text-[11px] gap-1"
                >
                  {isPlayingAll === "sentences" ? (
                    <>
                      <Square className="h-3 w-3" />
                      <span>
                        Stop
                        {playingProgress?.list === "sentences"
                          ? ` (${playingProgress.current}/${playingProgress.total})`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      <span>Listen All</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div
              data-testid="listening-sentences-list"
              className="max-h-[26rem] overflow-y-auto space-y-2 pr-1"
            >
              {filteredSentences.length === 0 ? (
                <div
                  data-testid="listening-sentences-empty"
                  className="text-xs text-muted-foreground py-6 text-center space-y-2"
                >
                  <p className="italic">
                    No punctuation sentences with up to {maxWords} word
                    {maxWords === 1 ? "" : "s"}.
                  </p>
                  {allAvailableSentences.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="listening-autofit-sentences-btn"
                      onClick={() =>
                        setMaxWords(
                          Math.min(40, Math.max(...allAvailableSentences.map((s) => s.wordCount))),
                        )
                      }
                      className="h-7 text-[11px]"
                    >
                      Expand limit to show all {allAvailableSentences.length} sentences
                    </Button>
                  )}
                </div>
              ) : (
                filteredSentences.map((item, idx) => {
                  const isActive = activeItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      data-testid={`listening-sentence-item-${idx}`}
                      className={`flex items-start justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-border/60 bg-background/70 hover:bg-muted/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shrink-0">
                            {item.wordCount}w
                          </span>
                          <p
                            dir={isBaseRtl ? "rtl" : "ltr"}
                            className="font-semibold text-foreground leading-snug"
                          >
                            {item.sentence}
                          </p>
                        </div>
                        {withTranslations && item.translation && (
                          <p
                            dir={isTargetRtl ? "rtl" : "ltr"}
                            data-testid={`listening-sentence-translation-${idx}`}
                            className="text-[11px] text-indigo-600 dark:text-indigo-300 pl-7"
                          >
                            {item.translation}
                          </p>
                        )}
                        {withTranslations &&
                          enabledNonBaseLanguages
                            .filter(
                              (langCode) =>
                                normalizeLanguage(langCode) !== normalizeLanguage(targetLanguage),
                            )
                            .map((extraLang) => {
                              const extraText =
                                item.translationsByLang?.[extraLang] ||
                                item.translationsByLang?.[normalizeLanguage(extraLang)] ||
                                "";
                              if (!extraText) return null;
                              return (
                                <p
                                  key={extraLang}
                                  dir={RTL.has(extraLang) ? "rtl" : "ltr"}
                                  data-testid={`listening-sentence-extra-translation-${idx}-${extraLang}`}
                                  className="text-[11px] text-sky-600 dark:text-sky-300 pl-7"
                                >
                                  <span className="font-mono text-[10px] uppercase opacity-75 mr-1">
                                    {extraLang}:
                                  </span>
                                  {extraText}
                                </p>
                              );
                            })}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`listening-play-sentence-${idx}`}
                        onClick={() => handlePlaySentence(item)}
                        className="h-7 px-2 text-[11px] gap-1 shrink-0"
                        title={
                          withTranslations
                            ? "Listen to sentence + translation"
                            : "Listen to sentence only"
                        }
                      >
                        <Volume2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Listen</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
