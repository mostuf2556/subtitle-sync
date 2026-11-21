export interface VideoItem {
  id: string;
  originalUrl: string;
  title?: string;
  timestamp: number;
}

export interface VideoCaptionTrackInfo {
  langCode: string;
  name?: string;
  isDefault?: boolean;
  isAsr?: boolean;
  trackUrl?: string;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  description?: string;
  authorName?: string;
  authorUrl?: string;
  channelId?: string;
  thumbnailUrl?: string;
  maxResThumbnailUrl?: string;
  sdThumbnailUrl?: string;
  hqThumbnailUrl?: string;
  mqThumbnailUrl?: string;
  defaultThumbnailUrl?: string;
  html?: string;
  providerName?: string;
  providerUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  availableCaptionTracks?: VideoCaptionTrackInfo[];
  defaultSubtitleLang?: string;
  extractedVia?: string;
  fetchedAt: number;
}

export interface LibraryVideoItem {
  id: string;
  originalUrl: string;
  title: string;
  cues: CaptionCue[];
  timestamp: number;
  targetLanguages?: TargetLanguage[];
  ttsRates?: Record<string, number>;
  ttsRatios?: Record<string, number>; // langCode -> ratio (1 in N sentences)
  playOrder?: SyncPlayOrder;
  sourceLang?: string;
  activeTargetLang?: string;
}

export interface PlayerOptions {
  autoplay: boolean;
  theaterMode: boolean;
  loop: boolean;
}

export type YouTubeFormatType =
  | "standard_watch"
  | "short_link"
  | "shorts"
  | "live"
  | "embed"
  | "iframe_code"
  | "legacy_v"
  | "attribution"
  | "raw_id"
  | "text_extracted"
  | "playlist_video"
  | "mobile_watch";

export interface ParsedYouTubeResult {
  videoId: string;
  formatType: YouTubeFormatType;
  startTime?: number; // In seconds (e.g. from t=1m30s)
  listId?: string; // e.g. from list=PL...
  cleanWatchUrl: string;
  embedUrl: string;
}

export interface CaptionCue {
  id: string;
  start: number; // in seconds
  duration: number; // in seconds
  text: string;
}

export interface TargetLanguage {
  id: string;
  code: string;
  name: string;
  ttsRate: number; // 0.5 to 2.0
  ttsRatio?: number; // 1 to N, e.g. 1 (all subtitles), 2 (every 2nd), etc.
  voice?: string; // voice name or voiceURI
  enabled: boolean;
  color?: string;
}

export type SyncPlayOrder = "video_first" | "tts_first";

export interface TTSStatus {
  isSpeaking: boolean;
  currentLang?: string;
  currentText?: string;
  engine: "android_native" | "web_speech";
}

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  isReady: () => boolean;
}

export interface InterceptedCaptionData {
  id: string;
  url: string;
  videoId: string;
  timestamp: number;
  method: string;
  status: number;
  contentType: string;
  format: "json3" | "unknown";
  rawData: string;
  bytes: number;
  cues: CaptionCue[];
  source: "native_webview_interceptor" | "simulated_test";
}

export type TranslationSource =
  | "youtube_native"
  | "youtube_native_client"
  | "youtube_native_android"
  | "google_translate_fallback"
  | "sample_offline";

export interface YouTubeNativeTranslationResult {
  success: boolean;
  source: TranslationSource;
  targetLang: string;
  format?: "json3" | "unknown";
  cues?: CaptionCue[];
  translations?: Record<string, string>;
  error?: string;
  modifiedUrl?: string;
}

declare global {
  interface Window {
    AndroidNativeShell?: {
      isNativeShell: () => boolean;
      showToast: (msg: string) => void;
      isTtsReady?: () => boolean;
      speak?: (text: string, lang: string, rate: number, utteranceId: string) => boolean;
      stopSpeaking?: () => void;
      isSpeaking?: () => boolean;
      getLastObservedTimedTextUrl?: () => string;
      setLastObservedTimedTextUrl?: (url: string) => void;
      fetchTranslatedCaptions?: (targetLang: string, format: string) => string;
      fetchTranslatedCaptionsWithUrl?: (url: string, targetLang: string, format: string) => string;
      fetchTimedTextExact?: (url: string, withSession: boolean) => string;
      fetchTimedTextExactAsync?: (requestId: string, url: string, withSession: boolean) => boolean;
      applyReleaseArtifact?: (downloadUrl: string, releaseTag: string) => boolean;
      clearOtaCache?: () => boolean;
      getAppliedReleaseArtifactTag?: () => string;
      getAppVersionName?: () => string;
      getAppVersionCode?: () => number;
      getInstalledAppInfo?: () => string;
      openInBrowser?: (url: string) => boolean;
      shareText?: (text: string, title?: string) => boolean;
      shareSubtitlesUrl?: (url: string, title?: string) => boolean;
      setBackgroundAudioEnabled?: (enabled: boolean) => boolean;
      saveLocalStorageBackup?: (snapshotJson: string) => boolean;
      readLocalStorageBackup?: () => string;
      updateMediaMetadata?: (
        title: string,
        artist: string,
        isPlaying: boolean,
        positionMs: number,
        durationMs: number,
      ) => boolean;
    };
    onNativeCaptionsInterceptedBase64?: (base64Json: string) => void;
    __onNativeFetchTimedTextResult?: (requestId: string, payloadJson: string) => void;
    onNativeTTSStart?: (utteranceId: string) => void;
    onNativeTTSDone?: (utteranceId: string) => void;
    onNativeTTSBoundary?: (utteranceId: string, charIndex: number) => void;
    onNativeTTSError?: (utteranceId: string, errorMsg?: string) => void;
    onNativeSharedLinkReceived?: (sharedLink: string) => void;
    onNativeMediaCommand?: (action: string, data?: number) => void;
    __pendingSharedLink?: string;
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type { Json3, Cue, Row } from "./lib/subtitles";
