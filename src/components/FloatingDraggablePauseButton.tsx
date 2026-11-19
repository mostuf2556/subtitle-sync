import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Pause,
  Play,
  SlidersHorizontal,
  X,
  Info,
  ScrollText,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  type CredentialHealthStatus,
  type CredentialStatusSnapshot,
  getCredentialStatusSnapshot,
  getEffectiveOpenRouterKey,
  getEffectiveTtsServiceToken,
  saveFloatingOpenRouterKey,
  saveFloatingTtsServiceToken,
  subscribeToCredentialUpdates,
  verifyOpenRouterCredential,
  verifyTtsServiceTokenCredential,
} from "@/utils/credentialStatus";
import { unlockTtsAudioPlayback } from "@/lib/alternative-tts";

export interface FloatingDraggablePauseButtonProps {
  isSetupPaused: boolean;
  onToggleSetupPause: () => void;
  isAutoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
  isTtsPlayEnabled?: boolean;
  onToggleTtsPlay?: () => void;
  isVideoPlaying?: boolean;
  isSpeaking?: boolean;
  pauseReason?: string | null;
  className?: string;
  onTogglePlay?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  currentTimeSec?: number;
  durationSec?: number;
  openRouterStatus?: CredentialHealthStatus;
  ttsTokenStatus?: CredentialHealthStatus;
  onOpenOpenRouterSettings?: () => void;
  onOpenTtsServiceSettings?: () => void;
}

