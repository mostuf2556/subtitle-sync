import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  SkipBack,
  SkipForward,
  Tv,
  CheckCircle2,
  Check,
  Award,
  Gamepad2,
  Flame,
  Shuffle,
  Languages,
  BookOpen,
  HelpCircle,
  Puzzle,
  Layers,
  Target,
  RefreshCw,
  Headphones,
  ArrowLeft,
  ChevronRight,
  Compass,
  FileText,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RTL } from "@/lib/subtitles";
import { CanvasBalloonGame } from "@/components/CanvasBalloonGame";
import { ListeningGamePanel, type ListeningSpeakOptions } from "@/components/ListeningGamePanel";
import { OpenRouterSentenceGamePanel } from "@/components/OpenRouterSentenceGamePanel";
import {
  extractListeningSentences,
  extractListeningWords,
  filterArchivedListeningWords,
  filterArchivedWordStrings,
  LISTENING_ARCHIVED_WORDS_UPDATED_EVENT,
  loadArchivedListeningWords,
  type ArchivedListeningWordEntry,
} from "@/utils/listeningGame";
import { extractTargetWordsToLearn } from "@/utils/openRouterSentenceGenerator";

export type LearningGameMode =
  | "sentence_builder"
  | "word_match"
  | "missing_word"
  | "word_balloons"
  | "listening_game"
  | "openrouter_sentences";

export interface WordBalloonLearningViewProps {
  /** Current base language sentence */
  currentSentence: string;
  /** Base language code (e.g. "en") */
  baseLanguage: string;
  /** Base language human name */
  baseLanguageName: string;
  /** Target translation language code (e.g. "es", "he") */
  targetLanguage: string;
  /** Target translation language human name */
  targetLanguageName: string;
  /** Translated full sentence */
  targetTranslation: string;
  /** Available languages for target translation */
  availableTargetLanguages?: Array<{ code: string; name: string }>;
  /** Callback to change target language */
  onSelectTargetLanguage?: (langCode: string) => void;
  /** Active sentence index (0-based) */
  activeRowIndex: number;
  /** Total number of sentences */
  totalRows: number;
  /** Previous sentence callback */
  onPrevSentence?: () => void;
  /** Next sentence callback */
  onNextSentence?: () => void;
  /** Replay / Restart sentence callback */
  onReplaySentence?: () => void;
  /** Configured per-language TTS speeds */
  configuredRates?: Record<string, number>;
  /** TTS speech synthesis callback */
  onSpeakText?: (
    text: string,
    langCode: string,
    options?: ListeningSpeakOptions,
  ) => void | Promise<void>;
  /** Cancel active/queued TTS speech callback */
  onStopSpeaking?: () => void;
  /** Load explicitly labelled [Fixture] sample subtitles when game has no content */
  onLoadSampleSubtitles?: () => void;
  /** Return to standard video player callback */
  onCloseLearningView?: () => void;
  /** Launch canvas balloon game on full screen callback */
  onOpenCanvasGame?: () => void;
  /** Optional shortcut to jump to Settings -> OpenRouter 1st accordion */
  onOpenOpenRouterSettings?: () => void;
  /** Full subtitle rows for multi-sentence vocabulary pooling */
  subtitleRows?: Array<{ texts?: Record<string, string>; text?: string }>;
  /** Optional initial game mode override */
  initialGameMode?: LearningGameMode;
  /** Custom wrapper styles */
  className?: string;
}

export interface WordBalloonItem {
  id: string;
  index: number;
  word: string;
  cleanWord: string;
  translation: string;
  colorScheme: BalloonColorScheme;
}

export interface BalloonColorScheme {
  name: string;
  unpunchedBg: string;
  unpunchedBorder: string;
  unpunchedText: string;
  unpunchedHover: string;
  punchedBg: string;
  punchedBorder: string;
  punchedText: string;
  accent: string;
}

const BALLOON_COLOR_PALETTES: BalloonColorScheme[] = [
  {
    name: "rose",
    unpunchedBg: "bg-rose-500/15 dark:bg-rose-500/25",
    unpunchedBorder: "border-rose-400/60 dark:border-rose-400/40",
    unpunchedText: "text-rose-700 dark:text-rose-200",
    unpunchedHover: "hover:bg-rose-500/25 dark:hover:bg-rose-500/35",
    punchedBg: "bg-rose-600 dark:bg-rose-700 text-white shadow-rose-500/30",
    punchedBorder: "border-rose-500 dark:border-rose-400",
    punchedText: "text-white",
    accent: "text-rose-600 dark:text-rose-400",
  },
  {
    name: "sky",
    unpunchedBg: "bg-sky-500/15 dark:bg-sky-500/25",
    unpunchedBorder: "border-sky-400/60 dark:border-sky-400/40",
    unpunchedText: "text-sky-700 dark:text-sky-200",
    unpunchedHover: "hover:bg-sky-500/25 dark:hover:bg-sky-500/35",
    punchedBg: "bg-sky-600 dark:bg-sky-700 text-white shadow-sky-500/30",
    punchedBorder: "border-sky-500 dark:border-sky-400",
    punchedText: "text-white",
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    name: "emerald",
    unpunchedBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    unpunchedBorder: "border-emerald-400/60 dark:border-emerald-400/40",
    unpunchedText: "text-emerald-700 dark:text-emerald-200",
    unpunchedHover: "hover:bg-emerald-500/25 dark:hover:bg-emerald-500/35",
    punchedBg: "bg-emerald-600 dark:bg-emerald-700 text-white shadow-emerald-500/30",
    punchedBorder: "border-emerald-500 dark:border-emerald-400",
    punchedText: "text-white",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "amber",
    unpunchedBg: "bg-amber-500/15 dark:bg-amber-500/25",
    unpunchedBorder: "border-amber-400/60 dark:border-amber-400/40",
    unpunchedText: "text-amber-800 dark:text-amber-200",
    unpunchedHover: "hover:bg-amber-500/25 dark:hover:bg-amber-500/35",
    punchedBg: "bg-amber-600 dark:bg-amber-700 text-white shadow-amber-500/30",
    punchedBorder: "border-amber-500 dark:border-amber-400",
    punchedText: "text-white",
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    name: "violet",
    unpunchedBg: "bg-violet-500/15 dark:bg-violet-500/25",
    unpunchedBorder: "border-violet-400/60 dark:border-violet-400/40",
    unpunchedText: "text-violet-700 dark:text-violet-200",
    unpunchedHover: "hover:bg-violet-500/25 dark:hover:bg-violet-500/35",
    punchedBg: "bg-violet-600 dark:bg-violet-700 text-white shadow-violet-500/30",
    punchedBorder: "border-violet-500 dark:border-violet-400",
    punchedText: "text-white",
    accent: "text-violet-600 dark:text-violet-400",
  },
  {
    name: "teal",
    unpunchedBg: "bg-teal-500/15 dark:bg-teal-500/25",
    unpunchedBorder: "border-teal-400/60 dark:border-teal-400/40",
    unpunchedText: "text-teal-700 dark:text-teal-200",
    unpunchedHover: "hover:bg-teal-500/25 dark:hover:bg-teal-500/35",
    punchedBg: "bg-teal-600 dark:bg-teal-700 text-white shadow-teal-500/30",
    punchedBorder: "border-teal-500 dark:border-teal-400",
    punchedText: "text-white",
    accent: "text-teal-600 dark:text-teal-400",
  },
];

