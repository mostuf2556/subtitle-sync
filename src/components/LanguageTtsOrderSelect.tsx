import React from "react";
import type { SectionOrder } from "@/lib/playback-preferences";

export interface LanguageTtsOrderSelectProps {
  languageCode: string;
  languageName: string;
  order: SectionOrder;
  onChange: (languageCode: string, order: SectionOrder) => void;
}

export function LanguageTtsOrderSelect({
  languageCode,
  languageName,
  order,
  onChange,
}: LanguageTtsOrderSelectProps) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-xs">
      <span className="shrink-0 text-muted-foreground">TTS order</span>
      <select
        aria-label={`${languageName} TTS order`}
        data-testid={`tts-order-select-${languageCode}`}
        value={order}
        onChange={(event) => onChange(languageCode, event.target.value as SectionOrder)}
        className="min-w-0 rounded border border-input bg-background px-1.5 py-1 text-xs"
      >
        <option value="video-first">After video</option>
        <option value="tts-first">Before video</option>
        <option value="video-middle">In between</option>
      </select>
    </label>
  );
}