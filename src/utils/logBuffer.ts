/**
 * Ring Buffer Logging Engine
 * Step 1.1 Safe Logging: Fixed-size ring buffer with guaranteed access and
 * response body truncation strictly within log entries to preserve app payload data.
 */

export interface LogEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  level:
    "INFO" | "SUCCESS" | "WARN" | "ERROR" | "ACTION" | "NETWORK" | "SUBTITLES" | "TTS" | "SYNC";
  category: string;
  message: string;
  details?: any;
  stack?: string;
  truncatedResponseBody?: string;
  responseBodyPreview15?: string;
  url?: string;
  status?: number;
  duration?: number;
}

export const MAX_LOG_ENTRIES = 500;
export const MAX_RESPONSE_BODY_LOG_CHARS = 500;

export type AppStateProvider = () => any;

class LogRingBuffer {
  private buffer: LogEntry[] = [];
  private subscribers: Set<() => void> = new Set();
  private appStateProvider: AppStateProvider | null = null;

  public registerAppStateProvider(provider: AppStateProvider): void {
    this.appStateProvider = provider;
  }

  public formatTime(ts: number = Date.now()): string {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  }

  /**
   * Truncates response body strictly for logging display to prevent memory/resource draining.
   * Original application payloads are kept intact.
   */
  public truncateBody(
    body: any,
    maxChars: number = MAX_RESPONSE_BODY_LOG_CHARS,
  ): string | undefined {
    if (body === undefined || body === null) return undefined;
    try {
      let str = typeof body === "string" ? body : JSON.stringify(body);
      if (str.length <= maxChars) {
        return str;
      }
      return `${str.substring(0, maxChars)}... [truncated ${str.length - maxChars} chars]`;
    } catch {
      return "[Unstringifiable Body]";
    }
  }

  /**
   * Extracts exactly X=15 characters of response body preview for high-visibility log diagnostics
   */
  public extractBodyPreview15(body: any): string | undefined {
    if (body === undefined || body === null) return undefined;
    try {
      let str = typeof body === "string" ? body : JSON.stringify(body);
      const clean = str.replace(/[\r\n\t]+/g, " ").trim();
      return clean.substring(0, 15);
    } catch {
      return undefined;
    }
  }

