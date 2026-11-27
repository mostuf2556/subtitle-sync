import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Json3 } from "../lib/subtitles";
import { getRandomRetryDelayMs } from "../lib/playback-preferences";
import { subtitleRequestQueue, type SubtitleQueueState } from "../utils/subtitleRequestQueue";
import { isDeveloperModeEnabled } from "../utils/developerMode";
import {
  getFetchStrategyConfig,
  setFetchStrategyConfig,
  getUseFetchServer,
  setUseFetchServer,
  getAttemptOrder,
  buildActiveAttemptOrder,
  type FetchAttempt,
  type SubtitleFetchStrategyConfig,
} from "../lib/subtitle-fetch-plan";
import {
  RotateCcw,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Server,
  Shuffle,
  Sliders,
  Radio,
} from "lucide-react";

export interface FloatingSubtitleRetryIndicatorProps {
  targetLanguages: string[];
  tracks: Record<string, Json3> | null;
  onFetchLanguage: (code: string) => Promise<boolean | void>;
  isFetching: boolean;
  autoRetryEnabled?: boolean;
  minPacingSec?: number;
  maxPacingSec?: number;
  onToggleAutoRetry?: (enabled: boolean) => void;
  floating?: boolean;
  debugMode?: boolean;
  defaultMinimized?: boolean;
  isVisible?: boolean;
}

