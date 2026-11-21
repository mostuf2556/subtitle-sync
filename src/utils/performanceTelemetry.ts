import { useCallback, useEffect, useRef, useState } from "react";
import {
  NON_OBLIGATORY_ELEMENTS,
  type NonObligatoryElementId,
} from "./performanceModeManager";

export interface PerfSample {
  timestamp: number;
  fps: number;
  frameMs: number;
  peakFrameMs: number;
  longTasks: number;
}

export interface OptionImpactRecord {
  optionId: string;
  label: string;
  enabled: boolean;
  baselineFps: number;
  measuredFps: number;
  baselineFrameMs: number;
  measuredFrameMs: number;
  peakFrameMs: number;
  verdict: "ok" | "degraded" | "improved" | "measuring";
  timestamp: number;
}

export interface VisualPerfOptionMeta {
  id: "disable_backdrop_blur";
  label: string;
  description: string;
}

export const VISUAL_PERF_OPTIONS: VisualPerfOptionMeta[] = [
  {
    id: "disable_backdrop_blur",
    label: "Disable Backdrop Blur (Menu Compositing)",
    description: "Turns off CSS backdrop-blur shaders that can stall WebView menus",
  },
];

const BACKDROP_BLUR_DISABLED_KEY = "yt_perf_disable_backdrop_blur_v1";

export function getBackdropBlurDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BACKDROP_BLUR_DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBackdropBlurDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKDROP_BLUR_DISABLED_KEY, disabled ? "1" : "0");
    document.documentElement.classList.toggle("perf-disable-backdrop-blur", disabled);
  } catch {
    // ignore
  }
}

export function applySavedVisualPerfFlags(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(
    "perf-disable-backdrop-blur",
    getBackdropBlurDisabled(),
  );
}

/**
 * Classifies frame time delta / FPS drop after toggling an option to help identify
 * which feature triggers UI performance defection.
 */
export function evaluateOptionImpactVerdict(
  baselineFps: number,
  measuredFps: number,
  baselineFrameMs: number,
  measuredFrameMs: number,
  peakFrameMs: number,
): "ok" | "degraded" | "improved" {
  const fpsDrop = baselineFps - measuredFps;
  const frameMsIncrease = measuredFrameMs - baselineFrameMs;
  if (fpsDrop >= 6 || frameMsIncrease >= 6 || peakFrameMs >= 45 || measuredFps < 35) {
    return "degraded";
  }
  if (measuredFps - baselineFps >= 5 || baselineFrameMs - measuredFrameMs >= 4) {
    return "improved";
  }
  return "ok";
}

export function getOptionMetaLabel(optionId: string): string {
  const nonObligatory = NON_OBLIGATORY_ELEMENTS.find(
    (item) => item.id === (optionId as NonObligatoryElementId),
  );
  if (nonObligatory) return nonObligatory.label;
  const visual = VISUAL_PERF_OPTIONS.find((item) => item.id === optionId);
  if (visual) return visual.label;
  return optionId;
}

const MAX_SAMPLES = 48;

export function usePerformanceTelemetry(active: boolean) {
  const [samples, setSamples] = useState<PerfSample[]>([]);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [longTasksTotal, setLongTasksTotal] = useState(0);

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const bucketStartRef = useRef<number>(0);
  const bucketLongTasksRef = useRef<number>(0);
  const latestMetricsRef = useRef<{ fps: number; frameMs: number; peakFrameMs: number }>({
    fps: 60,
    frameMs: 16.7,
    peakFrameMs: 16.7,
  });

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let rafId = 0;
    let observer: PerformanceObserver | null = null;
    lastFrameTimeRef.current = performance.now();
    bucketStartRef.current = lastFrameTimeRef.current;
    frameTimesRef.current = [];
    bucketLongTasksRef.current = 0;

    try {
      if (typeof PerformanceObserver !== "undefined") {
        const supported = PerformanceObserver.supportedEntryTypes || [];
        if (supported.includes("longtask")) {
          observer = new PerformanceObserver((list) => {
            const count = list.getEntries().length;
            if (count > 0) {
              bucketLongTasksRef.current += count;
              setLongTasksTotal((prev) => prev + count);
            }
          });
          observer.observe({ entryTypes: ["longtask"] });
        }
      }
    } catch {
      // ignore PerformanceObserver unsupported environments
    }

    const tick = (now: number) => {
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (dt > 0 && dt < 2000) {
        frameTimesRef.current.push(dt);
        if (dt > 34) {
          setDroppedFrames((prev) => prev + 1);
        }
      }

      if (now - bucketStartRef.current >= 250) {
        const frames = frameTimesRef.current;
        const count = frames.length;
        const avgMs =
          count > 0 ? frames.reduce((acc, v) => acc + v, 0) / count : 16.7;
        const peakMs = count > 0 ? Math.max(...frames) : 16.7;
        const elapsedSec = (now - bucketStartRef.current) / 1000;
        const fps = elapsedSec > 0 ? Math.min(120, Math.round(count / elapsedSec)) : 60;
        const sample: PerfSample = {
          timestamp: Date.now(),
          fps,
          frameMs: Number(avgMs.toFixed(1)),
          peakFrameMs: Number(peakMs.toFixed(1)),
          longTasks: bucketLongTasksRef.current,
        };
        latestMetricsRef.current = {
          fps: sample.fps,
          frameMs: sample.frameMs,
          peakFrameMs: sample.peakFrameMs,
        };
        setSamples((prev) => {
          const next = [...prev, sample];
          return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
        });

        frameTimesRef.current = [];
        bucketLongTasksRef.current = 0;
        bucketStartRef.current = now;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      try {
        observer?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [active]);

  const clearHistory = useCallback(() => {
    setSamples([]);
    setDroppedFrames(0);
    setLongTasksTotal(0);
  }, []);

  const latest = samples[samples.length - 1];
  const currentFps = latest?.fps ?? 60;
  const avgFrameMs =
    samples.length > 0
      ? Number(
          (samples.reduce((sum, s) => sum + s.frameMs, 0) / samples.length).toFixed(1),
        )
      : 16.7;
  const maxFrameMs =
    samples.length > 0
      ? Number(Math.max(...samples.map((s) => s.peakFrameMs)).toFixed(1))
      : 16.7;

  return {
    samples,
    currentFps,
    avgFrameMs,
    maxFrameMs,
    droppedFrames,
    longTasksTotal,
    latestMetricsRef,
    clearHistory,
  };
}
