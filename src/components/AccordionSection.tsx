import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Columns2,
  Pin,
  PinOff,
  Hourglass,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PanelId, ACCORDION_THEMES } from "@/config/accordionThemes";

export const ACCORDION_AUTO_FOLD_SECONDS = 10;
export const ACCORDION_AUTO_FOLD_MS = ACCORDION_AUTO_FOLD_SECONDS * 1_000;

export interface AccordionSectionProps {
  id: PanelId;
  title: string;
  videoId?: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  wide?: boolean;
  onToggleWide?: () => void;
  autoTimeout?: boolean;
}

export const AccordionSection = React.memo(function AccordionSection({
  id,
  title,
  videoId,
  children,
  open,
  onOpenChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  wide = false,
  onToggleWide,
  autoTimeout,
}: AccordionSectionProps) {
  const theme = ACCORDION_THEMES[id] || {
    borderLeft: "border-l-4 border-l-neutral-500",
    summaryBg: "bg-muted/30 hover:bg-muted/50",
    badgeBg: "bg-neutral-500/20 text-neutral-600 dark:text-neutral-300 border-neutral-500/30",
    dotBg: "bg-neutral-500",
    tagColor: "neutral",
    panelBg: "bg-card border-border",
  };

  // Timeout is only active for video library by default, unless explicitly passed via autoTimeout prop
  const isTimeoutActive = autoTimeout !== undefined ? autoTimeout : id === "library";

  const pinKey = `yt_accordion_pinned_${id}`;
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    try {
      setPinned(localStorage.getItem(pinKey) === "1");
    } catch {
      // ignore storage errors
    }
  }, [pinKey]);

  const [timeLeft, setTimeLeft] = useState<number>(ACCORDION_AUTO_FOLD_SECONDS);
  const startTimeRef = useRef<number>(Date.now());

  const markActivity = () => {
    startTimeRef.current = Date.now();
    setTimeLeft(ACCORDION_AUTO_FOLD_SECONDS);
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next && !open) {
        onOpenChange(true);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!open || pinned || isFullscreen || !isTimeoutActive) return;

    startTimeRef.current = Date.now();
    setTimeLeft(ACCORDION_AUTO_FOLD_SECONDS);

    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, ACCORDION_AUTO_FOLD_SECONDS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(interval);
        onOpenChange(false);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [open, pinned, isFullscreen, isTimeoutActive, onOpenChange]);

  const togglePinned = () => {
    setPinned((p) => {
      try {
        localStorage.setItem(pinKey, p ? "0" : "1");
      } catch {
        // ignore storage errors
      }
      return !p;
    });
  };

  return (
    <details
      data-panel={title.toLowerCase().replace(/\s+/g, "-")}
      data-panel-id={id}
      data-accordion-type={id}
      data-accordion-color={theme.tagColor}
      data-accordion-bg={theme.panelBg}
      data-video-id={videoId}
      data-fullscreen={isFullscreen ? "true" : "false"}
      open={isFullscreen ? true : open}
      onPointerDown={markActivity}
      onKeyDown={markActivity}
      onFocus={markActivity}
      onToggle={(event) => {
        if (!isFullscreen) {
          onOpenChange(event.currentTarget.open);
        }
      }}
      className={
        isFullscreen
          ? `fixed inset-0 z-50 m-0 flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-background/98 text-sm shadow-2xl backdrop-blur-md ${theme.borderLeft}`
          : `overflow-hidden rounded-xl border text-sm shadow-xs transition-all ${theme.panelBg || "bg-card border-border"} ${theme.borderLeft} ${wide ? "lg:col-span-2" : ""}`
      }
    >
      <summary
        data-testid={`accordion-bar-${id}`}
        className={`flex cursor-pointer list-none items-center gap-1.5 px-3.5 py-1.5 marker:hidden transition-all duration-150 select-none ${
          isFullscreen ? "sticky top-0 z-20 shrink-0 border-b border-border/70 px-3 sm:px-5 py-2.5" : ""
        } ${theme.summaryBg}`}
      >
        <ChevronDown
          aria-hidden="true"
          className={`size-4 text-muted-foreground/80 transition-transform duration-200 ${open ? "rotate-180 text-foreground" : ""}`}
        />
        <h2 className="mr-auto text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <span>{title}</span>
          <span
            data-testid={`accordion-color-badge-${id}`}
            className={`inline-block size-2 rounded-full ${theme.dotBg}`}
            aria-hidden="true"
          />
        </h2>
        {isTimeoutActive && open && !pinned && (
          <div
            data-testid={`accordion-timeout-container-${id}`}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/70 border border-border/50 text-[10px] text-muted-foreground font-mono mr-1"
            title={`Auto-folds in ${Math.ceil(timeLeft)}s without interaction`}
          >
            <Hourglass
              data-testid={`accordion-hourglass-icon-${id}`}
              className="size-3 text-amber-500 animate-pulse shrink-0"
              aria-hidden="true"
            />
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden shrink-0">
              <div
                data-testid={`accordion-timeout-progress-${id}`}
                className="h-full bg-amber-500 transition-all duration-100 ease-linear rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, (timeLeft / ACCORDION_AUTO_FOLD_SECONDS) * 100))}%`,
                }}
              />
            </div>
            <span
              data-testid={`accordion-timeout-countdown-${id}`}
              className="tabular-nums font-bold text-foreground/80"
            >
              {Math.ceil(timeLeft)}s
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-testid={`accordion-pin-${id}`}
          aria-pressed={pinned}
          onClick={(event) => {
            event.preventDefault();
            togglePinned();
          }}
          aria-label={pinned ? `Unpin ${title} (allow auto-fold)` : `Pin ${title} open`}
          title={pinned ? "Pinned: stays open" : "Pin to keep open (otherwise folds automatically)"}
          className={pinned ? "text-primary" : "text-muted-foreground"}
        >
          {pinned ? <Pin aria-hidden="true" /> : <PinOff aria-hidden="true" />}
        </Button>
        <Button
          type="button"
          variant={isFullscreen ? "default" : "ghost"}
          size={isFullscreen ? "sm" : "icon"}
          data-testid={`accordion-fullscreen-${id}`}
          aria-pressed={isFullscreen}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFullscreen();
          }}
          aria-label={isFullscreen ? `Exit full screen for ${title}` : `Enter full screen for ${title}`}
          title={isFullscreen ? "Exit full screen (Esc)" : `Open ${title} in full screen`}
          className={
            isFullscreen
              ? "h-7 gap-1.5 px-2.5 text-xs font-medium"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exit Full Screen</span>
            </>
          ) : (
            <Maximize2 className="size-4" aria-hidden="true" />
          )}
        </Button>
        {!isFullscreen && onToggleWide && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid={`accordion-width-${id}`}
            aria-label={wide ? `Set ${title} to half width` : `Set ${title} to full width`}
            title={wide ? "Set to half width" : "Set to full width"}
            onClick={(event) => {
              event.preventDefault();
              onToggleWide();
            }}
          >
            <Columns2 aria-hidden="true" />
          </Button>
        )}
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
      <div
        className={
          isFullscreen
            ? "flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 md:p-6"
            : "border-t border-border p-2 sm:p-3"
        }
      >
        {isFullscreen ? <div className="mx-auto w-full max-w-7xl">{children}</div> : children}
      </div>
    </details>
  );
});
