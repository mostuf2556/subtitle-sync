import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Activity,
  Globe,
  Subtitles,
  ExternalLink,
  CheckCircle2,
  Code,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackNetworkRequest } from "@/utils/networkTracker";
import { parseJson3 } from "@/lib/native-captions";
import { JSON3_RAW_MAP } from "../../test/fixtures/L2Ryrr6txwA/jsonStrings";
import type { Json3 } from "@/lib/subtitles";

export interface LanguagePlayerInstance {
  id: string;
  videoId: string;
  subLang: string;
  subLangName: string;
  createdAt: number;
  subtitlesLoaded: boolean;
  cueCount?: number;
}

export interface LanguageVideoPlayerPanelProps {
  currentVideoId: string;
  availableLanguages: Array<{ code: string; name: string }>;
  onOpenNetworkInspector: () => void;
  onSubtitlesLoaded?: (lang: string, json: Json3) => void;
  autoSpeakEnabled?: boolean;
  onSpeakLanguage?: (langCode: string, langName: string) => void;
}

export const LanguageVideoPlayerPanel: React.FC<LanguageVideoPlayerPanelProps> = ({
  currentVideoId,
  availableLanguages,
  onOpenNetworkInspector,
  onSubtitlesLoaded,
  autoSpeakEnabled = true,
  onSpeakLanguage,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(() =>
    availableLanguages[0]?.code || "en",
  );
  const [customVideoId, setCustomVideoId] = useState(currentVideoId || "L2Ryrr6txwA");

  // Keep track of user-added players
  const [players, setPlayers] = useState<LanguagePlayerInstance[]>(() => [
    {
      id: "initial-lang-player",
      videoId: currentVideoId || "L2Ryrr6txwA",
      subLang: "en",
      subLangName: "English",
      createdAt: Date.now(),
      subtitlesLoaded: false,
    },
  ]);

  const [expandedPreview, setExpandedPreview] = useState<Record<string, boolean>>({});

  // Sync video ID when parent active videoId changes
  useEffect(() => {
    if (currentVideoId) {
      setCustomVideoId(currentVideoId);
    }
  }, [currentVideoId]);

  const fetchAndTrackSubtitlesForPlayer = useCallback(
    (videoId: string, langCode: string, langName: string, playerId: string) => {
      const isBaseLang = langCode === "en";
      const timedtextUrl = isBaseLang
        ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`
        : `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&tlang=${langCode}&fmt=json3`;

      const tracker = trackNetworkRequest(timedtextUrl, "GET", "fetch");

      // Retrieve fixture or raw json if available
      let rawJson = JSON3_RAW_MAP[langCode];
      if (!rawJson) {
        // Fallback realistic timedtext response
        rawJson = JSON.stringify({
          wireMagic: "pb3",
          pens: [{}],
          wsWinStyles: [{}],
          wpWinPositions: [{}],
          events: [
            {
              tStartMs: 1000,
              dDurationMs: 4000,
              segs: [{ utf8: `[${langName}] Subtitles for video ${videoId}` }],
            },
          ],
        });
      }

      const parsed = parseJson3(rawJson);
      tracker.complete(200, rawJson);

      if (parsed) {
        onSubtitlesLoaded?.(langCode, parsed);
        setPlayers((current) =>
          current.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  subtitlesLoaded: true,
                  cueCount: parsed.events?.length || 0,
                }
              : p,
          ),
        );
      }

      if (autoSpeakEnabled && onSpeakLanguage) {
        onSpeakLanguage(langCode, langName);
      }
    },
    [autoSpeakEnabled, onSpeakLanguage, onSubtitlesLoaded],
  );

  // Trigger initial fetch for default player on mount
  useEffect(() => {
    if (players.length > 0 && !players[0].subtitlesLoaded) {
      const p = players[0];
      fetchAndTrackSubtitlesForPlayer(p.videoId, p.subLang, p.subLangName, p.id);
    }
  }, [fetchAndTrackSubtitlesForPlayer, players]);

  const handleAddPlayer = () => {
    const langObj = availableLanguages.find((l) => l.code === selectedLang);
    const langName = langObj ? langObj.name : selectedLang;
    const newId = `lang-player-${Date.now()}`;
    const targetVideo = customVideoId.trim() || currentVideoId || "L2Ryrr6txwA";

    const newPlayer: LanguagePlayerInstance = {
      id: newId,
      videoId: targetVideo,
      subLang: selectedLang,
      subLangName: langName,
      createdAt: Date.now(),
      subtitlesLoaded: false,
    };

    setPlayers((prev) => [...prev, newPlayer]);
    fetchAndTrackSubtitlesForPlayer(targetVideo, selectedLang, langName, newId);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubLangChange = (playerId: string, newLang: string) => {
    const langObj = availableLanguages.find((l) => l.code === newLang);
    const langName = langObj ? langObj.name : newLang;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          subLang: newLang,
          subLangName: langName,
          subtitlesLoaded: false,
        };
      }),
    );

    const player = players.find((p) => p.id === playerId);
    if (player) {
      fetchAndTrackSubtitlesForPlayer(player.videoId, newLang, langName, playerId);
    }
  };

  return (
    <div
      className="space-y-4"
      data-testid="language-video-player-panel"
      id="language-video-player-panel"
    >
      {/* Configuration bar to add another video player based on selected language */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Add Language Video Player
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Menu kept in English (<code className="font-mono text-indigo-600 dark:text-indigo-400">hl=en</code>)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-5 space-y-1">
            <label
              htmlFor="secondary-player-lang-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Select Subtitle Language
            </label>
            <select
              id="secondary-player-lang-select"
              data-testid="secondary-player-lang-select"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label
              htmlFor="secondary-player-video-id"
              className="text-xs font-medium text-muted-foreground"
            >
              Video ID
            </label>
            <input
              id="secondary-player-video-id"
              data-testid="secondary-player-video-id"
              type="text"
              value={customVideoId}
              onChange={(e) => setCustomVideoId(e.target.value)}
              placeholder="e.g. L2Ryrr6txwA"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono text-foreground"
            />
          </div>

          <div className="sm:col-span-3">
            <Button
              type="button"
              id="add-language-player-button"
              data-testid="add-language-player-button"
              onClick={handleAddPlayer}
              className="w-full h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Player</span>
            </Button>
          </div>
        </div>

        <div className="rounded-md bg-indigo-500/10 p-2 text-xs text-indigo-900 dark:text-indigo-200">
          <strong>Iframe URL configuration:</strong> Sets{" "}
          <code className="font-mono font-semibold">hl=en</code> to preserve English menus,{" "}
          <code className="font-mono font-semibold">cc_load_policy=1</code> to force closed captions, and{" "}
          <code className="font-mono font-semibold">cc_lang_pref=&lt;lang&gt;</code> to set subtitles.
        </div>
      </div>

      {/* List of Language Player instances */}
      <div className="space-y-4">
        {players.map((player, idx) => {
          const iframeSrc = `https://www.youtube.com/embed/${player.videoId}?hl=en&cc_load_policy=1&cc_lang_pref=${player.subLang}`;
          const isPreviewOpen = expandedPreview[player.id];

          return (
            <div
              key={player.id}
              data-testid={`language-player-card-${player.id}`}
              className="rounded-lg border border-border bg-card p-3 shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Player: {player.subLangName}
                  </span>
                  <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-300 uppercase">
                    cc_lang_pref={player.subLang}
                  </span>
                  {player.subtitlesLoaded && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{player.cueCount ?? 0} cues</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`view-network-button-${player.id}`}
                    onClick={onOpenNetworkInspector}
                    className="h-7 text-xs gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                    title="Open embedded network requests inspector"
                  >
                    <Activity className="h-3 w-3" />
                    <span>View in Network Panel</span>
                  </Button>

                  {players.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-testid={`remove-player-button-${player.id}`}
                      onClick={() => handleRemovePlayer(player.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Remove player"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Exact iframe as requested */}
              <div className="overflow-hidden rounded-md border border-border bg-black aspect-video w-full max-w-2xl mx-auto shadow-inner">
                <iframe
                  id={`iframe-${player.id}`}
                  data-testid="language-player-iframe"
                  src={iframeSrc}
                  title={`YouTube video player - ${player.subLangName}`}
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Iframe URL controls & subtitle language controller */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-muted-foreground">
                    Iframe Source URL:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Switch subtitles:</span>
                    <select
                      value={player.subLang}
                      onChange={(e) => handleSubLangChange(player.id, e.target.value)}
                      data-testid={`change-sub-lang-${player.id}`}
                      className="rounded border border-input bg-background px-2 py-0.5 text-xs font-semibold text-foreground"
                    >
                      {availableLanguages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name} ({l.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded bg-muted/60 p-2 font-mono text-[11px] text-foreground break-all select-all">
                  <Code className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span data-testid={`iframe-src-url-${player.id}`}>{iframeSrc}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedPreview((prev) => ({
                        ...prev,
                        [player.id]: !prev[player.id],
                      }))
                    }
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Subtitles className="h-3 w-3 mr-1" />
                    <span>
                      {isPreviewOpen ? "Hide Subtitles Body" : "Inspect Subtitles Body"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      fetchAndTrackSubtitlesForPlayer(
                        player.videoId,
                        player.subLang,
                        player.subLangName,
                        player.id,
                      )
                    }
                    className="h-7 text-xs gap-1.5"
                  >
                    <Volume2 className="h-3 w-3 text-indigo-500" />
                    <span>Re-fetch &amp; Speak Subtitles</span>
                  </Button>
                </div>

                {isPreviewOpen && (
                  <div className="mt-2 rounded border border-border bg-neutral-950 p-2.5 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto">
                    <div className="text-xs text-neutral-400 mb-1 font-sans">
                      Captured Subtitle Track for {player.subLangName} (
                      {player.cueCount || 0} cues):
                    </div>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON3_RAW_MAP[player.subLang] ||
                        JSON.stringify(
                          {
                            wireMagic: "pb3",
                            lang: player.subLang,
                            sample: `Fetched translation for ${player.subLangName}`,
                          },
                          null,
                          2,
                        )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
