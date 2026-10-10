import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, ExternalLink, BellOff } from "lucide-react";
import {
  subscribeSubtitleNotification,
  dismissSubtitleNotification,
  isSubtitleNotificationMuted,
  setSubtitleNotificationMuted,
  type SubtitleFetchNotification,
} from "@/utils/subtitleNotificationManager";

interface Props {
  onViewSubtitles: () => void;
}

export const SubtitleFetchToast: React.FC<Props> = ({ onViewSubtitles }) => {
  const [notification, setNotification] = useState<SubtitleFetchNotification | null>(null);
  const [muted, setMuted] = useState(() => isSubtitleNotificationMuted());

  useEffect(() => {
    return subscribeSubtitleNotification((n) => {
      setNotification(n);
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

  if (!notification || muted) return null;

  const isFetching = notification.status === "fetching";
  const isCompleted = notification.status === "completed";
  const isError = notification.status === "error";

  return (
    <div
      id="restored-subtitles-toast"
      data-testid="subtitle-fetch-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-xl transition-all animate-in slide-in-from-bottom-3 duration-200 text-card-foreground"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 shrink-0">
            {isFetching && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {isError && <AlertCircle className="w-5 h-5 text-destructive" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isFetching
                  ? "Fetching Subtitles"
                  : isCompleted
                    ? "Subtitles Fetched"
                    : "Subtitle Alert"}
              </span>
              {notification.langCode && (
                <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                  {notification.langCode.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground font-medium break-words">
              {notification.message}
            </p>

            {/* Quick Link to Show Subtitles in Table */}
            <div className="pt-1 flex items-center gap-3">
              <button
                id="toast-view-subtitles-link"
                data-testid="toast-view-subtitles-link"
                type="button"
                onClick={() => {
                  onViewSubtitles();
                  dismissSubtitleNotification();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>View subtitles in table</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <button
          id="toast-dismiss-button"
          data-testid="toast-dismiss-button"
          type="button"
          onClick={dismissSubtitleNotification}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mute further notifications checkbox */}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <label
          htmlFor="mute-subtitle-notifications-checkbox"
          className="flex items-center gap-1.5 cursor-pointer hover:text-foreground select-none"
        >
          <input
            id="mute-subtitle-notifications-checkbox"
            data-testid="mute-subtitle-notifications-checkbox"
            type="checkbox"
            checked={muted}
            onChange={handleMuteToggle}
            className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <span className="flex items-center gap-1">
            <BellOff className="w-3 h-3" />
            Mute further notifications
          </span>
        </label>
        <span className="text-[10px]">Auto-dismiss</span>
      </div>
    </div>
  );
};
