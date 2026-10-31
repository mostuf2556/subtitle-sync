import React, { useState, useMemo, useEffect } from "react";
import { BeginnerTabNav, BeginnerTabId } from "./BeginnerTabNav";
import { BeginnerVideoTab, ObservedSubtitleTrack } from "./tabs/BeginnerVideoTab";
import { BeginnerPreferencesTab } from "./tabs/BeginnerPreferencesTab";
import { VideoLibraryPanel } from "@/components/VideoLibraryPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Json3 } from "@/lib/subtitles";
import {
  loadAppSettings,
  saveAppSettings,
  AppSettings,
  ALL_KNOWN_LANGUAGES,
} from "@/utils/appSettings";
import { getBeginnerDefaultBaseLanguage } from "@/utils/beginnerLanguageSelection";

export interface BeginnerFlowContainerProps {
  url: string;
  videoId: string;
  isAndroid?: boolean;
  onUrlChange: (newUrl: string) => void;
  onSubmitUrl: (urlToLoad: string) => void;
  observedUrl: string | null;
  rawTracks: Record<string, Json3>;
  onLoadSampleSubtitles?: () => void;
  playerSlot?: React.ReactNode;
  playbackControlsSlot?: React.ReactNode;
  ttsServiceControlsSlot?: React.ReactNode;
  charsRemovalSlot?: React.ReactNode;
  subtitlesTableSlot?: React.ReactNode;
  criticalCaptionsAlertSlot?: React.ReactNode;
  perLanguageTtsSettingsSlot?: React.ReactNode;
  favoriteLanguageCatalog: Array<{ code: string; name: string }>;
  favoriteLanguages: string[];
  baseLanguage: string;
  selectedTargetLanguages: string[];
  onTargetLanguagesChange: (languages: string[]) => void;
  webDemoUrlsSlot?: React.ReactNode;
  showVideoSubtitles: boolean;
  onToggleVideoSubtitles: () => void;
  onTtsSpeedChange?: (speed: number) => void;
  onTtsVoiceChange?: (voiceURI: string) => void;
  onSubtitlesRatioChange?: (ratio: number) => void;
  onFavoriteLanguagesChange?: (langs: string[]) => void;
  onBaseLangChange?: (baseLang: string) => void;
  onApplyFavoritesToVideo?: () => void;
  onSaveCurrentSelectionAsFavorites?: () => void;
  onSwitchToAdvanced?: () => void;
}

