import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Volume2,
  Sparkles,
} from "lucide-react";
import {
  type AlternativeTtsEngine,
  type AlternativeTtsMode,
  type LovableTtsProvider,
  type RemoteTtsValidationResult,
  type ProviderTestResult,
  LOVABLE_TTS_PROVIDERS,
  SELECTABLE_AUTO_PROVIDERS,
  LOVABLE_TTS_DOCS_URL,
  LOVABLE_TTS_OPENAPI_URL,
  getVoicesForProvider,
  getDefaultVoiceForProvider,
  isSpeakApiPersonalToken,
  getAlternativeTtsAnonymousMode,
  setAlternativeTtsAnonymousMode,
  getCustomAutoProviders,
  setCustomAutoProviders,
  testAllOpenApiProviders,
  playAlternativeTtsAudio,
  fetchOpenApiProviders,
  recordEmployedTtsProvider,
  getLastEmployedTtsProvider,
  subscribeEmployedTtsProvider,
  disableAutoProvider,
  type EmployedTtsProviderInfo,
} from "@/lib/alternative-tts";
import { ExternalTtsDebuggerPanel } from "@/components/ExternalTtsDebuggerPanel";
import { useIsElementEnabled } from "@/utils/performanceModeManager";
import { recordUserInteraction } from "@/utils/appSettings";

export interface TtsServiceSettingsPanelProps {
  mode: AlternativeTtsMode;
  onModeChange: (mode: AlternativeTtsMode) => void;
  engine: AlternativeTtsEngine;
  onEngineChange: (engine: AlternativeTtsEngine) => void;
  provider: LovableTtsProvider;
  onProviderChange: (provider: LovableTtsProvider) => void;
  voice: string;
  onVoiceChange: (voice: string) => void;
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;
  baseLanguage?: string;
  currentKeyInput?: string;
  hasCustomKey?: boolean;
  hasCustomSpeakToken?: boolean;
  hasServerKey?: boolean;
  onSaveKey?: (key: string) => void;
  onClearKey?: () => void;
  onValidateService: () => Promise<void> | void;
  onTestAudio: () => Promise<boolean | void> | boolean | void;
  isValidating?: boolean;
  isTestingAudio?: boolean;
  validationResult?: RemoteTtsValidationResult | null;
  isAnonymous?: boolean;
  onAnonymousChange?: (anonymous: boolean) => void;
  showDebugger?: boolean;
  className?: string;
}

/**
 * Reactive TTS Service Settings Panel.
 *
 * Enforces strict reactive visibility to eliminate UI clutter:
 * Lovable Speak API (tts3.lovable.app):
 * - Shows provider selector ("auto", "google", "openrouter", "gemini", etc.)
 * - When provider is "google" or "auto": hides API key and voice dropdown
 * - When provider is keyed (openrouter, openai, elevenlabs, etc.): dynamically shows provider voices and token input
 * - Single validate button + single test audio button
 */