  public add(entry: {
    level: LogEntry["level"];
    category: string;
    message: string;
    details?: any;
    stack?: string;
    responseBody?: any;
    url?: string;
    status?: number;
    duration?: number;
  }): LogEntry {
    const now = Date.now();
    let stack = entry.stack;
    if (!stack && entry.details) {
      if (entry.details instanceof Error) {
        stack = entry.details.stack;
      } else if (typeof entry.details?.stack === "string") {
        stack = entry.details.stack;
      } else if (entry.details?.error instanceof Error) {
        stack = entry.details.error.stack;
      }
    }
    if (!stack && entry.level === "ERROR") {
      stack = new Error(entry.message).stack;
    }

    const newEntry: LogEntry = {
      id: `log-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      formattedTime: this.formatTime(now),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      details: entry.details,
      stack,
      truncatedResponseBody: this.truncateBody(entry.responseBody),
      responseBodyPreview15: this.extractBodyPreview15(entry.responseBody),
      url: entry.url,
      status: entry.status,
      duration: entry.duration,
    };

    this.buffer = [...this.buffer, newEntry].slice(-MAX_LOG_ENTRIES);

    this.notify();
    return newEntry;
  }

  public getPrecedingActions(timestamp: number, limit: number = 6): LogEntry[] {
    return this.buffer
      .filter((e) => (e.level === "ACTION" || e.category === "State Machine") && e.timestamp <= timestamp)
      .slice(-limit);
  }

  public getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  public getSnapshot(): readonly LogEntry[] {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = [];
    this.notify();
  }

  /**
   * Formats all log entries, live state, and user complaint into a comprehensive troubleshooting prompt
   */
  public generateTroubleshootingPrompt(userComplaint?: string): string {
    const lines: string[] = [];

    lines.push("# Bug Report & Troubleshooting Prompt for AI Developer");
    lines.push("");
    lines.push("## User Complaint / Reported Issue");
    lines.push(
      userComplaint && userComplaint.trim()
        ? `> ${userComplaint.trim()}`
        : "> [No specific complaint text entered — complete runtime diagnostic state requested]",
    );
    lines.push("");
    lines.push("## Diagnostic Metadata");
    lines.push(
      `- **Current URL**: ${typeof window !== "undefined" && window?.location?.href ? window.location.href : "N/A"}`,
    );
    lines.push(
      `- **User Agent**: ${typeof navigator !== "undefined" && navigator?.userAgent ? navigator.userAgent : "N/A"}`,
    );
    lines.push(`- **Recorded Log Count**: ${this.buffer.length} events (Ring Buffer, max 500)`);
    lines.push("");

    // Section 0: Active Errors & Failures (Promoted to top so errors are NEVER truncated)
    const errorLogs = this.buffer.filter((e) => e.level === "ERROR");
    lines.push(`## 0. Active Errors & Failures (${errorLogs.length} recorded)`);
    if (errorLogs.length === 0) {
      lines.push("*No active application errors recorded.*");
    } else {
      errorLogs.forEach((err, idx) => {
        lines.push(`### Error ${idx + 1}: [${err.formattedTime}] [${err.category}] ${err.message}`);
        if (err.stack) {
          lines.push("```stack");
          lines.push(err.stack);
          lines.push("```");
        }
        if (err.details) {
          lines.push("```json");
          lines.push(typeof err.details === "string" ? err.details : JSON.stringify(err.details, null, 2));
          lines.push("```");
        }
      });
    }
    lines.push("");

    // Section 0.5: Promoted TTS-Play Delay & Unexpected Pause Diagnostics
    const ttsAndPauseLogs = this.buffer.filter((e) => {
      const msg = e.message || "";
      if (
        msg.includes("TTS_UNJUSTIFIED_DELAY") ||
        msg.includes("TTS_STEP_") ||
        msg.includes("MEDIA_SESSION_PAUSE_RECEIVED") ||
        msg.includes("SPURIOUS_MEDIA_PAUSE_IGNORED") ||
        msg.includes("UNEXPECTED_PLAYER_PAUSE")
      ) {
        return true;
      }
      if (
        msg === "TTS_SECTION_FINISHED" &&
        (Number(e.details?.durationMs) > 2500 || Number(e.details?.preSpeechDelayMs) > 1200)
      ) {
        return true;
      }
      return e.level === "WARN" && (e.category === "TTS-Play" || e.category === "Playback");
    });
    lines.push(
      `## 0.5 TTS-Play Delay & Unexpected Pause Diagnostics (${ttsAndPauseLogs.length} events)`,
    );
    if (ttsAndPauseLogs.length === 0) {
      lines.push("*No TTS-Play delays or unexpected pause events recorded.*");
    } else {
      const recentPromoted = ttsAndPauseLogs.slice(-40);
      if (ttsAndPauseLogs.length > 40) {
        lines.push(`... [${ttsAndPauseLogs.length - 40} earlier TTS/pause events omitted] ...`);
      }
      recentPromoted.forEach((entry, idx) => {
        lines.push(`${idx + 1}. ${this.formatSingleLogEntry(entry)}`);
      });
    }
    lines.push("");

    // Live App State Snapshot
    lines.push("## 1. Live Application State Snapshot");
    if (this.appStateProvider) {
      try {
        const rawState = this.appStateProvider();
        lines.push("```json");
        lines.push(typeof rawState === "string" ? rawState : JSON.stringify(rawState, null, 2));
        lines.push("```");
      } catch (err) {
        lines.push(`[State Provider Evaluation Error: ${err}]`);
      }
    } else {
      lines.push("[State provider not registered]");
    }
    lines.push("");

    // Network Activity Table
    const networkLogs = this.buffer.filter((e) => e.level === "NETWORK" || !!e.url);
    lines.push(`## 2. Network Activity & TimedText Requests (${networkLogs.length} requests)`);
    if (networkLogs.length === 0) {
      lines.push("*No external network requests recorded (using offline/demo fixtures).*");
    } else {
      lines.push("| Time | Category | Status | Duration | Response (15 chars) | URL |");
      lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");
      networkLogs.forEach((n) => {
        const preview = n.responseBodyPreview15 ? `\`${n.responseBodyPreview15}\`` : "-";
        const statusStr = n.status !== undefined ? String(n.status) : "pending";
        const durStr = n.duration !== undefined ? `${n.duration}ms` : "-";
        lines.push(
          `| ${n.formattedTime} | ${n.category} | ${statusStr} | ${durStr} | ${preview} | \`${n.url || n.message}\` |`,
        );
      });
    }
    lines.push("");

    // State Machine Actions Sequence for Error Reproduction (Bounded to prevent clipboard cutoff)
    const actionLogs = this.buffer.filter((e) => e.level === "ACTION" || e.category === "State Machine");
    lines.push(`## 2.5 State Machine Actions Sequence for Reproduction (${actionLogs.length} actions)`);
    if (actionLogs.length === 0) {
      lines.push("*No state machine actions recorded.*");
    } else {
      const maxActionsToShow = 60;
      let displayActions: Array<{ act: LogEntry; index: number }> = [];
      if (actionLogs.length <= maxActionsToShow) {
        displayActions = actionLogs.map((act, index) => ({ act, index: index + 1 }));
      } else {
        // Show first 10 for startup context, plus the last 50 leading directly to the current state/error
        const head = actionLogs.slice(0, 10).map((act, index) => ({ act, index: index + 1 }));
        const tailStartIndex = actionLogs.length - 50;
        const tail = actionLogs.slice(tailStartIndex).map((act, idx) => ({
          act,
          index: tailStartIndex + idx + 1,
        }));
        displayActions = [...head, ...tail];
      }

      displayActions.forEach((item, arrIdx) => {
        if (actionLogs.length > maxActionsToShow && arrIdx === 10) {
          lines.push(`... [${actionLogs.length - 60} earlier state machine actions omitted for brevity] ...`);
        }
        lines.push(
          `${item.index}. [${item.act.formattedTime}] (ts: ${item.act.timestamp}) [${item.act.category}] ${item.act.message}${
            item.act.details ? ` | Details: ${JSON.stringify(item.act.details)}` : ""
          }`,
        );
      });
    }
    lines.push("");

    // Chronological Logs (Bounded to keep prompt under ~40KB)
    lines.push(`## 3. Chronological Event & Network Logs (${this.buffer.length} records)`);
    lines.push("```log");
    if (this.buffer.length === 0) {
      lines.push(`[${this.formatTime()}] [INFO] [System] Log buffer is currently empty.`);
    } else {
      const maxLogsToShow = 80;
      let displayLogs: Array<{ entry: LogEntry; index: number }> = [];
      if (this.buffer.length <= maxLogsToShow) {
        displayLogs = this.buffer.map((entry, index) => ({ entry, index }));
      } else {
        const head = this.buffer.slice(0, 10).map((entry, index) => ({ entry, index }));
        const tailStartIndex = this.buffer.length - 70;
        const tail = this.buffer.slice(tailStartIndex).map((entry, idx) => ({
          entry,
          index: tailStartIndex + idx,
        }));
        displayLogs = [...head, ...tail];
      }

      displayLogs.forEach((item, arrIdx) => {
        if (this.buffer.length > maxLogsToShow && arrIdx === 10) {
          lines.push(`... [${this.buffer.length - 80} earlier log records omitted for brevity] ...`);
        }
        const entry = item.entry;
        let line = `[${entry.formattedTime}] (ts: ${entry.timestamp}) [${entry.level}] [${entry.category}] ${entry.message}`;
        if (entry.url) {
          line += ` | URL: ${entry.url} (status=${entry.status ?? "pending"}${entry.duration !== undefined ? `, ${entry.duration}ms` : ""})`;
        }
        if (entry.responseBodyPreview15 !== undefined) {
          line += ` | body_preview(X=15 chars): "${entry.responseBodyPreview15}"`;
        }
        if (entry.details) {
          try {
            line += ` | Details: ${typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details)}`;
          } catch {}
        }
        if (entry.stack) {
          line += `\n  Stack Trace:\n    ${entry.stack.replace(/\n/g, "\n    ")}`;
        }
        if (entry.truncatedResponseBody && !entry.responseBodyPreview15) {
          line += ` | Response: ${entry.truncatedResponseBody}`;
        }
        lines.push(line);
      });
    }
    lines.push("```");
    lines.push("");

    // Developer Troubleshooting Instructions
    lines.push("## 4. Instructions for Troubleshooting");
    lines.push(
      "Please analyze the live application state, network requests, and chronological logs above to:",
    );
    lines.push("1. Identify the root cause of the reported user complaint or state abnormality.");
    lines.push("2. Verify if spoken TTS matched the presented on-screen subtitles.");
    lines.push("3. Check for any redundant network calls or failed caption fetches.");
    lines.push("4. Implement a precise surgical fix in accordance with `AGENTS.md` guidelines.");

    return lines.join("\n");
  }

  /**
   * Formats a single log entry into a readable diagnostic line/block.
   */
  public formatSingleLogEntry(entry: LogEntry, prefixMarker: string = ""): string {
    const marker = prefixMarker ? `${prefixMarker} ` : "";
    let line = `${marker}[${entry.formattedTime}] (ts: ${entry.timestamp}) [${entry.level}] [${entry.category}] ${entry.message}`;
    if (entry.url) {
      line += ` | URL: ${entry.url} (status=${entry.status ?? "pending"}${entry.duration !== undefined ? `, ${entry.duration}ms` : ""})`;
    }
    if (entry.responseBodyPreview15 !== undefined) {
      line += ` | body_preview(X=15 chars): "${entry.responseBodyPreview15}"`;
    }
    if (entry.details !== undefined) {
      try {
        line += ` | Details: ${typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details)}`;
      } catch {}
    }
    if (entry.stack) {
      line += `\n  Stack Trace:\n    ${entry.stack.replace(/\n/g, "\n    ")}`;
    }
    if (entry.truncatedResponseBody && !entry.responseBodyPreview15) {
      line += ` | Response: ${entry.truncatedResponseBody}`;
    }
    return line;
  }

  /**
   * Formats ONLY the error log entry (or all ERROR entries if errorId is omitted).
   * Does not include surrounding non-error logs or full application state dumps.
   */
  public formatOnlyErrorLogs(errorId?: string): string {
    const errorLogs = this.buffer.filter((e) => e.level === "ERROR");
    const targets = errorId
      ? errorLogs.filter((e) => e.id === errorId)
      : errorLogs;
    const resolvedTargets = targets.length > 0 ? targets : errorLogs;

    if (resolvedTargets.length === 0) {
      return "[No ERROR log entries recorded.]";
    }

    const header =
      resolvedTargets.length === 1
        ? "# Error Log Only (1 error)"
        : `# Error Logs Only (${resolvedTargets.length} errors)`;
    return [header, ...resolvedTargets.map((entry) => this.formatSingleLogEntry(entry))].join("\n\n");
  }

  /**
   * Formats ONLY a focused window of log entries immediately around an error
   * (default: 8 entries before and 4 entries after), NOT the entire log buffer.
   */
  public formatLogAroundError(
    errorId?: string,
    beforeCount: number = 8,
    afterCount: number = 4,
  ): string {
    if (this.buffer.length === 0) {
      return "[Log buffer is empty.]";
    }

    let targetIndex = -1;
    if (errorId) {
      targetIndex = this.buffer.findIndex((e) => e.id === errorId);
    }
    if (targetIndex === -1) {
      for (let i = this.buffer.length - 1; i >= 0; i--) {
        if (this.buffer[i].level === "ERROR") {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      return "[No ERROR log entry found in buffer.]";
    }

    const startIdx = Math.max(0, targetIndex - Math.max(0, beforeCount));
    const endIdx = Math.min(this.buffer.length, targetIndex + Math.max(0, afterCount) + 1);
    const windowEntries = this.buffer.slice(startIdx, endIdx);
    const targetEntry = this.buffer[targetIndex];

    const lines: string[] = [
      `# Log Window Around Error (showing entries ${startIdx + 1}..${endIdx} of ${this.buffer.length})`,
      `Target Error: [${targetEntry.formattedTime}] [${targetEntry.category}] ${targetEntry.message}`,
      "```log",
    ];

    windowEntries.forEach((entry, offset) => {
      const isTarget = startIdx + offset === targetIndex;
      lines.push(this.formatSingleLogEntry(entry, isTarget ? ">>> [TARGET ERROR]" : "   "));
    });

    lines.push("```");
    return lines.join("\n");
  }

  /**
   * Formats all log entries and complete application state into a single cohesive string for 1-click clipboard copy
   */
  public copyAll(userComplaint?: string): string {
    return this.generateTroubleshootingPrompt(userComplaint);
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }
}

export const logBuffer = new LogRingBuffer();

// Convenient shorthand loggers
export const logInfo = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: "INFO", category, message, details });

export const logSuccess = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: "SUCCESS", category, message, details });

