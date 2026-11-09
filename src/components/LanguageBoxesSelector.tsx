import React, { useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Check,
  Search,
  ArrowUp,
  ArrowDown,
  Link2,
  X,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type LanguageDisplayMode,
  getLanguageDisplayModeSetting,
  setLanguageDisplayModeSetting,
  recordUserInteraction,
} from "@/utils/appSettings";
import { parseJson3 } from "../lib/native-captions";
import { isValidJsonSubtitleResponse } from "../utils/subtitleCache";
import { fetchViaServer } from "../lib/subtitle-fetch-plan";
import serverConfig from "@/config/server.json";
import { Json3 } from "../types";
import { isSharedLanguageForVideo } from "@/utils/favoriteLanguagesRules";
import { emitSubtitleFetchLog } from "@/utils/subtitleFetchLogger";

export interface LanguageBoxesSelectorProps {
  catalog: Array<{ code: string; name: string }>;
  selectedLanguages: string[];
  onSelectionChange: (next: string[]) => void;
  isAndroid?: boolean;
  favoriteLanguages?: string[];
  currentVideoId?: string;
  loadedTracks?: Record<string, Json3> | null;
  onSaveSubtitleUrl?: (langCode: string, track: Json3, url?: string) => void;
}

/**
 * LanguageBoxesSelector
 * Presents languages with a button toggle between touch-friendly boxes and compact list.
 * In boxes mode, buttons have large click targets (min-h-[48px]) suitable for Android.
 * Clicked / selected languages are kept strictly at the top of the list.
 * Provides dedicated expand buttons on each language button to input subtitle URLs per language.
 */
