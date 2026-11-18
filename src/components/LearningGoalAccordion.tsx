import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Hourglass, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LEARNING_GOAL_AUTO_FOLD_SECONDS = 10;

export interface LearningGoalAccordionProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  autoFoldTimeoutSeconds?: number;
  autoTimeout?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Reusable Accordion for Learning Goals
 * - Folded by default (defaultOpen = false)
 * - 10-second auto-fold timeout countdown with sand-time / Hourglass indicator & progress bar
 * - Pin/Unpin button to keep open indefinitely
 * - Activity listener (clicks, keys, pointer) resets timer
 */
export const LearningGoalAccordion: React.FC<LearningGoalAccordionProps> = React.memo(
  ({
    id,
    title,
    icon,
    badge,
    children,
    defaultOpen = false,
    autoFoldTimeoutSeconds = LEARNING_GOAL_AUTO_FOLD_SECONDS,
    autoTimeout = true,
    className = "",
    testId,
  }) => {
    const pinKey = `yt_learning_goal_pinned_${id}`;
    const [pinned, setPinned] = useState<boolean>(() => {
      try {
        if (typeof window !== "undefined") {
          return localStorage.getItem(pinKey) === "1";
        }
      } catch {
        // ignore storage errors
      }
      return false;
    });

    const [open, setOpen] = useState<boolean>(pinned ? true : defaultOpen);
    const [timeLeft, setTimeLeft] = useState<number>(autoFoldTimeoutSeconds);
    const startTimeRef = useRef<number>(Date.now());

    const markActivity = () => {
      startTimeRef.current = Date.now();
      setTimeLeft(autoFoldTimeoutSeconds);
    };

    useEffect(() => {
      if (!open || pinned || !autoTimeout) return;

      startTimeRef.current = Date.now();
      setTimeLeft(autoFoldTimeoutSeconds);

      const interval = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, autoFoldTimeoutSeconds - elapsed);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          window.clearInterval(interval);
          setOpen(false);
        }
      }, 100);

      return () => window.clearInterval(interval);
    }, [open, pinned, autoTimeout, autoFoldTimeoutSeconds]);

    const togglePinned = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPinned((p) => {
        const next = !p;
        try {
          localStorage.setItem(pinKey, next ? "1" : "0");
        } catch {
          // ignore storage errors
        }
        return next;
      });
    };

    const actualTestId = testId || `learning-goal-accordion-${id}`;

    return (
      <details
        data-testid={actualTestId}
        data-learning-goal-accordion={id}
        open={open}
        onPointerDown={markActivity}
        onKeyDown={markActivity}
        onFocus={markActivity}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        className={`group rounded-lg border border-border/80 bg-card/70 shadow-xs transition-all [overflow-anchor:none] ${className}`}
      >
        <summary
          data-testid={`learning-goal-summary-${id}`}
          className="flex cursor-pointer list-none items-center gap-2 p-2.5 marker:hidden hover:bg-muted/40 transition-colors select-none rounded-lg"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
              open ? "rotate-180 text-foreground" : ""
            }`}
          />

          <div className="flex items-center gap-2 mr-auto min-w-0">
            {icon && <span className="text-primary shrink-0">{icon}</span>}
            <span className="font-semibold text-xs text-foreground truncate">{title}</span>
          </div>

          {badge && <div className="shrink-0">{badge}</div>}

          {/* Auto-folded timeout countdown with hourglass & progress bar */}
          {autoTimeout && open && !pinned && (
            <div
              data-testid={`learning-goal-timeout-${id}`}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/70 border border-border/50 text-[10px] text-muted-foreground font-mono"
              title={`Auto-folds in ${Math.ceil(timeLeft)}s without interaction`}
            >
              <Hourglass
                data-testid={`learning-goal-hourglass-${id}`}
                className="size-3 text-amber-500 animate-pulse shrink-0"
                aria-hidden="true"
              />
              <div className="w-10 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden shrink-0">
                <div
                  data-testid={`learning-goal-timeout-progress-${id}`}
                  className="h-full bg-amber-500 transition-all duration-100 ease-linear rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, (timeLeft / autoFoldTimeoutSeconds) * 100))}%`,
                  }}
                />
              </div>
              <span
                data-testid={`learning-goal-countdown-${id}`}
                className="tabular-nums font-bold text-foreground/80"
              >
                {Math.ceil(timeLeft)}s
              </span>
            </div>
          )}

          {/* Pin Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid={`learning-goal-pin-${id}`}
            aria-pressed={pinned}
            onClick={togglePinned}
            aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`}
            title={
              pinned
                ? "Pinned open (stays open)"
                : autoTimeout
                  ? "Pin to stay open (otherwise auto-folds in 10s)"
                  : "Pin to keep open across reloads"
            }
            className={`h-6 w-6 rounded shrink-0 ${pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            {pinned ? (
              <Pin className="h-3 w-3" aria-hidden="true" />
            ) : (
              <PinOff className="h-3 w-3" aria-hidden="true" />
            )}
          </Button>
        </summary>

        <div
          data-testid={`learning-goal-content-${id}`}
          className="border-t border-border/50 p-2.5 pt-2 space-y-2 text-xs"
        >
          {children}
        </div>
      </details>
    );
  },
);
