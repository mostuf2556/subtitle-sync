import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  Volume2,
  SkipBack,
  SkipForward,
  Loader2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Plus,
  Play,
  Square,
} from "lucide-react";

export const PLAY_ALL_MAX_ITERATIONS = 10;
import { Button } from "@/components/ui/button";
import { RTL } from "@/lib/subtitles";
import { getOpenRouterApiKeySetting, getOpenRouterModelSetting } from "@/utils/appSettings";
import { DEFAULT_OPENROUTER_MODEL } from "@/utils/openRouterAiService";
import { splitSentenceHighlightParts } from "@/utils/listeningGame";
import {
  OPENROUTER_SENTENCE_BATCH_SIZE,
  generateNextTargetWordSentencesBatch,
  shouldPrefetchNextSentenceBatch,
  resolveTextSpeechLanguage,
  type GeneratedTargetWordSentence,
} from "@/utils/openRouterSentenceGenerator";
import {
  getLastEmployedTtsProvider,
  subscribeEmployedTtsProvider,
  disableAutoProvider,
  type EmployedTtsProviderInfo,
} from "@/lib/alternative-tts";

export interface OpenRouterSentenceGamePanelProps {
  /** Candidate target vocabulary words extracted from active subtitles */
  targetWords: string[];
  baseLanguage: string;
  baseLanguageName: string;
  targetLanguage: string;
  targetLanguageName: string;
  onSpeakText?: (text: string, langCode: string) => void | Promise<void>;
  onStopSpeaking?: () => void;
  onOpenOpenRouterSettings?: () => void;
  /** Optional overrides primarily used for clean-room Storybook previews */
  apiKeyOverride?: string;
  modelOverride?: string;
  initialSentencesOverride?: GeneratedTargetWordSentence[];
  className?: string;
}

/**
 * Shared OpenRouter Target-Word Sentence Practice Game Panel.
 * Generates learner sentences incorporating active subtitle target vocabulary
 * on demand in batches of X=5, automatically prefetching the next 5 as you advance.
 */
