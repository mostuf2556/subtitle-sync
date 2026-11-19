import React from "react";

export type AccentPaletteId =
  | "default"
  | "rainbow"
  | "duolingo"
  | "ocean"
  | "emerald"
  | "sunset"
  | "violet"
  | "rose";

export interface AccentPaletteOption {
  id: AccentPaletteId;
  label: string;
  swatchClass: string;
}

export const ACCENT_PALETTE_STORAGE_KEY = "yt_accent_palette_v1";
export const ACCENT_BG_OPACITY_STORAGE_KEY = "yt_accent_bg_opacity_v1";
export const DEFAULT_ACCENT_BG_OPACITY = 35;

export const ACCENT_PALETTE_OPTIONS: readonly AccentPaletteOption[] = [
  { id: "default", label: "Default", swatchClass: "bg-slate-400" },
  {
    id: "rainbow",
    label: "Rainbow",
    swatchClass: "bg-gradient-to-r from-red-500 via-yellow-400 via-emerald-400 to-violet-500",
  },
  {
    id: "duolingo",
    label: "Duolingo",
    swatchClass: "bg-gradient-to-br from-[#58CC02] via-[#58CC02] to-[#FFC800]",
  },
  { id: "ocean", label: "Ocean", swatchClass: "bg-sky-500" },
  { id: "emerald", label: "Emerald", swatchClass: "bg-emerald-500" },
  { id: "sunset", label: "Sunset", swatchClass: "bg-orange-500" },
  { id: "violet", label: "Violet", swatchClass: "bg-violet-500" },
  { id: "rose", label: "Rose", swatchClass: "bg-rose-500" },
] as const;

export function clampAccentBgOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ACCENT_BG_OPACITY;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getSavedAccentPalette(): AccentPaletteId {
  if (typeof window === "undefined") return "default";
  try {
    const saved = window.localStorage.getItem(ACCENT_PALETTE_STORAGE_KEY);
    if (saved && ACCENT_PALETTE_OPTIONS.some((o) => o.id === saved)) {
      return saved as AccentPaletteId;
    }
  } catch {
    // ignore storage errors
  }
  return "default";
}

export function getSavedAccentBgOpacity(): number {
  if (typeof window === "undefined") return DEFAULT_ACCENT_BG_OPACITY;
  try {
    const raw = window.localStorage.getItem(ACCENT_BG_OPACITY_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return clampAccentBgOpacity(parsed);
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ACCENT_BG_OPACITY;
}

export function applyAccentPalette(accent: AccentPaletteId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (accent === "default") {
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accent);
  }
  try {
    window.localStorage.setItem(ACCENT_PALETTE_STORAGE_KEY, accent);
  } catch {
    // ignore storage errors
  }
}

export function applyAccentBgOpacity(opacityPercent: number): void {
  if (typeof document === "undefined") return;
  const clamped = clampAccentBgOpacity(opacityPercent);
  const alpha = (clamped / 100).toFixed(2);
  document.documentElement.style.setProperty("--accent-bg-opacity", `${clamped}%`);
  document.documentElement.style.setProperty("--accent-bg-opacity-alpha", alpha);
  try {
    window.localStorage.setItem(ACCENT_BG_OPACITY_STORAGE_KEY, String(clamped));
  } catch {
    // ignore storage errors
  }
}

export interface AccentPaletteSelectorProps {
  accent: AccentPaletteId;
  onChange: (accent: AccentPaletteId) => void;
  bgOpacity?: number;
  onBgOpacityChange?: (opacityPercent: number) => void;
}

export const AccentPaletteSelector: React.FC<AccentPaletteSelectorProps> = ({
  accent,
  onChange,
  bgOpacity = DEFAULT_ACCENT_BG_OPACITY,
  onBgOpacityChange,
}) => {
  const clampedOpacity = clampAccentBgOpacity(bgOpacity);
  return (
    <div
      data-testid="accent-palette-selector"
      className="flex items-center gap-1.5 rounded-lg p-[1.5px] bg-gradient-to-r from-red-500/80 via-amber-400/80 via-emerald-400/80 via-sky-500/80 to-violet-500/80 shadow-2xs"
      aria-label="Accent color palette"
    >
      <div className="flex items-center gap-1.5 rounded-[7px] bg-card/95 px-1.5 py-1">
        <div className="flex items-center gap-1">
          {ACCENT_PALETTE_OPTIONS.map((opt) => {
            const isSelected = accent === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`accent-palette-btn-${opt.id}`}
                aria-pressed={isSelected}
                onClick={() => onChange(opt.id)}
                title={`Accent color: ${opt.label}`}
                className={`h-5 w-5 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? "ring-2 ring-foreground ring-offset-1 ring-offset-card scale-110"
                    : "opacity-80 hover:opacity-100 hover:scale-105"
                }`}
              >
                <span className={`h-3.5 w-3.5 rounded-full ${opt.swatchClass}`} />
                <span className="sr-only">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {onBgOpacityChange && (
          <label
            className="flex items-center gap-1 pl-1.5 border-l border-border/70 text-[10px] text-muted-foreground"
            title={`Background color opacity: ${clampedOpacity}%`}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={clampedOpacity}
              data-testid="accent-bg-opacity-slider"
              aria-label="Background color opacity"
              onChange={(e) => onBgOpacityChange(clampAccentBgOpacity(Number(e.target.value)))}
              className="w-14 h-1.5 accent-primary cursor-pointer"
            />
            <span
              data-testid="accent-bg-opacity-value"
              className="font-mono w-7 text-right tabular-nums"
            >
              {clampedOpacity}%
            </span>
          </label>
        )}
      </div>
    </div>
  );
};
