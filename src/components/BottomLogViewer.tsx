import React, { useState, useEffect, useRef, useSyncExternalStore, useMemo, memo } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Workflow,
  X,
} from "lucide-react";
import {
  getLogEntriesSnapshot,
  logBuffer,
  subscribeToLogEntries,
  copyAllLogToClipboard,
  copyErrorOnlyToClipboard,
  copyLogAroundErrorToClipboard,
  type LogEntry,
} from "@/utils/logBuffer";
import { Button } from "@/components/ui/button";

function filterLogEntriesOptimized(
  entries: readonly LogEntry[],
  filterLevel: "ALL" | "ACTIONS_ERRORS",
  isActive: boolean,
): LogEntry[] {
  if (!isActive || entries.length === 0) return [];
  if (filterLevel === "ALL") return entries as LogEntry[];
  return entries.filter((entry) => entry.level === "ACTION" || entry.level === "ERROR");
}

function formatDetails(details: unknown): string {
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

interface BottomLogViewerProps {
  className?: string;
  defaultExpanded?: boolean;
  isVisible?: boolean;
  dockToViewport?: boolean;
  onClose?: () => void;
}

export const BottomLogViewer: React.FC<BottomLogViewerProps> = memo(({
  className = "",
  defaultExpanded = false,
  isVisible = true,
  dockToViewport = false,
  onClose,
}) => {
  const entries = useSyncExternalStore(
    subscribeToLogEntries,
    getLogEntriesSnapshot,
    getLogEntriesSnapshot,
  );
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [copiedErrorAction, setCopiedErrorAction] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "ACTIONS_ERRORS">("ALL");
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevVisibleRef = useRef<boolean>(isVisible);

  // Auto-expand when toggled visible from hidden
  useEffect(() => {
    if (isVisible && !prevVisibleRef.current) {
      setIsExpanded(true);
    }
    prevVisibleRef.current = isVisible;
  }, [isVisible]);

  // Listen for lead-to-log-record event from floating alert button or modals
  useEffect(() => {
    const handleLeadToLog = (event: Event) => {
      const customEvent = event as CustomEvent<{ entryId?: string }>;
      const targetId = customEvent.detail?.entryId;

      setIsExpanded(true);
      if (targetId) {
        setFocusedEntryId(targetId);
        // Switch filter to ALL so the record is guaranteed to be rendered
        setFilterLevel("ALL");

        setTimeout(() => {
          const el = document.getElementById(`bottom-log-entry-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            const viewer = document.getElementById("bottom-log-viewer");
            viewer?.scrollIntoView({ behavior: "smooth", block: "end" });
          }
        }, 120);
      } else {
        setTimeout(() => {
          const viewer = document.getElementById("bottom-log-viewer");
          viewer?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 80);
      }
    };

    window.addEventListener("lead-to-log-record", handleLeadToLog);
    return () => {
      window.removeEventListener("lead-to-log-record", handleLeadToLog);
    };
  }, []);

  const visibleEntries = useMemo(() => {
    return filterLogEntriesOptimized(entries, filterLevel, isVisible && isExpanded);
  }, [entries, filterLevel, isVisible, isExpanded]);

  const errorEntries = useMemo(() => {
    return entries.filter((entry) => entry.level === "ERROR");
  }, [entries]);
  const hasErrors = errorEntries.length > 0;
  const latestError = hasErrors ? errorEntries[errorEntries.length - 1] : null;
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const markCopiedErrorAction = (key: string) => {
    setCopiedErrorAction(key);
    setTimeout(() => {
      setCopiedErrorAction((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleCopyErrorOnly = async (errorId?: string) => {
    const actionKey = errorId ? `error-only:${errorId}` : "error-only:header";
    try {
      const ok = await copyErrorOnlyToClipboard(errorId);
      if (!ok) {
        await navigator.clipboard.writeText(logBuffer.formatOnlyErrorLogs(errorId));
      }
      markCopiedErrorAction(actionKey);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleCopyAroundError = async (errorId?: string) => {
    const actionKey = errorId ? `around-error:${errorId}` : "around-error:header";
    try {
      const ok = await copyLogAroundErrorToClipboard(errorId);
      if (!ok) {
        await navigator.clipboard.writeText(logBuffer.formatLogAroundError(errorId));
      }
      markCopiedErrorAction(actionKey);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleCopyAll = async () => {
    try {
      const ok = await copyAllLogToClipboard();
      if (ok) {
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2500);
      } else {
        await navigator.clipboard.writeText(logBuffer.copyAll());
        setCopyStatus("copied");
        setTimeout(() => setCopyStatus("idle"), 2500);
      }
    } catch {
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  };

  const handleClear = () => {
    logBuffer.clear();
    setFocusedEntryId(null);
  };

  return (
    <footer
      id="bottom-log-viewer"
      data-testid="bottom-log-viewer"
      className={`w-full border-t border-border bg-card shadow-2xl transition-all duration-200 text-foreground ${
        dockToViewport ? "fixed bottom-0 left-0 right-0 z-40" : ""
      } ${className}`}
    >
      {/* Collapsed / Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="bottom-log-toggle-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
            aria-expanded={isExpanded}
            aria-controls="bottom-log-content"
          >
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <span>Activity & State Log</span>
            <span className="rounded-full bg-primary/15 text-primary text-[10px] px-2 py-0.2 font-mono font-bold">
              {entries.length}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
            )}
          </button>

          {!isExpanded && latestEntry && (
            <div className="hidden md:flex items-center gap-1.5 min-w-0 text-[11px] text-muted-foreground truncate border-l border-border/60 pl-2">
              <span className={`font-bold font-mono uppercase text-[9px] px-1 py-0.2 rounded ${
                latestEntry.level === "ERROR"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-foreground"
              }`}>
                {latestEntry.level}
              </span>
              <span className="font-semibold text-foreground truncate">{latestEntry.category}:</span>
              <span className="truncate">{latestEntry.message}</span>
            </div>
          )}
        </div>

        {/* Action Controls: Error Copy Modes, Copy All, Clear, and Filter */}
        <div className="flex items-center flex-wrap gap-1.5 shrink-0">
          {isExpanded && (
            <div className="flex items-center border border-border rounded-md overflow-hidden bg-background mr-1 text-[11px]">
              <button
                type="button"
                data-testid="bottom-log-filter-all"
                onClick={() => setFilterLevel("ALL")}
                className={`px-2 py-0.5 transition-colors ${
                  filterLevel === "ALL"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                data-testid="bottom-log-filter-actions-errors"
                onClick={() => setFilterLevel("ACTIONS_ERRORS")}
                className={`px-2 py-0.5 transition-colors ${
                  filterLevel === "ACTIONS_ERRORS"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Actions/Errors
              </button>
            </div>
          )}

          {hasErrors && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="bottom-log-copy-error-only-btn"
                onClick={() => void handleCopyErrorOnly(latestError?.id)}
                className="h-7 px-2 text-[11px] flex items-center gap-1 font-medium border-destructive/40 text-destructive hover:bg-destructive/10"
                title="Copy only the error log entry without surrounding logs"
              >
                {copiedErrorAction === "error-only:header" ||
                copiedErrorAction === `error-only:${latestError?.id}` ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied Error!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    <span>Copy Error Only</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="bottom-log-copy-around-error-btn"
                onClick={() => void handleCopyAroundError(latestError?.id)}
                className="h-7 px-2 text-[11px] flex items-center gap-1 font-medium border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10"
                title="Copy only the log window immediately around the latest error (not all logs)"
              >
                {copiedErrorAction === "around-error:header" ||
                copiedErrorAction === `around-error:${latestError?.id}` ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied Window!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Around Error</span>
                  </>
                )}
              </Button>
            </>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="bottom-log-copy-all-button"
            onClick={() => void handleCopyAll()}
            className="h-7 px-2.5 text-[11px] flex items-center gap-1.5 font-medium border-rose-500/40 text-foreground hover:bg-rose-500/10"
            title="Copy all activity log, timestamps, state machine actions and reproduction data to clipboard"
          >
            {copyStatus === "copied" ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span>Copied All!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-rose-500" />
                <span>Copy All Log to Clipboard</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="bottom-log-copy-button"
            onClick={() => void handleCopyAll()}
            className="h-7 px-2 text-[11px] hidden sm:flex items-center gap-1"
            title="Copy log to clipboard"
          >
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            data-testid="bottom-log-clear-button"
            onClick={handleClear}
            disabled={entries.length === 0}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            title="Clear all log entries"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          {onClose && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="bottom-log-close-btn"
              onClick={onClose}
              className="h-7 px-1.5 text-[11px] text-muted-foreground hover:text-foreground flex items-center"
              title="Hide Activity & State Log"
              aria-label="Hide Activity & State Log"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Log Entries Container */}
      {isExpanded && (
        <div
          id="bottom-log-content"
          ref={containerRef}
          data-testid="bottom-log-content"
          className="border-t border-border/60 bg-muted/20 max-h-[45vh] sm:max-h-96 overflow-y-auto p-2 sm:p-3 space-y-2 text-xs font-mono"
        >
          {visibleEntries.length === 0 ? (
            <p className="text-center py-4 text-xs text-muted-foreground" data-testid="bottom-log-empty">
              No state machine or activity logs recorded yet.
            </p>
          ) : (
            <ol className="space-y-2" data-testid="bottom-log-list">
              {[...visibleEntries].reverse().map((entry: LogEntry) => {
                const isError = entry.level === "ERROR";
                const isAction = entry.level === "ACTION";
                const isFocused = focusedEntryId === entry.id;
                const precedingActions = isError ? logBuffer.getPrecedingActions(entry.timestamp, 5) : [];

                return (
                  <li
                    key={entry.id}
                    id={`bottom-log-entry-${entry.id}`}
                    data-testid={isFocused ? "bottom-log-focused-record" : `bottom-log-record-${entry.id}`}
                    className={`py-2 px-2.5 rounded transition-colors border ${
                      isFocused
                        ? "bg-rose-500/15 border-rose-500 shadow-md ring-2 ring-rose-500/40"
                        : isError
                          ? "bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10"
                          : "bg-background/60 border-border/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <time
                        data-testid="log-record-timestamp"
                        className="text-[10px] font-mono text-muted-foreground font-semibold"
                        title={`Timestamp: ${entry.timestamp} ms`}
                      >
                        {entry.formattedTime} ({entry.timestamp}ms)
                      </time>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                          isError
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : isAction
                              ? "bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {entry.level}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground">[{entry.category}]</span>
                      <span
                        data-testid={isError ? "log-record-error-message" : undefined}
                        className={`text-[11px] break-words ${
                          isError ? "font-semibold text-destructive" : "text-foreground/90"
                        }`}
                      >
                        {entry.message}
                      </span>
                      {isFocused && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500 text-white px-1.5 py-0.5 rounded">
                          Focused Error
                        </span>
                      )}
                      {isError && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            data-testid={`log-record-copy-error-btn-${entry.id}`}
                            data-action="copy-error-only"
                            onClick={() => void handleCopyErrorOnly(entry.id)}
                            className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive hover:bg-destructive/20 cursor-pointer"
                            title="Copy only this error log"
                          >
                            {copiedErrorAction === `error-only:${entry.id}` ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy Error</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            data-testid={`log-record-copy-around-btn-${entry.id}`}
                            data-action="copy-around-error"
                            onClick={() => void handleCopyAroundError(entry.id)}
                            className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                            title="Copy only the log entries around this error (not all logs)"
                          >
                            {copiedErrorAction === `around-error:${entry.id}` ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                                <span>Copied Window</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy Around</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Stack Trace block for Errors */}
                    {isError && entry.stack && (
                      <div className="mt-1.5">
                        <div className="text-[10px] font-bold text-destructive flex items-center gap-1">
                          <span>Stack Trace:</span>
                        </div>
                        <pre
                          data-testid="log-record-stack-trace"
                          className="mt-0.5 whitespace-pre-wrap break-words rounded bg-destructive/10 p-2 font-mono text-[10px] text-destructive border border-destructive/30 overflow-x-auto max-h-36"
                        >
                          {entry.stack}
                        </pre>
                      </div>
                    )}

                    {/* Preceding State Machine Actions for error reproduction */}
                    {isError && precedingActions.length > 0 && (
                      <div
                        data-testid="log-record-reproduction-sequence"
                        className="mt-2 rounded bg-sky-950/20 border border-sky-500/30 p-2 space-y-1"
                      >
                        <div className="text-[10px] font-bold text-sky-600 dark:text-sky-300 flex items-center gap-1.5">
                          <Workflow className="h-3 w-3" />
                          <span>Preceding State Machine Actions for Reproduction ({precedingActions.length} steps):</span>
                        </div>
                        <ol className="space-y-0.5 pl-3 list-decimal text-[10px] text-muted-foreground">
                          {precedingActions.map((action, actIdx) => (
                            <li key={action.id || actIdx} className="leading-tight">
                              <span className="font-mono text-foreground font-semibold">[{action.formattedTime}]</span>{" "}
                              <span className="text-sky-700 dark:text-sky-300 font-medium">[{action.category}]</span>{" "}
                              <span className="text-foreground/90">{action.message}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {entry.details !== undefined && (
                      <div className="mt-1">
                        <pre className="whitespace-pre-wrap break-words rounded bg-background/80 p-1.5 text-[10px] text-muted-foreground border border-border/50">
                          {formatDetails(entry.details)}
                        </pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </footer>
  );
});

