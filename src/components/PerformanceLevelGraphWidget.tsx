import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GripHorizontal,
  Minimize2,
  Maximize2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  NON_OBLIGATORY_ELEMENTS,
  disableAllNonObligatoryElements,
  isElementEnabled,
  setElementEnabled,
  useElementOverrides,
  usePerformanceMode,
  type NonObligatoryElementId,
} from "@/utils/performanceModeManager";
import {
  applySavedVisualPerfFlags,
  evaluateOptionImpactVerdict,
  getBackdropBlurDisabled,
  getOptionMetaLabel,
  setBackdropBlurDisabled,
  usePerformanceTelemetry,
  VISUAL_PERF_OPTIONS,
  type OptionImpactRecord,
  type PerfSample,
} from "@/utils/performanceTelemetry";

export interface PerformanceLevelGraphWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  initialSamples?: PerfSample[];
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
}

const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 360;
const MIN_WIDTH = 260;
const MIN_HEIGHT = 230;
const MAX_WIDTH = 720;
const MAX_HEIGHT = 640;

const POS_STORAGE_KEY = "yt_perf_graph_pos_v1";
const SIZE_STORAGE_KEY = "yt_perf_graph_size_v1";

function clampPosition(
  pos: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(8, window.innerWidth - Math.min(size.width, window.innerWidth - 16) - 8);
  const maxY = Math.max(8, window.innerHeight - 64);
  return {
    x: Math.max(8, Math.min(maxX, pos.x)),
    y: Math.max(8, Math.min(maxY, pos.y)),
  };
}

function clampSize(size: { width: number; height: number }): { width: number; height: number } {
  const maxW =
    typeof window !== "undefined" ? Math.min(MAX_WIDTH, window.innerWidth - 16) : MAX_WIDTH;
  const maxH =
    typeof window !== "undefined" ? Math.min(MAX_HEIGHT, window.innerHeight - 16) : MAX_HEIGHT;
  return {
    width: Math.max(Math.min(MIN_WIDTH, maxW), Math.min(maxW, size.width)),
    height: Math.max(Math.min(MIN_HEIGHT, maxH), Math.min(maxH, size.height)),
  };
}

