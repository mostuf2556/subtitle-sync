import React, { useState } from "react";
import {
  FlaskConical,
  Play,
  RotateCw,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code,
  DownloadCloud,
} from "lucide-react";
import {
  type SubtitleRequestMode,
  buildAttemptUrl,
  fetchViaServer,
  nativeExactFetchAsync,
  DEFAULT_FETCH_SERVER_URL,
} from "@/lib/subtitle-fetch-plan";
import { parseJson3, nativeShell } from "@/lib/native-captions";
import { isValidJsonSubtitleResponse } from "@/utils/subtitleCache";
import type { Json3 } from "@/types";

export interface ExperimentalFetchResultItem {
  id: string;
  lang: string;
  mode: SubtitleRequestMode;
  useServer: boolean;
  status: number;
  url: string;
  success: boolean;
  cuesCount: number;
  error?: string;
  timestamp: number;
  rawJson?: Json3;
}

export interface ExperimentalSubtitleFetchPanelProps {
  currentVideoId?: string;
  observedUrl?: string;
  fetchServerUrl?: string;
  defaultServerEnabled?: boolean;
  onApplySubtitles?: (lang: string, json: Json3) => void;
  className?: string;
}

const COMMON_EXPERIMENTAL_LANGS = [
  { code: "es", name: "Spanish" },
  { code: "he", name: "Hebrew" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "it", name: "Italian" },
];

