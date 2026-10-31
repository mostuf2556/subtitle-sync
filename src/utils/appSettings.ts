import { STORAGE_KEYS } from "../config/appConfig";

/**
 * App Settings Configuration and Local Persistence
 * Advanced features are turned OFF by default to prevent resource draining.
 * Subtitle fetching methods are configurable and enabled by default.
 */

export type SubtitlePosition = "top" | "above" | "under" | "bottom";
export type TTSSyncMode = "word_boundary" | "time_linear" | "word_step" | "full_sentence";
export type AppTheme = "minimal-light" | "pure-dark" | "warm-slate" | "midnight";

export interface AppSettings {
  // UI Display: Compact, lightweight view by default (Android UI Guidelines: no scrolling, minimal controls)
  compactView: boolean;
  theme: AppTheme;
  showExpandedControls: boolean; // Allow user to show them by updating configuration
  showTeacherPanel: boolean;
  showLinkBar: boolean;

  // Key Buttons Display: By default always show the most important buttons (Requirement 1)
  alwaysShowKeyControls: boolean;

  // Subtitle Positioning: By default keep translated subs on top (Requirement 1)
  subtitlePosition: SubtitlePosition;
  showTranslatedOnTop: boolean;

  // TTS Auto-Play & Narration: By default enable TTS narration (plays synchronized TTS and highlights text)
  autoPlayTTS: boolean;

  // Target Language Presentation: By default use only 1 target language
  singleTargetLanguageMode: boolean;

  // Subtitle Timestamp Display: By default also show the subtitles's time section besides the subtitles
  showSubtitleTimestamps: boolean;

  // TTS Play & Text Highlight Synchronization Mode (4 Alternatives)
  ttsSyncMode: TTSSyncMode;

  // Non-Native TTS Fallback (Audio Stream): DISABLED by default (only native hardware/WebSpeech is used)
  allowNonNativeTTSFallback: boolean;

  // Alternative TTS Service (Google Translate TTS): OFF by default
  useAlternativeTtsService: boolean;
  alternativeTtsMode: "fallback_only" | "always";

  // TTS Debugger: Present TTS input and TTS queue by default for real-time debugging (toggleable in Settings)
  showTtsDebugQueue: boolean;

  // Learning Languages & Pagination
  learningLanguages: string[];
  subtitlesPerPage: number; // Number of records per page in Subtitles Teacher Panel (e.g. 10, 25, 50, 100, 0=All)

  // Auto-fetch target translation subtitles via tlang once after default subs loaded (Requirement 6)
  autoFetchTargetTranslationsWithTlang: boolean;

  // By default when a new subtitle is fetched - tts-play the name of the language used to fetch
  speakLanguageNameOnFetch: boolean;

  // Subtitle fetch pacing window (never try to fetch more than 1 subtitle in window frame of X seconds)
  subtitleFetchWindowSeconds: number;

  // Advanced Features (OFF by default)
  enableDiagnosticDock: boolean;
  enableNetworkInspector: boolean;
  enableErrorInspector: boolean;
  enableBackgroundPrecache: boolean;

  // Subtitle Fetching Methods (all enabled by default in settings)
  methods: {
    nativeTimedTextInterception: boolean;
    directTimedTextTlang: boolean;
    serverSubtitleExtraction: boolean;
    googleFreeTranslationFallback: boolean;
    offlineLocalCache: boolean;
  };

  // Playback Order
  playOrder: "video_then_tts" | "tts_then_video";

  // On-demand sentence translation ahead via Google translation API until YouTube subtitles are fetched
  enableOnDemandTranslation: boolean;
  onDemandTranslationSentencesAhead: number; // Configured X=10 sentences ahead

  // OpenRouter Free Models & AI Punctuation Settings
  openRouterModel?: string;
  openRouterApiKey?: string;
  openRouterPunctuationStyle?: "conversational" | "formal" | "short_sentences";
  aiPunctuateAutoApply?: boolean;

  // Beginner Mode Tab-Based Flow Settings
  workflowMode?: "beginner" | "expert";
  beginnerActiveTab?: "video" | "preferences";
  beginnerTtsSpeed?: number;
  beginnerTtsVoice?: string;
  beginnerSubtitlesRatio?: number;
  showVideoSubtitles?: boolean;
  beginnerFavoriteLangs?: string[];
  beginnerSplitByPunctuation?: boolean;
  beginnerPunctuationChars?: string[];
  beginnerRemoveChars?: string[];
  beginnerStripSpeakerBrackets?: boolean;