export const logWarn = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: "WARN", category, message, details });

export const logError = (category: string, message: string, details?: any) =>
  logBuffer.add({ level: "ERROR", category, message, details });

export const logStateMachineAction = (action: string, details?: any) =>
  logBuffer.add({ level: "ACTION", category: "State Machine", message: action, details });

export const logNetwork = (entry: {
  category?: string;
  url: string;
  method?: string;
  status?: number;
  duration?: number;
  responseBody?: any;
  message: string;
}) =>
  logBuffer.add({
    level: "NETWORK",
    category: entry.category || "Network",
    message: entry.message,
    url: entry.url,
    status: entry.status,
    duration: entry.duration,
    responseBody: entry.responseBody,
  });

export const logSubtitles = (message: string, details?: any, responseBody?: any) =>
  logBuffer.add({ level: "SUBTITLES", category: "Subtitles", message, details, responseBody });

export const logTTS = (message: string, details?: any) =>
  logBuffer.add({ level: "TTS", category: "TTS", message, details });

export const logSync = (message: string, details?: any) =>
  logBuffer.add({ level: "SYNC", category: "SyncEngine", message, details });

export const logInterception = (action: string, details?: any) =>
  logBuffer.add({ level: "ACTION", category: "Interception", message: action, details });

export const logSubtitlePopulation = (action: string, details?: any) =>
  logBuffer.add({ level: "SUBTITLES", category: "SubtitlesViewer", message: action, details });