export const LanguageBoxesSelector: React.FC<LanguageBoxesSelectorProps> = ({
  catalog,
  selectedLanguages,
  onSelectionChange,
  isAndroid = false,
  favoriteLanguages = [],
  currentVideoId = "",
  loadedTracks = null,
  onSaveSubtitleUrl,
}) => {
  const [displayMode, setDisplayMode] = useState<LanguageDisplayMode>(() =>
    getLanguageDisplayModeSetting(),
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedLangUrl, setExpandedLangUrl] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [fetchStatus, setFetchStatus] = useState<
    Record<string, { loading: boolean; message: string | null; type: "info" | "success" | "error" }>
  >({});

  const handleToggleMode = () => {
    const nextMode: LanguageDisplayMode = displayMode === "boxes" ? "list" : "boxes";
    setDisplayMode(nextMode);
    setLanguageDisplayModeSetting(nextMode);
  };

  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // When favoriteLanguages are present, language boxes appear for favorite languages (plus any currently selected)
  const isFavoritesFiltered = Boolean(
    favoriteLanguages && favoriteLanguages.length > 0 && !showAllLanguages && !searchFilter.trim(),
  );

  const effectiveCatalog = useMemo(() => {
    if (isFavoritesFiltered) {
      const allowedCodes = new Set([...favoriteLanguages, ...selectedLanguages]);
      const favList = catalog.filter((l) => allowedCodes.has(l.code));
      if (favList.length > 0) return favList;
    }
    return catalog;
  }, [catalog, favoriteLanguages, selectedLanguages, isFavoritesFiltered]);

  // Keep clicked / selected languages strictly at the top
  const sortedCatalog = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    const source = query ? catalog : effectiveCatalog;
    const filtered = query
      ? source.filter(
          (l) => l.name.toLowerCase().includes(query) || l.code.toLowerCase().includes(query),
        )
      : source;

    const selected = filtered.filter((l) => selectedLanguages.includes(l.code));
    const unselected = filtered.filter((l) => !selectedLanguages.includes(l.code));
    const combined = [...selected, ...unselected];
    const seen = new Set<string>();
    return combined.filter((l) => {
      if (!l?.code || seen.has(l.code)) return false;
      seen.add(l.code);
      return true;
    });
  }, [catalog, effectiveCatalog, selectedLanguages, searchFilter]);

  // List of catalog languages without the saved/favorite languages
  const catalogWithoutFavorites = useMemo(() => {
    const seen = new Set<string>();
    const favSet = new Set(favoriteLanguages || []);
    return catalog.filter((l) => {
      if (!l?.code || favSet.has(l.code) || seen.has(l.code)) return false;
      seen.add(l.code);
      return true;
    });
  }, [catalog, favoriteLanguages]);

  const toggleLanguage = (code: string) => {
    recordUserInteraction(Date.now());
    let next: string[];
    if (selectedLanguages.includes(code)) {
      next = selectedLanguages.filter((c) => c !== code);
    } else {
      next = [...selectedLanguages, code];
    }
    onSelectionChange(next);
  };

  const moveFavoriteLanguage = (code: string, direction: -1 | 1) => {
    const index = selectedLanguages.indexOf(code);
    const nextIdx = index + direction;
    if (index < 0 || nextIdx < 0 || nextIdx >= selectedLanguages.length) return;
    const next = [...selectedLanguages];
    [next[index], next[nextIdx]] = [next[nextIdx]!, next[index]!];
    onSelectionChange(next);
  };

  const handleFetchForLang = async (code: string, name: string) => {
    const inputUrl = (urlInputs[code] || "").trim();
    if (!inputUrl) return;

    emitSubtitleFetchLog({
      type: "info",
      message: `Language Box fetch triggered for '${name}' (${code})`,
      url: inputUrl,
      lang: code,
    });

    setFetchStatus((prev) => ({
      ...prev,
      [code]: { loading: true, message: `Fetching subtitles for ${name}…`, type: "info" },
    }));

    try {
      let parsed: Json3 | null = null;
      // 1. Direct fetch
      try {
        const resp = await fetch(inputUrl);
        if (resp.ok) {
          const text = await resp.text();
          parsed = parseJson3(text);
          emitSubtitleFetchLog({
            type: "info",
            message: `Language Box direct fetch HTTP ${resp.status} for '${name}' (${code})`,
            url: inputUrl,
            status: resp.status,
            lang: code,
          });
        }
      } catch (directErr) {
        emitSubtitleFetchLog({
          type: "warning",
          message: `Language Box direct fetch failed for '${name}' (${code}) (${directErr instanceof Error ? directErr.message : String(directErr)}), attempting proxy fallback...`,
          url: inputUrl,
          lang: code,
        });
      }

      // 2. Server proxy if direct fetch failed
      if (!parsed || !isValidJsonSubtitleResponse(parsed)) {
        if (inputUrl.startsWith("http")) {
          const serverUrl =
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).fetchServerUrl ||
            (serverConfig as { fetchServerUrl?: string; server_address?: string }).server_address ||
            "http://localhost:3000/api/proxy";
          const proxyResp = await fetchViaServer(inputUrl, serverUrl);
          if (proxyResp && proxyResp.status === 200 && proxyResp.body) {
            parsed = parseJson3(proxyResp.body);
            emitSubtitleFetchLog({
              type: "info",
              message: `Language Box server proxy returned HTTP 200 for '${name}' (${code})`,
              url: inputUrl,
              status: 200,
              lang: code,
            });
          }
        }
      }

      if (parsed && isValidJsonSubtitleResponse(parsed)) {
        const cuesCount = parsed.events?.length || 0;
        emitSubtitleFetchLog({
          type: "success",
          message: `Successfully loaded ${cuesCount} cues for '${name}' (${code})!`,
          url: inputUrl,
          status: 200,
          lang: code,
          cuesCount,
        });
        setFetchStatus((prev) => ({
          ...prev,
          [code]: {
            loading: false,
            message: `Successfully loaded ${cuesCount} cues for ${name}!`,
            type: "success",
          },
        }));

        // Ensure language is selected
        if (!selectedLanguages.includes(code)) {
          onSelectionChange([...selectedLanguages, code]);
        }

        if (onSaveSubtitleUrl) {
          onSaveSubtitleUrl(code, parsed, inputUrl);
        }
      } else {
        emitSubtitleFetchLog({
          type: "error",
          message: `Failed to parse valid YouTube JSON3 subtitles for '${name}' (${code})`,
          url: inputUrl,
          lang: code,
        });
        setFetchStatus((prev) => ({
          ...prev,
          [code]: {
            loading: false,
            message:
              "Failed to parse valid YouTube JSON3 subtitles. Ensure payload contains { events: [...] }.",
            type: "error",
          },
        }));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      emitSubtitleFetchLog({
        type: "error",
        message: `Error fetching subtitles for '${name}' (${code}): ${errMsg}`,
        url: inputUrl,
        lang: code,
      });
      setFetchStatus((prev) => ({
        ...prev,
        [code]: {
          loading: false,
          message: `Error: ${errMsg}`,
          type: "error",
        },
      }));
    }
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"
      data-testid="language-boxes-selector-wrapper"
      data-control-category="daily-usage"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="target-language-select" className="text-sm font-medium text-foreground">
            Language Boxes
          </label>
          <span
            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
            suppressHydrationWarning
          >
            {selectedLanguages.length} selected
          </span>
          <span data-testid="favorite-languages-active-badge" className="sr-only">
            Active
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 p-1 shadow-2xs">
          {favoriteLanguages && favoriteLanguages.length > 0 && (
            <Button
              type="button"
              id="select-more-languages-btn"
              data-testid="select-more-languages-btn"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAllLanguages(true);
              }}
              className="h-7 text-xs gap-1 hover:bg-muted font-medium text-primary cursor-pointer"
              title="Select more languages from catalog"
            >
              <span>+ Select more languages</span>
            </Button>
          )}
          {favoriteLanguages && favoriteLanguages.length > 0 && (
            <Button
              type="button"
              data-testid="toggle-show-all-languages"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllLanguages((prev) => !prev)}
              className="h-7 text-xs gap-1 hover:bg-muted font-medium text-foreground cursor-pointer"
              title={showAllLanguages ? "Show my languages only" : "Show all catalog languages"}
            >
              {showAllLanguages ? "My List" : `All (${catalog.length})`}
            </Button>
          )}
          <Button
            type="button"
            id="toggle-language-display-mode"
            data-testid="toggle-language-display-mode"
            variant="ghost"
            size="sm"
            onClick={handleToggleMode}
            className="h-7 gap-1.5 text-xs hover:bg-muted font-medium text-foreground cursor-pointer"
            title={`Switch to ${displayMode === "boxes" ? "list" : "boxes"} view`}
          >
            {displayMode === "boxes" ? (
              <>
                <List className="h-3.5 w-3.5" />
                <span title="Show as List">List View</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" />
                <span title="Show as Boxes">Boxes View</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Instant search filter to filter languages while adding/selecting */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          id="search-language-input"
          data-testid="search-language-input"
          placeholder="Filter languages by name or code…"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            if (e.target.value.trim()) {
              setShowAllLanguages(true);
            }
          }}
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Boxes view: large touch targets for Android, selected kept on top */}
      {displayMode === "boxes" ? (
        <div
          id="language-boxes-grid"
          data-testid="language-boxes-grid"
          data-favorites-only={isFavoritesFiltered ? "true" : "false"}
          onMouseDown={() => recordUserInteraction(Date.now())}
          onPointerDown={() => recordUserInteraction(Date.now())}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-80 overflow-y-auto p-1 rounded-md border border-border bg-muted/10"
        >
          {sortedCatalog.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code);
            const priorityIdx = selectedLanguages.indexOf(lang.code);
            const isExpanded = expandedLangUrl === lang.code;
            const cueCount = loadedTracks?.[lang.code]?.events?.length;
            const status = fetchStatus[lang.code];

            return (
              <div
                key={lang.code}
                data-testid={`language-card-${lang.code}`}
                className={`${
                  isExpanded ? "col-span-2 sm:col-span-3 md:col-span-4" : ""
                } flex flex-col transition-all`}
              >
                <div
                  className={`flex items-center justify-between rounded-xl border p-1.5 sm:p-2 text-left text-sm font-medium transition-all min-h-[48px] select-none studio-card-elevated ${
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-xs ring-1 ring-primary/40 font-semibold"
                      : "border-border bg-card hover:bg-accent/40 text-foreground"
                  }`}
                >
                  <button
                    type="button"
                    id={`lang-box-${lang.code}`}
                    data-testid={`language-box-${lang.code}`}
                    data-selected={isSelected}
                    onMouseDown={() => recordUserInteraction(Date.now())}
                    onClick={() => toggleLanguage(lang.code)}
                    className="flex-1 flex items-center justify-between min-w-0 pr-1 text-left cursor-pointer"
                    title={
                      isSelected
                        ? `Unselect ${lang.name} (Priority #${priorityIdx + 1})`
                        : `Select ${lang.name}`
                    }
                  >
                    <div className="truncate pr-1 flex items-center gap-1.5 min-w-0">
                      {isSelected && (
                        <span className="shrink-0 font-mono text-[10px] font-bold text-primary bg-primary/20 rounded px-1">
                          #{priorityIdx + 1}
                        </span>
                      )}
                      <span
                        data-testid="language-box-title"
                        className="truncate text-xs sm:text-sm"
                      >
                        {lang.name}
                      </span>
                      {currentVideoId && isSharedLanguageForVideo(currentVideoId, lang.code) && (
                        <span
                          data-testid={`shared-badge-${lang.code}`}
                          className="text-[9px] font-bold text-blue-400 bg-blue-500/20 border border-blue-500/40 rounded px-1 shrink-0 uppercase"
                        >
                          (shared)
                        </span>
                      )}

                      {cueCount ? (
                        <span
                          className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 font-medium"
                          title={`${cueCount} cues loaded`}
                          data-testid={`cues-badge-${lang.code}`}
                        >
                          {cueCount}
                        </span>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <span
                        data-testid="language-selected-check"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span
                        data-testid="language-code-badge"
                        className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
                      >
                        {lang.code}
                      </span>
                    )}
                  </button>

                  {/* Dedicated Subtitle URL Expand Button */}
                  <button
                    type="button"
                    id={`expand-subtitles-url-${lang.code}`}
                    data-testid={`expand-subtitles-url-${lang.code}`}
                    aria-expanded={isExpanded}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      recordUserInteraction(Date.now());
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      recordUserInteraction(Date.now());
                      setExpandedLangUrl((cur) => (cur === lang.code ? null : lang.code));
                    }}
                    className={`p-1.5 rounded-md hover:bg-background/80 transition-colors ml-1 text-xs shrink-0 cursor-pointer ${
                      isExpanded
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={`Input subtitle URL for ${lang.name}`}
                    aria-label={`Input subtitle URL for ${lang.name}`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline Expandable Subtitle URL Drawer */}
                {isExpanded && (
                  <div
                    data-testid={`inline-subtitle-url-panel-${lang.code}`}
                    className="mt-1.5 p-3 rounded-lg border border-primary/30 bg-card shadow-sm space-y-2 text-xs text-card-foreground animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 pb-1">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Subtitle URL for {lang.name} ({lang.code})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedLangUrl(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded text-xs"
                        title="Close panel"
                        aria-label="Close panel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        id={`lang-box-url-input-${lang.code}`}
                        data-testid={`lang-box-url-input-${lang.code}`}
                        value={urlInputs[lang.code] ?? ""}
                        onChange={(e) =>
                          setUrlInputs((prev) => ({ ...prev, [lang.code]: e.target.value }))
                        }
                        placeholder={`e.g. /fixtures/${currentVideoId || "L2Ryrr6txwA"}/${lang.code}.json or https://...`}
                        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button
                        type="button"
                        size="sm"
                        id={`lang-box-fetch-url-${lang.code}`}
                        data-testid={`lang-box-fetch-url-${lang.code}`}
                        disabled={status?.loading || !(urlInputs[lang.code] || "").trim()}
                        onClick={() => handleFetchForLang(lang.code, lang.name)}
                        className="h-8 text-xs shrink-0"
                      >
                        {status?.loading ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Loading…
                          </>
                        ) : (
                          "Load"
                        )}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const sample = `/fixtures/${currentVideoId || "L2Ryrr6txwA"}/${lang.code}.json`;
                          setUrlInputs((prev) => ({ ...prev, [lang.code]: sample }));
                        }}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Use sample fixture</span>
                      </button>
                      {cueCount ? (
                        <span className="text-muted-foreground font-mono">
                          Active: {cueCount} cues
                        </span>
                      ) : null}
                    </div>

                    {status?.message && (
                      <div
                        data-testid={`lang-box-status-${lang.code}`}
                        className={`p-2 rounded text-[11px] flex items-start gap-1.5 border ${
                          status.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                            : status.type === "error"
                              ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                              : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {status.type === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : status.type === "error" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin shrink-0 mt-0.5" />
                        )}
                        <span className="flex-1">{status.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Accessible native select (visible in list mode or kept available for automation and standard multi-select) */}
      <div className={displayMode === "boxes" ? "sr-only" : "block"}>
        <select
          id="target-language-select"
          data-testid="target-language-select"
          aria-label="Target languages"
          suppressHydrationWarning
          multiple
          size={
            isAndroid
              ? Math.min(catalogWithoutFavorites.length, 6)
              : Math.max(1, catalogWithoutFavorites.length)
          }
          value={selectedLanguages.filter((c) => !favoriteLanguages.includes(c))}
          onChange={(event) => {
            const next = Array.from(event.target.selectedOptions, (option) => option.value);
            const currentFavs = selectedLanguages.filter((c) => favoriteLanguages.includes(c));
            onSelectionChange([...currentFavs, ...next]);
          }}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          {catalogWithoutFavorites.map((lang) => {
            const isSel = selectedLanguages.includes(lang.code);
            return (
              <option key={lang.code} value={lang.code}>
                {isSel ? `✓ ${lang.name}` : lang.name}
              </option>
            );
          })}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        {isAndroid
          ? "Tap any language box to enable or disable for this video. Use the link icon on any language to input custom subtitle URLs."
          : "Tap language boxes to enable or disable for this video. Click the link icon on any language to input custom subtitle URLs."}
      </p>
    </div>
  );
};
