import React, { useState } from "react";
import {
  Tv,
  Subtitles,
  Library,
  CheckCircle2,
  Sparkles,
  Play,
  Database,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageBoxesSelector } from "@/components/LanguageBoxesSelector";
import { extractYouTubeId } from "@/utils/youtube";

export interface ObservedSubtitleTrack {
  lang: string;
  name?: string;
  cuesCount: number;
  isCached: boolean;
  isBase: boolean;
}

export interface BeginnerVideoTabProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmitUrl: (url: string) => void;
  videoId: string;
  onOpenLibrary: () => void;
  observedUrl: string | null;
  observedTracks: ObservedSubtitleTrack[];
  onLoadSampleSubtitles?: () => void;
  playerSlot?: React.ReactNode;
  playbackControlsSlot?: React.ReactNode;
  ttsServiceControlsSlot?: React.ReactNode;
  charsRemovalSlot?: React.ReactNode;
  subtitlesTableSlot?: React.ReactNode;
  criticalCaptionsAlertSlot?: React.ReactNode;
  favoriteLanguages: string[];
  favoriteLanguageCatalog: Array<{ code: string; name: string }>;
  selectedTargetLanguages: string[];
  onTargetLanguagesChange: (languages: string[]) => void;
  isAndroid?: boolean;
  webDemoUrlsSlot?: React.ReactNode;
  subtitlesRatio: number;
  onSubtitlesRatioChange: (ratio: number) => void;
  showVideoSubtitles: boolean;
  onToggleVideoSubtitles: () => void;
}