export const PerformanceLevelGraphWidget: React.FC<PerformanceLevelGraphWidgetProps> = ({
  isOpen,
  onClose,
  initialSamples,
  initialPosition,
  initialSize,
}) => {
  usePerformanceMode();
  useElementOverrides();

  const [isMinimized, setIsMinimized] = useState(false);
  const [disableBlur, setDisableBlur] = useState<boolean>(() => getBackdropBlurDisabled());
  const [impactLog, setImpactLog] = useState<OptionImpactRecord[]>([]);

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (initialSize) return clampSize(initialSize);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SIZE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.width === "number" && typeof parsed?.height === "number") {
            return clampSize(parsed);
          }
        }
      } catch {
        // ignore
      }
      const w = Math.min(DEFAULT_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 24));
      return { width: w, height: DEFAULT_HEIGHT };
    }
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (initialPosition) return initialPosition;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(POS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
            return clampPosition(parsed, { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
          }
        }
      } catch {
        // ignore
      }
      return {
        x: Math.max(12, window.innerWidth - DEFAULT_WIDTH - 16),
        y: 68,
      };
    }
    return { x: 16, y: 68 };
  });

  useEffect(() => {
    applySavedVisualPerfFlags();
  }, []);

  const {
    samples: liveSamples,
    currentFps: liveFps,
    avgFrameMs: liveAvgFrameMs,
    maxFrameMs: liveMaxFrameMs,
    droppedFrames,
    longTasksTotal,
    latestMetricsRef,
    clearHistory,
  } = usePerformanceTelemetry(isOpen);

  const samples = liveSamples.length > 0 ? liveSamples : initialSamples || [];
  const currentFps =
    liveSamples.length > 0
      ? liveFps
      : samples.length > 0
        ? samples[samples.length - 1]!.fps
        : 60;
  const avgFrameMs =
    liveSamples.length > 0
      ? liveAvgFrameMs
      : samples.length > 0
        ? Number((samples.reduce((s, p) => s + p.frameMs, 0) / samples.length).toFixed(1))
        : 16.7;
  const maxFrameMs =
    liveSamples.length > 0
      ? liveMaxFrameMs
      : samples.length > 0
        ? Number(Math.max(...samples.map((p) => p.peakFrameMs)).toFixed(1))
        : 16.7;

  // Dragging state
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (dragRef.current?.active) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const nextPos = clampPosition(
          { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy },
          size,
        );
        setPosition(nextPos);
      } else if (resizeRef.current?.active) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        const nextSize = clampSize({
          width: resizeRef.current.origW + dx,
          height: resizeRef.current.origH + dy,
        });
        setSize(nextSize);
      }
    };

    const handlePointerUp = () => {
      if (dragRef.current?.active) {
        dragRef.current.active = false;
        try {
          localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(position));
        } catch {
          // ignore
        }
      }
      if (resizeRef.current?.active) {
        resizeRef.current.active = false;
        try {
          localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isOpen, position, size]);

  const recordOptionToggleCheck = useCallback(
    (optionId: string, enabled: boolean) => {
      const baselineFps = latestMetricsRef.current.fps || currentFps;
      const baselineFrameMs = latestMetricsRef.current.frameMs || avgFrameMs;
      const entryTs = Date.now();
      const label = getOptionMetaLabel(optionId);

      setImpactLog((prev) => [
        {
          optionId,
          label,
          enabled,
          baselineFps,
          measuredFps: baselineFps,
          baselineFrameMs,
          measuredFrameMs: baselineFrameMs,
          peakFrameMs: latestMetricsRef.current.peakFrameMs || baselineFrameMs,
          verdict: "measuring",
          timestamp: entryTs,
        },
        ...prev.filter((item) => item.optionId !== optionId).slice(0, 5),
      ]);

      const timer = window.setTimeout(() => {
        const measuredFps = latestMetricsRef.current.fps || baselineFps;
        const measuredFrameMs = latestMetricsRef.current.frameMs || baselineFrameMs;
        const peakFrameMs = latestMetricsRef.current.peakFrameMs || measuredFrameMs;
        const verdict = evaluateOptionImpactVerdict(
          baselineFps,
          measuredFps,
          baselineFrameMs,
          measuredFrameMs,
          peakFrameMs,
        );
        setImpactLog((prev) =>
          prev.map((item) =>
            item.timestamp === entryTs && item.optionId === optionId
              ? { ...item, measuredFps, measuredFrameMs, peakFrameMs, verdict }
              : item,
          ),
        );
      }, 900);
      timersRef.current.push(timer);
    },
    [avgFrameMs, currentFps, latestMetricsRef],
  );

  const handleToggleElementOption = useCallback(
    (id: NonObligatoryElementId) => {
      const next = !isElementEnabled(id);
      setElementEnabled(id, next);
      recordOptionToggleCheck(id, next);
    },
    [recordOptionToggleCheck],
  );

  const handleToggleBackdropBlurOption = useCallback(() => {
    const next = !disableBlur;
    setDisableBlur(next);
    setBackdropBlurDisabled(next);
    recordOptionToggleCheck("disable_backdrop_blur", next);
  }, [disableBlur, recordOptionToggleCheck]);

  // SVG chart geometry
  const chartGeom = useMemo(() => {
    const w = 280;
    const h = 76;
    const display = samples.length > 0 ? samples : [{ timestamp: 0, fps: 60, frameMs: 16.7, peakFrameMs: 16.7, longTasks: 0 }];
    const count = display.length;
    const fpsPoints = display
      .map((s, idx) => {
        const x = count === 1 ? w : (idx / (count - 1)) * w;
        const clampedFps = Math.max(0, Math.min(70, s.fps));
        const y = h - (clampedFps / 70) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const msPoints = display
      .map((s, idx) => {
        const x = count === 1 ? w : (idx / (count - 1)) * w;
        const clampedMs = Math.max(0, Math.min(60, s.frameMs));
        const y = h - (clampedMs / 60) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const fpsArea = `0,${h} ${fpsPoints} ${w},${h}`;
    return { w, h, fpsPoints, msPoints, fpsArea };
  }, [samples]);

  const statusTone =
    currentFps >= 50 && avgFrameMs <= 22
      ? "text-emerald-500"
      : currentFps >= 32
        ? "text-amber-500"
        : "text-rose-500";

  if (!isOpen) return null;

  return (
    <aside
      data-testid="performance-level-graph-widget"
      id="performance-level-graph-widget"
      role="dialog"
      aria-label="Performance Level Graph & Option Defection Inspector"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
      }}
      className="fixed z-50 flex flex-col rounded-xl border border-border bg-card/98 text-card-foreground shadow-2xl overflow-hidden select-none"
    >
      {/* Draggable Header Bar */}
      <div
        data-testid="performance-graph-drag-handle"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: position.x,
            origY: position.y,
          };
        }}
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/70 border-b border-border cursor-grab active:cursor-grabbing touch-none shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Activity className={`h-3.5 w-3.5 shrink-0 ${statusTone}`} />
          <span className="text-[11px] font-semibold truncate">Performance Level</span>
          <span
            data-testid="performance-graph-fps-badge"
            className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-background/80 border border-border/70 ${statusTone}`}
          >
            {currentFps} FPS
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="performance-graph-clear-btn"
            onClick={() => {
              clearHistory();
              setImpactLog([]);
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset graph history"
            aria-label="Reset performance graph history"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            data-testid="performance-graph-minimize-btn"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title={isMinimized ? "Expand performance graph" : "Minimize performance graph"}
            aria-label={isMinimized ? "Expand performance graph" : "Minimize performance graph"}
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            data-testid="performance-graph-close-btn"
            onClick={onClose}
            className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer"
            title="Close performance level graph"
            aria-label="Close performance level graph"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 min-h-0 flex flex-col p-2.5 gap-2 overflow-y-auto select-text">
          {/* Metrics Strip */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono shrink-0">
            <div className="rounded border border-border/60 bg-muted/30 px-1.5 py-1 text-center">
              <div className="text-muted-foreground text-[9px]">FPS</div>
              <div className={`font-bold ${statusTone}`}>{currentFps}</div>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 px-1.5 py-1 text-center">
              <div className="text-muted-foreground text-[9px]">AVG MS</div>
              <div className="font-bold text-foreground">{avgFrameMs}</div>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 px-1.5 py-1 text-center">
              <div className="text-muted-foreground text-[9px]">PEAK MS</div>
              <div
                className={`font-bold ${maxFrameMs >= 45 ? "text-rose-500" : "text-foreground"}`}
              >
                {maxFrameMs}
              </div>
            </div>
            <div className="rounded border border-border/60 bg-muted/30 px-1.5 py-1 text-center">
              <div className="text-muted-foreground text-[9px]">DROPS/LT</div>
              <div className="font-bold text-foreground">
                {droppedFrames}/{longTasksTotal}
              </div>
            </div>
          </div>

          {/* Live Graph */}
          <div className="rounded-lg border border-border/70 bg-background/80 p-1.5 shrink-0">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground mb-1 px-0.5">
              <span className="text-emerald-500">FPS (green)</span>
              <span className="text-amber-500">Frame ms (amber)</span>
            </div>
            <svg
              data-testid="performance-level-svg-graph"
              viewBox={`0 0 ${chartGeom.w} ${chartGeom.h}`}
              className="w-full h-20 overflow-visible"
              preserveAspectRatio="none"
            >
              {/* 60fps reference (16.7ms) */}
              <line
                x1="0"
                y1={chartGeom.h - (60 / 70) * (chartGeom.h - 6) - 3}
                x2={chartGeom.w}
                y2={chartGeom.h - (60 / 70) * (chartGeom.h - 6) - 3}
                stroke="currentColor"
                strokeOpacity="0.14"
                strokeDasharray="3 3"
              />
              {/* 30fps reference */}
              <line
                x1="0"
                y1={chartGeom.h - (30 / 70) * (chartGeom.h - 6) - 3}
                x2={chartGeom.w}
                y2={chartGeom.h - (30 / 70) * (chartGeom.h - 6) - 3}
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeDasharray="2 4"
              />
              <polygon
                points={chartGeom.fpsArea}
                fill="rgb(16 185 129 / 0.14)"
              />
              <polyline
                fill="none"
                stroke="rgb(16 185 129)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                points={chartGeom.fpsPoints}
              />
              <polyline
                fill="none"
                stroke="rgb(245 158 11)"
                strokeWidth="1.3"
                strokeDasharray="2 2"
                strokeLinejoin="round"
                points={chartGeom.msPoints}
              />
            </svg>
          </div>

          {/* Option Defection Probe Results */}
          {impactLog.length > 0 && (
            <div
              data-testid="performance-defection-log"
              className="rounded-md border border-border/70 bg-muted/20 p-1.5 space-y-1 shrink-0"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Option Impact Checks
              </div>
              {impactLog.map((item) => (
                <div
                  key={`${item.optionId}-${item.timestamp}`}
                  data-testid={`perf-impact-row-${item.optionId}`}
                  className="flex items-center justify-between gap-1.5 text-[10px] px-1.5 py-0.5 rounded bg-background/70 border border-border/50"
                >
                  <span className="truncate font-medium">
                    {item.label} ({item.enabled ? "ON" : "OFF"})
                  </span>
                  <span
                    className={`font-mono shrink-0 flex items-center gap-1 ${
                      item.verdict === "degraded"
                        ? "text-rose-500 font-bold"
                        : item.verdict === "improved"
                          ? "text-emerald-500 font-bold"
                          : "text-muted-foreground"
                    }`}
                  >
                    {item.verdict === "degraded" && <AlertTriangle className="h-2.5 w-2.5" />}
                    {item.verdict === "improved" && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {item.verdict === "measuring"
                      ? "Measuring…"
                      : `${item.baselineFps}->${item.measuredFps}fps (${item.peakFrameMs}ms)`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Checkable Options to Isolate Performance Defection */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Test Options (Toggle to check impact)
              </span>
              <button
                type="button"
                data-testid="perf-graph-disable-all-btn"
                onClick={() => {
                  disableAllNonObligatoryElements();
                  setDisableBlur(true);
                  setBackdropBlurDisabled(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Fastest</span>
              </button>
            </div>

            <div className="space-y-1">
              {VISUAL_PERF_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  data-testid={`perf-graph-option-${opt.id}`}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/60 bg-background/60 hover:bg-muted/40 text-[11px] cursor-pointer"
                >
                  <span className="truncate" title={opt.description}>
                    {opt.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={disableBlur}
                    onChange={handleToggleBackdropBlurOption}
                    className="h-3.5 w-3.5 accent-primary cursor-pointer shrink-0"
                  />
                </label>
              ))}

              {NON_OBLIGATORY_ELEMENTS.map((el) => {
                const enabled = isElementEnabled(el.id);
                return (
                  <label
                    key={el.id}
                    data-testid={`perf-graph-option-${el.id}`}
                    className={`flex items-center justify-between gap-2 px-2 py-1 rounded border text-[11px] cursor-pointer transition-colors ${
                      enabled
                        ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                        : "border-border/50 bg-background/50 text-muted-foreground"
                    }`}
                  >
                    <span className="truncate" title={el.description}>
                      {el.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggleElementOption(el.id)}
                      className="h-3.5 w-3.5 accent-primary cursor-pointer shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Right Resize Handle */}
      {!isMinimized && (
        <div
          data-testid="performance-graph-resize-handle"
          role="separator"
          aria-label="Resize performance graph"
          title="Drag to resize"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resizeRef.current = {
              active: true,
              startX: e.clientX,
              startY: e.clientY,
              origW: size.width,
              origH: size.height,
            };
          }}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none flex items-end justify-end p-0.5 text-muted-foreground/70 hover:text-primary"
        >
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </aside>
  );
};