export const ExperimentalSubtitleFetchPanel: React.FC<ExperimentalSubtitleFetchPanelProps> = ({
  currentVideoId = "L2Ryrr6txwA",
  observedUrl = "",
  fetchServerUrl = DEFAULT_FETCH_SERVER_URL,
  defaultServerEnabled = false,
  onApplySubtitles,
  className = "",
}) => {
  const [targetLang, setTargetLang] = useState<string>("es");
  const [customLang, setCustomLang] = useState<string>("");
  const [requestMode, setRequestMode] = useState<SubtitleRequestMode>("tlang");
  const [useServer, setUseServer] = useState<boolean>(defaultServerEnabled);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<ExperimentalFetchResultItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExperimentalFetchResultItem | null>(null);

  const effectiveLang = (customLang.trim() || targetLang || "es").toLowerCase();

  const getBaseTimedTextUrl = () => {
    if (observedUrl && observedUrl.includes("/api/timedtext")) {
      return observedUrl;
    }
    const vid = currentVideoId || "L2Ryrr6txwA";
    return `https://www.youtube.com/api/timedtext?v=${vid}&lang=en&fmt=json3`;
  };

  const executeSingleFetch = async (
    lang: string,
    mode: SubtitleRequestMode,
    serverRoute: boolean,
  ): Promise<ExperimentalFetchResultItem> => {
    const baseUrl = getBaseTimedTextUrl();
    const targetUrl = buildAttemptUrl(baseUrl, lang, mode);
    const item: ExperimentalFetchResultItem = {
      id: `${lang}-${mode}-${serverRoute ? "server" : "direct"}-${Date.now()}`,
      lang,
      mode,
      useServer: serverRoute,
      status: 0,
      url: targetUrl,
      success: false,
      cuesCount: 0,
      timestamp: Date.now(),
    };

    try {
      let body = "";
      let status = 0;

      if (serverRoute) {
        // Route via server proxy
        const serverRes = await fetchViaServer(fetchServerUrl, targetUrl);
        status = serverRes.status;
        body = serverRes.body;
        if (serverRes.error) {
          item.error = serverRes.error;
        }
      } else {
        // Direct route via native shell bridge or web fetch
        const shell = nativeShell();
        if (shell?.fetchTimedTextExactAsync || shell?.fetchTimedTextExact) {
          try {
            const parsed = await nativeExactFetchAsync(shell, targetUrl, true);
            status = Number(parsed.status) || 0;
            body = parsed.body || "";
            if (parsed.error) item.error = parsed.error;
          } catch (e) {
            item.error = String(e);
          }
        } else {
          // Standard browser fetch
          try {
            const res = await fetch(targetUrl);
            status = res.status;
            body = await res.text();
          } catch (e) {
            item.error = `Web fetch blocked: ${String(e)}`;
          }
        }
      }

      item.status = status;

      if (body) {
        const json = parseJson3(body);
        if (json && isValidJsonSubtitleResponse(json)) {
          item.success = true;
          item.cuesCount = json.events?.length || 0;
          item.rawJson = json;
        } else if (body.includes("<html") || body.includes("<!DOCTYPE")) {
          item.error = "Received HTML error page (bot/signature verification)";
        } else if (!item.error) {
          item.error = "Invalid or empty JSON3 cues";
        }
      }
    } catch (err) {
      item.error = String(err);
    }

    return item;
  };

  const handleTryFetch = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const res = await executeSingleFetch(effectiveLang, requestMode, useServer);
      setResults((prev) => [res, ...prev.slice(0, 19)]);
      setSelectedResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunAllCombinations = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const combinations: Array<{ mode: SubtitleRequestMode; useServer: boolean }> = [
        { mode: "tlang", useServer: false },
        { mode: "tlang", useServer: true },
        { mode: "lang", useServer: false },
        { mode: "lang", useServer: true },
      ];

      const newResults: ExperimentalFetchResultItem[] = [];
      for (const comb of combinations) {
        const res = await executeSingleFetch(effectiveLang, comb.mode, comb.useServer);
        newResults.push(res);
      }
      setResults((prev) => [...newResults, ...prev].slice(0, 20));
      setSelectedResult(newResults[0] || null);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      id="experimental-subtitle-fetch-panel"
      data-testid="experimental-subtitle-fetch-panel"
      data-control-category="experimental"
      className={`rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 sm:p-4 text-xs space-y-3.5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground text-sm">
                Experimental Subtitle Fetching Playground
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Debug Mode
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Test fetching subtitles for other languages with/without <code>tlang</code> and with/without the server proxy.
            </p>
          </div>
        </div>
      </div>

      {/* Target Language Selection */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>Target Language:</span>
            <strong className="text-primary font-mono">{effectiveLang}</strong>
          </span>
          <span className="text-[10px] text-muted-foreground">Pick preset or enter custom code</span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {COMMON_EXPERIMENTAL_LANGS.map((lang, idx) => (
            <button
              key={`${lang.code}-${idx}`}
              type="button"
              data-testid={`experimental-lang-pill-${lang.code}`}
              onClick={() => {
                setTargetLang(lang.code);
                setCustomLang("");
              }}
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                effectiveLang === lang.code
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "bg-background border border-border hover:bg-muted text-foreground"
              }`}
            >
              {lang.name} ({lang.code})
            </button>
          ))}
          <input
            type="text"
            id="experimental-custom-lang-input"
            data-testid="experimental-custom-lang-input"
            placeholder="Custom (e.g. ko, tr)"
            value={customLang}
            onChange={(e) => setCustomLang(e.target.value)}
            className="w-24 rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Experimental Parameters: with/without tlang/lang & with/without server */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Mode: with tlang vs with lang */}
        <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1.5">
          <span className="text-[11px] font-medium text-foreground block">
            Subtitle Parameter Mode (with/without tlang):
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <input
                type="radio"
                name="experimental-mode"
                data-testid="experimental-mode-tlang-radio"
                checked={requestMode === "tlang"}
                onChange={() => setRequestMode("tlang")}
                className="text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-semibold text-foreground">with tlang</span>
              <span className="text-[10px] text-muted-foreground">(keep lang, add &tlang)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <input
                type="radio"
                name="experimental-mode"
                data-testid="experimental-mode-lang-radio"
                checked={requestMode === "lang"}
                onChange={() => setRequestMode("lang")}
                className="text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-semibold text-foreground">with lang</span>
              <span className="text-[10px] text-muted-foreground">(replace &lang, no tlang)</span>
            </label>
          </div>
        </div>

        {/* Server: with server vs without server */}
        <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1.5">
          <span className="text-[11px] font-medium text-foreground block flex items-center justify-between">
            <span>Transport Route (with/without server):</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={fetchServerUrl}>
              {fetchServerUrl}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <input
                type="radio"
                name="experimental-server"
                data-testid="experimental-server-off-radio"
                checked={!useServer}
                onChange={() => setUseServer(false)}
                className="text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-semibold text-foreground">without server</span>
              <span className="text-[10px] text-muted-foreground">(direct / bridge)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <input
                type="radio"
                name="experimental-server"
                data-testid="experimental-server-on-radio"
                checked={useServer}
                onChange={() => setUseServer(true)}
                className="text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Server className="w-3 h-3 text-sky-400" />
                <span>with server</span>
              </span>
              <span className="text-[10px] text-muted-foreground">(proxy)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          id="experimental-try-fetch-btn"
          data-testid="experimental-try-fetch-button"
          disabled={isRunning}
          onClick={handleTryFetch}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isRunning ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Try Fetch Subtitles ({requestMode} · {useServer ? "with server" : "without server"})</span>
        </button>

        <button
          type="button"
          id="experimental-matrix-btn"
          data-testid="experimental-run-matrix-button"
          disabled={isRunning}
          onClick={handleRunAllCombinations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Run all 4 combinations (tlang/lang × direct/server) to compare outcomes"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Test All 4 Combinations</span>
        </button>

        {results.length > 0 && (
          <button
            type="button"
            onClick={() => setResults([])}
            className="text-[11px] text-muted-foreground hover:text-foreground ml-auto underline"
          >
            Clear test log ({results.length})
          </button>
        )}
      </div>

      {/* Results List & Inspector */}
      {results.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-sky-500/20">
          <span className="text-[11px] font-semibold text-foreground flex items-center justify-between">
            <span>Experimental Fetch Results Log</span>
            <span className="text-[10px] text-muted-foreground">Click a row to inspect details</span>
          </span>

          <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border/60 bg-background/60 p-1.5">
            {results.map((r) => {
              const isSelected = selectedResult?.id === r.id;
              return (
                <div
                  key={r.id}
                  data-testid={`experimental-result-row-${r.lang}-${r.mode}-${r.useServer ? "server" : "direct"}`}
                  onClick={() => setSelectedResult(r)}
                  className={`flex items-center justify-between p-2 rounded-md border text-[11px] cursor-pointer transition ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-2xs"
                      : "border-border/40 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {r.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-foreground uppercase">{r.lang}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                        r.mode === "tlang"
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                          : "bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {r.mode}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        r.useServer
                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {r.useServer ? "with server" : "without server"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline max-w-[200px]">
                      {r.url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                        r.status === 200
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                      }`}
                    >
                      HTTP {r.status}
                    </span>
                    {r.success ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        {r.cuesCount} cues
                      </span>
                    ) : (
                      <span className="text-destructive font-medium text-[10px] truncate max-w-[120px]">
                        {r.error || "Failed"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Result Details Card */}
          {selectedResult && (
            <div
              data-testid="experimental-result-detail-card"
              className="p-2.5 rounded-lg border border-border bg-card space-y-1.5 text-xs animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-primary" />
                  <span>Request Diagnostics: {selectedResult.lang.toUpperCase()}</span>
                </span>
                {selectedResult.success && onApplySubtitles && selectedResult.rawJson && (
                  <button
                    type="button"
                    data-testid="experimental-load-into-player-button"
                    onClick={() =>
                      onApplySubtitles(selectedResult.lang, selectedResult.rawJson!)
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <DownloadCloud className="w-3 h-3" />
                    <span>Load into Player</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-0.5">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Language:</span>
                  <span className="font-mono font-bold text-foreground uppercase">
                    {selectedResult.lang}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Parameter Style:</span>
                  <span className="font-semibold text-primary">{selectedResult.mode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Server Route:</span>
                  <span className="font-semibold text-foreground">
                    {selectedResult.useServer ? "With Server Proxy" : "Without Server (Direct)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Outcome:</span>
                  <span
                    className={`font-bold ${
                      selectedResult.success
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {selectedResult.success
                      ? `Valid JSON3 (${selectedResult.cuesCount} cues)`
                      : selectedResult.error || "Failed"}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-muted-foreground block mb-0.5">Executed URL:</span>
                <div className="p-1.5 rounded bg-muted/60 border border-border/60 font-mono text-[10px] break-all select-all text-foreground">
                  {selectedResult.url}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
