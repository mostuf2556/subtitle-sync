import React, { useState } from "react";
import { X } from "lucide-react";

export interface GlobalFavoriteLanguagesPanelProps {
  catalog: Array<{ code: string; name: string }>;
  favoriteLanguages: string[];
  targetLanguages: string[];
  videoId: string;
  onFavoriteLanguagesChange: (languages: string[]) => void;
  onApplyFavoritesToVideo: () => void;
  onSaveCurrentSelectionAsFavorites: () => void;
}

export function GlobalFavoriteLanguagesPanel({
  catalog,
  favoriteLanguages,
  targetLanguages,
  videoId,
  onFavoriteLanguagesChange,
  onApplyFavoritesToVideo,
  onSaveCurrentSelectionAsFavorites,
}: GlobalFavoriteLanguagesPanelProps) {
  const [filter, setFilter] = useState("");
  const availableLanguages = catalog.filter((language) => {
    if (favoriteLanguages.includes(language.code)) return false;
    const query = filter.trim().toLowerCase();
    return (
      !query ||
      language.name.toLowerCase().includes(query) ||
      language.code.toLowerCase().includes(query)
    );
  });

  const handleAddLanguage = (code: string) => {
    if (code && !favoriteLanguages.includes(code)) {
      onFavoriteLanguagesChange([...favoriteLanguages, code]);
      setFilter("");
    }
  };

  return (
    <section
      className="space-y-3 border-b border-border pb-4"
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
            className="rounded border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            Apply favorites to this video
          </button>
          <button
            type="button"
            data-testid="languages-save-current-as-favorites-btn"
            onClick={onSaveCurrentSelectionAsFavorites}
            className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
          >
            Save this video as favorites
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Global favorite languages">
        {favoriteLanguages.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">No favorites selected</span>
        ) : (
          favoriteLanguages.map((code) => {
            const language = catalog.find((item) => item.code === code) ?? {
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
                  className="inline-flex h-4 w-4 items-center justify-center hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="language-favorites-filter" className="text-xs text-muted-foreground">
          Add a favorite
        </label>
        <input
          id="language-favorites-filter"
          data-testid="language-favorites-filter"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search languages"
          className="min-w-36 rounded border border-input bg-background px-2 py-1 text-xs"
        />
        <select
          aria-label="Add a favorite language"
          data-testid="language-favorites-add-select"
          id="language-favorites-add-select"
          value=""
          onChange={(event) => handleAddLanguage(event.target.value)}
          className="min-w-48 rounded border border-input bg-background px-2 py-1 text-xs"
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

      <p className="text-[11px] text-muted-foreground">
        Enabled for {videoId || "this video"}: {targetLanguages.join(", ") || "None"}
      </p>
    </section>
  );
}