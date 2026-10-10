import React, { useState, useEffect } from "react";
import {
  Activity,
  X,
  Search,
  Trash2,
  Check,
  Copy,
  Clock,
  ArrowDownLeft,
  Filter,
  ChevronDown,
  Maximize2,
  Minimize2,
  Globe,
  FileText,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useNetworkRequests,
  clearNetworkRequests,
  extractTlang,
  extractLang,
  formatRequestForClipboard,
  isSuccessfulFetch,
  type NetworkRequestRecord,
} from "@/utils/networkTracker";
import { SUPPORTED_LANGUAGES_CATALOG } from "@/utils/appSettings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkRequestsInspector: React.FC<Props> = ({ isOpen, onClose }) => {
  const requests = useNetworkRequests();
  const [filterType, setFilterType] = useState<"all" | "timedtext" | "native">("all");
  const [hideFailed, setHideFailed] = useState(true); // By default filter out failed network requests
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedDetail, setCopiedDetail] = useState<"url" | "body" | "request" | null>(null);
  const [showFullBody, setShowFullBody] = useState(false);
  const [expandedListItems, setExpandedListItems] = useState<Record<string, boolean>>({});
  const [isMinimized, setIsMinimized] = useState(false);
  // Small screens (Android): show either the list or one request detail at a time
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <aside
        id="network-inspector-minimized"
        data-testid="network-inspector-minimized"
        aria-label="Network Inspector Minimized Bar"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 bg-neutral-900/95 border border-neutral-700/80 rounded-full shadow-2xl backdrop-blur-md text-xs text-neutral-200 animate-in slide-in-from-bottom duration-200"
      >
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setIsMinimized(false)}
          title="Click to restore Network Inspector"
        >
          <div className="p-1.5 rounded-full bg-blue-500/20 text-blue-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-semibold text-neutral-200">Network Inspector</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
            {requests.length} captured
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
            {
              requests.filter(
                (r) => !hideFailed || (!Boolean(r.error) && (r.isPending || isSuccessfulFetch(r))),
              ).length
            }{" "}
            shown
          </span>
        </div>
        <div className="h-4 w-px bg-neutral-700" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="expand-network-inspector-button"
            data-testid="expand-network-inspector-button"
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Expand inspector"
            aria-label="Expand Network Inspector"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="compact-close-network-inspector-button"
            data-testid="compact-close-network-inspector-button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition"
            title="Close inspector"
            aria-label="Close Network Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  const getLanguageName = (code: string | null) => {
    if (!code) return null;
    const found = SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code);
    return found ? found.name : code;
  };

  const isFailedRequest = (req: NetworkRequestRecord) => {
    return Boolean(req.error) || (!req.isPending && !isSuccessfulFetch(req));
  };

  const getTlangStatusInfo = (req: NetworkRequestRecord, tlang: string) => {
    if (req.isPending) {
      return {
        status: "pending",
        label: "Pending",
        colorClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      };
    }
    if (isSuccessfulFetch(req)) {
      return {
        status: "done",
        label: "Done",
        colorClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    }
    // Check if overridden by green on retry success
    const hasSubsequentSuccess = requests.some(
      (other) =>
        other.id !== req.id &&
        extractTlang(other.url) === tlang &&
        isSuccessfulFetch(other) &&
        other.startTime >= req.startTime,
    );
    if (hasSubsequentSuccess) {
      return {
        status: "retry_success",
        label: "Failed (Retried & Done)",
        colorClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    }
    return {
      status: "failed",
      label: "Failed",
      colorClass: "bg-red-500/20 text-red-300 border-red-500/40",
    };
  };

  const failedCount = requests.filter(isFailedRequest).length;

  const filtered = requests.filter((req) => {
    // 1. By default filter out failed network requests unless user toggles it off
    if (hideFailed && isFailedRequest(req)) {
      return false;
    }

    // 2. Type filter
    if (filterType === "timedtext" && !req.url.includes("timedtext")) return false;
    if (
      filterType === "native" &&
      req.type !== "native_bridge" &&
      req.type !== "timedtext_interception"
    ) {
      return false;
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const tlang = extractTlang(req.url)?.toLowerCase() || "";
      return (
        req.url.toLowerCase().includes(q) ||
        req.method.toLowerCase().includes(q) ||
        tlang.includes(q) ||
        req.responseBodyPreview?.toLowerCase().includes(q) ||
        req.error?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedRequest =
    filtered.find((r) => r.id === selectedId) || (filtered.length > 0 ? filtered[0] : null);

  const handleCopyText = (text: string, type: "url" | "body" | "request") => {
    try {
      void navigator.clipboard.writeText(text);
      setCopiedDetail(type);
      setTimeout(() => setCopiedDetail(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCopyRequestItem = (e: React.MouseEvent, req: NetworkRequestRecord) => {
    e.stopPropagation();
    try {
      void navigator.clipboard.writeText(formatRequestForClipboard(req));
      setCopiedId(req.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const toggleListItemExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedListItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderHighlightedUrl = (url: string) => {
    const tlangMatch = /[?&](tlang=[^&#]+)/i.exec(url);
    if (!tlangMatch) {
      return <span className="break-all whitespace-pre-wrap break-words">{url}</span>;
    }

    const matchStr = tlangMatch[1];
    const startIndex = tlangMatch.index + 1; // skip ? or &
    const before = url.slice(0, startIndex);
    const after = url.slice(startIndex + matchStr.length);

    return (
      <span className="break-all whitespace-pre-wrap break-words">
        {before}
        <mark className="rounded bg-amber-500/30 text-amber-200 px-1 py-0.5 font-bold border border-amber-500/40">
          {matchStr}
        </mark>
        {after}
      </span>
    );
  };

  return (
    <div
      id="network-inspector-modal"
      data-testid="network-inspector-modal"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[100dvh] sm:h-[85vh] max-h-[100dvh] bg-neutral-900 border-0 sm:border border-neutral-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 sm:py-3.5 pt-[max(0.6rem,env(safe-area-inset-top))] bg-neutral-950/90 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                  Network
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {requests.length} cap
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                  {filtered.length} show
                </span>
                {hideFailed && failedCount > 0 && (
                  <span
                    data-testid="failed-hidden-counter"
                    className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60"
                  >
                    {failedCount} fail hid
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-xs text-neutral-400">
                Live captures timedtext, native bridge requests, highlights tlang language tags, and
                word-wraps request details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              id="clear-network-logs-button"
              data-testid="clear-network-logs-button"
              type="button"
              onClick={clearNetworkRequests}
              disabled={requests.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-neutral-300 bg-neutral-800 hover:bg-neutral-700 active:scale-95 border border-neutral-700 disabled:opacity-50 transition touch-manipulation min-h-[36px]"
              title="Clear all recorded logs"
              aria-label="Clear Network Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Clear</span>
            </button>
            <button
              id="collapse-network-inspector-button"
              data-testid="collapse-network-inspector-button"
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Minimize inspector"
              aria-label="Minimize Network Inspector"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              id="close-network-inspector-button"
              data-testid="close-network-inspector-button"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 border border-neutral-700/60 transition touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Close inspector (Esc)"
              aria-label="Close Network Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Segmented Tab Switcher (Visible only on small screens) */}
        <div className="md:hidden flex border-b border-neutral-800 bg-neutral-950/80 p-1.5 gap-1.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`flex-1 py-2 rounded-xl text-center font-semibold transition touch-manipulation min-h-[38px] ${
              mobileView === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 bg-neutral-900/60"
            }`}
          >
            Requests ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileView("detail")}
            disabled={!selectedRequest}
            className={`flex-1 py-2 rounded-xl text-center font-semibold transition touch-manipulation min-h-[38px] ${
              mobileView === "detail"
                ? "bg-blue-600 text-white shadow-sm"
                : selectedRequest
                  ? "text-neutral-400 hover:text-neutral-200 bg-neutral-900/60"
                  : "text-neutral-600 cursor-not-allowed bg-neutral-950/40"
            }`}
          >
            {selectedRequest ? `Detail (${selectedRequest.method})` : "Select request"}
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-nowrap scrollbar-none">
            <span className="text-neutral-500 hidden xs:flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            {(
              [
                { key: "all", label: "All" },
                { key: "timedtext", label: "TimedText" },
                { key: "native", label: "Native Bridge" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`px-2.5 py-1 rounded-md transition font-medium shrink-0 ${
                  filterType === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Toggle: Filter out failed network requests (Default ON) */}
            <button
              id="toggle-hide-failed-requests"
              data-testid="toggle-hide-failed-requests"
              type="button"
              onClick={() => setHideFailed((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition shrink-0 ${
                hideFailed
                  ? "bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-red-950/60 border-red-700 text-red-300 hover:bg-red-900/60"
              }`}
              title="Toggle filtering out failed requests"
            >
              {hideFailed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hide Failed: ON</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-red-400" />
                  <span>Hide Failed: OFF</span>
                </>
              )}
            </button>
          </div>

          <div className="relative w-full min-w-0 flex-1 sm:min-w-[180px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search URL, method, tlang…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Body content: Split list & detail */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 md:divide-x divide-neutral-800 overflow-hidden">
          {/* Requests List */}
          <div
            className={`${mobileView === "detail" ? "hidden md:block" : "block"} min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5`}
          >
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs space-y-2">
                <p>No network requests match the current filters.</p>
                {hideFailed && failedCount > 0 && (
                  <p className="text-[11px] text-neutral-400">
                    {failedCount} failed request(s) filtered out.{" "}
                    <button
                      type="button"
                      onClick={() => setHideFailed(false)}
                      className="text-blue-400 underline hover:text-blue-300"
                    >
                      Show failed requests
                    </button>
                  </p>
                )}
              </div>
            ) : (
              filtered.map((req) => {
                const isSelected = req.id === selectedRequest?.id;
                const isItemExpanded = expandedListItems[req.id];
                const tlang = extractTlang(req.url);
                const tlangName = getLanguageName(tlang);
                const tlangInfo = tlang ? getTlangStatusInfo(req, tlang) : null;
                const langParam = extractLang(req.url);
                const langParamName = getLanguageName(langParam);
                const isCopied = copiedId === req.id;
                const isBodyEmpty =
                  req.status === 200 &&
                  (!req.fullResponseBody || req.fullResponseBody.trim() === "");

                return (
                  <div
                    key={req.id}
                    onClick={() => (setSelectedId(req.id), setMobileView("detail"))}
                    className={`p-2.5 rounded-lg border cursor-pointer transition text-xs space-y-2 ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-700/60"
                        : "bg-neutral-950/40 border-neutral-800/60 hover:bg-neutral-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                            req.isPending
                              ? "bg-yellow-900/60 text-yellow-300"
                              : req.status === 200 && !isBodyEmpty
                                ? "bg-emerald-900/60 text-emerald-300"
                                : "bg-red-900/60 text-red-300"
                          }`}
                        >
                          {req.isPending ? "PENDING" : req.status}
                        </span>
                        <span className="font-semibold text-neutral-300 font-mono text-[11px]">
                          {req.method}
                        </span>
                        <span className="text-[10px] text-neutral-500">{req.type}</span>

                        {/* tlang Language Highlight Tag with dynamic status color */}
                        {tlang && tlangInfo && (
                          <span
                            data-testid={`tlang-tag-${req.id}`}
                            data-status={tlangInfo.status}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${tlangInfo.colorClass}`}
                            title={`Target Translation Language: ${tlangName} (${tlang}) — ${tlangInfo.label}`}
                          >
                            <Globe className="w-3 h-3" />
                            <span>
                              tlang: {tlang} ({tlangName}) [{tlangInfo.label}]
                            </span>
                          </span>
                        )}

                        {/* lang Language Fallback Tag */}
                        {!tlang && langParam && (
                          <span
                            data-testid={`lang-tag-${req.id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-purple-500/20 text-purple-300 border-purple-500/40"
                            title={`Language: ${langParamName} (${langParam})`}
                          >
                            <Globe className="w-3 h-3" />
                            <span>
                              lang: {langParam} ({langParamName})
                            </span>
                          </span>
                        )}

                        {/* Green badge indicator for successfully fetched language */}
                        {(tlang || langParam) && isSuccessfulFetch(req) && (
                          <span
                            data-testid={`good-fetch-badge-${tlang || langParam}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            title={`Successfully fetched subtitles for ${tlangName || langParamName || tlang || langParam}`}
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Good Fetch</span>
                          </span>
                        )}

                        {/* Empty response badge for 200 status */}
                        {isBodyEmpty && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-800/60">
                            200 OK (empty body — 0 chars)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {req.duration !== undefined && (
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            {req.duration}ms
                          </span>
                        )}
                        {/* Quick Copy Request to Clipboard Button */}
                        <button
                          id={`copy-request-button-${req.id}`}
                          data-testid={`copy-request-button-${req.id}`}
                          type="button"
                          onClick={(e) => handleCopyRequestItem(e, req)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] border border-neutral-700 transition"
                          title="Quick copy full request details to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Word-wrapped URL with tlang highlight */}
                    <div className="font-mono text-[11px] text-neutral-300 break-all whitespace-pre-wrap break-words leading-relaxed">
                      {renderHighlightedUrl(req.url)}
                    </div>

                    {/* Accordion / unfoldable first 250 chars preview */}
                    <div className="text-[11px] font-mono bg-neutral-900/80 rounded border border-neutral-800/80 overflow-hidden">
                      <div
                        className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-neutral-800/50"
                        onClick={(e) => toggleListItemExpand(e, req.id)}
                        title="Click to unfold / collapse preview"
                      >
                        <div className="flex items-center gap-1 text-neutral-400 overflow-hidden mr-1">
                          <ArrowDownLeft className="w-3 h-3 text-blue-400 shrink-0" />
                          <span className="text-neutral-500 shrink-0">First 250 chars:</span>
                          {!isItemExpanded && (
                            <span className="text-emerald-400 font-semibold truncate">
                              {isBodyEmpty
                                ? "[Empty response body — 0 chars]"
                                : req.responseBodyPreview
                                  ? `"${req.responseBodyPreview}"`
                                  : req.isPending
                                    ? "loading…"
                                    : "[empty]"}
                            </span>
                          )}
                        </div>
                        <button
                          id={`record-accordion-toggle-${req.id}`}
                          data-testid={`record-accordion-toggle-${req.id}`}
                          type="button"
                          className="text-neutral-400 hover:text-white p-0.5 rounded"
                          aria-label={isItemExpanded ? "Collapse" : "Unfold"}
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isItemExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {isItemExpanded && (
                        <div className="px-2.5 py-1.5 border-t border-neutral-800/60 bg-neutral-950/60 text-emerald-400 break-all whitespace-pre-wrap break-words select-text max-h-36 overflow-y-auto">
                          {isBodyEmpty
                            ? "[Empty response body — 0 chars]"
                            : req.responseBodyPreview || (req.isPending ? "loading…" : "[empty]")}
                          {req.fullResponseBody && req.fullResponseBody.length > 250 && (
                            <div className="mt-1 text-[10px] text-blue-400 font-sans">
                              (Select this request to expose the full {req.fullResponseBody.length}{" "}
                              characters)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Request Detail Panel */}
          <div
            className={`${mobileView === "list" ? "hidden md:block" : "block"} min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-4 text-xs break-words`}
          >
            <div className="md:hidden sticky top-0 z-10 -mx-3 -mt-3 mb-3 p-2 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 shadow-md">
              <button
                type="button"
                data-testid="network-back-to-list"
                onClick={() => setMobileView("list")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 px-4 py-2.5 text-xs font-semibold text-neutral-100 shadow-sm transition touch-manipulation min-h-[40px]"
              >
                ← Back to Requests List
              </button>
            </div>
            {selectedRequest ? (
              <>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold ${
                        isSuccessfulFetch(selectedRequest)
                          ? "bg-emerald-900/60 text-emerald-300"
                          : "bg-red-900/60 text-red-300"
                      }`}
                    >
                      {selectedRequest.status || "PENDING"}
                      {selectedRequest.status === 200 && !isSuccessfulFetch(selectedRequest)
                        ? " (Empty Body — 0 chars)"
                        : ""}
                    </span>
                    <span className="font-bold text-neutral-200 text-sm">
                      {selectedRequest.method}
                    </span>

                    {/* Target language highlight tag in detail header */}
                    {extractTlang(selectedRequest.url) && (
                      <span
                        data-testid="detail-tlang-tag"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      >
                        <Globe className="w-3 h-3" />
                        <span>
                          tlang: {extractTlang(selectedRequest.url)} (
                          {getLanguageName(extractTlang(selectedRequest.url))})
                        </span>
                      </span>
                    )}

                    {/* Fallback language tag in detail header */}
                    {!extractTlang(selectedRequest.url) && extractLang(selectedRequest.url) && (
                      <span
                        data-testid="detail-lang-tag"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      >
                        <Globe className="w-3 h-3" />
                        <span>
                          lang: {extractLang(selectedRequest.url)} (
                          {getLanguageName(extractLang(selectedRequest.url))})
                        </span>
                      </span>
                    )}

                    {/* Good fetch green badge in detail header */}
                    {(extractTlang(selectedRequest.url) || extractLang(selectedRequest.url)) &&
                      isSuccessfulFetch(selectedRequest) && (
                        <span
                          data-testid="detail-good-fetch-badge"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Good Fetch</span>
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick Copy Full Request to Clipboard */}
                    <button
                      id="copy-full-request-button"
                      data-testid="copy-full-request-button"
                      type="button"
                      onClick={() =>
                        handleCopyText(formatRequestForClipboard(selectedRequest), "request")
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                      title="Copy complete formatted request to clipboard"
                    >
                      {copiedDetail === "request" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedDetail === "request" ? "Copied Request!" : "Copy Full Request"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedRequest.url, "url")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    >
                      {copiedDetail === "url" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedDetail === "url" ? "Copied URL" : "Copy URL"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                    Full Request URL (Word-Wrapped)
                  </div>
                  <div
                    data-testid="detail-full-url"
                    className="p-2.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 break-all whitespace-pre-wrap break-words leading-relaxed"
                  >
                    {renderHighlightedUrl(selectedRequest.url)}
                  </div>
                </div>

                {selectedRequest.error && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-800/60 text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <div className="font-semibold">Request Error</div>
                      <div className="break-all whitespace-pre-wrap break-words font-mono text-[11px]">
                        {selectedRequest.error}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-neutral-400">
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">Type</span>
                    <span className="font-mono text-neutral-200">{selectedRequest.type}</span>
                  </div>
                  <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">Duration</span>
                    <span className="font-mono text-neutral-200">
                      {selectedRequest.duration ?? "—"} ms
                    </span>
                  </div>
                </div>

                {/* Accordion: Expose first 250 chars and allow unfolding & clicking to expose whole body */}
                <details
                  className="border border-neutral-800 rounded-xl bg-neutral-950/60 overflow-hidden"
                  open
                >
                  <summary className="flex items-center justify-between p-3 cursor-pointer bg-neutral-900/70 hover:bg-neutral-800/70 select-none">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                      <span className="text-neutral-300 font-semibold uppercase text-[10px] tracking-wider">
                        Response Body (First 250 Chars Accordion)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                        {showFullBody && selectedRequest.fullResponseBody
                          ? `${selectedRequest.fullResponseBody.length} chars (full)`
                          : selectedRequest.status === 200 &&
                              (!selectedRequest.fullResponseBody ||
                                selectedRequest.fullResponseBody.trim() === "")
                            ? "0 chars (empty body)"
                            : `${selectedRequest.responseBodyPreview?.length || 0} / 250 chars`}
                      </span>
                    </div>
                  </summary>

                  <div className="p-3 space-y-2.5 border-t border-neutral-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-neutral-400">
                        {showFullBody
                          ? "Showing complete response body:"
                          : "Showing first 250 characters. Unfold / click below to expose whole body:"}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedRequest.fullResponseBody &&
                          selectedRequest.fullResponseBody.length > 250 && (
                            <button
                              id="toggle-full-response-body-button"
                              type="button"
                              onClick={() => setShowFullBody((prev) => !prev)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shadow-sm"
                            >
                              {showFullBody ? (
                                <>
                                  <Minimize2 className="w-3.5 h-3.5" />
                                  <span>Show First 250 Chars</span>
                                </>
                              ) : (
                                <>
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>
                                    Expose Whole Response Body (
                                    {selectedRequest.fullResponseBody.length} chars)
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        {(selectedRequest.fullResponseBody ||
                          selectedRequest.responseBodyPreview) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                selectedRequest.fullResponseBody ||
                                  selectedRequest.responseBodyPreview ||
                                  "",
                                "body",
                              )
                            }
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition"
                          >
                            {copiedDetail === "body" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedDetail === "body" ? "Copied" : "Copy Body"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all break-words select-text max-h-[45vh] overflow-y-auto"
                      data-testid="inspector-response-body"
                    >
                      {showFullBody
                        ? selectedRequest.fullResponseBody ||
                          (selectedRequest.status === 200
                            ? "[Empty response body — 0 chars]"
                            : "[Empty]")
                        : selectedRequest.responseBodyPreview
                          ? selectedRequest.responseBodyPreview
                          : selectedRequest.status === 200 &&
                              (!selectedRequest.fullResponseBody ||
                                selectedRequest.fullResponseBody.trim() === "")
                            ? "[Empty response body — 0 chars]"
                            : selectedRequest.isPending
                              ? "Request in progress…"
                              : "[Empty or Non-string response]"}
                    </div>
                  </div>
                </details>
              </>
            ) : (
              <div className="p-8 text-center text-neutral-500">
                Select a network request to inspect its 250-char preview and accordion.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