export const TtsServiceSettingsPanel: React.FC<TtsServiceSettingsPanelProps> = React.memo(
  ({
    mode,
    onModeChange,
    engine,
    onEngineChange,
    provider,
    onProviderChange,
    voice,
    onVoiceChange,
    speechRate,
    onSpeechRateChange,
    baseLanguage = "en",
    currentKeyInput = "",
    hasCustomKey = false,
    hasCustomSpeakToken = false,
    hasServerKey = false,
    onSaveKey,
    onClearKey,
    onValidateService,
    onTestAudio,
    isValidating = false,
    isTestingAudio = false,
    validationResult = null,
    isAnonymous,
    onAnonymousChange,
    showDebugger = true,
    className = "",
  }) => {
    const [keyInput, setKeyInput] = useState(currentKeyInput);
    const [showKeyPassword, setShowKeyPassword] = useState(false);
    const [keySavedFeedback, setKeySavedFeedback] = useState(false);
    const [anonymousState, setAnonymousState] = useState<boolean>(() => {
      if (isAnonymous !== undefined) return isAnonymous;
      return getAlternativeTtsAnonymousMode();
    });

    const [autoProviders, setAutoProviders] = useState<LovableTtsProvider[]>(() =>
      getCustomAutoProviders(),
    );
    const [isTestingAllProviders, setIsTestingAllProviders] = useState(false);
    const [providerTestResults, setProviderTestResults] = useState<ProviderTestResult[] | null>(
      null,
    );
    const [activePlayingProvider, setActivePlayingProvider] = useState<string | null>(null);
    const [testAudioError, setTestAudioError] = useState<string | null>(null);
    const [testAudioSuccess, setTestAudioSuccess] = useState<boolean>(false);
    const [discoveredOpenApiProviders, setDiscoveredOpenApiProviders] = useState<
      LovableTtsProvider[]
    >(() => [...SELECTABLE_AUTO_PROVIDERS]);
    const [isSyncingOpenApi, setIsSyncingOpenApi] = useState<boolean>(false);
    const [openApiSyncNote, setOpenApiSyncNote] = useState<string | null>(null);
    const [employedProvider, setEmployedProvider] = useState<EmployedTtsProviderInfo | null>(() =>
      getLastEmployedTtsProvider(),
    );

    React.useEffect(() => {
      return subscribeEmployedTtsProvider((info) => {
        setEmployedProvider(info);
      });
    }, []);

    const handleSyncOpenApiProviders = async () => {
      if (isSyncingOpenApi) return;
      setIsSyncingOpenApi(true);
      setOpenApiSyncNote(null);
      try {
        const res = await fetchOpenApiProviders();
        setDiscoveredOpenApiProviders(res.providers);
        setOpenApiSyncNote(
          res.fromLiveSpec
            ? `Synced ${res.providers.length} providers from openapi.json`
            : `Using ${res.providers.length} built-in OpenAPI providers`,
        );
      } finally {
        setIsSyncingOpenApi(false);
      }
    };

    const handleTestAudioClick = async () => {
      setTestAudioError(null);
      setTestAudioSuccess(false);
      recordEmployedTtsProvider(
        provider === "auto" ? autoProviders.join(", ") || "auto" : provider,
        "requested",
      );
      try {
        const result = await onTestAudio();
        if (result === false) {
          setTestAudioError(
            `Audio playback failed for TTS3 (${provider}). Check provider status, token, or browser audio permissions.`,
          );
        } else {
          setTestAudioSuccess(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err || "Unknown playback error");
        setTestAudioError(`Audio playback failed: ${msg}`);
      }
    };

    const handleToggleAutoProvider = (p: LovableTtsProvider) => {
      setAutoProviders((prev) => {
        const exists = prev.includes(p);
        const next = exists ? prev.filter((item) => item !== p) : [...prev, p];
        const finalized = next.length > 0 ? next : [p]; // keep at least one
        setCustomAutoProviders(finalized);
        return finalized;
      });
    };

    const handleTestAllProviders = async () => {
      if (isTestingAllProviders) return;
      setIsTestingAllProviders(true);
      setProviderTestResults([]);
      try {
        const results = await testAllOpenApiProviders(
          "OpenAPI multi-provider test",
          baseLanguage || "en",
          SELECTABLE_AUTO_PROVIDERS,
          (_completed, _total, current) => {
            setProviderTestResults((prev) => {
              const filtered = (prev || []).filter((r) => r.provider !== current.provider);
              return [...filtered, current];
            });
          },
        );
        setProviderTestResults(results);
      } catch (err) {
        console.warn("Failed testing all providers:", err);
      } finally {
        setIsTestingAllProviders(false);
      }
    };

    const handlePlayProviderAudio = async (result: ProviderTestResult) => {
      if (!result.audioUrl || activePlayingProvider) return;
      setActivePlayingProvider(result.provider);
      setTestAudioError(null);
      recordEmployedTtsProvider(result.provider, "requested");
      try {
        const played = await playAlternativeTtsAudio(
          "OpenAPI test",
          baseLanguage || "en",
          speechRate || 1.0,
          undefined,
          "lovable",
          {
            provider: result.provider,
            interrupt: true,
          },
        );
        if (played === false) {
          setTestAudioError(`Failed to play audio clip for provider "${result.provider}".`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err || "Unknown playback error");
        setTestAudioError(`Failed playing "${result.provider}" audio: ${msg}`);
      } finally {
        setActivePlayingProvider(null);
      }
    };

    const debuggerEnabled = useIsElementEnabled("tts_debugger");

    React.useEffect(() => {
      if (isAnonymous !== undefined) {
        setAnonymousState(isAnonymous);
      }
    }, [isAnonymous]);

    const handleAnonymousToggle = (val: boolean) => {
      setAnonymousState(val);
      setAlternativeTtsAnonymousMode(val);
      onAnonymousChange?.(val);
    };

    // Sync state if prop changes from outside
    React.useEffect(() => {
      setKeyInput(currentKeyInput);
    }, [currentKeyInput]);

    const isLovablePublicProvider = provider === "google" || provider === "auto";
    const isKeyedProvider = !isLovablePublicProvider;
    const isValidationOk = Boolean(validationResult && validationResult.ok);

    const availableVoices = getVoicesForProvider(provider);

    const handleSaveKeyClick = () => {
      if (onSaveKey) {
        onSaveKey(keyInput);
        setKeySavedFeedback(true);
        setTimeout(() => setKeySavedFeedback(false), 2000);
      }
    };

    const handleClearKeyClick = () => {
      setKeyInput("");
      if (onClearKey) {
        onClearKey();
      }
    };

    return (
      <div
        data-testid="tts-service-settings-panel"
        className={`space-y-3 p-3 rounded-lg border border-border bg-card text-card-foreground text-xs ${className}`}
      >
        {/* 1. Mode Selector: Always vs Fallback only */}
        <div className="space-y-1.5 pb-2 border-b border-border/50">
          <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] block">
            Playback Mode
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="tts-panel-playback-mode"
                data-testid="alternative-tts-mode-always"
                value="always"
                checked={mode === "always"}
                onChange={() => onModeChange("always")}
              />
              <span className="font-medium text-foreground">Always use speech service</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
              <input
                type="radio"
                name="tts-panel-playback-mode"
                data-testid="alternative-tts-mode-fallback"
                value="fallback_only"
                checked={mode === "fallback_only"}
                onChange={() => onModeChange("fallback_only")}
              />
              <span>Fallback only when device speech fails</span>
            </label>
          </div>
        </div>

        {/* 2. TTS Service / Engine Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="tts-panel-engine-select"
              className="text-muted-foreground font-semibold"
            >
              TTS Service:
            </label>
            <select
              id="tts-panel-engine-select"
              data-testid="alternative-tts-engine-select"
              value={engine}
              onChange={(e) => onEngineChange(e.target.value as AlternativeTtsEngine)}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-2xs transition-all focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="lovable">Lovable Speak API (tts3.lovable.app)</option>
            </select>
          </div>

          {engine === "lovable" && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <a
                href={LOVABLE_TTS_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="lovable-tts-docs-link"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Docs ↗
              </a>
              <a
                href={LOVABLE_TTS_OPENAPI_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="lovable-tts-openapi-link"
                className="text-muted-foreground hover:underline inline-flex items-center gap-0.5"
              >
                OpenAPI ↗
              </a>
            </div>
          )}
        </div>

        {/* 3. Reactive Controls Card */}
        <div
          data-testid="tts-reactive-controls-card"
          className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border/60"
        >
          {/* Lovable Speak API Mode: Reactive Provider & Voice Selection */}
          <div className="space-y-3" data-testid="lovable-speak-api-controls">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Provider Selection */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="tts-panel-provider-select"
                  className="text-muted-foreground font-medium"
                >
                  Provider:
                </label>
                <select
                  id="tts-panel-provider-select"
                  data-testid="lovable-tts-provider-select"
                  value={provider}
                  onChange={(e) => {
                    const nextProvider = e.target.value as LovableTtsProvider;
                    onProviderChange(nextProvider);
                    const newVoices = getVoicesForProvider(nextProvider);
                    if (newVoices.length > 0 && !newVoices.includes(voice)) {
                      onVoiceChange(getDefaultVoiceForProvider(nextProvider));
                    }
                  }}
                  className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-mono font-medium shadow-2xs transition-all focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {LOVABLE_TTS_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Selection (Dynamically shown only when provider offers choices) */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Voice:</span>
                {availableVoices.length === 0 ? (
                  <span
                    data-testid="tts-default-voice-indicator"
                    className="text-xs text-muted-foreground italic px-2 py-0.5 rounded bg-background border border-border/60"
                  >
                    Default (Standard voice)
                  </span>
                ) : (
                  <select
                    data-testid="lovable-tts-voice-select"
                    value={voice || getDefaultVoiceForProvider(provider)}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-2xs transition-all focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {availableVoices.map((v) => (
                      <option key={v} value={v}>
                        {v} {v === getDefaultVoiceForProvider(provider) ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Active / Employed Provider Indicator & Disable Button + OpenAPI Sync */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 bg-background/50 px-2.5 py-1.5 text-[11px]">
              <button
                type="button"
                data-testid="tts-employed-provider-badge"
                onClick={() => {
                  const target = employedProvider?.provider || (provider !== "auto" ? provider : "");
                  if (!target) return;
                  const updated = disableAutoProvider(target);
                  setAutoProviders(updated);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-border/70 bg-background hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive px-2 py-0.5 text-muted-foreground cursor-pointer transition-colors"
                title="Click to disable the currently employed provider from the auto pool"
              >
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                <span>Employed provider:</span>
                <strong className="font-mono text-foreground">
                  {employedProvider?.provider ||
                    (provider === "auto"
                      ? `auto (${autoProviders.join(", ")})`
                      : provider)}
                </strong>
                <span className="text-[10px] underline ml-1">Disable</span>
              </button>
              <div className="flex items-center gap-1.5">
                {openApiSyncNote && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {openApiSyncNote}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="btn-sync-openapi-providers"
                  disabled={isSyncingOpenApi}
                  onClick={() => void handleSyncOpenApiProviders()}
                  className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-[10.5px] font-mono text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-60"
                  title="Refresh available providers from openapi.json"
                >
                  {isSyncingOpenApi ? "Syncing…" : "Sync openapi.json"}
                </button>
              </div>
            </div>

            {/* Custom Auto Provider Selection: Shown when provider is "auto" to customize /api/public/auto pool */}
            {provider === "auto" && (
              <div
                data-testid="custom-auto-providers-section"
                className="space-y-1.5 p-2 rounded border border-border/60 bg-background/50"
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Custom Auto Provider Pool:</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Uncheck providers with unpleasant audio to exclude them
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {discoveredOpenApiProviders.map((p) => {
                    const isChecked = autoProviders.includes(p);
                    return (
                      <label
                        key={p}
                        data-testid={`auto-provider-option-${p}`}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                            : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAutoProvider(p)}
                          className="h-3 w-3 rounded text-primary border-input focus:ring-primary cursor-pointer"
                        />
                        <span>{p}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* API Key / Speak API Token / Authorization Code Input (Shown for Lovable Speak API tts3.lovable.app) */}
            <div
              data-testid="tts-token-input-section"
              className="space-y-1.5 pt-2 border-t border-border/60"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label
                  htmlFor="tts-panel-token-input"
                  className="text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap"
                >
                  <span>Authorization Code / API Token:</span>
                  {hasCustomSpeakToken ? (
                    <span
                      data-testid="speak-token-custom-badge"
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30"
                    >
                      ✓ Authorization code (spk_...) saved
                    </span>
                  ) : hasCustomKey ? (
                    <span
                      data-testid="openrouter-key-custom-badge"
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30"
                    >
                      ✓ Provider key saved
                    </span>
                  ) : hasServerKey ? (
                    <span
                      data-testid="openrouter-key-server-badge"
                      className="text-[10px] text-primary font-medium"
                    >
                      (Using server .env key)
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      (Optional - enter Bearer token or spk_...)
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    id="tts-panel-token-input"
                    data-testid="openrouter-tts-key-input"
                    type={showKeyPassword ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={
                      hasServerKey
                        ? "Using server key (or enter Bearer spk_...)"
                        : "Bearer spk_... or spk_... (authorization code)"
                    }
                    className="w-full rounded border border-input bg-background px-2.5 py-1 pr-8 text-xs font-mono text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    data-testid="toggle-show-openrouter-key-btn"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    title={showKeyPassword ? "Hide key" : "Show key"}
                  >
                    {showKeyPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="save-openrouter-key-btn"
                  onClick={handleSaveKeyClick}
                  className="px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer"
                >
                  {keySavedFeedback ? "Saved!" : "Save"}
                </button>

                {keyInput && (
                  <button
                    type="button"
                    data-testid="clear-openrouter-key-btn"
                    onClick={handleClearKeyClick}
                    className="px-2 py-1 rounded border border-input bg-background text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    title="Clear custom key"
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className="text-[10.5px] text-muted-foreground leading-normal mt-0.5">
                Set authorization code (
                <code className="font-mono text-primary">Bearer spk_...</code> or{" "}
                <code className="font-mono text-primary">spk_...</code>) for{" "}
                <code className="font-mono text-primary">
                  https://tts3.lovable.app/api/public/tts
                </code>{" "}
                POST requests, or an upstream key (
                <code className="font-mono text-primary">sk_...</code>).
              </p>
            </div>
          </div>

          {/* 4. Speech Rate Notice & Control */}
          <div
            data-testid="lovable-tts-native-speed-notice"
            className="flex items-center justify-between rounded border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
          >
            <span className="text-muted-foreground font-medium">TTS Speech Rate:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-mono text-[11px]">
                {(speechRate ?? 0.5).toFixed(1)}x
              </span>
              <select
                data-testid="main-settings-tts-rate-select"
                aria-label="TTS speech rate"
                value={(speechRate ?? 0.5).toFixed(1)}
                onChange={(e) => {
                  recordUserInteraction(Date.now());
                  onSpeechRateChange(Number(e.target.value));
                }}
                className="rounded border border-input bg-background px-1.5 py-0.5 text-xs font-mono cursor-pointer"
              >
                {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((rateVal) => (
                  <option key={rateVal} value={rateVal.toFixed(1)}>
                    {rateVal.toFixed(1)}×
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* 4b. Anonymity Mode Selector (Regular vs Anonymous) */}
          <div
            data-testid="tts-anonymity-mode-control"
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
          >
            <div className="flex flex-col">
              <span className="text-foreground font-medium flex items-center gap-1.5">
                <span>Access Mode:</span>
                <span
                  data-testid="tts-anonymity-status-label"
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    anonymousState
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {anonymousState ? "Anonymous" : "Regular"}
                </span>
              </span>
              <span className="text-[10.5px] text-muted-foreground">
                {anonymousState
                  ? "Anonymous: strips cookies, session tokens, and personal identifiers"
                  : "Regular: uses standard credentials and session tracking"}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded border border-input">
              <button
                type="button"
                data-testid="tts-anonymity-regular-btn"
                onClick={() => handleAnonymousToggle(false)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                  !anonymousState
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                data-testid="tts-anonymity-anonymous-btn"
                onClick={() => handleAnonymousToggle(true)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all ${
                  anonymousState
                    ? "bg-amber-500 text-white dark:bg-amber-600 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anonymous
              </button>
            </div>
          </div>
        </div>

        {/* 5. Clean Action Buttons Row: First show Validation button. After validation is OK -> show Play button. */}
        <div
          data-testid="tts-service-action-buttons-row"
          className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50"
        >
          {!isValidationOk ? (
            <>
              {/* First show Validation button */}
              <button
                type="button"
                data-testid="btn-validate-remote-tts"
                disabled={isValidating}
                onClick={() => onValidateService()}
                className="px-2.5 py-1 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-xs font-mono inline-flex items-center gap-1.5 text-primary disabled:opacity-60 cursor-pointer font-medium shadow-2xs"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Validating Service…</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3" />
                    <span>Validate TTS3 Service</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="btn-validate-tts3-service"
                disabled={isValidating}
                onClick={() => onValidateService()}
                className="px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-[11px] font-mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Validate Lovable TTS3 public endpoint"
              >
                Validate TTS3 Service
              </button>

              <span
                data-testid="tts-validation-required-hint"
                className="text-[11px] text-muted-foreground font-mono inline-flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3 text-muted-foreground/70" />
                <span>Validate service first to enable playback</span>
              </span>
            </>
          ) : (
            <>
              {/* After validation is OK - show Play button */}
              <button
                type="button"
                data-testid="test-alternative-tts-btn"
                disabled={isTestingAudio}
                onClick={() => void handleTestAudioClick()}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer font-semibold shadow-xs"
              >
                {isTestingAudio ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                    <span>Playing test audio…</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>▶ Play Test Audio (TTS3 / {provider})</span>
                  </>
                )}
              </button>

              {/* Re-validate secondary button */}
              <button
                type="button"
                data-testid="btn-validate-remote-tts"
                disabled={isValidating}
                onClick={() => onValidateService()}
                className="px-2 py-1 rounded border border-border bg-background hover:bg-muted text-[11px] font-mono inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Re-validate service endpoint"
              >
                {isValidating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Activity className="h-3 w-3" />
                )}
                <span>Re-validate</span>
              </button>
            </>
          )}

          {/* OpenAPI Multi-Provider Test All Button */}
          <button
            type="button"
            data-testid="btn-test-all-openapi-providers"
            disabled={isTestingAllProviders}
            onClick={handleTestAllProviders}
            className="px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-mono inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 disabled:opacity-60 cursor-pointer font-medium shadow-2xs"
            title="Test audio response generation across all OpenAPI providers"
          >
            {isTestingAllProviders ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Testing Providers…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Test All Providers (OpenAPI)</span>
              </>
            )}
          </button>

          {testAudioError && (
            <div
              role="alert"
              data-testid="tts-test-audio-error"
              className="w-full flex items-start gap-1.5 rounded border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{testAudioError}</span>
            </div>
          )}

          {testAudioSuccess && !testAudioError && !isTestingAudio && (
            <div
              data-testid="tts-test-audio-success"
              className="w-full flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Test audio played successfully ({provider}).</span>
            </div>
          )}
        </div>

        {/* Multi-Provider Test Results Card & Live Audio Playback */}
        {providerTestResults && providerTestResults.length > 0 && (
          <div
            data-testid="openapi-multi-provider-results-card"
            className="space-y-2 p-2.5 rounded-lg border border-border bg-background/60 text-xs"
          >
            <div className="flex items-center justify-between flex-wrap gap-1 border-b border-border/50 pb-1.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>OpenAPI Multi-Provider Audio Generation Results</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {providerTestResults.filter((r) => r.ok).length} / {providerTestResults.length}{" "}
                ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {providerTestResults.map((result) => {
                const isPlaying = activePlayingProvider === result.provider;
                return (
                  <div
                    key={result.provider}
                    data-testid={`provider-result-card-${result.provider}`}
                    className={`p-2 rounded border flex flex-col justify-between gap-1.5 transition-all ${
                      result.ok
                        ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                        : "border-destructive/30 bg-destructive/5 text-destructive"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-semibold text-[11px] uppercase">
                        {result.provider}
                      </span>
                      <span
                        data-testid={`provider-status-badge-${result.provider}`}
                        className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-medium ${
                          result.ok
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {result.ok ? `${result.latencyMs}ms` : "Error"}
                      </span>
                    </div>

                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {result.ok ? result.details : result.error}
                    </span>

                    {result.ok && result.audioUrl && (
                      <button
                        type="button"
                        data-testid={`play-provider-audio-btn-${result.provider}`}
                        disabled={isPlaying}
                        onClick={() => handlePlayProviderAudio(result)}
                        className="mt-1 w-full px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10.5px] font-mono inline-flex items-center justify-center gap-1 cursor-pointer font-medium transition-all"
                      >
                        {isPlaying ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span>Playing…</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" />
                            <span>▶ Play Clip</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Validation Status Feedback Card */}
        {validationResult && (
          <div
            data-testid="remote-tts-validation-details"
            className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded border text-xs ${
              validationResult.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                data-testid="remote-tts-validation-badge"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${
                  validationResult.ok
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {validationResult.ok ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Available ({validationResult.latencyMs}ms)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>Unavailable ({validationResult.latencyMs}ms)</span>
                  </>
                )}
              </span>
              <span className="font-semibold">{validationResult.serviceName}:</span>
              <span className="text-[11px] opacity-90">
                {validationResult.ok
                  ? validationResult.details || "Audio stream verified"
                  : validationResult.error || "Service check failed"}
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-70">
              Checked {new Date(validationResult.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* 7. External TTS Request/Response Debugger Panel (Hidden by default in Fast Mode) */}
        {showDebugger && debuggerEnabled && <ExternalTtsDebuggerPanel className="mt-2" />}
      </div>
    );
  },
);
