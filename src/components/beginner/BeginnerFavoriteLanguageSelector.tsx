import React from "react";
import { Button } from "@/components/ui/button";
import { ALL_KNOWN_LANGUAGES, SUPPORTED_LANGUAGES_CATALOG } from "@/utils/appSettings";
import { Check } from "lucide-react";

/**
 * Resolves a language code to a human-readable full display name via
 * provided catalog, global ALL_KNOWN_LANGUAGES, or Intl.DisplayNames.
 */
export function getDisplayLanguageName(
  code: string,
  catalog: Array<{ code: string; name: string }> = SUPPORTED_LANGUAGES_CATALOG,
): string {
  const normalized = (code || "").trim().toLowerCase();
  if (!normalized) return "";

  // 1. Check in provided catalog
  const matchInCatalog = catalog?.find((item) => item.code.toLowerCase() === normalized);
  if (matchInCatalog?.name) return matchInCatalog.name;

  // 2. Check in global catalog
  const matchInAll = ALL_KNOWN_LANGUAGES?.find((item) => item.code.toLowerCase() === normalized);
  if (matchInAll?.name) return matchInAll.name;

  // 3. Fallback to Intl.DisplayNames if standard ISO code
  try {
    const intlName = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    if (intlName && intlName.toLowerCase() !== normalized) {
      return intlName;
    }
  } catch {
    // fallback
  }

  return code;
}

export interface BeginnerFavoriteLanguageSelectorProps {
  favoriteLanguages?: string[];
  selectedLanguages?: string[];
  onSelectionChange?: (languages: string[]) => void;
  catalog?: Array<{ code: string; name: string }>;
  isAndroid?: boolean;
  className?: string;
}

/**
 * BeginnerFavoriteLanguageSelector
 * Renders language buttons with human-readable display names, titles, and accessible aria-labels.
 */
export const BeginnerFavoriteLanguageSelector: React.FC<BeginnerFavoriteLanguageSelectorProps> = ({
  favoriteLanguages = [],
  selectedLanguages = [],
  onSelectionChange,
  catalog = SUPPORTED_LANGUAGES_CATALOG,
  className = "",
}) => {
  const languages = React.useMemo(() => {
    const raw = favoriteLanguages.length > 0 ? favoriteLanguages : catalog.slice(0, 8).map((l) => l.code);
    return Array.from(new Set(raw.filter(Boolean)));
  }, [favoriteLanguages, catalog]);

  const toggleLanguage = (langCode: string) => {
    if (!onSelectionChange) return;
    if (selectedLanguages.includes(langCode)) {
      onSelectionChange(selectedLanguages.filter((c) => c !== langCode));
    } else {
      onSelectionChange([...selectedLanguages, langCode]);
    }
  };

  return (
    <div
      data-testid="beginner-favorite-languages-selector"
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {languages.map((code) => {
        const name = getDisplayLanguageName(code, catalog);
        const isSelected = selectedLanguages.includes(code);

        return (
          <Button
            key={code}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLanguage(code)}
            title={name}
            aria-label={`Select ${name} as target subtitle language`}
            className="flex items-center gap-1.5 transition-colors"
          >
            {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
            <span>{name}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default BeginnerFavoriteLanguageSelector;