export const logForeignTrack = (lang: string, status: string, details?: any) =>
  logBuffer.add({
    level: status.toLowerCase().includes("fail") || status.toLowerCase().includes("error") ? "WARN" : "INFO",
    category: "ForeignSubtitles",
    message: `[${lang}] ${status}`,
    details,
  });

/**
 * Copies the complete timestamped diagnostic report and application state to clipboard.
 */
export async function copyBugReportToClipboard(userComplaint?: string): Promise<boolean> {
  const report = logBuffer.copyAll(userComplaint);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      logInfo("Diagnostics", "Full bug report & logs copied to clipboard");
      return true;
    }
  } catch (err) {
    console.error("Failed to copy bug report:", err);
  }
  return false;
}

export const registerAppStateProvider = (provider: AppStateProvider) =>
  logBuffer.registerAppStateProvider(provider);

export const subscribeToLogEntries = (listener: () => void) => logBuffer.subscribe(listener);
export const getLogEntriesSnapshot = () => logBuffer.getSnapshot();

/**
 * Directs the view to the universal log element (#bottom-log-viewer), reveals and
 * expands it, and scrolls smoothly to the relevant record for inspection.
 */
export function leadToLogRecord(entryId?: string): void {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("yt_show_bottom_log", "true");
      localStorage.setItem("yt_show_bottom_log", "true");
      window.dispatchEvent(
        new CustomEvent("lead-to-log-record", {
          detail: { entryId },
        }),
      );
    }
  } catch (err) {
    console.warn("leadToLogRecord error:", err);
  }
}

/**
 * Copies the complete log buffer, timestamps, state machine actions sequence,
 * and error details/stack traces to clipboard for error reproduction.
 */
export async function copyAllLogToClipboard(userComplaint?: string): Promise<boolean> {
  return copyBugReportToClipboard(userComplaint);
}

/**
 * Copies ONLY the error log entry (or all error entries when errorId is omitted) to clipboard.
 */
export async function copyErrorOnlyToClipboard(errorId?: string): Promise<boolean> {
  const report = logBuffer.formatOnlyErrorLogs(errorId);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      return true;
    }
  } catch (err) {
    console.error("Failed to copy error-only log:", err);
  }
  return false;
}

/**
 * Copies ONLY the log window immediately around the specified (or latest) error to clipboard.
 */
export async function copyLogAroundErrorToClipboard(
  errorId?: string,
  beforeCount: number = 8,
  afterCount: number = 4,
): Promise<boolean> {
  const report = logBuffer.formatLogAroundError(errorId, beforeCount, afterCount);
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      return true;
    }
  } catch (err) {
    console.error("Failed to copy log around error:", err);
  }
  return false;
}