export const BeginnerFlowContainer: React.FC<BeginnerFlowContainerProps> = ({
  url,
  videoId,
  isAndroid = false,
  onUrlChange,
  onSubmitUrl,
  observedUrl,
  rawTracks,
  onLoadSampleSubtitles,
  playerSlot,
  playbackControlsSlot,
  ttsServiceControlsSlot,
  charsRemovalSlot,
  subtitlesTableSlot,
  criticalCaptionsAlertSlot,
  perLanguageTtsSettingsSlot,
  favoriteLanguageCatalog,
  favoriteLanguages,
  baseLanguage,
  selectedTargetLanguages,
  onTargetLanguagesChange,
  webDemoUrlsSlot,
  showVideoSubtitles,
  onToggleVideoSubtitles,
  onTtsSpeedChange,
  onTtsVoiceChange,
  onSubtitlesRatioChange,
  onFavoriteLanguagesChange,
  onBaseLangChange,
  onApplyFavoritesToVideo,
  onSaveCurrentSelectionAsFavorites,
  onSwitchToAdvanced,
}) => {
  // Load initial settings
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  const [activeTab, setActiveTab] = useState<BeginnerTabId>(
    settings.beginnerActiveTab === "video" ? "video" : "preferences",
  );
  const [ttsSpeed, setTtsSpeed] = useState<number>(settings.beginnerTtsSpeed ?? 1.0);
  const [ttsVoice, setTtsVoice] = useState<string>(settings.beginnerTtsVoice ?? "");
  const [subtitlesRatio, setSubtitlesRatio] = useState<number>(
    settings.beginnerSubtitlesRatio ?? 1.0,
  );
  // Video Library Modal
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const handleSubmitUrl = (urlToLoad: string) => {
    onSubmitUrl(urlToLoad);
  };

  // Sync state changes to localStorage
  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...loadAppSettings(), ...partial };
      saveAppSettings(next);
      return next;
    });
  };

  // Convert rawTracks into observed tracks list
  const observedTracks = useMemo<ObservedSubtitleTrack[]>(() => {
    const list: ObservedSubtitleTrack[] = [];
    const keys = Object.keys(rawTracks);
    for (const lang of keys) {
      const json = rawTracks[lang];
      if (json && Array.isArray(json.events)) {
        const langObj = ALL_KNOWN_LANGUAGES.find((l) => l.code === lang);
        list.push({
          lang,
          name: langObj ? langObj.name : lang.toUpperCase(),
          cuesCount: json.events.length,
          isCached: true,
          isBase: baseLanguage === lang,
        });
      }
    }
    return list;
  }, [rawTracks, baseLanguage]);

  const hasObservedBaseLanguage = observedTracks.some((track) => track.lang === baseLanguage);

  // Prefer English when available; otherwise use the first detected track.
  useEffect(() => {
    if (observedTracks.length > 0 && !hasObservedBaseLanguage) {
      const defaultLang = getBeginnerDefaultBaseLanguage(observedTracks);
      if (!defaultLang) return;
      onBaseLangChange?.(defaultLang);
    }
  }, [observedTracks, hasObservedBaseLanguage, onBaseLangChange]);

  const handleTabChange = (newTab: BeginnerTabId) => {
    setActiveTab(newTab);
    updateSettings({ beginnerActiveTab: newTab });
  };

  return (
    <div
      className="w-full min-h-screen bg-background text-foreground flex flex-col"
      data-testid="beginner-flow-container"
    >
      {/* Beginner Step-by-Step Tabs Navigation */}
      <BeginnerTabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSwitchToAdvanced={onSwitchToAdvanced}
      />

      {/* Main Tab View Container */}
      <main className="flex-1 py-3 px-2">
        <div hidden={activeTab !== "video"}>
          <BeginnerVideoTab
            url={url}
            onUrlChange={onUrlChange}
            onSubmitUrl={handleSubmitUrl}
            videoId={videoId}
            isAndroid={isAndroid}
            onOpenLibrary={() => setIsLibraryOpen(true)}
            observedUrl={observedUrl}
            observedTracks={observedTracks}
            onLoadSampleSubtitles={onLoadSampleSubtitles}
            webDemoUrlsSlot={webDemoUrlsSlot}
            favoriteLanguages={favoriteLanguages}
            favoriteLanguageCatalog={favoriteLanguageCatalog}
            selectedTargetLanguages={selectedTargetLanguages}
            onTargetLanguagesChange={onTargetLanguagesChange}
            playerSlot={playerSlot}
            playbackControlsSlot={playbackControlsSlot}
            ttsServiceControlsSlot={ttsServiceControlsSlot}
            charsRemovalSlot={charsRemovalSlot}
            subtitlesTableSlot={subtitlesTableSlot}
            criticalCaptionsAlertSlot={criticalCaptionsAlertSlot}
            subtitlesRatio={subtitlesRatio}
            onSubtitlesRatioChange={(ratio) => {
              setSubtitlesRatio(ratio);
              updateSettings({ beginnerSubtitlesRatio: ratio });
              onSubtitlesRatioChange?.(ratio);
            }}
            showVideoSubtitles={showVideoSubtitles}
            onToggleVideoSubtitles={onToggleVideoSubtitles}
          />
        </div>

        <div hidden={activeTab !== "preferences"}>
          <BeginnerPreferencesTab
            ttsSpeed={ttsSpeed}
            onTtsSpeedChange={(s) => {
              setTtsSpeed(s);
              updateSettings({ beginnerTtsSpeed: s });
              onTtsSpeedChange?.(s);
            }}
            ttsVoice={ttsVoice}
            onTtsVoiceChange={(v) => {
              setTtsVoice(v);
              updateSettings({ beginnerTtsVoice: v });
              onTtsVoiceChange?.(v);
            }}
            favoriteLanguages={favoriteLanguages}
            onFavoriteLanguagesChange={(langs) => onFavoriteLanguagesChange?.(langs)}
            showVideoSubtitles={showVideoSubtitles}
            onToggleVideoSubtitles={onToggleVideoSubtitles}
            baseLanguage={baseLanguage}
            perLanguageTtsSettingsSlot={perLanguageTtsSettingsSlot}
            onContinueToNextTab={() => handleTabChange("video")}
            catalog={favoriteLanguageCatalog}
            targetLanguages={selectedTargetLanguages}
            videoId={videoId}
            onApplyFavoritesToVideo={onApplyFavoritesToVideo}
            onSaveCurrentSelectionAsFavorites={onSaveCurrentSelectionAsFavorites}
          />
        </div>
      </main>

      {/* Video Library Modal */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              Saved Video Library
            </DialogTitle>
          </DialogHeader>
          <VideoLibraryPanel
            currentVideoId={videoId}
            onSelectVideo={(newId, newUrl) => {
              if (newUrl) {
                onSubmitUrl(newUrl);
              } else if (newId) {
                onSubmitUrl(`https://www.youtube.com/watch?v=${newId}`);
              }
              setIsLibraryOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
