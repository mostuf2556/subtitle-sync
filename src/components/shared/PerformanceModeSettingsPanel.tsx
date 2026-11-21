import React, { useState } from "react";
import {
  Activity,
  Zap,
  Gauge,
  EyeOff,
  Eye,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  usePerformanceMode,
  useElementOverrides,
  setPerformanceMode,
  setElementEnabled,
  disableAllNonObligatoryElements,
  enableAllNonObligatoryElements,
  resetPerformanceModeToDefault,
  NON_OBLIGATORY_ELEMENTS,
  isElementEnabled,
} from "@/utils/performanceModeManager";

export interface PerformanceModeSettingsPanelProps {
  className?: string;
  onOpenPerformanceGraph?: () => void;
}

export const PerformanceModeSettingsPanel: React.FC<PerformanceModeSettingsPanelProps> = ({
  className = "",
  onOpenPerformanceGraph,
}) => {
  const currentMode = usePerformanceMode();
  const overrides = useElementOverrides();
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const enabledCount = NON_OBLIGATORY_ELEMENTS.filter((el) => isElementEnabled(el.id)).length;
  const totalCount = NON_OBLIGATORY_ELEMENTS.length;

  return (
    <div
      data-testid="performance-mode-panel"
      id="performance-mode-panel"
      className={`rounded-lg border border-border/80 bg-card p-4 space-y-4 shadow-sm ${className}`}
    >
      {/* Header with Mode Description */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 font-semibold">
              <Zap className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Performance Mode: Fast vs. Slow
            </h4>
            <Badge
              variant={currentMode === "fast" ? "default" : "secondary"}
              className={`text-[11px] font-medium uppercase tracking-wider ${
                currentMode === "fast"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentMode === "fast" ? "Fast (Default)" : "Slow Mode"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentMode === "fast"
              ? "Fast Mode active: all non-obligatory elements and debug routines are hidden and disabled by default for maximum speed."
              : "Slow Mode active: all auxiliary debuggers, timing labs, swipers, and experimental panels are enabled."}
          </p>
        </div>

        {/* Global Action Buttons: Graph View / Disable All / Enable All */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="perf-open-graph-btn"
            id="perf-open-graph-btn"
            onClick={() => {
              onOpenPerformanceGraph?.();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("yt-toggle-performance-graph"));
              }
            }}
            className="h-8 gap-1.5 text-xs font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            title="Open draggable & resizable live performance level graph"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            <span>Perf Graph</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={currentMode === "fast" && enabledCount === 0 ? "default" : "outline"}
            data-testid="perf-disable-all"
            id="perf-disable-all"
            onClick={() => disableAllNonObligatoryElements()}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Disable All
          </Button>

          <Button
            type="button"
            size="sm"
            variant={currentMode === "slow" && enabledCount === totalCount ? "default" : "outline"}
            data-testid="perf-enable-all"
            id="perf-enable-all"
            onClick={() => enableAllNonObligatoryElements()}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            Enable All
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Reset to default Fast Mode"
            data-testid="perf-reset-defaults"
            id="perf-reset-defaults"
            onClick={() => resetPerformanceModeToDefault()}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Mode Switcher Segmented Control */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          data-testid="perf-mode-fast-btn"
          id="perf-mode-fast-btn"
          onClick={() => setPerformanceMode("fast")}
          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
            currentMode === "fast"
              ? "border-emerald-500/80 bg-emerald-500/10 shadow-xs"
              : "border-border/60 hover:bg-muted/40"
          }`}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-600">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
              <span>Fast Mode</span>
              <span className="text-[10px] text-emerald-600 font-semibold">(Recommended)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Hides and disables non-obligatory elements (debuggers, timing lab, multi-video swiper) for clean, responsive operation.
            </p>
          </div>
        </button>

        <button
          type="button"
          data-testid="perf-mode-slow-btn"
          id="perf-mode-slow-btn"
          onClick={() => setPerformanceMode("slow")}
          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
            currentMode === "slow"
              ? "border-amber-500/80 bg-amber-500/10 shadow-xs"
              : "border-border/60 hover:bg-muted/40"
          }`}
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-600">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-xs text-foreground">
              <span>Slow Mode</span>
              <span className="text-[10px] text-muted-foreground font-normal">(Full Inspection)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Enables all developer panels, network inspectors, experimental timing labs, and state telemetry recorders.
            </p>
          </div>
        </button>
      </div>

      {/* Expandable Granular Elements Configuration */}
      <div className="border border-border/60 rounded-md bg-muted/20">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
          data-testid="perf-toggle-details"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Customize Individual Non-Obligatory Elements</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
              {enabledCount}/{totalCount} Active
            </Badge>
          </div>
          {showDetails ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {showDetails && (
          <div className="p-3 border-t border-border/60 space-y-2.5">
            <p className="text-[11px] text-muted-foreground">
              Toggle specific elements on or off. Individual settings override the global mode.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {NON_OBLIGATORY_ELEMENTS.map((el) => {
                const isEnabled = isElementEnabled(el.id);
                const hasCustomOverride = Object.prototype.hasOwnProperty.call(overrides, el.id);

                return (
                  <div
                    key={el.id}
                    data-testid={`perf-el-item-${el.id}`}
                    className={`flex items-start justify-between gap-2.5 p-2 rounded-md border text-xs transition-colors ${
                      isEnabled
                        ? "border-primary/40 bg-card"
                        : "border-border/40 bg-muted/40 opacity-75"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground text-[11px]">{el.label}</span>
                        {hasCustomOverride && (
                          <span className="text-[9px] text-muted-foreground uppercase font-mono">
                            (custom)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                        {el.description}
                      </p>
                    </div>

                    <Switch
                      id={`switch-perf-${el.id}`}
                      data-testid={`switch-perf-${el.id}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => setElementEnabled(el.id, checked)}
                      className="shrink-0 mt-0.5"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
