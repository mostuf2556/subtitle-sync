import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import { Json3 } from "@/lib/subtitles";
import { getRandomRetryDelayMs } from "@/lib/playback-preferences";
import { subtitleRequestQueue, type SubtitleQueueState } from "@/utils/subtitleRequestQueue";
import {
  subscribeSubtitleNotification,
  dismissSubtitleNotification,
  isSubtitleNotificationMuted,
  setSubtitleNotificationMuted,
  type SubtitleFetchNotification,
} from "@/utils/subtitleNotificationManager";
import { SubtitleFetchToast } from "@/components/SubtitleFetchToast";
import { FloatingSubtitleRetryIndicator } from "@/components/FloatingSubtitleRetryIndicator";

export interface NotificationsStatusTabProps {
  targetLanguages: string[];
  tracks: Record<string, Json3> | null;
  onFetchLanguage: (code: string) => Promise<boolean | void>;
  isFetching: boolean;
  autoRetryEnabled?: boolean;
  minPacingSec?: number;
  maxPacingSec?: number;
  onToggleAutoRetry?: (enabled: boolean) => void;
  onViewSubtitlesInTable: () => void;
}

export const NotificationsStatusTab: React.FC<NotificationsStatusTabProps> = ({
  targetLanguages,
  tracks,
  onFetchLanguage,
  isFetching,
  autoRetryEnabled = true,
  minPacingSec = 3,
  maxPacingSec = 8,
  onToggleAutoRetry,
  onViewSubtitlesInTable,
}) => {
  // 1. Notification history & current notification
  const [currentNotification, setCurrentNotification] = useState<SubtitleFetchNotification | null>(
    null,
  );
  const [notificationHistory, setNotificationHistory] = useState<SubtitleFetchNotification[]>([]);
  const [muted, setMuted] = useState<boolean>(() => isSubtitleNotificationMuted());
  const [queueState, setQueueState] = useState<SubtitleQueueState>(() =>
    subtitleRequestQueue.getState(),
  );

  useEffect(() => {
    return subtitleRequestQueue.subscribe(setQueueState);
  }, []);

  useEffect(() => {
    return subscribeSubtitleNotification((n) => {
      if (n) {
        setCurrentNotification(n);
        setNotificationHistory((prev) => {
          const filtered = prev.filter((item) => item.timestamp !== n.timestamp);
          return [n, ...filtered].slice(0, 20); // Keep last 20 notifications
        });
      }
    });
  }, []);

  const handleMuteToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setMuted(isChecked);
    setSubtitleNotificationMuted(isChecked);
    if (isChecked) {
      dismissSubtitleNotification();
    }
  };

  // 2. Pending languages calculation (memoized to avoid new array reference on every render)
  const pendingLanguages = useMemo(() => {
    return targetLanguages.filter((code) => {
      const track = tracks?.[code];
      return !track || !track.events || track.events.length === 0;
    });
  }, [targetLanguages, tracks]);

  const pendingKey = useMemo(() => pendingLanguages.join(","), [pendingLanguages]);

  const loadedLanguages = useMemo(() => {
    return targetLanguages.filter((code) => {
      const track = tracks?.[code];
      return track && track.events && track.events.length > 0;
    });
  }, [targetLanguages, tracks]);

  const allFetched = targetLanguages.length > 0 && pendingLanguages.length === 0;

  // 3. Retry timers & pacing (countdown display synced with queue; execution delegated to single queue/indicator owner)
  const [isPaused, setIsPaused] = useState<boolean>(!autoRetryEnabled);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(minPacingSec);
  const [currentlyFetchingLang, setCurrentlyFetchingLang] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveFetching = Boolean(
    isFetching ||
      currentlyFetchingLang ||
      queueState.isExecuting ||
      queueState.currentlyFetchingLang,
  );
  const effectiveIsPaused = isPaused || queueState.isPaused;

  const onFetchLanguageRef = useRef(onFetchLanguage);
  onFetchLanguageRef.current = onFetchLanguage;
  const pendingLanguagesRef = useRef(pendingLanguages);
  pendingLanguagesRef.current = pendingLanguages;
  const isFetchingRef = useRef(effectiveFetching);
  isFetchingRef.current = effectiveFetching;

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
    if (pendingLanguagesRef.current.length === 0 || isFetchingRef.current) return;
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
    setCurrentlyFetchingLang(targetLang);
    clearTimers();

    try {
      await onFetchLanguageRef.current(targetLang);
    } finally {
      setCurrentlyFetchingLang(null);
    }
  }, [clearTimers]);

  useEffect(() => {
    if (pendingLanguages.length === 0) {
      clearTimers();
      setSecondsRemaining(0);
      return;
    }

    if (effectiveIsPaused || effectiveFetching) {
      clearTimers();
      return;
    }

    const jitterMs = getRandomRetryDelayMs(minPacingSec, maxPacingSec);
    const cooldownRemainingMs = Math.max(0, queueState.cooldownUntil - Date.now());
    const delayMs = Math.max(jitterMs, cooldownRemainingMs);
    const initialSeconds = Math.max(1, Math.round(delayMs / 1000));
    setSecondsRemaining(initialSeconds);

    clearTimers();

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Embedded FloatingSubtitleRetryIndicator already schedules the background retry loop when autoRetryEnabled=true;
    // avoid double-triggering onFetchLanguage from a competing second timer.

    return () => {
      clearTimers();
    };
  }, [
    pendingKey,
    pendingLanguages.length,
    effectiveIsPaused,
    effectiveFetching,
    queueState.cooldownUntil,
    minPacingSec,
    maxPacingSec,
    clearTimers,
  ]);

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

  return (
    <div data-testid="notifications-status-tab" className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Notifications & Fetch Status
            </h2>
            <p className="text-xs text-muted-foreground">
              Subtitle discovery, background fetch progress, and real-time status alerts without
              screen clutter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="tab-mute-notifications-checkbox"
            className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none"
          >
            <input
              id="tab-mute-notifications-checkbox"
              data-testid="tab-mute-notifications-checkbox"
              type="checkbox"
              checked={muted}
              onChange={handleMuteToggle}
              className="rounded border-input text-primary focus:ring-primary w-4 h-4"
            />
            <span className="flex items-center gap-1.5 font-medium">
              <BellOff className="w-3.5 h-3.5" />
              Mute alerts
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Subtitle Auto-Fetch & Retry Status */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              {allFetched ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : effectiveFetching ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-primary" />
              )}
              <h3 className="text-sm font-semibold text-foreground">Auto-Fetch & Retry Engine</h3>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                allFetched
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : effectiveIsPaused
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              {allFetched ? "All Loaded" : effectiveIsPaused ? "Paced Paused" : "Active"}
            </span>
          </div>

          {targetLanguages.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground">
              No favorite languages selected yet. Add languages in the Languages panel.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Progress Counters */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Languages Status:</span>
                <span className="font-semibold text-foreground">
                  {loadedLanguages.length} of {targetLanguages.length} loaded
                </span>
              </div>

              {/* Countdown / Pacing display */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {allFetched
                      ? "All tracks loaded"
                      : effectiveIsPaused
                        ? "Retry is paused"
                        : effectiveFetching
                          ? `Fetching ${queueState.currentlyFetchingLang || currentlyFetchingLang || "subtitles"}…`
                          : "Next automated request in:"}
                  </span>
                  <span
                    data-testid="tab-retry-countdown"
                    className="font-mono text-sm font-bold text-primary"
                  >
                    {allFetched
                      ? "Done"
                      : effectiveIsPaused
                        ? "Paused"
                        : effectiveFetching
                          ? "Fetching…"
                          : `${secondsRemaining}s`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    Anti-bot jitter pacing: {minPacingSec}s–{maxPacingSec}s
                  </span>
                </div>
              </div>

              {/* Pending language chips */}
              {pendingLanguages.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Pending ({pendingLanguages.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pendingLanguages.map((lang, idx) => (
                      <span
                        key={`${lang}-${idx}`}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Loaded language chips */}
              {loadedLanguages.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Loaded ({loadedLanguages.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {loadedLanguages.map((lang, idx) => (
                      <span
                        key={`${lang}-${idx}`}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 uppercase"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleManualRetryNow}
                  disabled={effectiveFetching || pendingLanguages.length === 0}
                  data-testid="tab-retry-now-btn"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 disabled:opacity-50 transition active:scale-95 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Now</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePause}
                  data-testid="tab-retry-toggle-btn"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted font-medium text-xs text-foreground transition active:scale-95"
                >
                  {effectiveIsPaused ? (
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>{effectiveIsPaused ? "Resume" : "Pause"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Real-Time Subtitle Alerts & Notification Log */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-foreground">Fetch Indications & Alerts</h3>
            </div>
            {notificationHistory.length > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {notificationHistory.length} alerts
              </span>
            )}
          </div>

          {/* Active notification card */}
          {currentNotification ? (
            <div
              data-testid="tab-active-notification"
              className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {currentNotification.status === "fetching" && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {currentNotification.status === "completed" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {currentNotification.status === "error" && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {currentNotification.status === "fetching"
                      ? "Fetching Subtitles"
                      : currentNotification.status === "completed"
                        ? "Subtitles Fetched"
                        : "Subtitle Alert"}
                  </span>
                </div>
                {currentNotification.langCode && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                    {currentNotification.langCode.toUpperCase()}
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground font-medium">{currentNotification.message}</p>

              <button
                type="button"
                data-testid="tab-view-subtitles-btn"
                onClick={onViewSubtitlesInTable}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <span>View subtitles in table</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground">
              No recent subtitle alerts. Subtitle requests and responses will be recorded here.
            </div>
          )}

          {/* Notification History List */}
          {notificationHistory.length > 1 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Recent Event Log
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {notificationHistory.slice(1).map((item, idx) => (
                  <div
                    key={`${item.timestamp}-${idx}`}
                    data-testid="tab-notification-item"
                    className="p-2 rounded border border-border/40 bg-muted/20 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {item.status === "fetching" ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      ) : item.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <span className="text-muted-foreground truncate">{item.message}</span>
                    </div>
                    {item.langCode && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground shrink-0 uppercase">
                        {item.langCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integrated Non-Floating Subtitle Indications & Toasts */}
      <div className="space-y-4 pt-2">
        <FloatingSubtitleRetryIndicator
          targetLanguages={targetLanguages}
          tracks={tracks}
          onFetchLanguage={onFetchLanguage}
          isFetching={effectiveFetching}
          autoRetryEnabled={autoRetryEnabled}
          minPacingSec={minPacingSec}
          maxPacingSec={maxPacingSec}
          onToggleAutoRetry={onToggleAutoRetry}
          floating={false}
        />
        <SubtitleFetchToast onViewSubtitles={onViewSubtitlesInTable} floating={false} />
      </div>
    </div>
  );
};