export const BeginnerVideoTab: React.FC<BeginnerVideoTabProps> = ({
  url,
  onUrlChange,
  onSubmitUrl,
  videoId,
  onOpenLibrary,
  observedUrl,
  observedTracks,
  onLoadSampleSubtitles,
  playerSlot,
  playbackControlsSlot,
  ttsServiceControlsSlot,
  charsRemovalSlot,
  subtitlesTableSlot,
  criticalCaptionsAlertSlot,
  favoriteLanguages,
  favoriteLanguageCatalog,
  selectedTargetLanguages,
  onTargetLanguagesChange,
  isAndroid = false,
  webDemoUrlsSlot,
  subtitlesRatio,
  onSubtitlesRatioChange,
  showVideoSubtitles,
  onToggleVideoSubtitles,
}) => {
  const [inputVal, setInputVal] = useState(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSubmitUrl(inputVal.trim());
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setInputVal(text.trim());
          onUrlChange(text.trim());
          onSubmitUrl(text.trim());
        }
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  return (
    <div
      className="space-y-4 max-w-4xl mx-auto p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5"
      data-testid="beginner-video-tab"
      data-control-category="daily-usage"
    >
      {criticalCaptionsAlertSlot}

      {/* Daily video and subtitle controls */}
      <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>Video &amp; Subtitles</span>
                {videoId && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground border-border"
                  >
                    ID: {videoId}
                  </Badge>
                )}
              </h2>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenLibrary}
            className="h-8 px-2.5 text-xs border-border hover:bg-muted text-foreground flex items-center gap-1.5"
            data-testid="btn-open-library"
          >
            <Library className="w-3.5 h-3.5 text-primary" />
            <span>Saved Library</span>
          </Button>
        </div>

        {/* Web Demo or Standard URL Input Form */}
        {webDemoUrlsSlot ? (
          <div className="pt-1">{webDemoUrlsSlot}</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  onUrlChange(e.target.value);
                }}
                placeholder="Paste YouTube link (e.g., https://youtu.be/...)"
                className="h-9 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground pr-16 focus-visible:ring-primary"
                data-testid="beginner-url-input"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded transition-colors"
              >
                Paste
              </button>
            </div>

            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shrink-0"
              data-testid="btn-load-video"
            >
              <Play className="w-3 h-3 mr-1" />
              Load Video
            </Button>
          </form>
        )}

        {/* Video Player Display */}
        {playerSlot && (
          <div
            className="w-full rounded-xl overflow-hidden bg-black aspect-video border border-border shadow-md relative"
            data-testid="beginner-player-slot-container"
          >
            {playerSlot}
          </div>
        )}
        {playerSlot && (
          <div
            data-testid="video-display-controls"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
            data-control-category="daily-usage"
          >
            <Button
              type="button"
              size="sm"
              variant={showVideoSubtitles ? "default" : "outline"}
              aria-pressed={showVideoSubtitles}
              data-testid="video-subtitles-overlay-toggle"
              data-control-category="daily-usage"
              onClick={onToggleVideoSubtitles}
              className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
              title="Toggle spoken subtitles over the video"
            >
              <Subtitles className="h-3.5 w-3.5" />
              {showVideoSubtitles ? "Overlay on" : "Overlay off"}
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium text-foreground">Subtitle size</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Decrease subtitle overlay size"
                data-testid="subtitle-overlay-size-decrease"
                disabled={subtitlesRatio <= 0.6}
                onClick={() =>
                  onSubtitlesRatioChange(
                    Math.max(0.6, Math.round((subtitlesRatio - 0.1) * 10) / 10),
                  )
                }
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span
                className="min-w-12 text-center font-mono text-[11px] font-semibold text-primary"
                data-testid="subtitle-overlay-size-value"
              >
                {subtitlesRatio.toFixed(2)}x
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Increase subtitle overlay size"
                data-testid="subtitle-overlay-size-increase"
                disabled={subtitlesRatio >= 1.8}
                onClick={() =>
                  onSubtitlesRatioChange(
                    Math.min(1.8, Math.round((subtitlesRatio + 0.1) * 10) / 10),
                  )
                }
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        {playerSlot && ttsServiceControlsSlot}
        {playbackControlsSlot && <div className="pt-2">{playbackControlsSlot}</div>}
      </div>

      <LanguageBoxesSelector
        catalog={favoriteLanguageCatalog}
        selectedLanguages={selectedTargetLanguages}
        onSelectionChange={onTargetLanguagesChange}
        favoriteLanguages={favoriteLanguages}
        currentVideoId={videoId}
        isAndroid={isAndroid}
      />

      {subtitlesTableSlot && (
        <section
          className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"
          aria-label="Parallel subtitles table"
          data-testid="beginner-parallel-subtitles"
          data-control-category="daily-usage"
        >
          <h3 className="text-xs font-semibold text-foreground">Parallel subtitles</h3>
          {charsRemovalSlot}
          {subtitlesTableSlot}
        </section>
      )}

      <details
        className="rounded-xl border border-border bg-card p-3.5 shadow-sm"
        data-testid="beginner-caption-discovery-details"
      >
        <summary className="cursor-pointer text-xs font-semibold text-foreground">
          Caption discovery details ({observedTracks.length} tracks)
        </summary>
        <div className="mt-3 space-y-3">
          {/* Caption interception prompt */}
          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <Subtitles className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span>Enable Captions (CC) in Video</span>
                  {observedUrl && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      TimedText Intercepted
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Play the video and turn on{" "}
                  <strong className="text-foreground">CC (Captions)</strong> in the YouTube player.
                  The app intercepts the authentic{" "}
                  <code className="text-primary bg-muted px-1 py-0.5 rounded text-[11px]">
                    timedtext
                  </code>{" "}
                  network calls and securely saves the subtitle tracks into offline local storage.
                </p>
                {onLoadSampleSubtitles && observedTracks.length === 0 && (
                  <div className="pt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onLoadSampleSubtitles}
                      className="h-7 px-2.5 text-[11px] border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 dark:hover:bg-sky-950/40"
                      data-testid="btn-load-sample-subs"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Load Sample Captions (Instant Test)
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Intercepted URL Info */}
            {observedUrl && (
              <div className="bg-muted/50 border border-border rounded-lg p-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground font-mono text-[10px] truncate">
                    {observedUrl}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-500 shrink-0 font-medium">
                  Cached Locally
                </span>
              </div>
            )}
          </div>

          {/* Automatically selected base track */}
          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>Detected Subtitle Tracks</span>
                  <span className="text-muted-foreground font-normal">
                    ({observedTracks.length} detected)
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  The base language is selected automatically: English when available, otherwise the
                  first detected track.
                </p>
              </div>
            </div>

            {observedTracks.length === 0 ? (
              <div className="bg-background border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground space-y-1">
                <Subtitles className="w-6 h-6 mx-auto text-muted-foreground/60 mb-1" />
                <p>No subtitle tracks detected yet.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Start video playback or toggle CC on the player to trigger caption discovery.
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                data-testid="observed-subtitles-list"
              >
                {observedTracks.map((track) => {
                  const isSelected = track.isBase;
                  return (
                    <div
                      key={track.lang}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex items-center justify-between p-2.5 rounded-lg border ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40"
                          : "bg-background border-border text-foreground"
                      }`}
                      data-testid={`observed-subtitle-track-${track.lang}`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {track.name || track.lang.toUpperCase()}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-border"
                          >
                            {track.lang}
                          </Badge>
                          {track.isCached && (
                            <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Cached
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {track.cuesCount} subtitle cues available
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-card text-transparent"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};