  // By default exclude the default subtitles from tts-play
  excludeDefaultSubtitlesFromTTS?: boolean;

  // Limits
  onDemandCount: number; // Limited to next X=4 subtitles (Step 4.4)
  maxRetries: number; // Max retry limit to X=2 (Step 2.3)
}

export const SUPPORTED_LANGUAGES_CATALOG: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "zh-CN", name: "Chinese Simplified (简体中文)" },
  { code: "zh-TW", name: "Chinese Traditional (繁體中文)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "he", name: "Hebrew (עברית)" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "sv", name: "Swedish (Svenska)" },
  { code: "no", name: "Norwegian (Norsk)" },
  { code: "da", name: "Danish (Dansk)" },
  { code: "fi", name: "Finnish (Suomi)" },
  { code: "vi", name: "Vietnamese (Tiếng Việt)" },
  { code: "th", name: "Thai (ไทย)" },
  { code: "el", name: "Greek (Ελληνικά)" },
  { code: "uk", name: "Ukrainian (Українська)" },
  { code: "cs", name: "Czech (Čeština)" },
  { code: "ro", name: "Romanian (Română)" },
  { code: "hu", name: "Hungarian (Magyar)" },
  { code: "id", name: "Indonesian (Bahasa Indonesia)" },
  { code: "ms", name: "Malay (Bahasa Melayu)" },
  { code: "tl", name: "Tagalog / Filipino" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "ur", name: "Urdu (اردو)" },
  { code: "fa", name: "Persian (فارسی)" },
  { code: "bg", name: "Bulgarian (Български)" },
  { code: "hr", name: "Croatian (Hrvatski)" },
  { code: "sr", name: "Serbian (Српски)" },
  { code: "sk", name: "Slovak (Slovenčina)" },
  { code: "sl", name: "Slovenian (Slovenščina)" },
  { code: "lt", name: "Lithuanian (Lietuvių)" },
  { code: "lv", name: "Latvian (Latviešu)" },
  { code: "et", name: "Estonian (Eesti)" },
  { code: "ca", name: "Catalan (Català)" },
  { code: "eu", name: "Basque (Euskara)" },
  { code: "gl", name: "Galician (Galego)" },
  { code: "ga", name: "Irish (Gaeilge)" },
  { code: "cy", name: "Welsh (Cymraeg)" },
  { code: "is", name: "Icelandic (Íslenska)" },
  { code: "sw", name: "Swahili (Kiswahili)" },
  { code: "af", name: "Afrikaans" },
  { code: "hy", name: "Armenian (Հայերեն)" },
  { code: "ka", name: "Georgian (ქართული)" },
  { code: "az", name: "Azerbaijani (Azərbaycan)" },
  { code: "kk", name: "Kazakh (Қазақ)" },
  { code: "uz", name: "Uzbek (Oʻzbek)" },
  { code: "mn", name: "Mongolian (Монгол)" },
  { code: "ne", name: "Nepali (नेपाली)" },
  { code: "si", name: "Sinhala (සිංහල)" },
  { code: "my", name: "Burmese (မြန်မာ)" },
  { code: "km", name: "Khmer (ខ្មែរ)" },
  { code: "lo", name: "Lao (ລາວ)" },
  { code: "sq", name: "Albanian (Shqip)" },
  { code: "mk", name: "Macedonian (Македонски)" },
  { code: "bs", name: "Bosnian (Bosanski)" },
  { code: "mt", name: "Maltese (Malti)" },
  { code: "la", name: "Latin (Latina)" },
  { code: "eo", name: "Esperanto" },
  { code: "yi", name: "Yiddish (ייִדיש)" },
];