const MemoFloatingSubtitleRetryIndicator = React.memo(function FloatingSubtitleRetryIndicator({
  targetLanguages,
  tracks,
  onFetchLanguage,
  isFetching,
  autoRetryEnabled = true,
  minPacingSec = 3,
  maxPacingSec = 8,
  onToggleAutoRetry,
  floating = false,
  debugMode,
  defaultMinimized = true,
  isVisible = true,
}: FloatingSubtitleRetryIndicatorProps) {
  // Determine if debug / developer mode is active (either via prop or developer mode setting)
  const isDebug = debugMode !== undefined ? debugMode : isDeveloperModeEnabled();

  // Experimental fetch config and server/client state for debug panel
  const [useServer, setUseServer] = useState<boolean>(() => getUseFetchServer());
  const [strategyConfig, setStrategyState] = useState<SubtitleFetchStrategyConfig>(() =>
    getFetchStrategyConfig(),
  );
  const [attempts, setAttempts] = useState<FetchAttempt[]>(() => getAttemptOrder());
  const [queueState, setQueueState] = useState<SubtitleQueueState>(() =>
    subtitleRequestQueue.getState(),
  );

  useEffect(() => {
    return subtitleRequestQueue.subscribe(setQueueState);
  }, []);

  // Keep state synced with localStorage/settings
  const refreshFetchConfig = useCallback(() => {
    setUseServer(getUseFetchServer());
    setStrategyState(getFetchStrategyConfig());
    setAttempts(getAttemptOrder());
  }, []);

  useEffect(() => {
    refreshFetchConfig();
  }, [refreshFetchConfig]);

  // Compute which favorite languages still lack valid subtitle cues (memoized to avoid new array reference on every render)
  const pendingLanguages = useMemo(() => {
    return targetLanguages.filter((code) => {
      const track = tracks?.[code];
      return !track || !track.events || track.events.length === 0;
    });
  }, [targetLanguages, tracks]);

  const pendingKey = useMemo(() => pendingLanguages.join(","), [pendingLanguages]);
  const queuePendingKey = useMemo(
    () => queueState.pendingLangs.join(","),
    [queueState.pendingLangs],
  );

  // Default to retrying by default as requested, folded by default
  const [isPaused, setIsPaused] = useState<boolean>(!autoRetryEnabled);
  const [isMinimized, setIsMinimized] = useState<boolean>(defaultMinimized ?? true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(minPacingSec);
  const [currentlyFetchingLang, setCurrentlyFetchingLang] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextScheduledDelayMs = useRef<number>(minPacingSec * 1000);
  const triggerInFlightRef = useRef<boolean>(false);

  const effectiveIsPaused = isPaused || queueState.isPaused;
  const effectiveFetching = Boolean(
    isFetching ||
      currentlyFetchingLang ||
      queueState.isExecuting ||
      queueState.currentlyFetchingLang,
  );
  const effectiveFetchingLang =
    queueState.currentlyFetchingLang || currentlyFetchingLang || pendingLanguages[0] || "subtitles";
  const nextTargetLang = pendingLanguages[0] || "";
  const isTargetAlreadyQueued = Boolean(
    nextTargetLang && queueState.pendingLangs.includes(nextTargetLang),
  );

  const onFetchLanguageRef = useRef(onFetchLanguage);
  onFetchLanguageRef.current = onFetchLanguage;
  const pendingLanguagesRef = useRef(pendingLanguages);
  pendingLanguagesRef.current = pendingLanguages;
  const isFetchingRef = useRef(effectiveFetching);
  isFetchingRef.current = effectiveFetching;

  // Sync isPaused with external autoRetryEnabled changes if provided
  useEffect(() => {
    setIsPaused(!autoRetryEnabled);
  }, [autoRetryEnabled]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const triggerNextFetch = useCallback(async () => {
    if (
      pendingLanguagesRef.current.length === 0 ||
      isFetchingRef.current ||
      triggerInFlightRef.current
    ) {
      return;
    }
    const targetLang = pendingLanguagesRef.current[0]!;
    const queueSnap = subtitleRequestQueue.getState();
    if (
      queueSnap.isPaused ||
      queueSnap.isExecuting ||
      queueSnap.currentlyFetchingLang ||
      queueSnap.pendingLangs.includes(targetLang)
    ) {
      return;
    }
    triggerInFlightRef.current = true;
    setCurrentlyFetchingLang(targetLang);
    clearTimers();

    try {
      await onFetchLanguageRef.current(targetLang);
    } finally {
      triggerInFlightRef.current = false;
      setCurrentlyFetchingLang(null);
    }
  }, [clearTimers]);

  // Main pacing and retry scheduling loop
  useEffect(() => {
    // If no pending languages, all are fetched!
    if (pendingLanguages.length === 0) {
      clearTimers();
      setSecondsRemaining(0);
      return;
    }

    // If not visible, paused, already fetching, or queued in subtitleRequestQueue, hold off without competing timers
    if (
      !isVisible ||
      effectiveIsPaused ||
      effectiveFetching ||
      isTargetAlreadyQueued
    ) {
      clearTimers();
      return;
    }

    // Pick randomized delay between minPacingSec and maxPacingSec and respect queue backoff cooldown
    const jitterMs = getRandomRetryDelayMs(minPacingSec, maxPacingSec);
    const cooldownRemainingMs = Math.max(0, queueState.cooldownUntil - Date.now());
    const delayMs = Math.max(jitterMs, cooldownRemainingMs);
    nextScheduledDelayMs.current = delayMs;
    const initialSeconds = Math.max(1, Math.round(delayMs / 1000));
    setSecondsRemaining(initialSeconds);

    clearTimers();

    // Secondary 1s ticker for user-visible countdown
    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Primary timeout executing next paced fetch
    timerRef.current = setTimeout(() => {
      clearTimers();
      void triggerNextFetch();
    }, delayMs);

    return () => {
      clearTimers();
    };
  }, [
    pendingKey,
    pendingLanguages.length,
    queuePendingKey,
    effectiveIsPaused,
    effectiveFetching,
    isTargetAlreadyQueued,
    queueState.cooldownUntil,
    isVisible,
    minPacingSec,
    maxPacingSec,
    triggerNextFetch,
    clearTimers,
  ]);

  // If no target languages are selected, don't show the indicator
  if (targetLanguages.length === 0) {
    return null;
  }

  const allFetched = pendingLanguages.length === 0;

  const handleTogglePause = () => {
    const nextState = !effectiveIsPaused;
    setIsPaused(nextState);
    subtitleRequestQueue.setPaused(nextState);
    onToggleAutoRetry?.(!nextState);
  };

  const handleManualRetryNow = () => {
    clearTimers();
    void triggerNextFetch();
  };

  // Experimental debug toggle handlers
  const handleToggleServer = () => {
    const nextVal = !useServer;
    setUseFetchServer(nextVal);
    setUseServer(nextVal);
  };

  const handleToggleSession = () => {
    const updated = setFetchStrategyConfig({ allowSession: !strategyConfig.allowSession });
    setStrategyState(updated);
  };

  const handleToggleAnon = () => {
    const updated = setFetchStrategyConfig({ allowAnon: !strategyConfig.allowAnon });
    setStrategyState(updated);
  };

  const handleCycleStrategy = () => {
    const nextMode = strategyConfig.mode === "random" ? "ordered" : "random";
    const updated = setFetchStrategyConfig({ mode: nextMode });
    setStrategyState(updated);
  };

  // Determine current active attempt order for debug display
  const activeAttempts = buildActiveAttemptOrder(attempts, strategyConfig);
  const nextAttempt = activeAttempts[0];

  return (
    <div
      data-testid="floating-subtitle-retry-indicator"
      className={
        floating
          ? "fixed bottom-20 right-4 z-40 max-w-xs transition-all duration-300 sm:bottom-6 sm:right-6"
          : "relative w-full max-w-none transition-all duration-300"
      }
    >
      <div
        className={`overflow-hidden rounded-xl border bg-background/95 shadow-xl backdrop-blur-md transition-all ${
          allFetched
            ? "border-emerald-500/40 shadow-emerald-500/5"
            : effectiveIsPaused
              ? "border-amber-500/40 shadow-amber-500/5"
              : "border-primary/50 shadow-primary/10"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-1.5 min-w-0">
            {allFetched ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : effectiveFetching ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="text-xs font-semibold text-foreground truncate">
              {allFetched
                ? "Subtitles Loaded"
                : effectiveFetching
                  ? `Fetching ${effectiveFetchingLang}…`
                  : effectiveIsPaused
                    ? "Retry Paused"
                    : "Auto-Fetching Subtitles"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!allFetched && (
              <button
                type="button"
                onClick={handleTogglePause}
                data-testid={
                  effectiveIsPaused ? "floating-retry-resume-btn" : "floating-retry-pause-btn"
                }
                className={`p-1 rounded-md text-xs transition ${
                  effectiveIsPaused
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
                title={effectiveIsPaused ? "Resume auto-fetching" : "Pause auto-fetching"}
                aria-label={effectiveIsPaused ? "Resume auto-retry" : "Pause auto-retry"}
              >
                {effectiveIsPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              data-testid="floating-retry-minimize-btn"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
              title={isMinimized ? "Expand indicator" : "Minimize indicator"}
              aria-label={isMinimized ? "Expand indicator" : "Minimize indicator"}
            >
              {isMinimized ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Content Body (collapsible) */}
        {!isMinimized && (
          <div className="p-3 space-y-2 text-xs">
            {allFetched ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>All {targetLanguages.length} favorited languages fetched successfully!</span>
              </div>
            ) : (
              <>
                {/* Status line */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Pending languages:</span>
                  <span className="font-semibold text-foreground">
                    {pendingLanguages.length} of {targetLanguages.length}
                  </span>
                </div>

                {/* Pending language tags */}
                <div className="flex flex-wrap gap-1">
                  {pendingLanguages.map((lang, idx) => (
                    <span
                      key={`${lang}-${idx}`}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 uppercase"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                {/* Pacing Info & Countdown */}
                <div className="rounded-lg bg-muted/40 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {effectiveIsPaused
                        ? "Paced retry is paused"
                        : effectiveFetching
                          ? "Request in progress…"
                          : isTargetAlreadyQueued
                            ? "Queued in fetch queue…"
                            : "Next request in:"}
                    </span>
                    <span
                      data-testid="floating-retry-countdown"
                      className="font-mono text-xs font-bold text-primary"
                    >
                      {effectiveIsPaused
                        ? "Paused"
                        : effectiveFetching
                          ? "Fetching…"
                          : isTargetAlreadyQueued
                            ? "Queued"
                            : `${secondsRemaining}s`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span>
                      API safe pacing: {minPacingSec}s–{maxPacingSec}s jitter
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleManualRetryNow}
                    disabled={effectiveFetching || isTargetAlreadyQueued || pendingLanguages.length === 0}
                    data-testid="floating-retry-now-btn"
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 disabled:opacity-50 transition active:scale-95 shadow-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Retry Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePause}
                    data-testid="floating-retry-toggle-btn"
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-medium text-xs text-foreground transition active:scale-95"
                  >
                    {effectiveIsPaused ? "Resume" : "Pause"}
                  </button>
                </div>

                {/* Experimental Debug Panel (Visible only when debug / developer mode is active) */}
                {isDebug && (
                  <div
                    data-testid="auto-fetch-debug-panel"
                    className="mt-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-2.5 space-y-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1">
                        <Sliders className="h-3 w-3" />
                        <span>Experimental Fetch Architecture (Debug)</span>
                      </span>
                      <span
                        data-testid="debug-fetch-strategy-badge"
                        className="rounded px-1.5 py-0.2 font-mono text-[9px] uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      >
                        {strategyConfig.mode}
                      </span>
                    </div>

                    {/* Architectural badges */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {/* Origin badge: Server Proxy vs Client */}
                      <div className="flex items-center justify-between rounded bg-background/80 p-1.5 border border-border/60">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          <span>Origin:</span>
                        </span>
                        <span
                          data-testid="debug-fetch-route-badge"
                          className={`font-semibold font-mono text-[10px] ${
                            useServer
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {useServer ? "Server Proxy" : "Client (Direct)"}
                        </span>
                      </div>

                      {/* Session vs No-Session (Anon) badge */}
                      <div className="flex items-center justify-between rounded bg-background/80 p-1.5 border border-border/60">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Radio className="h-3 w-3" />
                          <span>Session:</span>
                        </span>
                        <span
                          data-testid="debug-fetch-session-badge"
                          className="font-semibold font-mono text-[10px] text-foreground truncate"
                        >
                          {strategyConfig.allowSession && strategyConfig.allowAnon
                            ? "Session & Anon"
                            : strategyConfig.allowSession
                              ? "Session Only"
                              : strategyConfig.allowAnon
                                ? "No-Session (Anon)"
                                : "Disabled"}
                        </span>
                      </div>
                    </div>

                    {/* Next attempt preview */}
                    {nextAttempt && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-1 rounded">
                        <span>Next planned attempt:</span>
                        <span
                          data-testid="debug-fetch-next-attempt-badge"
                          className="font-mono font-semibold text-foreground"
                        >
                          {nextAttempt.mode} / {nextAttempt.send === "session" ? "Session" : "No-Session"}
                        </span>
                      </div>
                    )}

                    {/* Interactive Debug Toggles */}
                    <div className="pt-1 border-t border-amber-500/20 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={handleToggleServer}
                        data-testid="debug-toggle-server-btn"
                        className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                          useServer
                            ? "border-purple-500 bg-purple-500/15 text-purple-700 dark:text-purple-300"
                            : "border-border bg-background hover:bg-muted text-muted-foreground"
                        }`}
                        title="Toggle Server Proxy vs Client direct fetch"
                      >
                        {useServer ? "✓ Server Proxy" : "Client Direct"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCycleStrategy}
                        data-testid="debug-toggle-strategy-btn"
                        className="px-1.5 py-1 rounded text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground text-center transition flex items-center justify-center gap-1"
                        title="Toggle strategy mode: random <-> ordered"
                      >
                        <Shuffle className="h-2.5 w-2.5" />
                        <span>Mode: {strategyConfig.mode}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleSession}
                        data-testid="debug-toggle-session-btn"
                        className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                          strategyConfig.allowSession
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-border bg-background hover:bg-muted text-muted-foreground line-through opacity-70"
                        }`}
                        title="Allow/disallow Session requests"
                      >
                        Session: {strategyConfig.allowSession ? "ON" : "OFF"}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleAnon}
                        data-testid="debug-toggle-anon-btn"
                        className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition ${
                          strategyConfig.allowAnon
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-border bg-background hover:bg-muted text-muted-foreground line-through opacity-70"
                        }`}
                        title="Allow/disallow No-Session (Anon) requests"
                      >
                        Anon: {strategyConfig.allowAnon ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export function FloatingSubtitleRetryIndicator(props: FloatingSubtitleRetryIndicatorProps) {
  return <MemoFloatingSubtitleRetryIndicator {...props} />;
}