/**
 * Synthesizes a pleasant punch/pop sound effect using Web Audio API
 */
function playWebAudioPopSound(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Synthesizes a bright success chime on correct answer / match
 */
function playWebAudioSuccessChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;

    // Two-tone arpeggio (E5 -> B5)
    [659.25, 987.77].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  } catch {
    // AudioContext fallback
  }
}

/**
 * Synthesizes a soft error tone on mismatch
 */
function playWebAudioErrorTone(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // AudioContext fallback
  }
}

/**
 * Tokenize a text string into word units.
 */
function extractWords(text: string): string[] {
  if (!text) return [];
  const matches = text.trim().match(/\S+/g);
  return matches ? matches : [];
}

/**
 * Cleans non-alphanumeric punctuation from a word token for dictionary/display.
 */
function sanitizeWord(rawWord: string): string {
  return rawWord.replace(
    /^[^a-zA-Z0-9\u0590-\u05FF\u0600-\u06FF]+|[^a-zA-Z0-9\u0590-\u05FF\u0600-\u06FF]+$/g,
    "",
  );
}

/**
 * Fisher-Yates array shuffle.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const WordBalloonLearningView: React.FC<WordBalloonLearningViewProps> = ({
  currentSentence,
  baseLanguage,
  baseLanguageName,
  targetLanguage,
  targetLanguageName,
  targetTranslation,
  availableTargetLanguages = [],
  onSelectTargetLanguage,
  activeRowIndex,
  totalRows,
  onPrevSentence,
  onNextSentence,
  onReplaySentence,
  configuredRates,
  onSpeakText,
  onStopSpeaking,
  onLoadSampleSubtitles,
  onCloseLearningView,
  onOpenCanvasGame,
  onOpenOpenRouterSettings,
  subtitleRows = [],
  initialGameMode,
  className = "",
}) => {
  // Resolve playable defaults even if video hasn't moved past row -1
  const fallbackRowSentence = useMemo(() => {
    if (subtitleRows.length === 0) return "";
    const row = subtitleRows[0];
    return (
      row?.texts?.[baseLanguage] ||
      row?.text ||
      (row?.texts ? Object.values(row.texts)[0] : "") ||
      ""
    ).trim();
  }, [subtitleRows, baseLanguage]);

  const fallbackRowTranslation = useMemo(() => {
    if (subtitleRows.length === 0) return "";
    const row = subtitleRows[0];
    return (row?.texts?.[targetLanguage] || "").trim();
  }, [subtitleRows, targetLanguage]);

  const effectiveSentence = currentSentence.trim() ? currentSentence : fallbackRowSentence;
  const effectiveTranslation = targetTranslation.trim()
    ? targetTranslation
    : fallbackRowTranslation;
  const effectiveTotalRows = Math.max(totalRows, subtitleRows.length);
  const effectiveRowIndex =
    effectiveTotalRows > 0
      ? activeRowIndex >= 0 && activeRowIndex < effectiveTotalRows
        ? activeRowIndex
        : 0
      : -1;

  const [archivedWords, setArchivedWords] = useState<ArchivedListeningWordEntry[]>(() =>
    loadArchivedListeningWords(),
  );

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

  const availableWordsTotal = useMemo(
    () =>
      filterArchivedListeningWords(
        extractListeningWords(subtitleRows, {
          baseLanguage,
          targetLanguage,
          minLetters: 1,
          fallbackSentence: effectiveSentence,
          fallbackTranslation: effectiveTranslation,
        }),
        archivedWords,
      ).length,
    [
      subtitleRows,
      baseLanguage,
      targetLanguage,
      effectiveSentence,
      effectiveTranslation,
      archivedWords,
    ],
  );

  const availableSentencesTotal = useMemo(
    () =>
      extractListeningSentences(subtitleRows, {
        baseLanguage,
        targetLanguage,
        maxWords: 50,
        fallbackSentence: effectiveSentence,
        fallbackTranslation: effectiveTranslation,
      }).length,
    [subtitleRows, baseLanguage, targetLanguage, effectiveSentence, effectiveTranslation],
  );

  const targetWordsForAiGame = useMemo(
    () =>
      filterArchivedWordStrings(
        extractTargetWordsToLearn(subtitleRows, {
          baseLanguage,
          targetLanguage,
          minLetters: 3,
          maxWords: 30,
          fallbackSentence: effectiveSentence,
          fallbackTranslation: effectiveTranslation,
        }).map((item) => item.word),
        archivedWords,
      ),
    [
      subtitleRows,
      baseLanguage,
      targetLanguage,
      effectiveSentence,
      effectiveTranslation,
      archivedWords,
    ],
  );

  const hasPlayableContent =
    Boolean(effectiveSentence) || availableWordsTotal > 0 || availableSentencesTotal > 0;

  // Guided Wizard / Menu stage ("menu" welcomes user cleanly; "play" shows active game)
  const [wizardStage, setWizardStage] = useState<"menu" | "play">(
    initialGameMode ? "play" : "menu",
  );
  // Game mode: Sentence Builder, Word Match, Missing Word, Word Balloons, Listening Game, or OpenRouter Sentences
  const [gameMode, setGameMode] = useState<LearningGameMode>(initialGameMode ?? "listening_game");
  const [listeningWithTranslations, setListeningWithTranslations] = useState<boolean>(true);
  const [customOpenRouterWords, setCustomOpenRouterWords] = useState<string[] | null>(null);

  useEffect(() => {
    setCustomOpenRouterWords(null);
  }, [subtitleRows, baseLanguage]);

  const effectiveAiTargetWords = useMemo(() => {
    if (customOpenRouterWords && customOpenRouterWords.length > 0) {
      return filterArchivedWordStrings(customOpenRouterWords, archivedWords);
    }
    return targetWordsForAiGame;
  }, [customOpenRouterWords, archivedWords, targetWordsForAiGame]);

  // Toggle for full screen Canvas Balloon Game mode
  const [internalShowCanvasGame, setInternalShowCanvasGame] = useState<boolean>(false);
  // Sound FX toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Gamification stats
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [completedSentencesCount, setCompletedSentencesCount] = useState<number>(0);

  const handleSelectGameMode = useCallback(
    (mode: LearningGameMode) => {
      if (
        (gameMode === "listening_game" || gameMode === "openrouter_sentences") &&
        mode !== gameMode
      ) {
        onStopSpeaking?.();
      }
      if (mode === "openrouter_sentences") {
        setCustomOpenRouterWords(null);
      }
      setGameMode(mode);
      setWizardStage("play");
    },
    [gameMode, onStopSpeaking],
  );

  const handleCreateSentencesWithOpenRouterFromWords = useCallback(
    (words: string[]) => {
      onStopSpeaking?.();
      setCustomOpenRouterWords(words.length > 0 ? words : null);
      setGameMode("openrouter_sentences");
      setWizardStage("play");
    },
    [onStopSpeaking],
  );

  const handleBackToMenu = useCallback(() => {
    onStopSpeaking?.();
    setWizardStage("menu");
  }, [onStopSpeaking]);

  // -------------------------------------------------------------
  // Mode 1: Sentence Builder State
  // -------------------------------------------------------------
  const baseWords = useMemo(() => extractWords(effectiveSentence), [effectiveSentence]);
  const translationWords = useMemo(
    () => extractWords(effectiveTranslation),
    [effectiveTranslation],
  );

  // Which language the player is unscrambling (defaults to base language or target if specified)
  const targetWordsForBuilder = useMemo(() => {
    // If target translation is available, build the base or target words
    return baseWords.map((word, idx) => ({
      id: `w-${idx}-${word}`,
      originalIndex: idx,
      word,
      cleanWord: sanitizeWord(word),
    }));
  }, [baseWords]);

  const [availableTiles, setAvailableTiles] = useState<
    Array<{ id: string; originalIndex: number; word: string; cleanWord: string }>
  >([]);
  const [placedTiles, setPlacedTiles] = useState<
    Array<{ id: string; originalIndex: number; word: string; cleanWord: string }>
  >([]);
  const [builderStatus, setBuilderStatus] = useState<"idle" | "correct" | "incorrect">("idle");

  // Reset Sentence Builder when active sentence changes
  useEffect(() => {
    if (targetWordsForBuilder.length > 0) {
      setAvailableTiles(shuffleArray(targetWordsForBuilder));
      setPlacedTiles([]);
      setBuilderStatus("idle");
    } else {
      setAvailableTiles([]);
      setPlacedTiles([]);
      setBuilderStatus("idle");
    }
  }, [targetWordsForBuilder, effectiveRowIndex]);

  const handleTileClick = useCallback(
    (tile: { id: string; originalIndex: number; word: string; cleanWord: string }) => {
      if (soundEnabled) playWebAudioPopSound();
      if (builderStatus === "correct") return;

      // Move from available to placed
      setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setPlacedTiles((prev) => {
        const next = [...prev, tile];
        // If all tiles placed, check automatically
        if (next.length === targetWordsForBuilder.length) {
          const isCorrect = next.every((t, i) => t.originalIndex === i);
          if (isCorrect) {
            if (soundEnabled) playWebAudioSuccessChime();
            setBuilderStatus("correct");
            setScore((s) => s + 50);
            setStreak((st) => st + 1);
            setCompletedSentencesCount((c) => c + 1);
            if (onSpeakText && effectiveSentence) {
              void onSpeakText(effectiveSentence, baseLanguage);
            }
          } else {
            if (soundEnabled) playWebAudioErrorTone();
            setBuilderStatus("incorrect");
            setStreak(0);
          }
        }
        return next;
      });
    },
    [
      soundEnabled,
      builderStatus,
      targetWordsForBuilder.length,
      effectiveSentence,
      baseLanguage,
      onSpeakText,
    ],
  );

  const handlePlacedTileClick = useCallback(
    (tile: { id: string; originalIndex: number; word: string; cleanWord: string }) => {
      if (builderStatus === "correct") return;
      if (soundEnabled) playWebAudioPopSound();

      // Return to available
      setPlacedTiles((prev) => prev.filter((t) => t.id !== tile.id));
      setAvailableTiles((prev) => [...prev, tile]);
      setBuilderStatus("idle");
    },
    [builderStatus, soundEnabled],
  );

  const handleGiveHint = useCallback(() => {
    if (builderStatus === "correct") return;
    const nextExpectedIndex = placedTiles.length;
    if (nextExpectedIndex >= targetWordsForBuilder.length) return;

    const neededTile = targetWordsForBuilder[nextExpectedIndex];
    if (!neededTile) return;

    if (soundEnabled) playWebAudioPopSound();
    setAvailableTiles((prev) => prev.filter((t) => t.id !== neededTile.id));
    setPlacedTiles((prev) => {
      const next = [...prev, neededTile];
      if (next.length === targetWordsForBuilder.length) {
        setBuilderStatus("correct");
        setScore((s) => s + 25);
        if (soundEnabled) playWebAudioSuccessChime();
      }
      return next;
    });
  }, [builderStatus, placedTiles.length, targetWordsForBuilder, soundEnabled]);

  const handleResetBuilder = useCallback(() => {
    setAvailableTiles(shuffleArray(targetWordsForBuilder));
    setPlacedTiles([]);
    setBuilderStatus("idle");
  }, [targetWordsForBuilder]);

  // -------------------------------------------------------------
  // Mode 2: Word Match State (Vocabulary Pairs)
  // -------------------------------------------------------------
  const matchPairs = useMemo(() => {
    if (baseWords.length === 0) return [];
    const minLen = Math.min(baseWords.length, translationWords.length, 6);
    const pairs: Array<{ id: string; base: string; target: string }> = [];

    for (let i = 0; i < minLen; i++) {
      const b = sanitizeWord(baseWords[i]);
      const t = sanitizeWord(translationWords[i] || "");
      if (b && t && b.length > 1) {
        pairs.push({ id: `pair-${i}`, base: b, target: t });
      }
    }
    return pairs;
  }, [baseWords, translationWords]);

  const [selectedBaseWord, setSelectedBaseWord] = useState<string | null>(null);
  const [selectedTargetWord, setSelectedTargetWord] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());

  // Shuffled target choices for word matching
  const shuffledTargetPairs = useMemo(() => {
    return shuffleArray(matchPairs);
  }, [matchPairs]);

  useEffect(() => {
    setSelectedBaseWord(null);
    setSelectedTargetWord(null);
    setMatchedPairIds(new Set());
  }, [effectiveRowIndex, effectiveSentence]);

  const handleBaseWordSelect = (word: string) => {
    if (soundEnabled) playWebAudioPopSound();
    setSelectedBaseWord(word);
    if (onSpeakText) void onSpeakText(word, baseLanguage);

    if (selectedTargetWord) {
      checkMatch(word, selectedTargetWord);
    }
  };

  const handleTargetWordSelect = (word: string) => {
    if (soundEnabled) playWebAudioPopSound();
    setSelectedTargetWord(word);
    if (onSpeakText) void onSpeakText(word, targetLanguage);

    if (selectedBaseWord) {
      checkMatch(selectedBaseWord, word);
    }
  };

  const checkMatch = (baseW: string, targetW: string) => {
    const matchingPair = matchPairs.find(
      (p) =>
        p.base.toLowerCase() === baseW.toLowerCase() &&
        p.target.toLowerCase() === targetW.toLowerCase(),
    );

    if (matchingPair) {
      if (soundEnabled) playWebAudioSuccessChime();
      setMatchedPairIds((prev) => new Set([...prev, matchingPair.id]));
      setScore((s) => s + 20);
      setStreak((st) => st + 1);
    } else {
      if (soundEnabled) playWebAudioErrorTone();
      setStreak(0);
    }
    setSelectedBaseWord(null);
    setSelectedTargetWord(null);
  };

  // -------------------------------------------------------------
  // Mode 3: Missing Word State (Fill in the blank)
  // -------------------------------------------------------------
  const missingWordIndex = useMemo(() => {
    if (baseWords.length <= 1) return 0;
    // Choose the longest word in the sentence as the blank target
    let longestIdx = 0;
    let maxLen = 0;
    baseWords.forEach((w, idx) => {
      const clean = sanitizeWord(w);
      if (clean.length > maxLen) {
        maxLen = clean.length;
        longestIdx = idx;
      }
    });
    return longestIdx;
  }, [baseWords]);

  const missingWordOptions = useMemo(() => {
    if (baseWords.length === 0) return [];
    const correctWord = baseWords[missingWordIndex];
    const correctClean = sanitizeWord(correctWord);

    // Collect distractors from subtitle vocabulary or fallback catalog
    const distractorPool = new Set<string>();
    subtitleRows.forEach((r) => {
      const candidateText = r.text || r.texts?.[baseLanguage] || "";
      if (candidateText) {
        extractWords(candidateText).forEach((w) => {
          const c = sanitizeWord(w);
          if (c && c.toLowerCase() !== correctClean.toLowerCase() && c.length > 2) {
            distractorPool.add(c);
          }
        });
      }
    });

    const fallbackDistractors = [
      "learning",
      "practice",
      "adventure",
      "subtitles",
      "knowledge",
      "together",
      "explore",
    ];
    fallbackDistractors.forEach((d) => distractorPool.add(d));

    const distractors = shuffleArray(Array.from(distractorPool))
      .filter((w) => w.toLowerCase() !== correctClean.toLowerCase())
      .slice(0, 3);

    return shuffleArray([correctWord, ...distractors]);
  }, [baseWords, missingWordIndex, subtitleRows, baseLanguage]);

  const [selectedMissingOption, setSelectedMissingOption] = useState<string | null>(null);
  const [missingWordFeedback, setMissingWordFeedback] = useState<"idle" | "correct" | "incorrect">(
    "idle",
  );

  useEffect(() => {
    setSelectedMissingOption(null);
    setMissingWordFeedback("idle");
  }, [effectiveRowIndex, effectiveSentence]);

  const handleSelectMissingWord = (option: string) => {
    setSelectedMissingOption(option);
    const correctWord = baseWords[missingWordIndex];
    const isCorrect =
      sanitizeWord(option).toLowerCase() === sanitizeWord(correctWord).toLowerCase();

    if (isCorrect) {
      if (soundEnabled) playWebAudioSuccessChime();
      setMissingWordFeedback("correct");
      setScore((s) => s + 35);
      setStreak((st) => st + 1);
      if (onSpeakText && effectiveSentence) {
        void onSpeakText(effectiveSentence, baseLanguage);
      }
    } else {
      if (soundEnabled) playWebAudioErrorTone();
      setMissingWordFeedback("incorrect");
      setStreak(0);
    }
  };

  // -------------------------------------------------------------
  // Mode 4: Word Balloons State (Backwards Compatibility & Discovery)
  // -------------------------------------------------------------
  const [punchedIndices, setPunchedIndices] = useState<Set<number>>(new Set());
  const [justPunchedIndex, setJustPunchedIndex] = useState<number | null>(null);

  useEffect(() => {
    setPunchedIndices(new Set());
    setJustPunchedIndex(null);
  }, [effectiveRowIndex, effectiveSentence]);

  const balloons = useMemo<WordBalloonItem[]>(() => {
    if (baseWords.length === 0) return [];
    return baseWords.map((word, index) => {
      const cleanWord = sanitizeWord(word);
      const colorScheme = BALLOON_COLOR_PALETTES[index % BALLOON_COLOR_PALETTES.length];

      let wordTranslation = "";
      if (translationWords.length > 0) {
        if (baseWords.length === translationWords.length) {
          wordTranslation = translationWords[index];
        } else {
          const targetIndex = Math.min(
            translationWords.length - 1,
            Math.floor((index / baseWords.length) * translationWords.length),
          );
          wordTranslation = translationWords[targetIndex];
        }
      }

      if (!wordTranslation) {
        wordTranslation = `[${cleanWord || word}]`;
      }

      return {
        id: `balloon-${index}-${cleanWord}`,
        index,
        word,
        cleanWord,
        translation: sanitizeWord(wordTranslation) || wordTranslation,
        colorScheme,
      };
    });
  }, [baseWords, translationWords]);

  const handlePunchBalloon = useCallback(
    (index: number, balloon: WordBalloonItem) => {
      if (soundEnabled) playWebAudioPopSound();

      setPunchedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          if (onSpeakText && balloon.translation) {
            onSpeakText(balloon.translation, targetLanguage);
          }
        } else {
          next.add(index);
          setJustPunchedIndex(index);
          setTimeout(() => setJustPunchedIndex(null), 600);
          setScore((s) => s + 5);
          if (onSpeakText && balloon.translation) {
            onSpeakText(balloon.translation, targetLanguage);
          }
        }
        return next;
      });
    },
    [soundEnabled, onSpeakText, targetLanguage],
  );

  const handlePunchAll = useCallback(() => {
    if (soundEnabled) playWebAudioPopSound();
    const allIndices = new Set(balloons.map((_, i) => i));
    setPunchedIndices(allIndices);
  }, [balloons, soundEnabled]);

  const handleResetBalloons = useCallback(() => {
    setPunchedIndices(new Set());
    setJustPunchedIndex(null);
  }, []);

  const totalBalloons = balloons.length;
  const punchedCount = punchedIndices.size;
  const progressRatio = totalBalloons > 0 ? punchedCount / totalBalloons : 0;
  const isAllPunched = totalBalloons > 0 && punchedCount === totalBalloons;

  const isBaseRtl = RTL.has(baseLanguage);
  const isTargetRtl = RTL.has(targetLanguage);

  if (internalShowCanvasGame && hasPlayableContent) {
    return (
      <CanvasBalloonGame
        currentSentence={effectiveSentence}
        baseLanguage={baseLanguage}
        baseLanguageName={baseLanguageName}
        targetLanguage={targetLanguage}
        targetLanguageName={targetLanguageName}
        targetTranslation={effectiveTranslation}
        availableTargetLanguages={availableTargetLanguages}
        onSelectTargetLanguage={onSelectTargetLanguage}
        activeRowIndex={effectiveRowIndex}
        totalRows={effectiveTotalRows}
        onPrevSentence={onPrevSentence}
        onNextSentence={onNextSentence}
        onReplaySentence={onReplaySentence}
        onSpeakText={onSpeakText}
        onCloseGame={() => setInternalShowCanvasGame(false)}
        initialFullScreen={true}
        className={className}
      />
    );
  }

  return (
    <div
      data-testid="word-balloon-learning-view"
      id="word-balloon-learning-view"
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-indigo-500/30 bg-card p-4 sm:p-6 text-foreground shadow-xl transition-all ${className}`}
      style={{ minHeight: "480px" }}
    >
      {/* 1. Header Toolbar: Title, Game Mode Switcher, Score & Stats */}
      <div className="flex flex-col gap-3 border-b border-border/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Game Title & Sentence Index */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
              <span>Subtitles Sentence &amp; Word Game</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                data-testid="balloon-sentence-counter"
                className="font-semibold text-foreground"
              >
                {effectiveRowIndex >= 0
                  ? `Sentence ${effectiveRowIndex + 1} of ${effectiveTotalRows}`
                  : "No subtitles loaded"}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium">
                {baseLanguageName} → {targetLanguageName}
              </span>
            </div>
          </div>

          {/* Gamification Bar: Score, Streak, Sound Toggle, Full Screen & Back to Video */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Score & Streak Counters */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-semibold">
              <span data-testid="game-xp-score" className="text-indigo-600 dark:text-indigo-400">
                {score} XP
              </span>
              {streak > 1 && (
                <>
                  <span aria-hidden="true" className="text-muted-foreground">
                    ·
                  </span>
                  <span
                    data-testid="game-streak-counter"
                    className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold"
                  >
                    <Flame className="h-3.5 w-3.5 fill-current" />
                    {streak} Streak
                  </span>
                </>
              )}
            </div>

            {/* Target Language Selector */}
            {availableTargetLanguages.length > 1 && onSelectTargetLanguage && (
              <div className="flex items-center gap-1 bg-card border border-border/80 px-2 py-1 rounded-md text-xs">
                <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  data-testid="balloon-target-lang-select"
                  aria-label="Select Target Language"
                  value={targetLanguage}
                  onChange={(e) => onSelectTargetLanguage(e.target.value)}
                  className="bg-transparent font-medium text-xs text-foreground focus:outline-hidden cursor-pointer"
                  title="Select target language for learning"
                >
                  {Array.from(
                    new Map(availableTargetLanguages.map((lang) => [lang.code, lang])).values(),
                  ).map((lang, idx) => (
                    <option
                      key={`${lang.code}-${idx}`}
                      value={lang.code}
                      className="bg-popover text-popover-foreground"
                    >
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sound Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="balloon-sound-toggle"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`h-7 px-2 text-xs gap-1 border-border ${
                soundEnabled ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
              }`}
              title={soundEnabled ? "Mute game sounds" : "Enable game sounds"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </Button>

            {/* Canvas Game Full Screen */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="balloon-play-canvas-game-btn"
              disabled={!hasPlayableContent}
              onClick={() => {
                if (!hasPlayableContent) return;
                if (onOpenCanvasGame) {
                  onOpenCanvasGame();
                } else {
                  setInternalShowCanvasGame(true);
                }
              }}
              className="h-7 px-2.5 text-xs gap-1.5 border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold"
              title="Play Canvas Balloon Game on full screen (without video)"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Full Screen Game</span>
            </Button>

            {/* Return to Video Button */}
            {onCloseLearningView && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="balloon-back-to-video-btn"
                onClick={() => {
                  onStopSpeaking?.();
                  onCloseLearningView();
                }}
                className="h-7 px-2.5 text-xs gap-1.5 border-border bg-card hover:bg-muted text-foreground"
                title="Return to video player"
              >
                <Tv className="h-3.5 w-3.5" />
                <span>Back to Video</span>
              </Button>
            )}
          </div>
        </div>

        {/* Game Mode Segmented Selector (hidden on empty content guard) */}
        {hasPlayableContent && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg">
            {wizardStage === "play" && (
              <button
                type="button"
                data-testid="game-back-to-menu-btn"
                onClick={handleBackToMenu}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-border bg-card text-foreground hover:bg-muted transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Menu</span>
              </button>
            )}

            <button
              type="button"
              data-testid="game-mode-sentence-builder"
              onClick={() => handleSelectGameMode("sentence_builder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "sentence_builder"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Puzzle className="h-3.5 w-3.5" />
              <span>Sentence Builder</span>
            </button>

            <button
              type="button"
              data-testid="game-mode-word-match"
              onClick={() => handleSelectGameMode("word_match")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "word_match"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Word Match</span>
            </button>

            <button
              type="button"
              data-testid="game-mode-missing-word"
              onClick={() => handleSelectGameMode("missing_word")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "missing_word"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Missing Word</span>
            </button>

            <button
              type="button"
              data-testid="game-mode-word-balloons"
              onClick={() => handleSelectGameMode("word_balloons")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "word_balloons"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Word Balloons</span>
            </button>

            <button
              type="button"
              data-testid="game-mode-listening-game"
              onClick={() => handleSelectGameMode("listening_game")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "listening_game"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>Listening Game</span>
            </button>

            <button
              type="button"
              data-testid="game-mode-openrouter-sentences"
              onClick={() => handleSelectGameMode("openrouter_sentences")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                wizardStage === "play" && gameMode === "openrouter_sentences"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>AI Sentences (5x)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Empty-Content Guard Wizard (Never present an empty game without subtitles) */}
      {!hasPlayableContent ? (
        <div
          data-testid="game-empty-content-wizard"
          className="my-auto py-8 px-4 flex flex-col items-center text-center max-w-xl mx-auto space-y-5"
        >
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              Subtitles Required Before Starting the Game
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every game mode uses real words and sentences from your active video&apos;s subtitles.
              No subtitles are loaded right now, so let&apos;s load content in 1 click first:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                Option 1 · Instant Practice
              </div>
              <p className="text-xs text-muted-foreground">
                Load approved multi-language sample subtitles for demo video{" "}
                <code className="font-mono font-semibold text-foreground">L2Ryrr6txwA</code>.
              </p>
              {onLoadSampleSubtitles && (
                <Button
                  type="button"
                  size="sm"
                  data-testid="game-load-sample-fixture-btn"
                  onClick={onLoadSampleSubtitles}
                  className="w-full h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>[Fixture] Load Sample Subtitles (L2Ryrr6txwA)</span>
                </Button>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Option 2 · Any YouTube Video
              </div>
              <p className="text-xs text-muted-foreground">
                Return to the video player and enable or fetch captions for your chosen video.
              </p>
              {onCloseLearningView && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="game-empty-back-to-video-btn"
                  onClick={onCloseLearningView}
                  className="w-full h-8 text-xs gap-1.5 border-border"
                >
                  <Tv className="h-3.5 w-3.5" />
                  <span>Back to Video &amp; Load Captions</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : wizardStage === "menu" ? (
        /* Guided Game Menu / Wizard (Step-by-step entry into playable activities) */
        <div data-testid="game-wizard-menu" className="my-auto py-4 space-y-5">
          {/* Step 1: Ready Content & Language Pairing Banner */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Step 1 · Ready Subtitles Content
                </span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {effectiveTotalRows} sentences · {availableWordsTotal} words ({baseLanguageName} →{" "}
                {targetLanguageName})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg border border-border/70 bg-card/80">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">
                  Active Sentence ({baseLanguageName})
                </div>
                <p dir={isBaseRtl ? "rtl" : "ltr"} className="font-semibold text-foreground">
                  {effectiveSentence}
                </p>
              </div>
              <div className="p-2.5 rounded-lg border border-border/70 bg-card/80">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">
                  Translation ({targetLanguageName})
                </div>
                <p
                  dir={isTargetRtl ? "rtl" : "ltr"}
                  className="font-semibold text-indigo-600 dark:text-indigo-300"
                >
                  {effectiveTranslation || "Audio-only (no target translation text on this row)"}
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: Choose Game Mode Cards */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Step 2 · Choose How You Want to Practice
              </span>
              <Button
                type="button"
                size="sm"
                data-testid="wizard-quick-start-btn"
                onClick={() =>
                  handleSelectGameMode(
                    availableWordsTotal > 0 ? "listening_game" : "sentence_builder",
                  )
                }
                className="h-7 px-3 text-xs gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                <span>
                  Quick Start: {availableWordsTotal > 0 ? "Listening Game" : "Sentence Builder"}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Card 1: Listening Game */}
              <button
                type="button"
                data-testid="wizard-card-listening-game"
                onClick={() => handleSelectGameMode("listening_game")}
                className="text-left p-3.5 rounded-xl border border-indigo-500/40 bg-card hover:bg-indigo-500/10 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Headphones className="h-4 w-4 text-indigo-500" />
                    <span>Listening Game</span>
                  </span>
                  <span className="rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                    {availableWordsTotal}w · {availableSentencesTotal}s
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Listen to filtered words &amp; sentences sequentially with or without
                  translations.
                </p>
              </button>

              {/* Card 2: Sentence Builder */}
              <button
                type="button"
                data-testid="wizard-card-sentence-builder"
                onClick={() => handleSelectGameMode("sentence_builder")}
                className="text-left p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Puzzle className="h-4 w-4 text-sky-500" />
                    <span>Sentence Builder</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {baseWords.length} tiles
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Assemble the subtitle sentence words in order from the translation prompt.
                </p>
              </button>

              {/* Card 3: Word Match */}
              <button
                type="button"
                data-testid="wizard-card-word-match"
                disabled={matchPairs.length === 0}
                onClick={() => handleSelectGameMode("word_match")}
                className={`text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${
                  matchPairs.length > 0
                    ? "border-border bg-card hover:bg-muted/50 hover:border-indigo-500 cursor-pointer"
                    : "border-border/50 bg-muted/20 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Layers className="h-4 w-4 text-emerald-500" />
                    <span>Word Match</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {matchPairs.length > 0 ? `${matchPairs.length} pairs` : "Needs translation"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Pair {baseLanguageName} words side-by-side with {targetLanguageName} translations.
                </p>
              </button>

              {/* Card 4: Missing Word */}
              <button
                type="button"
                data-testid="wizard-card-missing-word"
                onClick={() => handleSelectGameMode("missing_word")}
                className="text-left p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Target className="h-4 w-4 text-amber-500" />
                    <span>Missing Word</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {missingWordOptions.length} choices
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Fill in the key missing word from multiple-choice subtitle options.
                </p>
              </button>

              {/* Card 5: Word Balloons */}
              <button
                type="button"
                data-testid="wizard-card-word-balloons"
                onClick={() => handleSelectGameMode("word_balloons")}
                className="text-left p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-rose-500" />
                    <span>Word Balloons</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {balloons.length} balloons
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Pop word balloons to reveal and hear their {targetLanguageName} translations.
                </p>
              </button>

              {/* Card 6: AI Sentences (OpenRouter X=5 Target-Word Sentences) */}
              <button
                type="button"
                data-testid="wizard-card-openrouter-sentences"
                onClick={() => handleSelectGameMode("openrouter_sentences")}
                className="text-left p-3.5 rounded-xl border border-indigo-500/40 bg-card hover:bg-indigo-500/10 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <MessageSquarePlus className="h-4 w-4 text-indigo-500" />
                    <span>AI Sentences (5x)</span>
                  </span>
                  <span className="rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                    {targetWordsForAiGame.length}w · 5/batch
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Generate 5 fresh OpenRouter sentences at a time using your target words to learn.
                </p>
              </button>

              {/* Card 7: Canvas Full Screen */}
              <button
                type="button"
                data-testid="wizard-card-canvas-fullscreen"
                onClick={() => {
                  if (onOpenCanvasGame) {
                    onOpenCanvasGame();
                  } else {
                    setInternalShowCanvasGame(true);
                  }
                }}
                className="text-left p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-indigo-500 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Gamepad2 className="h-4 w-4 text-violet-500" />
                    <span>Full Screen Balloons</span>
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Arcade
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Launch the full-screen canvas balloon popping arcade mode.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Main Interactive Workspace (Per Game Mode) */
        <div className="my-auto py-4 space-y-4">
          {/* ============================================================== */}
          {/* MODE 1: SENTENCE BUILDER (UNSCRAMBLE SENTENCE)                  */}
          {/* ============================================================== */}
          {gameMode === "sentence_builder" && (
            <div data-testid="sentence-builder-workspace" className="space-y-4">
              {/* Guide Prompt / Target Translation */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Target Translation Meaning:
                  </div>
                  <div
                    dir={isTargetRtl ? "rtl" : "ltr"}
                    className="text-base font-semibold text-foreground leading-relaxed"
                  >
                    {effectiveTranslation || effectiveSentence}
                  </div>
                </div>

                {onSpeakText && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void onSpeakText(
                        effectiveTranslation || effectiveSentence,
                        effectiveTranslation ? targetLanguage || baseLanguage : baseLanguage,
                      )
                    }
                    className="h-7 text-xs gap-1 border-border shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Listen</span>
                  </Button>
                )}
              </div>

              {/* Workspace: Placed Sentence Slot */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Click tiles below to build the grammatical sentence in order:</span>
                  <span className="font-mono">
                    {placedTiles.length} / {targetWordsForBuilder.length} words
                  </span>
                </div>

                <div
                  dir={isBaseRtl ? "rtl" : "ltr"}
                  className={`min-h-[70px] p-3.5 rounded-xl border-2 flex flex-wrap items-center gap-2 transition-all ${
                    builderStatus === "correct"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : builderStatus === "incorrect"
                        ? "border-rose-500 bg-rose-500/10"
                        : "border-dashed border-border/80 bg-card/60"
                  }`}
                >
                  {placedTiles.length > 0 ? (
                    placedTiles.map((tile, idx) => (
                      <button
                        key={`placed-${tile.id}`}
                        type="button"
                        onClick={() => handlePlacedTileClick(tile)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-xs cursor-pointer ${
                          builderStatus === "correct"
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                        title="Click to remove word back to bank"
                      >
                        {tile.word}
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic select-none">
                      Empty slot — tap words below to place them here...
                    </span>
                  )}
                </div>
              </div>

              {/* Word Bank: Available Shuffled Tiles */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-xs font-semibold text-muted-foreground">Word Bank:</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGiveHint}
                      disabled={builderStatus === "correct" || availableTiles.length === 0}
                      className="h-6 px-2 text-[11px] gap-1 border-border"
                    >
                      <HelpCircle className="h-3 w-3 text-amber-500" />
                      <span>Hint</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetBuilder}
                      className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </Button>
                  </div>
                </div>

                <div
                  dir={isBaseRtl ? "rtl" : "ltr"}
                  className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/20 min-h-[56px]"
                >
                  {availableTiles.length > 0 ? (
                    availableTiles.map((tile) => (
                      <button
                        key={`avail-${tile.id}`}
                        type="button"
                        onClick={() => handleTileClick(tile)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card hover:border-indigo-500 hover:bg-indigo-500/10 text-foreground transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        {tile.word}
                      </button>
                    ))
                  ) : builderStatus === "correct" ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm py-1">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Perfect! Sentence assembled correctly (+50 XP)!</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic py-1">
                      All words placed in sentence slot.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: WORD MATCH (VOCABULARY PAIRS)                          */}
          {/* ============================================================== */}
          {gameMode === "word_match" && (
            <div data-testid="word-match-grid" className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Match words in {baseLanguageName} with translations in {targetLanguageName}:
                </span>
                <span className="font-mono">
                  {matchedPairIds.size} / {matchPairs.length} pairs matched
                </span>
              </div>

              {matchPairs.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Base Language Words Column */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                      {baseLanguageName}
                    </div>
                    <div className="space-y-2">
                      {matchPairs.map((pair) => {
                        const isMatched = matchedPairIds.has(pair.id);
                        const isSelected = selectedBaseWord === pair.base;

                        return (
                          <button
                            key={`base-${pair.id}`}
                            type="button"
                            onClick={() => !isMatched && handleBaseWordSelect(pair.base)}
                            disabled={isMatched}
                            className={`w-full p-2.5 rounded-lg border text-sm font-semibold text-left transition-all flex items-center justify-between ${
                              isMatched
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 opacity-60"
                                : isSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                  : "border-border bg-card hover:border-indigo-500/50 hover:bg-muted text-foreground"
                            }`}
                          >
                            <span>{pair.base}</span>
                            {isMatched && <Check className="h-4 w-4 text-emerald-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Language Words Column */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                      {targetLanguageName}
                    </div>
                    <div className="space-y-2">
                      {shuffledTargetPairs.map((pair) => {
                        const isMatched = matchedPairIds.has(pair.id);
                        const isSelected = selectedTargetWord === pair.target;

                        return (
                          <button
                            key={`target-${pair.id}`}
                            type="button"
                            dir={isTargetRtl ? "rtl" : "ltr"}
                            onClick={() => !isMatched && handleTargetWordSelect(pair.target)}
                            disabled={isMatched}
                            className={`w-full p-2.5 rounded-lg border text-sm font-semibold transition-all flex items-center justify-between ${
                              isMatched
                                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 opacity-60"
                                : isSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                  : "border-border bg-card hover:border-indigo-500/50 hover:bg-muted text-foreground"
                            }`}
                          >
                            <span>{pair.target}</span>
                            {isMatched && <Check className="h-4 w-4 text-emerald-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Insufficient subtitle words for pair matching. Advance to the next sentence below.
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 3: MISSING WORD (FILL-IN-THE-BLANK)                       */}
          {/* ============================================================== */}
          {gameMode === "missing_word" && (
            <div data-testid="missing-word-container" className="space-y-5 py-2">
              {/* Incomplete Sentence Prompt */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Complete the Subtitle Sentence:
                </div>
                <p
                  dir={isBaseRtl ? "rtl" : "ltr"}
                  className="text-base sm:text-lg font-medium text-foreground leading-relaxed"
                >
                  {baseWords.map((word, idx) => {
                    if (idx === missingWordIndex) {
                      return (
                        <span
                          key={idx}
                          className={`inline-block mx-1.5 px-3 py-0.5 rounded-md border-b-2 font-bold ${
                            missingWordFeedback === "correct"
                              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : selectedMissingOption
                                ? "border-rose-500 text-rose-500 bg-rose-500/10"
                                : "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                          }`}
                        >
                          {selectedMissingOption ? selectedMissingOption : "[ ______ ]"}
                        </span>
                      );
                    }
                    return <span key={idx}>{word} </span>;
                  })}
                </p>

                {/* Translation Hint */}
                <div
                  dir={isTargetRtl ? "rtl" : "ltr"}
                  className="text-xs text-muted-foreground pt-1 border-t border-border/40"
                >
                  <strong className="text-foreground">Meaning:</strong>{" "}
                  {effectiveTranslation || "(Listen or choose from context)"}
                </div>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground px-1">
                  Choose the correct missing word:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {missingWordOptions.map((opt, idx) => {
                    const isSelected = selectedMissingOption === opt;
                    const isCorrectWord =
                      sanitizeWord(opt).toLowerCase() ===
                      sanitizeWord(baseWords[missingWordIndex] || "").toLowerCase();

                    let btnStyle = "border-border bg-card hover:border-indigo-500 hover:bg-muted";
                    if (isSelected) {
                      btnStyle = isCorrectWord
                        ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                        : "border-rose-500 bg-rose-600 text-white";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMissingWord(opt)}
                        className={`p-3 rounded-lg border text-sm font-semibold transition-all text-center shadow-xs cursor-pointer ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 4: WORD BALLOONS (POPPABLE VOCABULARY DISCOVERY)          */}
          {/* ============================================================== */}
          {gameMode === "word_balloons" && (
            <div className="space-y-4">
              {/* Progress and Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span
                  data-testid="balloon-progress-text"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  {isAllPunched ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Award className="h-4 w-4" />
                      All balloons punched! Great job!
                    </span>
                  ) : (
                    <span>
                      Punch balloons to reveal translations:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {punchedCount}/{totalBalloons}
                      </strong>{" "}
                      ({Math.round(progressRatio * 100)}%)
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="punch-all-balloons-btn"
                    onClick={handlePunchAll}
                    disabled={isAllPunched || totalBalloons === 0}
                    className="h-6 px-2 text-[11px] gap-1 border-border"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span>Punch All</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid="reset-balloons-btn"
                    onClick={handleResetBalloons}
                    disabled={punchedCount === 0}
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Re-inflate</span>
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  data-testid="balloon-progress-bar"
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>

              {/* Word Balloons Grid */}
              <div
                data-testid="word-balloons-container"
                dir={isBaseRtl ? "rtl" : "ltr"}
                className="min-h-[160px] flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-4 rounded-xl border border-indigo-500/20 bg-card/40 backdrop-blur-xs"
              >
                {balloons.length > 0 ? (
                  balloons.map((balloon) => {
                    const isPunched = punchedIndices.has(balloon.index);
                    const isJustPunched = justPunchedIndex === balloon.index;
                    const { colorScheme } = balloon;

                    return (
                      <div
                        key={balloon.id}
                        data-testid={`balloon-card-${balloon.index}`}
                        className="flex flex-col items-center select-none group"
                      >
                        <button
                          type="button"
                          onClick={() => handlePunchBalloon(balloon.index, balloon)}
                          className={`relative flex min-w-[76px] sm:min-w-[92px] flex-col items-center justify-center px-3 py-2.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer active:scale-95 shadow-md ${
                            isPunched
                              ? `${colorScheme.punchedBg} ${colorScheme.punchedBorder}`
                              : `${colorScheme.unpunchedBg} ${colorScheme.unpunchedBorder} ${colorScheme.unpunchedHover}`
                          } ${isJustPunched ? "scale-110 ring-4 ring-indigo-400" : ""}`}
                        >
                          <span
                            className={`font-bold text-sm tracking-wide ${
                              isPunched ? colorScheme.punchedText : colorScheme.unpunchedText
                            }`}
                          >
                            {balloon.word}
                          </span>

                          <div className="mt-1 text-[11px] font-medium leading-tight">
                            {isPunched ? (
                              <span dir={isTargetRtl ? "rtl" : "ltr"} className="opacity-95">
                                {balloon.translation}
                              </span>
                            ) : (
                              <span className="opacity-60 text-[10px] italic">tap to pop</span>
                            )}
                          </div>
                        </button>

                        {/* Balloon String */}
                        <div className="flex flex-col items-center pointer-events-none mt-0.5">
                          <div
                            className={`w-2 h-1 rounded-full ${
                              isPunched ? "bg-foreground/70" : "bg-muted-foreground/60"
                            }`}
                          />
                          <div className="w-0.5 h-2.5 bg-muted-foreground/30" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground italic text-sm">
                    No sentence words available. Advance to next sentence below.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 5: LISTENING GAME (WORDS & SENTENCES WITH/WITHOUT TRANS.) */}
          {/* ============================================================== */}
          {gameMode === "listening_game" && (
            <ListeningGamePanel
              rows={subtitleRows}
              currentSentence={effectiveSentence}
              targetTranslation={effectiveTranslation}
              baseLanguage={baseLanguage}
              baseLanguageName={baseLanguageName}
              targetLanguage={targetLanguage}
              targetLanguageName={targetLanguageName}
              availableLanguages={availableTargetLanguages}
              configuredRates={configuredRates}
              onSpeakText={onSpeakText}
              onStopSpeaking={onStopSpeaking}
              initialWithTranslations={listeningWithTranslations}
              onWithTranslationsChange={setListeningWithTranslations}
              onCreateSentencesWithOpenRouter={handleCreateSentencesWithOpenRouterFromWords}
            />
          )}

          {/* ============================================================== */}
          {/* MODE 6: OPENROUTER AI SENTENCES USING TARGET WORDS (X=5 BATCH) */}
          {/* ============================================================== */}
          {gameMode === "openrouter_sentences" && (
            <OpenRouterSentenceGamePanel
              targetWords={effectiveAiTargetWords}
              baseLanguage={baseLanguage}
              baseLanguageName={baseLanguageName}
              targetLanguage={targetLanguage}
              targetLanguageName={targetLanguageName}
              onSpeakText={onSpeakText}
              onStopSpeaking={onStopSpeaking}
              onOpenOpenRouterSettings={onOpenOpenRouterSettings}
            />
          )}

          {/* 3. Reference Sentence & Translation Cards (Always Accessible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-2">
            {/* Base Sentence Card */}
            <div
              data-testid="balloon-base-sentence-card"
              className="p-3 rounded-lg border border-border/80 bg-card flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="font-semibold text-foreground uppercase tracking-wide">
                  {baseLanguageName} ({baseLanguage})
                </span>
                {onSpeakText && effectiveSentence && (
                  <button
                    type="button"
                    data-testid="balloon-speak-btn"
                    onClick={() => void onSpeakText(effectiveSentence, baseLanguage)}
                    className="hover:text-foreground flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Pronounce full sentence"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Pronounce</span>
                  </button>
                )}
              </div>
              <p
                dir={isBaseRtl ? "rtl" : "ltr"}
                className="font-medium text-foreground text-sm leading-relaxed"
              >
                {effectiveSentence || "N/A"}
              </p>
            </div>

            {/* Target Translation Sentence Card (hidden when Listening Game is in Without Translations mode) */}
            {!(gameMode === "listening_game" && !listeningWithTranslations) && (
              <div
                data-testid="balloon-target-translation-card"
                className="p-3 rounded-lg border border-border/80 bg-card flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground uppercase tracking-wide">
                    {targetLanguageName} ({targetLanguage})
                  </span>
                  {onSpeakText && effectiveTranslation && (
                    <button
                      type="button"
                      onClick={() => void onSpeakText(effectiveTranslation, targetLanguage)}
                      className="hover:text-foreground flex items-center gap-1 text-[11px] text-indigo-500 cursor-pointer"
                      title="Pronounce target translation"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Pronounce</span>
                    </button>
                  )}
                </div>
                <p
                  dir={isTargetRtl ? "rtl" : "ltr"}
                  className="font-medium text-foreground text-sm leading-relaxed"
                >
                  {effectiveTranslation || "N/A"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Footer Controls: Sentence Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3 mt-2">
        <div className="flex items-center gap-2">
          {onPrevSentence && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="balloon-prev-sentence-btn"
              onClick={onPrevSentence}
              disabled={effectiveRowIndex <= 0}
              className="h-8 px-2.5 text-xs gap-1 border-border text-foreground"
              title="Previous subtitle sentence"
            >
              <SkipBack className="h-3.5 w-3.5" />
              <span>Prev Sentence</span>
            </Button>
          )}

          {onReplaySentence && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="balloon-replay-sentence-btn"
              onClick={onReplaySentence}
              disabled={!hasPlayableContent}
              className="h-8 px-2.5 text-xs gap-1 border-border text-foreground"
              title="Reset current sentence game"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay</span>
            </Button>
          )}

          {onNextSentence && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="balloon-next-sentence-btn"
              onClick={onNextSentence}
              disabled={effectiveRowIndex < 0 || effectiveRowIndex >= effectiveTotalRows - 1}
              className="h-8 px-2.5 text-xs gap-1 border-border text-foreground font-semibold"
              title="Next subtitle sentence"
            >
              <span>Next Sentence</span>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          <span>
            Interactive Subtitles Learning Mode · Master words and sentences directly from video
          </span>
        </div>
      </div>
    </div>
  );
};
