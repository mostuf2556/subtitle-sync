import React, { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

export interface GlobalFavoriteLanguagesPanelProps {
  catalog: Array<{ code: string; name: string }>;
  favoriteLanguages: string[];
  targetLanguages: string[];
  videoId: string;
  onFavoriteLanguagesChange: (languages: string[]) => void;
  onApplyFavoritesToVideo: () => void;
  onSaveCurrentSelectionAsFavorites: () => void;
  className?: string;
}

const DEFAULT_MANUAL_LIST_CAP = 24;

export const GlobalFavoriteLanguagesPanel = React.memo(function GlobalFavoriteLanguagesPanel({
  catalog,
  favoriteLanguages,
  targetLanguages,
  videoId,
  onFavoriteLanguagesChange,
  onApplyFavoritesToVideo,
  onSaveCurrentSelectionAsFavorites,
  className,
}: GlobalFavoriteLanguagesPanelProps) {
  const isHiddenMount = Boolean(className?.split(/\s+/).includes("hidden"));
  const [filter, setFilter] = useState("");
  const [showManualList, setShowManualList] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  const favoriteSet = useMemo(() => new Set(favoriteLanguages), [favoriteLanguages]);

  const catalogMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    for (const item of catalog) {
      map.set(item.code, item);
    }
    return map;
  }, [catalog]);

  const availableLanguages = useMemo(() => {
    if (isHiddenMount) return [];
    const query = filter.trim().toLowerCase();
    return catalog.filter((language) => {
      if (favoriteSet.has(language.code)) return false;
      return (
        !query ||
        language.name.toLowerCase().includes(query) ||
        language.code.toLowerCase().includes(query)
      );
    });
  }, [isHiddenMount, catalog, favoriteSet, filter]);

  const cappedManualLanguages = useMemo(() => {
    if (showAllMatches || availableLanguages.length <= DEFAULT_MANUAL_LIST_CAP) {
      return availableLanguages;
    }
    return availableLanguages.slice(0, DEFAULT_MANUAL_LIST_CAP);
  }, [availableLanguages, showAllMatches]);

  if (isHiddenMount) {
    return (
      <div
        className={`hidden ${className || ""}`.trim()}
        data-testid="global-favorite-languages-panel"
        aria-hidden="true"
      />
    );
  }

  const handleAddLanguage = (code: string) => {
    if (code && !favoriteSet.has(code)) {
      onFavoriteLanguagesChange([...favoriteLanguages, code]);
    }
  };

  return (
    <section
      className={`space-y-3 border-b border-border pb-4 ${className || ""}`.trim()}
      data-testid="global-favorite-languages-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">Favorite Languages</h3>
          <p className="text-[11px] text-muted-foreground">
            Defaults for new videos; each video keeps its own language selection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="languages-reset-video-to-favorites-btn"
            onClick={onApplyFavoritesToVideo}
            className="rounded border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted cursor-pointer"
          >
            Apply favorites to this video
          </button>
          <button
            type="button"
            data-testid="languages-save-current-as-favorites-btn"
            onClick={onSaveCurrentSelectionAsFavorites}
            className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 cursor-pointer"
          >
            Save this video as favorites
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Global favorite languages">
        {favoriteLanguages.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">No favorites selected</span>
        ) : (
          Array.from(new Set(favoriteLanguages)).map((code) => {
            const language = catalogMap.get(code) ?? {
              code,
              name: code.toUpperCase(),
            };
            return (
              <span
                key={code}
                data-testid={`language-favorite-chip-${code}`}
                className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
              >
                <span data-testid={`fav-lang-${code}`}>{language.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    onFavoriteLanguagesChange(favoriteLanguages.filter((item) => item !== code))
                  }
                  title={`Remove ${language.name} from favorites`}
                  aria-label={`Remove ${language.name} from favorites`}
                  className="inline-flex h-4 w-4 items-center justify-center hover:text-destructive cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
      </div>

      {/* Filter & Manual Selection List (never auto-selects while typing) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="language-favorites-filter" className="text-xs text-muted-foreground">
            Add a favorite
          </label>
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
            <input
              id="language-favorites-filter"
              data-testid="language-favorites-filter"
              type="search"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setShowAllMatches(false);
                if (event.target.value.trim()) {
                  setShowManualList(true);
                }
              }}
              placeholder="Filter languages…"
              className="min-w-44 rounded border border-input bg-background pl-7 pr-2 py-1 text-xs"
            />
          </div>
          <button
            type="button"
            data-testid="global-favorites-toggle-list-btn"
            onClick={() => setShowManualList((prev) => !prev)}
            className="rounded border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted cursor-pointer"
          >
            {showManualList ? "Hide List" : `Browse (${availableLanguages.length})`}
          </button>
          <select
            aria-label="Add a favorite language"
            data-testid="language-favorites-add-select"
            id="language-favorites-add-select"
            value=""
            onChange={(event) => handleAddLanguage(event.target.value)}
            className="min-w-44 rounded border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Choose a language</option>
            {availableLanguages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
          <select
            aria-hidden="true"
            tabIndex={-1}
            data-testid="add-lang-select"
            className="sr-only"
            value=""
            onChange={(event) => handleAddLanguage(event.target.value)}
          >
            <option value="">+ Add language to favorites...</option>
            {availableLanguages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name} ({language.code})
              </option>
            ))}
          </select>
        </div>

        {(showManualList || filter.trim().length > 0) && (
          <div
            role="listbox"
            aria-label="Filtered languages for manual selection"
            data-testid="global-favorites-manual-list"
            className="flex flex-col space-y-1 max-h-40 overflow-y-auto rounded-md border border-border/70 bg-background/80 p-1.5"
          >
            {cappedManualLanguages.length === 0 ? (
              <span className="text-[11px] text-muted-foreground px-1 py-0.5 italic">
                No matching languages remaining.
              </span>
            ) : (
              cappedManualLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  role="option"
                  aria-selected={false}
                  data-testid={`global-fav-manual-item-${language.code}`}
                  onClick={() => handleAddLanguage(language.code)}
                  className="inline-flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-left hover:bg-primary/15 text-foreground cursor-pointer transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus className="h-3 w-3 text-primary shrink-0" />
                    <span>{language.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({language.code})
                  </span>
                </button>
              ))
            )}
            {!showAllMatches && availableLanguages.length > DEFAULT_MANUAL_LIST_CAP && (
              <button
                type="button"
                data-testid="global-favorites-show-all-btn"
                onClick={() => setShowAllMatches(true)}
                className="text-[11px] text-primary hover:underline py-1 text-center cursor-pointer"
              >
                Show all {availableLanguages.length} matches
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Enabled for {videoId || "this video"}: {targetLanguages.join(", ") || "None"}
      </p>
    </section>
  );
});