export const ALL_KNOWN_LANGUAGES = SUPPORTED_LANGUAGES_CATALOG;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  // Default compact density is required by AGENTS.md across both hosts.
  compactView: true,
  theme: "midnight",
  showExpandedControls: true,
  showTeacherPanel: true,
  showLinkBar: true,

  // By default always show the most important buttons (Requirement 1)
  alwaysShowKeyControls: true,

  // By default keep translated subtitles on top, overlay inside top of video (Requirement 1)
  subtitlePosition: "top",
  showTranslatedOnTop: true,

  // By default enable TTS narration (plays synchronized TTS and highlights text)
  autoPlayTTS: true,

  // By default use only 1 target language
  singleTargetLanguageMode: true,

  // By default also show the subtitles's time section besides the subtitles
  showSubtitleTimestamps: true,

  // TTS Play & Text Highlight Sync Mode (4 Alternatives, default: word_boundary)
  ttsSyncMode: "word_boundary",

  // Non-Native TTS Fallback: enabled by default
  allowNonNativeTTSFallback: true,

  // Alternative TTS Service: OFF by default
  useAlternativeTtsService: false,
  alternativeTtsMode: "fallback_only",

  // Present TTS input and TTS queue by default for real-time debugging
  showTtsDebugQueue: true,

  // Favorite languages / learning targets: empty by default (no hardcoded default subtitles language)
  learningLanguages: [],
  subtitlesPerPage: 25,

  // By default try to subtitle fetch using tlang param change once after default subs loaded (Requirement 6)
  autoFetchTargetTranslationsWithTlang: true,

  // By default when a new subtitle is fetched - tts-play the name of the language used to fetch
  speakLanguageNameOnFetch: true,

  // Subtitle fetch pacing window (never try to fetch more than 1 subtitle in window frame of X seconds)
  subtitleFetchWindowSeconds: 5,

  // Advanced features: ON by default
  enableDiagnosticDock: true,
  enableNetworkInspector: true,
  enableErrorInspector: true,
  enableBackgroundPrecache: true,

  // Subtitle methods: all available
  methods: {
    nativeTimedTextInterception: true,
    directTimedTextTlang: true,
    serverSubtitleExtraction: true,
    googleFreeTranslationFallback: true,
    offlineLocalCache: true,
  },

  playOrder: "video_then_tts",
  enableOnDemandTranslation: true,
  onDemandTranslationSentencesAhead: 10,
  openRouterModel: "openrouter/auto:free",
  openRouterApiKey: "",
  openRouterPunctuationStyle: "conversational",
  aiPunctuateAutoApply: false,
  onDemandCount: 4,
  maxRetries: 2,

  // Beginner Mode Defaults
  workflowMode: "beginner",
  beginnerActiveTab: "preferences",
  beginnerTtsSpeed: 1.0,
  beginnerTtsVoice: "",
  beginnerSubtitlesRatio: 1.0,
  showVideoSubtitles: true,
  beginnerFavoriteLangs: ["he", "en", "es", "fr", "ar", "ru"],
  beginnerSplitByPunctuation: true,
  beginnerPunctuationChars: [".", "!", "?", "…", "؟"],
  beginnerRemoveChars: [">", ">>"],
  beginnerStripSpeakerBrackets: true,

  // By default exclude the default subtitles from tts-play
  excludeDefaultSubtitlesFromTTS: true,
};

const SETTINGS_STORAGE_KEY = STORAGE_KEYS.SETTINGS_STORAGE_KEY;

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        delete parsed.beginnerSelectedBaseLang;
      }
      return {
        ...DEFAULT_APP_SETTINGS,
        compactView: parsed.compactView !== undefined ? parsed.compactView : true,
        theme: parsed.theme || DEFAULT_APP_SETTINGS.theme,
        ...parsed,
        methods: {
          ...DEFAULT_APP_SETTINGS.methods,
          ...(parsed.methods || {}),
        },
      };
    }
  } catch (err) {
    console.warn("[AppSettings] Failed to load stored settings:", err);
  }
  return {
    ...DEFAULT_APP_SETTINGS,
    compactView: true,
  };
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("[AppSettings] Failed to save settings:", err);
  }
}

// ----------------------------------------------------------------------------
// Per-VideoID Settings Management (Target Languages, TTS Rates, Play Order)
// ----------------------------------------------------------------------------
export interface VideoSpecificSettings {
  targetLanguages?: any[];
  ttsRates?: Record<string, number>; // langCode -> rate
  ttsRatios?: Record<string, number>; // langCode -> ratio (1 in N sentences)
  playOrder?: "video_first" | "tts_first";
  sourceLang?: string;
  activeTargetLang?: string;
  lastUpdated?: number;
}

const VIDEO_SETTINGS_KEY_PREFIX = "yt_video_settings_";

export function loadVideoSettings(videoId: string): VideoSpecificSettings | null {
  if (typeof window === "undefined" || !videoId) return null;
  try {
    const raw = localStorage.getItem(`${VIDEO_SETTINGS_KEY_PREFIX}${videoId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[AppSettings] Failed to load settings for video ${videoId}:`, err);
  }
  return null;
}