export function formatPlaytimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const padSec = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const padMin = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${padMin}:${padSec}`;
  }
  return `${mins}:${padSec}`;
}

function getCredentialBadgeText(status: CredentialHealthStatus): string {
  if (status === "valid") return "Valid";
  if (status === "invalid") return "Invalid";
  return "Missing";
}

function getCredentialPillClasses(status: CredentialHealthStatus): string {
  if (status === "valid") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
  }
  if (status === "invalid") {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40";
  }
  return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40";
}

function getCredentialDotClass(status: CredentialHealthStatus): string {
  if (status === "valid") return "bg-emerald-500";
  if (status === "invalid") return "bg-rose-500";
  return "bg-amber-500";
}

const STORAGE_KEY_POS = "yt_floating_pause_pos";

interface Position {
  x: number;
  y: number;
}

export const FloatingDraggablePauseButton: React.FC<FloatingDraggablePauseButtonProps> = React.memo(
  ({
    isSetupPaused,
    onToggleSetupPause,
    isAutoScrollEnabled = false,
    onToggleAutoScroll,
    isTtsPlayEnabled = true,
    onToggleTtsPlay,
    isVideoPlaying = false,
    isSpeaking = false,
    pauseReason = null,
    className = "",
    onTogglePlay,
    onPlay,
    onPause,
    currentTimeSec = 0,
    durationSec = 0,
    openRouterStatus: openRouterStatusProp,
    ttsTokenStatus: ttsTokenStatusProp,
    onOpenOpenRouterSettings,
    onOpenTtsServiceSettings,
  }) => {
    const [position, setPosition] = useState<Position>(() => {
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(STORAGE_KEY_POS);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
              return parsed;
            }
          }
        } catch {
          // Fallback to default position below
        }
        return {
          x: Math.max(16, window.innerWidth - 220),
          y: Math.max(16, window.innerHeight - 110),
        };
      }
      return { x: 200, y: 500 };
    });

    const [isOpen, setIsOpen] = useState(false);
    const [activeExplanation, setActiveExplanation] = useState<
      "setup-pause" | "auto-scroll" | "tts-play" | null
    >(null);
    const [activeCredentialEditor, setActiveCredentialEditor] = useState<
      "openrouter" | "tts-token" | null
    >(null);
    const [credentialSnapshot, setCredentialSnapshot] = useState<CredentialStatusSnapshot>(() =>
      getCredentialStatusSnapshot(),
    );
    const [openRouterInput, setOpenRouterInput] = useState<string>(() =>
      getEffectiveOpenRouterKey(),
    );
    const [ttsTokenInput, setTtsTokenInput] = useState<string>(() => getEffectiveTtsServiceToken());
    const [showOpenRouterSecret, setShowOpenRouterSecret] = useState(false);
    const [showTtsTokenSecret, setShowTtsTokenSecret] = useState(false);
    const [isVerifyingOpenRouter, setIsVerifyingOpenRouter] = useState(false);
    const [isVerifyingTtsToken, setIsVerifyingTtsToken] = useState(false);
    const [openRouterFeedback, setOpenRouterFeedback] = useState<{
      ok: boolean;
      message: string;
    } | null>(null);
    const [ttsTokenFeedback, setTtsTokenFeedback] = useState<{
      ok: boolean;
      message: string;
    } | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showPlaytimeMobile, setShowPlaytimeMobile] = useState(false);
    const mobileTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
    const startPosRef = useRef<Position>({ x: 0, y: 0 });
    const hasMovedRef = useRef<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const refreshCredentialState = useCallback(() => {
      setCredentialSnapshot(getCredentialStatusSnapshot());
      setOpenRouterInput(getEffectiveOpenRouterKey());
      setTtsTokenInput(getEffectiveTtsServiceToken());
    }, []);

    useEffect(() => {
      return subscribeToCredentialUpdates(refreshCredentialState);
    }, [refreshCredentialState]);

    useEffect(() => {
      if (isOpen) {
        refreshCredentialState();
      }
    }, [isOpen, refreshCredentialState]);

    // Clamps position inside viewport boundaries
    const clampPosition = useCallback((x: number, y: number): Position => {
      if (typeof window === "undefined") return { x, y };
      const btnWidth = containerRef.current?.offsetWidth || 180;
      const btnHeight = containerRef.current?.offsetHeight || 48;
      const maxX = Math.max(16, window.innerWidth - btnWidth - 16);
      const maxY = Math.max(16, window.innerHeight - btnHeight - 16);
      return {
        x: Math.min(maxX, Math.max(16, x)),
        y: Math.min(maxY, Math.max(24, y)),
      };
    }, []);

    // Window resize handler: keep button within screen bounds
    useEffect(() => {
      const handleResize = () => {
        setPosition((prev) => clampPosition(prev.x, prev.y));
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [clampPosition]);

    // Persist position whenever it changes
    useEffect(() => {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position));
        } catch {
          // Ignore storage errors
        }
      }
    }, [position]);

    // Click outside listener to close dropdown
    useEffect(() => {
      if (!isOpen) return;
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setActiveExplanation(null);
        }
      };
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen]);

    // Mouse drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY };
      startPosRef.current = { ...position };
      hasMovedRef.current = false;
      setIsDragging(true);
    };

    useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!dragStartRef.current) return;
        const dx = e.clientX - dragStartRef.current.clientX;
        const dy = e.clientY - dragStartRef.current.clientY;

        if (!hasMovedRef.current && Math.hypot(dx, dy) > 10) {
          hasMovedRef.current = true;
        }

        if (hasMovedRef.current) {
          const nextX = startPosRef.current.x + dx;
          const nextY = startPosRef.current.y + dy;
          setPosition(clampPosition(nextX, nextY));
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
        if (hasMovedRef.current) {
          setTimeout(() => {
            hasMovedRef.current = false;
          }, 0);
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("blur", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("blur", handleMouseUp);
      };
    }, [isDragging, clampPosition]);

    // Touch drag handlers
    const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      dragStartRef.current = { clientX: touch.clientX, clientY: touch.clientY };
      startPosRef.current = { ...position };
      hasMovedRef.current = false;
      setIsDragging(true);

      // On mobile: long-press (>= 400ms) reveals the playtime tooltip
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!hasMovedRef.current) {
          setShowPlaytimeMobile(true);
          if (mobileTooltipTimerRef.current) clearTimeout(mobileTooltipTimerRef.current);
          mobileTooltipTimerRef.current = setTimeout(() => setShowPlaytimeMobile(false), 3500);
        }
      }, 400);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !dragStartRef.current) return;
      const dx = touch.clientX - dragStartRef.current.clientX;
      const dy = touch.clientY - dragStartRef.current.clientY;

      if (!hasMovedRef.current && Math.hypot(dx, dy) > 10) {
        hasMovedRef.current = true;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      if (hasMovedRef.current) {
        const nextX = startPosRef.current.x + dx;
        const nextY = startPosRef.current.y + dy;
        setPosition(clampPosition(nextX, nextY));
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (hasMovedRef.current) {
        setTimeout(() => {
          hasMovedRef.current = false;
        }, 0);
      }
    };

    const handleButtonClick = (e?: React.MouseEvent) => {
      if (hasMovedRef.current) {
        e?.preventDefault();
        e?.stopPropagation();
        return;
      }

      // Active state of combined (tts-play & video-player) player
      const isPlayingCombined = Boolean(isVideoPlaying || isSpeaking);
      if (isPlayingCombined) {
        if (onPause) {
          onPause();
        } else if (onTogglePlay) {
          onTogglePlay();
        } else {
          onToggleSetupPause();
        }
      } else {
        unlockTtsAudioPlayback();
        if (onPlay) {
          onPlay();
        } else if (onTogglePlay) {
          onTogglePlay();
        } else {
          onToggleSetupPause();
        }
        setShowPlaytimeMobile(true);
        if (mobileTooltipTimerRef.current) clearTimeout(mobileTooltipTimerRef.current);
        mobileTooltipTimerRef.current = setTimeout(() => setShowPlaytimeMobile(false), 3000);
      }
    };

    const handleToggleSetupPauseOption = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSetupPause();
      setActiveExplanation("setup-pause");
    };

    const handleToggleAutoScrollOption = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleAutoScroll) {
        onToggleAutoScroll();
      }
      setActiveExplanation("auto-scroll");
    };

    const handleToggleTtsPlayOption = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isTtsPlayEnabled) {
        unlockTtsAudioPlayback();
      }
      if (onToggleTtsPlay) {
        onToggleTtsPlay();
      }
      setActiveExplanation("tts-play");
    };

    const openCredentialEditor = (target: "openrouter" | "tts-token") => {
      setIsOpen(true);
      setActiveCredentialEditor(target);
    };

    const handleSaveOpenRouter = () => {
      const nextSnap = saveFloatingOpenRouterKey(openRouterInput);
      setCredentialSnapshot(nextSnap);
      setOpenRouterFeedback({
        ok: nextSnap.openRouter.status === "valid",
        message:
          nextSnap.openRouter.status === "valid"
            ? "OpenRouter API key saved."
            : nextSnap.openRouter.lastError || "OpenRouter API key cleared.",
      });
    };

    const handleClearOpenRouter = () => {
      setOpenRouterInput("");
      const nextSnap = saveFloatingOpenRouterKey("");
      setCredentialSnapshot(nextSnap);
      setOpenRouterFeedback({
        ok: false,
        message: nextSnap.openRouter.hasServerKey
          ? "Custom key cleared (using server key)."
          : "OpenRouter API key cleared.",
      });
    };

    const handleVerifyOpenRouter = async () => {
      setIsVerifyingOpenRouter(true);
      setOpenRouterFeedback(null);
      try {
        const trimmed = openRouterInput.trim();
        if (trimmed !== getEffectiveOpenRouterKey()) {
          saveFloatingOpenRouterKey(trimmed);
        }
        const res = await verifyOpenRouterCredential(trimmed);
        setCredentialSnapshot(getCredentialStatusSnapshot());
        setOpenRouterFeedback({ ok: res.ok, message: res.message });
      } finally {
        setIsVerifyingOpenRouter(false);
      }
    };

    const handleSaveTtsToken = () => {
      const nextSnap = saveFloatingTtsServiceToken(ttsTokenInput);
      setCredentialSnapshot(nextSnap);
      setTtsTokenFeedback({
        ok: nextSnap.ttsToken.status === "valid",
        message:
          nextSnap.ttsToken.status === "valid"
            ? "TTS-Service token saved."
            : "TTS-Service token cleared.",
      });
    };

    const handleClearTtsToken = () => {
      setTtsTokenInput("");
      const nextSnap = saveFloatingTtsServiceToken("");
      setCredentialSnapshot(nextSnap);
      setTtsTokenFeedback({
        ok: false,
        message: "TTS-Service token cleared.",
      });
    };

    const handleVerifyTtsToken = async () => {
      setIsVerifyingTtsToken(true);
      setTtsTokenFeedback(null);
      try {
        const cleaned = ttsTokenInput.trim().replace(/^bearer\s+/i, "");
        if (cleaned !== getEffectiveTtsServiceToken()) {
          saveFloatingTtsServiceToken(cleaned);
        }
        const res = await verifyTtsServiceTokenCredential(cleaned);
        setCredentialSnapshot(getCredentialStatusSnapshot());
        setTtsTokenFeedback({ ok: res.ok, message: res.message });
      } finally {
        setIsVerifyingTtsToken(false);
      }
    };

    // Determine popover direction relative to viewport
    const opensUpward = typeof window !== "undefined" ? position.y > window.innerHeight / 2 : true;
    const alignsRight = typeof window !== "undefined" ? position.x > window.innerWidth / 2 : false;

    const isPlaybackActive = isVideoPlaying || isSpeaking;
    const isEffectivelyPaused = isSetupPaused || !isPlaybackActive;
    const activeOptionsCount =
      (isSetupPaused ? 1 : 0) + (isAutoScrollEnabled ? 1 : 0) + (isTtsPlayEnabled ? 1 : 0);

    const effectiveOpenRouterStatus: CredentialHealthStatus =
      openRouterStatusProp ?? credentialSnapshot.openRouter.status;
    const effectiveTtsTokenStatus: CredentialHealthStatus =
      ttsTokenStatusProp ?? credentialSnapshot.ttsToken.status;

    const shouldShowPlaytimeTooltip =
      !isOpen && (isHovered || showPlaytimeMobile) && !isDragging;
    const formattedCurrentTime = formatPlaytimeSeconds(currentTimeSec);
    const formattedDuration = durationSec > 0 ? formatPlaytimeSeconds(durationSec) : null;
    const playtimeLabel = formattedDuration
      ? `${formattedCurrentTime} / ${formattedDuration}`
      : formattedCurrentTime;

    return (
      <div
        ref={containerRef}
        data-testid="floating-draggable-pause-container"
        role="region"
        aria-label="Floating Controls Controller"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: "none",
          zIndex: 9999,
        }}
        className={`select-none ${className}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Trigger Button: 1 floating button of 1 icon */}
        <button
          type="button"
          data-testid="floating-pause-button"
          data-dropdown-trigger="true"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-pressed={isSetupPaused}
          aria-label={
            !isPlaybackActive
              ? `Play video${pauseReason ? ` (Paused: ${pauseReason})` : ""}`
              : "Pause video"
          }
          title={
            !isPlaybackActive
              ? `Play video - Time: ${playtimeLabel}${pauseReason ? ` (Paused: ${pauseReason})` : ""}`
              : `Pause video - Time: ${playtimeLabel}`
          }
          onClick={handleButtonClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md transition-all duration-150 active:scale-95 ${
            isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab hover:scale-105"
          } ${
            !isPlaybackActive
              ? "border-emerald-500 bg-emerald-600 text-white shadow-emerald-500/40 hover:bg-emerald-700 ring-2 ring-emerald-400/50"
              : "border-rose-500 bg-rose-600 text-white shadow-rose-500/40 hover:bg-rose-700 ring-2 ring-rose-400/50"
          }`}
        >
          <span data-testid="floating-dropdown-trigger" className="hidden" aria-hidden="true" />
          <span data-testid="floating-pause-status" className="sr-only">
            {!isPlaybackActive
              ? `Paused (OFF)${pauseReason ? ` - ${pauseReason}` : ""}`
              : isAutoScrollEnabled
                ? "Auto-Scroll ON"
                : "Playback Active (ON)"}
          </span>
          <span data-testid="floating-pause-badge" className="sr-only">
            {!isPlaybackActive ? "Playback Paused" : "Playback Active"}
          </span>

          {/* Exactly 1 icon */}
          {!isPlaybackActive ? (
            <Play className="h-5 w-5 fill-current shrink-0 ml-0.5" />
          ) : (
            <Pause className="h-5 w-5 fill-current shrink-0" />
          )}
        </button>

        {/* Floating Settings Button with OpenRouter API Key & TTS-Service Token Valid/Missing Indication */}
        <button
          type="button"
          data-testid="floating-menu-toggle-btn"
          aria-label={`Floating settings (OpenRouter: ${getCredentialBadgeText(effectiveOpenRouterStatus)}, TTS Token: ${getCredentialBadgeText(effectiveTtsTokenStatus)})`}
          title={`Floating settings — OpenRouter Key: ${getCredentialBadgeText(effectiveOpenRouterStatus)} · TTS Token: ${getCredentialBadgeText(effectiveTtsTokenStatus)}. Click to configure.`}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`absolute -top-3 ${alignsRight ? "-right-1" : "-left-1"} flex items-center gap-1 rounded-full bg-background/95 border border-border/90 px-1.5 py-0.5 text-[9px] font-semibold text-foreground shadow-md backdrop-blur-sm hover:bg-muted transition-transform active:scale-95 whitespace-nowrap cursor-pointer`}
        >
          <SlidersHorizontal className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          <span
            data-testid="floating-openrouter-status-indicator"
            data-status={effectiveOpenRouterStatus}
            onClick={(e) => {
              e.stopPropagation();
              openCredentialEditor("openrouter");
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-1 py-0.2 leading-tight cursor-pointer ${getCredentialPillClasses(effectiveOpenRouterStatus)}`}
            title={`OpenRouter API Key: ${getCredentialBadgeText(effectiveOpenRouterStatus)} — click to update`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCredentialDotClass(effectiveOpenRouterStatus)}`}
            />
            <span>OR {getCredentialBadgeText(effectiveOpenRouterStatus)}</span>
          </span>
          <span
            data-testid="floating-tts-token-status-indicator"
            data-status={effectiveTtsTokenStatus}
            onClick={(e) => {
              e.stopPropagation();
              openCredentialEditor("tts-token");
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-1 py-0.2 leading-tight cursor-pointer ${getCredentialPillClasses(effectiveTtsTokenStatus)}`}
            title={`TTS-Service Token: ${getCredentialBadgeText(effectiveTtsTokenStatus)} — click to update`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCredentialDotClass(effectiveTtsTokenStatus)}`}
            />
            <span>TTS {getCredentialBadgeText(effectiveTtsTokenStatus)}</span>
          </span>
        </button>

        {/* Playtime Tooltip on Hover / Long Press / After Click */}
        {shouldShowPlaytimeTooltip && (
          <div
            data-testid="floating-playtime-tooltip"
            role="tooltip"
            aria-live="polite"
            className={`absolute pointer-events-none z-50 rounded-md bg-neutral-900/90 text-white px-2 py-1 text-[11px] font-mono font-medium shadow-lg backdrop-blur-md border border-neutral-700/80 whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
              opensUpward ? "bottom-full mb-4" : "top-full mt-2"
            } ${alignsRight ? "right-0" : "left-0"}`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{playtimeLabel}</span>
          </div>
        )}

        {/* Pause Reason Tooltip / Notification Chip attached to floating button */}
        {isEffectivelyPaused && pauseReason && !isOpen && !shouldShowPlaytimeTooltip && (
          <div
            data-testid="floating-pause-reason-chip"
            className={`absolute pointer-events-none rounded-md bg-black/85 text-white px-2 py-1 text-[10px] font-medium shadow-md backdrop-blur-sm border border-white/20 whitespace-nowrap max-w-xs truncate transition-all duration-200 ${
              opensUpward ? "bottom-full mb-4" : "top-full mt-1.5"
            } ${alignsRight ? "right-0" : "left-0"}`}
            title={pauseReason}
          >
            {pauseReason}
          </div>
        )}

        {/* Dropdown Menu Popup */}
        {isOpen && (
          <div
            data-testid="floating-menu-dropdown"
            role="menu"
            aria-label="Floating Options Menu"
            className={`absolute w-80 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-xl border border-border/80 bg-popover/95 p-3.5 text-popover-foreground shadow-2xl backdrop-blur-md transition-all duration-150 ${
              opensUpward ? "bottom-full mb-4" : "top-full mt-2"
            } ${alignsRight ? "right-0" : "left-0"}`}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span>Floating Controls</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close floating menu"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Pause Reason Banner in Menu */}
              {isEffectivelyPaused && pauseReason && (
                <div
                  data-testid="floating-menu-pause-reason"
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs"
                >
                  <div className="font-semibold text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1 mb-0.5">
                    <Pause className="h-3 w-3 fill-current" />
                    <span>Pause Reason</span>
                  </div>
                  <div className="text-[11px] text-foreground font-medium">{pauseReason}</div>
                </div>
              )}

              {/* Option 1: Pause for Setup */}
              <div
                data-testid="menu-option-setup-pause"
                className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
                  isSetupPaused
                    ? "border-rose-400/80 bg-rose-500/10 text-foreground"
                    : "border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                }`}
                onClick={handleToggleSetupPauseOption}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        isSetupPaused ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {isSetupPaused ? (
                        <Pause className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-current" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Pause for Setup</div>
                      <div className="text-[10px] text-muted-foreground">
                        {isSetupPaused
                          ? "Playback & scrolling frozen (OFF)"
                          : "Normal playback active (ON)"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isSetupPaused
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {isSetupPaused ? "Paused" : "Off"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveExplanation((prev) =>
                          prev === "setup-pause" ? null : "setup-pause",
                        );
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Explain Pause for Setup"
                      aria-label="Explain Pause for Setup"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Explanation Text */}
                {(activeExplanation === "setup-pause" || isSetupPaused) && (
                  <div
                    data-testid="explanation-setup-pause"
                    className="mt-2 rounded bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground border-l-2 border-rose-500"
                  >
                    <p className="font-medium text-foreground mb-0.5">
                      Pause for Setup Explanation:
                    </p>
                    Freezes video playback, text-to-speech voice synthesis, and automatic scrolling to
                    allow configuring languages, parser criteria, and audio settings without
                    interruption.
                  </div>
                )}
              </div>

              {/* Option 2: Auto Scroll */}
              <div
                data-testid="menu-option-auto-scroll"
                className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
                  isAutoScrollEnabled
                    ? "border-emerald-500/80 bg-emerald-500/10 text-foreground"
                    : "border-rose-400/50 bg-rose-500/5 hover:border-rose-400 hover:bg-rose-500/10"
                }`}
                onClick={handleToggleAutoScrollOption}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        isAutoScrollEnabled
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-tight">
                        Auto-Scroll Subtitles
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isAutoScrollEnabled
                          ? "Auto-centering active row (ON)"
                          : "Manual scrolling only (OFF)"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isAutoScrollEnabled
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isAutoScrollEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveExplanation((prev) =>
                          prev === "auto-scroll" ? null : "auto-scroll",
                        );
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Explain Auto-Scroll"
                      aria-label="Explain Auto-Scroll"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Explanation Text */}
                {(activeExplanation === "auto-scroll" || isAutoScrollEnabled) && (
                  <div
                    data-testid="explanation-auto-scroll"
                    className="mt-2 rounded bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground border-l-2 border-emerald-500"
                  >
                    <p className="font-medium text-foreground mb-0.5">
                      Auto-Scroll Subtitles Explanation:
                    </p>
                    Automatically centers and scrolls the parallel subtitles table to follow the
                    active sentence and spoken dialogue during video playback. Automatically holds
                    for 5 seconds whenever you touch or scroll the screen.
                  </div>
                )}
              </div>

              {/* Option 3: TTS-Play */}
              <div
                data-testid="menu-option-tts-play"
                className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
                  isTtsPlayEnabled
                    ? "border-emerald-500/80 bg-emerald-500/10 text-foreground"
                    : "border-rose-400/50 bg-rose-500/5 hover:border-rose-400 hover:bg-rose-500/10"
                }`}
                onClick={handleToggleTtsPlayOption}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        isTtsPlayEnabled
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {isTtsPlayEnabled ? (
                        <Volume2 className="h-3.5 w-3.5" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-tight">TTS-Play</div>
                      <div className="text-[10px] text-muted-foreground">
                        {isTtsPlayEnabled
                          ? "Speak translated subtitles (ON)"
                          : "Automatic TTS paused (OFF)"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isTtsPlayEnabled
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isTtsPlayEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveExplanation((prev) => (prev === "tts-play" ? null : "tts-play"));
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Explain TTS-Play"
                      aria-label="Explain TTS-Play"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Explanation Text */}
                {(activeExplanation === "tts-play" || !isTtsPlayEnabled) && (
                  <div
                    data-testid="explanation-tts-play"
                    className="mt-2 rounded bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground border-l-2 border-emerald-500"
                  >
                    <p className="font-medium text-foreground mb-0.5">TTS-Play Explanation:</p>
                    Automatically pauses the video between subtitle sections to speak enabled
                    translations via text-to-speech, and resumes video playback once speech
                    finishes.
                  </div>
                )}
              </div>

              {/* Option 4 & 5: API Keys & Tokens (OpenRouter API Key & TTS-Service Token) */}
              <div
                data-testid="floating-menu-credentials-section"
                className="pt-1.5 border-t border-border/60 space-y-2"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                  API Keys &amp; Tokens (Click to Update)
                </div>

                {/* OpenRouter API Key Row */}
                <div
                  data-testid="floating-menu-openrouter-item"
                  className={`rounded-lg border p-2 transition-colors ${
                    effectiveOpenRouterStatus === "valid"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : effectiveOpenRouterStatus === "invalid"
                        ? "border-rose-500/50 bg-rose-500/10"
                        : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <button
                    type="button"
                    data-testid="floating-menu-openrouter-toggle"
                    onClick={() =>
                      setActiveCredentialEditor((prev) =>
                        prev === "openrouter" ? null : "openrouter",
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight truncate">
                          OpenRouter API Key
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Click to update key
                        </div>
                      </div>
                    </div>
                    <span
                      data-testid="floating-menu-openrouter-badge"
                      data-status={effectiveOpenRouterStatus}
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${getCredentialPillClasses(effectiveOpenRouterStatus)}`}
                    >
                      {effectiveOpenRouterStatus === "valid" ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      )}
                      <span>{getCredentialBadgeText(effectiveOpenRouterStatus)}</span>
                    </span>
                  </button>

                  {activeCredentialEditor === "openrouter" && (
                    <div
                      data-testid="floating-openrouter-editor"
                      className="mt-2 pt-2 border-t border-border/50 space-y-1.5"
                    >
                      <div className="relative">
                        <input
                          type={showOpenRouterSecret ? "text" : "password"}
                          data-testid="floating-openrouter-key-input"
                          value={openRouterInput}
                          onChange={(e) => {
                            setOpenRouterInput(e.target.value);
                            setOpenRouterFeedback(null);
                          }}
                          placeholder="sk-or-v1-..."
                          aria-label="OpenRouter API Key"
                          className="w-full rounded border border-input bg-background px-2 py-1 pr-7 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60"
                        />
                        <button
                          type="button"
                          data-testid="floating-openrouter-toggle-visibility"
                          onClick={() => setShowOpenRouterSecret((s) => !s)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showOpenRouterSecret ? "Hide key" : "Show key"}
                        >
                          {showOpenRouterSecret ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          data-testid="floating-openrouter-save-btn"
                          onClick={handleSaveOpenRouter}
                          className="rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          data-testid="floating-openrouter-verify-btn"
                          disabled={isVerifyingOpenRouter}
                          onClick={handleVerifyOpenRouter}
                          className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingOpenRouter && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          <span>Verify</span>
                        </button>
                        {openRouterInput && (
                          <button
                            type="button"
                            data-testid="floating-openrouter-clear-btn"
                            onClick={handleClearOpenRouter}
                            className="rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        {onOpenOpenRouterSettings && (
                          <button
                            type="button"
                            data-testid="floating-openrouter-full-settings-btn"
                            onClick={() => {
                              setIsOpen(false);
                              onOpenOpenRouterSettings();
                            }}
                            className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline cursor-pointer"
                          >
                            <span>Full Settings</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      {(openRouterFeedback || credentialSnapshot.openRouter.lastError) && (
                        <div
                          data-testid="floating-openrouter-feedback"
                          className={`rounded px-2 py-1 text-[10px] ${
                            openRouterFeedback?.ok
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {openRouterFeedback?.message || credentialSnapshot.openRouter.lastError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TTS-Service Token Row */}
                <div
                  data-testid="floating-menu-tts-token-item"
                  className={`rounded-lg border p-2 transition-colors ${
                    effectiveTtsTokenStatus === "valid"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : effectiveTtsTokenStatus === "invalid"
                        ? "border-rose-500/50 bg-rose-500/10"
                        : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <button
                    type="button"
                    data-testid="floating-menu-tts-token-toggle"
                    onClick={() =>
                      setActiveCredentialEditor((prev) =>
                        prev === "tts-token" ? null : "tts-token",
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Volume2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight truncate">
                          TTS-Service Token
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Click to update token
                        </div>
                      </div>
                    </div>
                    <span
                      data-testid="floating-menu-tts-token-badge"
                      data-status={effectiveTtsTokenStatus}
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${getCredentialPillClasses(effectiveTtsTokenStatus)}`}
                    >
                      {effectiveTtsTokenStatus === "valid" ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : (
                        <AlertTriangle className="h-2.5 w-2.5" />
                      )}
                      <span>{getCredentialBadgeText(effectiveTtsTokenStatus)}</span>
                    </span>
                  </button>

                  {activeCredentialEditor === "tts-token" && (
                    <div
                      data-testid="floating-tts-token-editor"
                      className="mt-2 pt-2 border-t border-border/50 space-y-1.5"
                    >
                      <div className="relative">
                        <input
                          type={showTtsTokenSecret ? "text" : "password"}
                          data-testid="floating-tts-token-input"
                          value={ttsTokenInput}
                          onChange={(e) => {
                            setTtsTokenInput(e.target.value);
                            setTtsTokenFeedback(null);
                          }}
                          placeholder="spk_... or Bearer spk_..."
                          aria-label="TTS-Service Token"
                          className="w-full rounded border border-input bg-background px-2 py-1 pr-7 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60"
                        />
                        <button
                          type="button"
                          data-testid="floating-tts-token-toggle-visibility"
                          onClick={() => setShowTtsTokenSecret((s) => !s)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showTtsTokenSecret ? "Hide token" : "Show token"}
                        >
                          {showTtsTokenSecret ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          data-testid="floating-tts-token-save-btn"
                          onClick={handleSaveTtsToken}
                          className="rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          data-testid="floating-tts-token-verify-btn"
                          disabled={isVerifyingTtsToken}
                          onClick={handleVerifyTtsToken}
                          className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingTtsToken && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          <span>Verify</span>
                        </button>
                        {ttsTokenInput && (
                          <button
                            type="button"
                            data-testid="floating-tts-token-clear-btn"
                            onClick={handleClearTtsToken}
                            className="rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        {onOpenTtsServiceSettings && (
                          <button
                            type="button"
                            data-testid="floating-tts-token-full-settings-btn"
                            onClick={() => {
                              setIsOpen(false);
                              onOpenTtsServiceSettings();
                            }}
                            className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline cursor-pointer"
                          >
                            <span>Full Settings</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      {(ttsTokenFeedback || credentialSnapshot.ttsToken.lastError) && (
                        <div
                          data-testid="floating-tts-token-feedback"
                          className={`rounded px-2 py-1 text-[10px] ${
                            ttsTokenFeedback?.ok
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {ttsTokenFeedback?.message || credentialSnapshot.ttsToken.lastError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Guidance */}
            <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Drag handle to reposition anywhere</span>
              <span className="flex items-center gap-1 font-medium">
                {activeOptionsCount > 0 ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                )}
                {activeOptionsCount > 0 ? `${activeOptionsCount} Active` : "Inactive"}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default FloatingDraggablePauseButton;