export const OpenRouterSentenceGamePanel: React.FC<OpenRouterSentenceGamePanelProps> = ({
  targetWords,
  baseLanguage,
  baseLanguageName,
  targetLanguage,
  targetLanguageName,
  onSpeakText,
  onStopSpeaking,
  onOpenOpenRouterSettings,
  apiKeyOverride,
  modelOverride,
  initialSentencesOverride,
  className = "",
}) => {
  const effectiveKey = (
    apiKeyOverride !== undefined ? apiKeyOverride : getOpenRouterApiKeySetting()
  ).trim();
  const effectiveModel =
    (modelOverride !== undefined ? modelOverride : getOpenRouterModelSetting()).trim() ||
    DEFAULT_OPENROUTER_MODEL;

  const uniqueTargetWords = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const raw of targetWords) {
      const clean = raw.trim();
      const lower = clean.toLowerCase();
      if (!clean || seen.has(lower)) continue;
      seen.add(lower);
      list.push(clean);
    }
    return list;
  }, [targetWords]);

  const [selectedWords, setSelectedWords] = useState<string[]>(() =>
    uniqueTargetWords.slice(0, 10),
  );

  useEffect(() => {
    setSelectedWords((prev) => {
      const validSet = new Set(uniqueTargetWords.map((w) => w.toLowerCase()));
      const retained = prev.filter((w) => validSet.has(w.toLowerCase()));
      if (retained.length > 0) return retained;
      return uniqueTargetWords.slice(0, 10);
    });
  }, [uniqueTargetWords]);

  const [sentences, setSentences] = useState<GeneratedTargetWordSentence[]>(
    () => initialSentencesOverride ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [batchNumber, setBatchNumber] = useState<number>(() =>
    initialSentencesOverride && initialSentencesOverride.length > 0 ? 1 : 0,
  );
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [lastModelUsed, setLastModelUsed] = useState<string>(effectiveModel);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [playAllIteration, setPlayAllIteration] = useState<number>(0);
  const [playAllLimitReached, setPlayAllLimitReached] = useState<boolean>(false);
  const [employedProvider, setEmployedProvider] = useState<EmployedTtsProviderInfo | null>(() =>
    getLastEmployedTtsProvider(),
  );
  const [disabledProviderNotice, setDisabledProviderNotice] = useState<string | null>(null);
  const playAllCancelledRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    return subscribeEmployedTtsProvider((info) => {
      setEmployedProvider(info);
    });
  }, []);

  const handleDisableEmployedProvider = useCallback(() => {
    const providerName = employedProvider?.provider;
    if (!providerName) return;
    disableAutoProvider(providerName);
    setDisabledProviderNotice(`Disabled provider "${providerName}"`);
  }, [employedProvider]);

  const isFetchingRef = useRef<boolean>(false);
  const sentencesRef = useRef<GeneratedTargetWordSentence[]>(sentences);
  sentencesRef.current = sentences;
  const batchNumberRef = useRef<number>(batchNumber);
  batchNumberRef.current = batchNumber;
  const autoInitiatedRef = useRef<boolean>(false);
  const advanceOnNextResolveRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      playAllCancelledRef.current = true;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isFetchingRef.current = false;
      if (sentencesRef.current.length === 0) {
        autoInitiatedRef.current = false;
      }
    };
  }, []);

  const isBaseRtl = RTL.has(baseLanguage);
  const isTargetRtl = RTL.has(targetLanguage);

  const activeWordsForPrompt = useMemo(
    () => (selectedWords.length > 0 ? selectedWords : uniqueTargetWords.slice(0, 10)),
    [selectedWords, uniqueTargetWords],
  );

  const fetchBatch = useCallback(
    async (options?: { reset?: boolean; advanceToNewStart?: boolean }) => {
      if (isFetchingRef.current) return;
      if (activeWordsForPrompt.length === 0) {
        setErrorMessage("No target vocabulary words available from current subtitles.");
        return;
      }

      if (!effectiveKey) {
        setErrorMessage(
          "Configure your OpenRouter API key in Settings (1st accordion) to generate sentences.",
        );
        return;
      }

      isFetchingRef.current = true;
      setIsFetching(true);
      setErrorMessage(null);
      if (options?.advanceToNewStart) {
        advanceOnNextResolveRef.current = true;
      }

      const prevList = options?.reset ? [] : sentencesRef.current;
      const nextBatchIdx = options?.reset ? 1 : batchNumberRef.current + 1;
      const excludeSentences = prevList.map((s) => s.sentence);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await generateNextTargetWordSentencesBatch({
          targetWords: activeWordsForPrompt,
          baseLanguage,
          baseLanguageName,
          targetLanguage,
          targetLanguageName,
          count: OPENROUTER_SENTENCE_BATCH_SIZE,
          batchIndex: nextBatchIdx,
          excludeSentences,
          apiKey: effectiveKey,
          model: effectiveModel,
          signal: controller.signal,
        });

        if (!isMountedRef.current || controller.signal.aborted) return;

        setLastModelUsed(res.modelUsed);
        const startOffset = options?.reset ? 0 : prevList.length;

        setSentences((curr) => {
          const base = options?.reset ? [] : curr;
          const existingSet = new Set(base.map((s) => s.sentence.trim().toLowerCase()));
          const merged = [...base];
          for (const item of res.sentences) {
            const norm = item.sentence.trim().toLowerCase();
            if (!existingSet.has(norm)) {
              existingSet.add(norm);
              merged.push(item);
            }
          }
          return merged;
        });

        setBatchNumber(nextBatchIdx);
        if (options?.reset) {
          setCurrentIndex(0);
        } else if (advanceOnNextResolveRef.current && res.sentences.length > 0) {
          setCurrentIndex(startOffset);
        }
      } catch (err: unknown) {
        const errName = err instanceof Error ? err.name : "";
        const msg = err instanceof Error ? err.message : String(err);
        const isAbort =
          controller.signal.aborted ||
          !isMountedRef.current ||
          errName === "AbortError" ||
          msg.toLowerCase().includes("abort") ||
          msg.toLowerCase().includes("cancel");
        if (!isAbort) {
          setErrorMessage(msg);
        }
      } finally {
        advanceOnNextResolveRef.current = false;
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setIsFetching(false);
        }
      }
    },
    [
      activeWordsForPrompt,
      effectiveKey,
      effectiveModel,
      baseLanguage,
      baseLanguageName,
      targetLanguage,
      targetLanguageName,
    ],
  );

  // Automatically fetch initial X=5 batch once when key & words are ready (unless Storybook override)
  useEffect(() => {
    if (autoInitiatedRef.current) return;
    if (initialSentencesOverride && initialSentencesOverride.length > 0) {
      autoInitiatedRef.current = true;
      return;
    }
    if (effectiveKey && activeWordsForPrompt.length > 0 && sentencesRef.current.length === 0) {
      autoInitiatedRef.current = true;
      void fetchBatch({ reset: true });
    }
  }, [effectiveKey, activeWordsForPrompt, fetchBatch, initialSentencesOverride]);

  const handleStopPlayAll = useCallback(() => {
    playAllCancelledRef.current = true;
    setIsPlayingAll(false);
    onStopSpeaking?.();
  }, [onStopSpeaking]);

  const handleStartPlayAll = useCallback(async () => {
    if (isPlayingAll) {
      handleStopPlayAll();
      return;
    }
    playAllCancelledRef.current = false;
    setPlayAllLimitReached(false);
    setPlayAllIteration(0);
    setIsPlayingAll(true);

    try {
      for (let iter = 1; iter <= PLAY_ALL_MAX_ITERATIONS; iter++) {
        if (playAllCancelledRef.current || !isMountedRef.current) break;

        let idx = currentIndexRef.current;
        if (idx >= sentencesRef.current.length) {
          await fetchBatch({ advanceToNewStart: true });
          if (playAllCancelledRef.current || !isMountedRef.current) break;
          idx = currentIndexRef.current;
        }

        const item = sentencesRef.current[idx];
        if (!item) break;

        setPlayAllIteration(iter);

        if (onSpeakText) {
          const sentenceLang = resolveTextSpeechLanguage(
            item.sentence,
            baseLanguage,
            targetLanguage,
          );
          await onSpeakText(item.sentence, sentenceLang);
          if (playAllCancelledRef.current || !isMountedRef.current) break;
          if (showTranslation && item.translation) {
            const translationLang = resolveTextSpeechLanguage(
              item.translation,
              targetLanguage,
              baseLanguage,
            );
            await onSpeakText(item.translation, translationLang);
            if (playAllCancelledRef.current || !isMountedRef.current) break;
          }
        } else {
          await new Promise((r) => setTimeout(r, 400));
        }

        if (playAllCancelledRef.current || !isMountedRef.current) break;

        if (
          shouldPrefetchNextSentenceBatch(
            idx + 1,
            sentencesRef.current.length,
            isFetchingRef.current,
          ) &&
          iter < PLAY_ALL_MAX_ITERATIONS
        ) {
          void fetchBatch({ advanceToNewStart: false });
        }

        if (iter < PLAY_ALL_MAX_ITERATIONS) {
          const nextIdx = idx + 1;
          currentIndexRef.current = nextIdx;
          setCurrentIndex(nextIdx);
        } else {
          setPlayAllLimitReached(true);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsPlayingAll(false);
      }
    }
  }, [
    isPlayingAll,
    handleStopPlayAll,
    fetchBatch,
    onSpeakText,
    baseLanguage,
    targetLanguage,
    showTranslation,
  ]);

  const activeSentence = sentences[currentIndex] || null;

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    onStopSpeaking?.();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    onStopSpeaking?.();
    if (currentIndex + 1 < sentences.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (shouldPrefetchNextSentenceBatch(nextIdx, sentences.length, isFetchingRef.current)) {
        void fetchBatch({ advanceToNewStart: false });
      }
    } else {
      // User reached end of loaded sentences: fetch next X=5 on demand and advance to first of new batch
      void fetchBatch({ advanceToNewStart: true });
    }
  };

  const toggleTargetWord = (word: string) => {
    setSelectedWords((prev) => {
      const exists = prev.some((w) => w.toLowerCase() === word.toLowerCase());
      if (exists) {
        return prev.length > 1 ? prev.filter((w) => w.toLowerCase() !== word.toLowerCase()) : prev;
      }
      return [...prev, word];
    });
  };

  const highlightedParts = useMemo(() => {
    if (!activeSentence) return [];
    return splitSentenceHighlightParts(activeSentence.sentence, activeSentence.targetWord);
  }, [activeSentence]);

  return (
    <div
      data-testid="openrouter-sentence-game-panel"
      className={`space-y-4 rounded-xl border border-indigo-500/30 bg-card/70 p-4 ${className}`}
    >
      {/* 1. Header & OpenRouter Model Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-bold text-foreground">
            OpenRouter Target-Word Sentences
          </span>
          <span
            data-testid="ai-game-model-badge"
            className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
          >
            {lastModelUsed}
          </span>
          <span
            data-testid="ai-game-batch-size-badge"
            className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground"
          >
            Next {OPENROUTER_SENTENCE_BATCH_SIZE} / request
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {effectiveKey && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="ai-game-generate-btn"
              disabled={isFetching || activeWordsForPrompt.length === 0}
              onClick={() => void fetchBatch({ reset: true })}
              className="h-7 px-2.5 text-xs gap-1 border-border"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              <span>New Batch ({OPENROUTER_SENTENCE_BATCH_SIZE})</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            data-testid="ai-game-fetch-next-batch-btn"
            disabled={isFetching || !effectiveKey || activeWordsForPrompt.length === 0}
            onClick={() => void fetchBatch({ advanceToNewStart: sentences.length === 0 })}
            className="h-7 px-2.5 text-xs gap-1 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating {OPENROUTER_SENTENCE_BATCH_SIZE}…</span>
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                <span>Next {OPENROUTER_SENTENCE_BATCH_SIZE} Sentences</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Missing OpenRouter API Key Callout */}
      {!effectiveKey && (
        <div
          data-testid="ai-game-missing-key-banner"
          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs"
        >
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
            <Key className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <div className="font-semibold">OpenRouter API Key Not Set</div>
              <p className="text-[11px] opacity-90">
                Set your free OpenRouter key in Settings (1st accordion) to generate{" "}
                {OPENROUTER_SENTENCE_BATCH_SIZE} fresh practice sentences from your target words on demand.
              </p>
            </div>
          </div>

          {onOpenOpenRouterSettings && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="ai-game-open-settings-btn"
              onClick={onOpenOpenRouterSettings}
              className="h-7 px-3 text-xs gap-1 border-amber-500/50 bg-background hover:bg-amber-500/15 text-foreground cursor-pointer"
            >
              <Key className="h-3 w-3 text-amber-500" />
              <span>Open OpenRouter Settings</span>
            </Button>
          )}
        </div>
      )}

      {/* 3. Target Words to Learn Chips */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">
            Target Words to Learn ({activeWordsForPrompt.length} selected / {uniqueTargetWords.length}{" "}
            available):
          </span>
          <span className="font-mono text-[10px]">Tap words to focus</span>
        </div>

        <div
          data-testid="ai-game-target-words-list"
          dir={isBaseRtl ? "rtl" : "ltr"}
          className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg border border-border/60 bg-muted/20"
        >
          {uniqueTargetWords.slice(0, 24).map((word) => {
            const isSelected = selectedWords.some(
              (w) => w.toLowerCase() === word.toLowerCase(),
            );
            const isActiveSentenceWord =
              activeSentence?.targetWord.toLowerCase() === word.toLowerCase();

            return (
              <button
                key={word}
                type="button"
                onClick={() => toggleTargetWord(word)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                  isActiveSentenceWord
                    ? "bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/40"
                    : isSelected
                      ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 border-indigo-500/40"
                      : "bg-card text-muted-foreground border-border hover:border-indigo-400/50"
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error feedback if API fails */}
      {errorMessage && (
        <div
          data-testid="ai-game-error-banner"
          className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {effectiveKey && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void fetchBatch({ reset: sentences.length === 0 })}
              className="h-6 px-2 text-[11px] border-destructive/40"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* 4. Active Practice Sentence Card */}
      {activeSentence ? (
        <div
          data-testid="ai-game-sentence-card"
          className="rounded-xl border border-indigo-500/35 bg-background/90 p-4 space-y-3 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                data-testid="ai-game-progress-counter"
                className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
              >
                Sentence {currentIndex + 1} / {sentences.length}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                Batch #{activeSentence.batchIndex}
              </span>
              {activeSentence.targetWord && (
                <span
                  data-testid="ai-game-active-target-word"
                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                >
                  Word: {activeSentence.targetWord}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isFetching && (
                <span
                  data-testid="ai-game-prefetch-indicator"
                  className="text-[10px] font-mono text-indigo-500 inline-flex items-center gap-1"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Prefetching next {OPENROUTER_SENTENCE_BATCH_SIZE}…</span>
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="ai-game-toggle-translation-btn"
                onClick={() => setShowTranslation((prev) => !prev)}
                className="h-7 px-2 text-[11px] gap-1 border-border"
              >
                {showTranslation ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showTranslation ? "Hide Translation" : "Show Translation"}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p
                data-testid="ai-game-sentence-text"
                dir={isBaseRtl ? "rtl" : "ltr"}
                className="text-base sm:text-lg font-semibold text-foreground leading-relaxed"
              >
                {highlightedParts.map((part, idx) =>
                  part.isMatch ? (
                    <mark
                      key={idx}
                      className="px-1 py-0.5 rounded bg-amber-400/30 dark:bg-amber-500/30 text-foreground font-bold"
                    >
                      {part.text}
                    </mark>
                  ) : (
                    <span key={idx}>{part.text}</span>
                  ),
                )}
              </p>

              {onSpeakText && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="ai-game-speak-sentence-btn"
                  onClick={() =>
                    void onSpeakText(
                      activeSentence.sentence,
                      resolveTextSpeechLanguage(
                        activeSentence.sentence,
                        baseLanguage,
                        targetLanguage,
                      ),
                    )
                  }
                  className="h-7 px-2.5 text-xs gap-1 shrink-0 border-border"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Listen</span>
                </Button>
              )}
            </div>

            {showTranslation && activeSentence.translation && (
              <div className="flex items-start justify-between gap-3 pt-2 border-t border-border/50">
                <p
                  data-testid="ai-game-sentence-translation"
                  dir={isTargetRtl ? "rtl" : "ltr"}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-300 leading-relaxed"
                >
                  {activeSentence.translation}
                </p>

                {onSpeakText && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid="ai-game-speak-translation-btn"
                    onClick={() =>
                      void onSpeakText(
                        activeSentence.translation,
                        resolveTextSpeechLanguage(
                          activeSentence.translation,
                          targetLanguage,
                          baseLanguage,
                        ),
                      )
                    }
                    className="h-7 px-2 text-[11px] gap-1 shrink-0 text-indigo-500"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>{targetLanguageName}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-2">
              {employedProvider?.provider && (
                <button
                  type="button"
                  data-testid="btn-disable-employed-provider"
                  onClick={handleDisableEmployedProvider}
                  className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 px-2 py-1 text-[11px] font-mono text-destructive cursor-pointer transition-colors"
                  title={`Click to disable TTS provider "${employedProvider.provider}" if its audio is unpleasant`}
                >
                  <span>Provider: {employedProvider.provider}</span>
                  <span className="font-semibold underline">Disable</span>
                </button>
              )}
              {disabledProviderNotice && (
                <span
                  data-testid="disabled-provider-notice"
                  className="text-[11px] font-mono text-amber-600 dark:text-amber-400"
                >
                  {disabledProviderNotice}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="ai-game-prev-btn"
                disabled={currentIndex <= 0}
                onClick={handlePrev}
                className="h-7 px-2.5 text-xs gap-1 border-border"
              >
                <SkipBack className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="default"
                data-testid="ai-game-next-btn"
                disabled={isFetching && currentIndex + 1 >= sentences.length}
                onClick={handleNext}
                className="h-7 px-3 text-xs gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                <span>
                  {currentIndex + 1 >= sentences.length
                    ? `Next (+${OPENROUTER_SENTENCE_BATCH_SIZE} AI)`
                    : "Next Sentence"}
                </span>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                size="sm"
                variant={isPlayingAll ? "destructive" : "outline"}
                data-testid="ai-game-play-all-btn"
                onClick={() => void handleStartPlayAll()}
                className="h-7 px-2.5 text-xs gap-1 font-semibold"
                title={`Play up to ${PLAY_ALL_MAX_ITERATIONS} different keyword combinations before requiring another click (protects token usage)`}
              >
                {isPlayingAll ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    <span>
                      Stop ({playAllIteration}/{PLAY_ALL_MAX_ITERATIONS})
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>Play All ({PLAY_ALL_MAX_ITERATIONS}x)</span>
                  </>
                )}
              </Button>
            </div>

            <span className="text-[11px] text-muted-foreground font-mono">
              {sentences.length - 1 - currentIndex <= 1
                ? "Auto-fetches next 5 as you advance"
                : `${sentences.length - 1 - currentIndex} buffered ahead`}
            </span>
          </div>

          {playAllLimitReached && !isPlayingAll && (
            <div
              data-testid="ai-game-play-all-limit-notice"
              className="mt-2 flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-600 dark:text-amber-300"
            >
              <span>
                Paused after {PLAY_ALL_MAX_ITERATIONS} combinations to protect token usage. Click{" "}
                <strong>Play All ({PLAY_ALL_MAX_ITERATIONS}x)</strong> to continue.
              </span>
            </div>
          )}
        </div>
      ) : isFetching ? (
        <div
          data-testid="ai-game-loading-state"
          className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Generating first {OPENROUTER_SENTENCE_BATCH_SIZE} target-word sentences…</span>
        </div>
      ) : (
        <div
          data-testid="ai-game-empty-batch-state"
          className="py-8 text-center text-xs text-muted-foreground space-y-2"
        >
          <p>
            Click <strong>Next {OPENROUTER_SENTENCE_BATCH_SIZE} Sentences</strong> above to generate
            personalized practice sentences with your target words.
          </p>
        </div>
      )}

      {/* 5. Scrollable Queue of Generated Sentences */}
      {sentences.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Generated Queue ({sentences.length} total)
          </div>
          <div
            data-testid="ai-game-sentences-list"
            className="max-h-56 overflow-y-auto space-y-1.5 pr-1"
          >
            {sentences.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`ai-game-sentence-item-${idx}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    if (shouldPrefetchNextSentenceBatch(idx, sentences.length, isFetchingRef.current)) {
                      void fetchBatch({ advanceToNewStart: false });
                    }
                  }}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isCurrent
                      ? "border-indigo-500 bg-indigo-500/10 text-foreground"
                      : "border-border/60 bg-background/60 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold">#{idx + 1}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-muted">
                        B{item.batchIndex}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {item.targetWord}
                      </span>
                    </div>
                    <div dir={isBaseRtl ? "rtl" : "ltr"} className="text-foreground font-medium truncate">
                      {item.sentence}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

OpenRouterSentenceGamePanel.displayName = "OpenRouterSentenceGamePanel";