export function saveVideoSettings(videoId: string, settings: Partial<VideoSpecificSettings>): void {
  if (typeof window === "undefined" || !videoId) return;
  try {
    const existing = loadVideoSettings(videoId) || {};
    const updated: VideoSpecificSettings = {
      ...existing,
      ...settings,
      ttsRates: {
        ...(existing.ttsRates || {}),
        ...(settings.ttsRates || {}),
      },
      ttsRatios: {
        ...(existing.ttsRatios || {}),
        ...(settings.ttsRatios || {}),
      },
      lastUpdated: Date.now(),
    };
    localStorage.setItem(`${VIDEO_SETTINGS_KEY_PREFIX}${videoId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn(`[AppSettings] Failed to save settings for video ${videoId}:`, err);
  }
}

export function getUserLearningLanguages(): string[] {
  const current = loadAppSettings();
  return Array.isArray(current.learningLanguages) ? current.learningLanguages : [];
}

export function setUserLearningLanguages(languages: string[]): void {
  const current = loadAppSettings();
  saveAppSettings({
    ...current,
    learningLanguages: languages,
  });
}

export const FAVORITE_LANGUAGES_KEY = "yt_favorite_languages";

/**
 * Retrieves global favorite languages configured in settings, backed by localStorage.
 */
export function getFavoriteLanguages(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITE_LANGUAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((item: unknown) =>
            typeof item === "string"
              ? item.trim()
              : item && typeof item === "object" && "code" in item && typeof (item as { code?: unknown }).code === "string"
                ? (item as { code: string }).code.trim()
                : "",
          )
          .filter((s): s is string => typeof s === "string" && s.length > 0);
      }
    }
  } catch {
    // fallback
  }
  const learning = getUserLearningLanguages();
  return Array.isArray(learning)
    ? learning
        .map((item: unknown) =>
          typeof item === "string"
            ? item.trim()
            : item && typeof item === "object" && "code" in item && typeof (item as { code?: unknown }).code === "string"
              ? (item as { code: string }).code.trim()
              : "",
        )
        .filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
}

/**
 * Saves global favorite languages in settings and localStorage.
 */
export function setFavoriteLanguages(languages: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITE_LANGUAGES_KEY, JSON.stringify(languages));
  } catch (err) {
    console.warn("[AppSettings] Failed to save favorite languages:", err);
  }
  setUserLearningLanguages(languages);
}

export function getVideoTargetLang(videoId: string): string | null {
  const settings = loadVideoSettings(videoId);
  return settings?.activeTargetLang || null;
}

export function setVideoTargetLang(videoId: string, langCode: string): void {
  saveVideoSettings(videoId, { activeTargetLang: langCode });
}

export function getSingleTargetLanguageMode(): boolean {
  const settings = loadAppSettings();
  return settings.singleTargetLanguageMode ?? true;
}

export function setSingleTargetLanguageMode(singleMode: boolean): void {
  const current = loadAppSettings();
  saveAppSettings({
    ...current,
    singleTargetLanguageMode: singleMode,
  });
}

// ----------------------------------------------------------------------------
// Full App Settings & Status Snapshot Export / Import
// ----------------------------------------------------------------------------
export interface AppStateSnapshot {
  exportedAt: string;
  version: string;
  settings: AppSettings;
  activeTargetLang?: string;
  videoSettings?: Record<string, VideoSpecificSettings>;
  status?: {
    platform: "android_native" | "web";
    userAgent?: string;
    timestamp?: number;
  };
}

export function isAndroidAppEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as any).AndroidNativeShell) return true;
  if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) return true;
  return false;
}

export function exportFullAppState(extraStatus?: Record<string, any>): string {
  const currentSettings = loadAppSettings();
  const allVideoSettings: Record<string, VideoSpecificSettings> = {};

  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(VIDEO_SETTINGS_KEY_PREFIX)) {
          const videoId = key.replace(VIDEO_SETTINGS_KEY_PREFIX, "");
          const val = loadVideoSettings(videoId);
          if (val) allVideoSettings[videoId] = val;
        }
      }
    } catch {
      // Ignore storage enumeration errors
    }
  }

  const isNative = isAndroidAppEnvironment();

  const snapshot: AppStateSnapshot = {
    exportedAt: new Date().toISOString(),
    version: "2.0.57",
    settings: currentSettings,
    videoSettings: allVideoSettings,
    status: {
      platform: isNative ? "android_native" : "web",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      timestamp: Date.now(),
      ...extraStatus,
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

export function importFullAppState(jsonString: string): {
  success: boolean;
  settings?: AppSettings;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Invalid JSON format: expected object" };
    }

    // Validate settings object
    const newSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...(parsed.settings || (parsed.methods ? parsed : {})),
      methods: {
        ...DEFAULT_APP_SETTINGS.methods,
        ...(parsed.settings?.methods || parsed.methods || {}),
      },
    };

    saveAppSettings(newSettings);

    // If videoSettings are provided, persist each
    if (
      parsed.videoSettings &&
      typeof parsed.videoSettings === "object" &&
      typeof window !== "undefined"
    ) {
      try {
        Object.entries(parsed.videoSettings).forEach(([videoId, vSettings]) => {
          if (videoId && typeof vSettings === "object") {
            localStorage.setItem(
              `${VIDEO_SETTINGS_KEY_PREFIX}${videoId}`,
              JSON.stringify(vSettings),
            );
          }
        });
      } catch (e) {
        console.warn("[AppSettings] Failed restoring video settings:", e);
      }
    }

    return { success: true, settings: newSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to parse JSON string" };
  }
}

export const AUTO_SCROLL_STORAGE_KEY = "yt_auto_scroll";

/**
 * Get whether auto-focus and scroll to current subtitle is enabled.
 * Defaults to FALSE (off) as required by Subtask 16.4.
 */
export function getAutoScrollSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    return window.localStorage.getItem(AUTO_SCROLL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Persist auto-focus and scroll to current subtitle setting.
 */
export function setAutoScrollSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(AUTO_SCROLL_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const AUTO_SCROLL_COOLDOWN_MS = 5000;

let lastUserInteractionTimestamp = 0;

/**
 * Record a user interaction timestamp (mouse movements, clicks, keypresses, scrolls, touch).
 */
export function recordUserInteraction(timestamp = Date.now()): void {
  lastUserInteractionTimestamp = timestamp;
}

/**
 * Returns the timestamp of the last recorded user interaction.
 */
export function getLastUserInteractionTimestamp(): number {
  return lastUserInteractionTimestamp;
}

/**
 * Checks if auto-scroll is currently allowed based on the 5-second idle cooldown.
 * Auto-scroll is permitted ONLY if at least AUTO_SCROLL_COOLDOWN_MS (5000ms)
 * have elapsed since the user last interacted with the page.
 */
export function isAutoScrollAllowed(
  currentTime = Date.now(),
  cooldownMs = AUTO_SCROLL_COOLDOWN_MS,
): boolean {
  if (lastUserInteractionTimestamp === 0) {
    return true;
  }
  return currentTime - lastUserInteractionTimestamp >= cooldownMs;
}

/**
 * Reset user interaction timestamp (primarily for tests).
 */
export function resetUserInteractionTimestamp(): void {
  lastUserInteractionTimestamp = 0;
}

export const DEBUG_MODE_STORAGE_KEY = "yt_debug_mode";

/**
 * Get whether debug mode is enabled.
 * Defaults to TRUE (on) by default.
 */
export function getDebugModeSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/**
 * Persist debug mode setting.
 */
export function setDebugModeSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const AUTO_SPEAK_ON_FETCH_STORAGE_KEY = "yt_auto_speak_on_fetch";

/**
 * Get whether auto-speak upon subtitle fetch is enabled.
 * Defaults to TRUE (on) to automatically speak language when subtitles are loaded.
 */
export function getAutoSpeakOnFetchSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(AUTO_SPEAK_ON_FETCH_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/**
 * Persist auto-speak upon subtitle fetch setting.
 */
export function setAutoSpeakOnFetchSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(AUTO_SPEAK_ON_FETCH_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const SPEAK_LANGUAGE_NAME_ON_FETCH_STORAGE_KEY = "yt_speak_language_name_on_fetch";

/**
 * Get whether TTS-playing the language name upon fetching subtitles is enabled.
 * Defaults to TRUE (on) by default.
 */
export function getSpeakLanguageNameOnFetchSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(SPEAK_LANGUAGE_NAME_ON_FETCH_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/**
 * Persist TTS-play language name upon subtitle fetch setting.
 */
export function setSpeakLanguageNameOnFetchSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      SPEAK_LANGUAGE_NAME_ON_FETCH_STORAGE_KEY,
      enabled ? "true" : "false",
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const SUBTITLE_FETCH_WINDOW_SECONDS_STORAGE_KEY = "yt_subtitle_fetch_window_seconds";

/**
 * Get the subtitle fetch window frame in seconds.
 * Never try to fetch more than 1 subtitle in this window frame to prevent YouTube API abuse.
 * Defaults to 5 seconds.
 */
export function getSubtitleFetchWindowSeconds(): number {
  if (typeof window === "undefined" || !window.localStorage) {
    return 5;
  }
  try {
    const val = window.localStorage.getItem(SUBTITLE_FETCH_WINDOW_SECONDS_STORAGE_KEY);
    if (!val) return 5;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 5 : num;
  } catch {
    return 5;
  }
}

/**
 * Persist subtitle fetch window frame in seconds.
 */
export function setSubtitleFetchWindowSeconds(seconds: number): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const clamped = Math.max(1, Math.min(60, seconds));
    window.localStorage.setItem(SUBTITLE_FETCH_WINDOW_SECONDS_STORAGE_KEY, String(clamped));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const LANGUAGE_DISPLAY_MODE_STORAGE_KEY = "yt_language_display_mode";

export type LanguageDisplayMode = "boxes" | "list";

/**
 * Get language presentation display mode ("boxes" or "list").
 * Defaults to "boxes" for touch-friendly Android UI.
 */
export function getLanguageDisplayModeSetting(): LanguageDisplayMode {
  if (typeof window === "undefined" || !window.localStorage) {
    return "boxes";
  }
  try {
    const val = window.localStorage.getItem(LANGUAGE_DISPLAY_MODE_STORAGE_KEY);
    return val === "list" ? "list" : "boxes";
  } catch {
    return "boxes";
  }
}

/**
 * Persist language presentation display mode.
 */
export function setLanguageDisplayModeSetting(mode: LanguageDisplayMode): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(LANGUAGE_DISPLAY_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const ON_DEMAND_TRANSLATION_STORAGE_KEY = "yt_enable_on_demand_translation";
export const ON_DEMAND_TRANSLATION_AHEAD_STORAGE_KEY = "yt_on_demand_translation_ahead";

export function getOnDemandTranslationSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(ON_DEMAND_TRANSLATION_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setOnDemandTranslationSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ON_DEMAND_TRANSLATION_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

export function getOnDemandTranslationSentencesAhead(): number {
  if (typeof window === "undefined" || !window.localStorage) return 10;
  try {
    const val = window.localStorage.getItem(ON_DEMAND_TRANSLATION_AHEAD_STORAGE_KEY);
    if (!val) return 10;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : num;
  } catch {
    return 10;
  }
}

export function setOnDemandTranslationSentencesAhead(count: number): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const clamped = Math.max(1, Math.min(50, count));
    window.localStorage.setItem(ON_DEMAND_TRANSLATION_AHEAD_STORAGE_KEY, String(clamped));
  } catch {
    // Ignore storage errors
  }
}

export const OPENROUTER_MODEL_STORAGE_KEY = "yt_openrouter_model";
export const OPENROUTER_API_KEY_STORAGE_KEY = "yt_openrouter_api_key";
export const AI_PUNCTUATE_AUTO_APPLY_STORAGE_KEY = "yt_ai_punctuate_auto_apply";

export function getOpenRouterModelSetting(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "openrouter/auto:free";
  }
  try {
    const val = window.localStorage.getItem(OPENROUTER_MODEL_STORAGE_KEY);
    return val && val.trim().length > 0 ? val.trim() : "openrouter/auto:free";
  } catch {
    return "openrouter/auto:free";
  }
}

export function setOpenRouterModelSetting(model: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      OPENROUTER_MODEL_STORAGE_KEY,
      model.trim() || "openrouter/auto:free",
    );
  } catch {
    // Ignore storage errors
  }
}

export function getOpenRouterApiKeySetting(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_OPENROUTER_API_KEY as string) || ""
      : "";
  }
  try {
    const userKey =
      window.localStorage.getItem(OPENROUTER_API_KEY_STORAGE_KEY) ||
      window.localStorage.getItem("yt_alternative_tts_lovable_api_key_v1") ||
      window.localStorage.getItem("yt_openrouter_api_key_v1") ||
      "";
    if (userKey && userKey.trim()) return userKey.trim();
    const envKey =
      typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_OPENROUTER_API_KEY as string) || ""
        : "";
    return envKey ? envKey.trim() : "";
  } catch {
    return "";
  }
}

export function setOpenRouterApiKeySetting(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const clean = key.trim();
  try {
    if (clean) {
      window.localStorage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, clean);
      window.localStorage.setItem("yt_alternative_tts_lovable_api_key_v1", clean);
      window.localStorage.setItem("yt_openrouter_api_key_v1", clean);
    } else {
      window.localStorage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY);
      window.localStorage.removeItem("yt_alternative_tts_lovable_api_key_v1");
      window.localStorage.removeItem("yt_openrouter_api_key_v1");
    }
  } catch {
    // Ignore storage errors
  }
}

export function getAiPunctuateAutoApplySetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(AI_PUNCTUATE_AUTO_APPLY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAiPunctuateAutoApplySetting(autoApply: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(AI_PUNCTUATE_AUTO_APPLY_STORAGE_KEY, String(autoApply));
  } catch {
    // Ignore storage errors
  }
}

export const OPENROUTER_PUNCTUATION_STYLE_STORAGE_KEY = "yt_openrouter_punct_style";

export function getOpenRouterPunctuationStyleSetting():
  "conversational" | "formal" | "short_sentences" {
  if (typeof window === "undefined" || !window.localStorage) return "conversational";
  try {
    const val = window.localStorage.getItem(OPENROUTER_PUNCTUATION_STYLE_STORAGE_KEY);
    if (val === "formal" || val === "short_sentences" || val === "conversational") {
      return val;
    }
    return "conversational";
  } catch {
    return "conversational";
  }
}

export function setOpenRouterPunctuationStyleSetting(
  style: "conversational" | "formal" | "short_sentences",
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(OPENROUTER_PUNCTUATION_STYLE_STORAGE_KEY, style);
  } catch {
    // Ignore storage errors
  }
}

export const EXCLUDE_DEFAULT_SUBTITLES_TTS_STORAGE_KEY = "yt_exclude_default_subs_tts";

/**
 * Get whether default subtitles should be excluded from TTS play by default.
 * Defaults to true.
 */
export function getExcludeDefaultSubtitlesFromTTSSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(EXCLUDE_DEFAULT_SUBTITLES_TTS_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/**
 * Persist setting to exclude default subtitles from TTS play by default.
 */
export function setExcludeDefaultSubtitlesFromTTSSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      EXCLUDE_DEFAULT_SUBTITLES_TTS_STORAGE_KEY,
      enabled ? "true" : "false",
    );
  } catch {
    // Ignore storage errors
  }
}

export const STRIP_SPEAKER_BRACKETS_STORAGE_KEY = "yt_strip_speaker_brackets_v1";
export const REMOVE_CHARS_STORAGE_KEY = "yt_remove_chars_v1";

/**
 * Get setting to strip speaker brackets and noise cues.
 */
export function getStripSpeakerBracketsSetting(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  try {
    const val = window.localStorage.getItem(STRIP_SPEAKER_BRACKETS_STORAGE_KEY);
    if (val !== null) return val === "true";
  } catch {
    // Ignore storage errors
  }
  return true;
}

/**
 * Persist setting to strip speaker brackets and noise cues.
 */
export function setStripSpeakerBracketsSetting(enabled: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STRIP_SPEAKER_BRACKETS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get setting for characters to remove or strip.
 */
export function getRemoveCharsSetting(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [">", ">>"];
  try {
    const val = window.localStorage.getItem(REMOVE_CHARS_STORAGE_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return [">", ">>"];
}

/**
 * Persist setting for characters to remove or strip.
 */
export function setRemoveCharsSetting(chars: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(REMOVE_CHARS_STORAGE_KEY, JSON.stringify(chars));
  } catch {
    // Ignore storage errors
  }
}

export const VIDEO_LIBRARY_TIMEOUT_KEY = "yt_video_library_timeout_enabled";

export function getVideoLibraryTimeoutSetting(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return true;
    const val = window.localStorage.getItem(VIDEO_LIBRARY_TIMEOUT_KEY);
    return val !== null ? val === "true" || val === "1" : true;
  } catch {
    return true;
  }
}

export function setVideoLibraryTimeoutSetting(enabled: boolean): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(VIDEO_LIBRARY_TIMEOUT_KEY, enabled ? "true" : "false");
  } catch {}
}
