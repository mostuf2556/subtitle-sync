import React, { useState, useEffect, useRef, useMemo } from "react";
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
  CheckCircle2,
  XCircle,
  Loader2,
  Code2,
  ListFilter,
  ArrowLeft,
  SlidersHorizontal,
  ChevronUp,
} from "lucide-react";
import {
  useNetworkRequests,
  clearNetworkRequests,
  extractTlang,
  formatRequestForClipboard,
  isSuccessfulFetch,
  type NetworkRequestRecord,
} from "@/utils/networkTracker";
import { SUPPORTED_LANGUAGES_CATALOG } from "@/utils/appSettings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isAndroid?: boolean;
}

export const NetworkRequestsInspector: React.FC<Props> = ({
  isOpen,
  onClose,
  isAndroid = false,
}) => {
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
  const [activeMobileTab, setActiveMobileTab] = useState<"list" | "detail">("list");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  // Controlled Accordion Sections in Detail View to prevent clutter / overlapping elements
  const [openDetailAccordions, setOpenDetailAccordions] = useState<{
    overview: boolean;
    params: boolean;
    body: boolean;
    raw: boolean;
  }>({
    overview: true,
    params: true,
    body: true,
    raw: false,
  });

  const toggleDetailAccordion = (key: keyof typeof openDetailAccordions) => {
    setOpenDetailAccordions((prev) => {
      const next = !prev[key];
      announce(`${key} section ${next ? "expanded" : "collapsed"}`);
      return { ...prev, [key]: next };
    });
  };

  const setAllDetailAccordions = (open: boolean) => {
    setOpenDetailAccordions({
      overview: open,
      params: open,
      body: open,
      raw: open,
    });
    announce(open ? "All detail sections expanded" : "All detail sections collapsed");
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Expose Android hardware back button handler so back button returns from Detail to List
  useEffect(() => {
    if (!isOpen) return;
    (
      window as Window & { __handleInspectorBack?: () => boolean }
    ).__handleInspectorBack = () => {
      if (activeMobileTab === "detail") {
        setActiveMobileTab("list");
        return true;
      }
      return false;
    };
    return () => {
      delete (window as Window & { __handleInspectorBack?: () => boolean }).__handleInspectorBack;
    };
  }, [isOpen, activeMobileTab]);

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeMobileTab === "detail") {
          setActiveMobileTab("list");
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, activeMobileTab]);

  // Accessibility announcer
  const announce = (msg: string) => {
    setLiveAnnouncement(msg);
  };

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

  const failedCount = useMemo(() => requests.filter(isFailedRequest).length, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      if (hideFailed && isFailedRequest(req)) {
        return false;
      }
      if (filterType === "timedtext" && !req.url.includes("timedtext")) return false;
      if (
        filterType === "native" &&
        req.type !== "native_bridge" &&
        req.type !== "timedtext_interception"
      ) {
        return false;
      }
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
  }, [requests, hideFailed, filterType, searchQuery]);

  const selectedRequest = useMemo(() => {
    return (
      filtered.find((r) => r.id === selectedId) ||
      (filtered.length > 0 ? filtered[0] : null)
    );
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedRequest && selectedRequest.id !== selectedId) {
      setSelectedId(selectedRequest.id);
    }
  }, [selectedRequest, selectedId]);

  const handleCopyText = (text: string, type: "url" | "body" | "request") => {
    try {
      void navigator.clipboard.writeText(text);
      setCopiedDetail(type);
      announce(
        type === "url"
          ? "Request URL copied to clipboard"
          : type === "body"
            ? "Response body copied to clipboard"
            : "Complete request details copied to clipboard",
      );
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
      announce(`Request ${req.method} details copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const toggleListItemExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedListItems((prev) => {
      const next = !prev[id];
      announce(next ? "Preview unfolded" : "Preview collapsed");
      return { ...prev, [id]: next };
    });
  };

  // Keyboard navigation inside list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (filtered.length === 0) return;
    const currentIndex = filtered.findIndex((r) => r.id === selectedRequest?.id);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(filtered.length - 1, currentIndex + 1);
      setSelectedId(filtered[nextIndex].id);
      announce(`Selected request ${nextIndex + 1} of ${filtered.length}`);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(0, currentIndex - 1);
      setSelectedId(filtered[prevIndex].id);
      announce(`Selected request ${prevIndex + 1} of ${filtered.length}`);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedId(filtered[0].id);
      announce("Selected first request");
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedId(filtered[filtered.length - 1].id);
      announce("Selected last request");
    }
  };

  // Parse URL query parameters
  const parsedQueryParams = useMemo(() => {
    if (!selectedRequest?.url) return [];
    try {
      const u = new URL(selectedRequest.url);
      const params: { key: string; value: string; isHighlighted: boolean }[] = [];
      u.searchParams.forEach((value, key) => {
        params.push({
          key,
          value,
          isHighlighted: key === "tlang" || key === "lang" || key === "fmt",
        });
      });
      return params;
    } catch {
      return [];
    }
  }, [selectedRequest?.url]);

  const renderHighlightedUrl = (url: string) => {
    const tlangMatch = /[?&](tlang=[^&#]+)/i.exec(url);
    if (!tlangMatch) {
      return <span className="break-all whitespace-pre-wrap break-words">{url}</span>;
    }

    const matchStr = tlangMatch[1];
    const startIndex = tlangMatch.index + 1;
    const before = url.slice(0, startIndex);
    const after = url.slice(startIndex + matchStr.length);

    return (
      <span className="break-all whitespace-pre-wrap break-words">
        {before}
        <mark className="rounded bg-amber-400/25 text-amber-200 px-1 py-0.5 font-bold border border-amber-400/40">
          {matchStr}
        </mark>
        {after}
      </span>
    );
  };

  if (!isOpen) return null;

  // Minimized Floating Widget
  if (isMinimized) {
    return (
      <aside
        id="network-inspector-minimized"
        data-testid="network-inspector-minimized"
        aria-label="Network Inspector Minimized Bar"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-full shadow-2xl backdrop-blur-md text-sm text-neutral-200 animate-in slide-in-from-bottom duration-200"
      >
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full pr-1"
          onClick={() => setIsMinimized(false)}
          title="Click to restore Network Inspector"
          aria-label="Expand Network Inspector (currently minimized)"
        >
          <div className="p-1.5 rounded-full bg-blue-500/20 text-blue-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-semibold text-neutral-100">Network Inspector</span>
          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
            {requests.length} captured
          </span>
          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800">
            {
              requests.filter(
                (r) =>
                  !hideFailed ||
                  (!Boolean(r.error) && (r.isPending || isSuccessfulFetch(r))),
              ).length
            }{" "}
            shown
          </span>
        </button>
        <div className="h-5 w-px bg-neutral-700" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            id="expand-network-inspector-button"
            data-testid="expand-network-inspector-button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
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
            className="p-2 rounded-full text-neutral-300 hover:text-rose-400 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition"
            title="Close inspector"
            aria-label="Close Network Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div
      id="network-inspector-modal"
      data-testid="network-inspector-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-inspector-title"
      aria-describedby="network-inspector-desc"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 ${
        isAndroid ? "p-0" : "p-2 sm:p-4 md:p-6"
      }`}
      onClick={onClose}
    >
      {/* Live Region for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <div
        ref={modalRef}
        className={`relative w-full bg-neutral-900 border border-neutral-700/80 shadow-2xl flex flex-col overflow-hidden text-neutral-100 ${
          isAndroid
            ? "h-full max-h-none rounded-none border-none"
            : "max-w-6xl h-[92vh] max-h-[950px] rounded-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar (Android Material 3 Navigation or Desktop Header) */}
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* On Android/Mobile in Detail view, show dedicated Back to Requests button */}
            {activeMobileTab === "detail" ? (
              <button
                type="button"
                onClick={() => setActiveMobileTab("list")}
                className="md:hidden flex items-center gap-1.5 p-1.5 -ml-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
                aria-label="Back to requests list"
              >
                <ArrowLeft className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">Requests</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="network-inspector-title" className="text-base sm:text-lg font-bold text-neutral-50 tracking-tight truncate">
                  {activeMobileTab === "detail" && selectedRequest ? (
                    <span className="md:hidden font-mono text-sm">
                      {selectedRequest.method} {extractTlang(selectedRequest.url) ? `[tlang: ${extractTlang(selectedRequest.url)}]` : selectedRequest.type}
                    </span>
                  ) : (
                    "Network Inspector"
                  )}
                </h2>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-md font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {requests.length} captured
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800">
                    {filtered.length} shown
                  </span>
                  {hideFailed && failedCount > 0 && (
                    <span
                      data-testid="failed-hidden-counter"
                      className="px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/70"
                    >
                      {failedCount} failed hidden
                    </span>
                  )}
                </div>
              </div>
              <p id="network-inspector-desc" className="text-xs text-neutral-400 mt-0.5 hidden lg:block">
                Live captures timedtext, native bridge requests, highlights tlang language tags, and word-wraps request details
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="clear-network-logs-button"
              data-testid="clear-network-logs-button"
              type="button"
              onClick={() => {
                clearNetworkRequests();
                announce("All network logs cleared");
              }}
              disabled={requests.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-neutral-200 bg-neutral-800 hover:bg-neutral-700 hover:text-white border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 transition"
              title="Clear all recorded logs"
              aria-label="Clear Network Logs"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              id="collapse-network-inspector-button"
              data-testid="collapse-network-inspector-button"
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 transition"
              title="Minimize inspector to floating dock"
              aria-label="Minimize Network Inspector"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              id="close-network-inspector-button"
              data-testid="close-network-inspector-button"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-300 hover:text-rose-400 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 active:scale-95 transition"
              title="Close inspector (Esc)"
              aria-label="Close Network Inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Filter Chips Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5 bg-neutral-950/70 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs text-neutral-400 font-medium flex items-center gap-1 shrink-0" id="filter-type-label">
              <Filter className="w-3.5 h-3.5 text-neutral-400" /> Filters:
            </span>
            <div role="radiogroup" aria-labelledby="filter-type-label" className="flex items-center gap-1.5 shrink-0">
              {(
                [
                  { key: "all", label: "All Requests" },
                  { key: "timedtext", label: "TimedText" },
                  { key: "native", label: "Native Bridge" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="radio"
                  aria-checked={filterType === tab.key}
                  onClick={() => {
                    setFilterType(tab.key);
                    announce(`Filter set to ${tab.label}`);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 shrink-0 ${
                    filterType === tab.key
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Toggle: Hide Failed Requests */}
            <button
              id="toggle-hide-failed-requests"
              data-testid="toggle-hide-failed-requests"
              type="button"
              aria-pressed={hideFailed}
              onClick={() => {
                setHideFailed((prev) => {
                  const next = !prev;
                  announce(next ? "Filtering out failed requests" : "Showing all requests including failed");
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                hideFailed
                  ? "bg-emerald-950/80 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80"
                  : "bg-rose-950/80 border-rose-600/70 text-rose-300 hover:bg-rose-900/80"
              }`}
              title="Toggle filtering out failed requests"
            >
              {hideFailed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hide Failed: ON (Default)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hide Failed: OFF (Showing all)</span>
                </>
              )}
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search requests by URL, method, tlang language tag or response content"
              placeholder="Search URL, method, tlang, preview…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-700/80 rounded-lg text-xs sm:text-sm text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Mobile View Segmented Tab Bar */}
        <div className="flex md:hidden items-center border-b border-neutral-800 bg-neutral-950 px-4 py-2 shrink-0">
          <div className="flex w-full rounded-xl bg-neutral-850 p-1 border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveMobileTab("list")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition active:scale-98 ${
                activeMobileTab === "list"
                  ? "bg-blue-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Requests List ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("detail")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition active:scale-98 ${
                activeMobileTab === "detail"
                  ? "bg-blue-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Request Detail
            </button>
          </div>
        </div>

        {/* Main Content Area (Split Grid) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Left Column: Requests List */}
          <div
            ref={listRef}
            role="listbox"
            tabIndex={0}
            aria-label="Captured Network Requests"
            onKeyDown={handleListKeyDown}
            className={`md:col-span-6 lg:col-span-5 overflow-y-auto p-3 sm:p-4 space-y-3 bg-neutral-950/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 ${
              activeMobileTab === "list" ? "block" : "hidden md:block"
            }`}
          >
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-neutral-400 text-xs sm:text-sm space-y-3">
                <ListFilter className="w-8 h-8 text-neutral-500 mx-auto" />
                <p className="font-medium text-neutral-300">No requests match the current filters.</p>
                {hideFailed && failedCount > 0 && (
                  <p className="text-xs text-neutral-400">
                    {failedCount} failed request(s) filtered out.{" "}
                    <button
                      type="button"
                      onClick={() => setHideFailed(false)}
                      className="text-blue-400 font-semibold underline hover:text-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
                    >
                      Show failed requests
                    </button>
                  </p>
                )}
              </div>
            ) : (
              filtered.map((req, index) => {
                const isSelected = req.id === selectedRequest?.id;
                const isItemExpanded = expandedListItems[req.id];
                const tlang = extractTlang(req.url);
                const tlangName = getLanguageName(tlang);
                const tlangInfo = tlang ? getTlangStatusInfo(req, tlang) : null;
                const isCopied = copiedId === req.id;
                const isBodyEmpty =
                  req.status === 200 &&
                  (!req.fullResponseBody || req.fullResponseBody.trim() === "");

                return (
                  <div
                    key={req.id}
                    role="option"
                    id={`network-request-item-${req.id}`}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => {
                      setSelectedId(req.id);
                      setActiveMobileTab("detail");
                      announce(`Selected request ${index + 1}: ${req.method} ${tlang ? `tlang ${tlang}` : ""}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(req.id);
                        setActiveMobileTab("detail");
                      }
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border text-xs transition-all space-y-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-[0.99] ${
                      isSelected
                        ? "bg-blue-950/50 border-blue-600 shadow-md ring-1 ring-blue-500/40"
                        : "bg-neutral-900/60 border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700"
                    }`}
                  >
                    {/* Header Row: Status, Method, Type, Duration & Copy */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                            req.isPending
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : req.status === 200 && !isBodyEmpty
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                : "bg-rose-950 text-rose-300 border border-rose-700"
                          }`}
                        >
                          {req.isPending ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                              <span>PENDING</span>
                            </>
                          ) : req.status === 200 && !isBodyEmpty ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{req.status} OK</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>{req.status || "ERR"}</span>
                            </>
                          )}
                        </span>

                        <span className="font-mono font-bold text-xs text-neutral-200 px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700">
                          {req.method}
                        </span>

                        <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                          {req.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.duration !== undefined && (
                          <span className="text-xs font-mono text-neutral-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            {req.duration}ms
                          </span>
                        )}

                        <button
                          id={`copy-request-button-${req.id}`}
                          data-testid={`copy-request-button-${req.id}`}
                          type="button"
                          onClick={(e) => handleCopyRequestItem(e, req)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
                          title="Quick copy full request details to clipboard"
                          aria-label={`Copy request ${req.id} details`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-neutral-300" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Target Language & Empty Badges Row (Prevents Stacking On Top of Other Elements) */}
                    {(tlang || isBodyEmpty) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {tlang && tlangInfo && (
                          <span
                            data-testid={`tlang-tag-${req.id}`}
                            data-status={tlangInfo.status}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${tlangInfo.colorClass}`}
                            title={`Target Translation Language: ${tlangName} (${tlang}) — ${tlangInfo.label}`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>
                              tlang: {tlang} ({tlangName}) [{tlangInfo.label}]
                            </span>
                          </span>
                        )}

                        {tlang && isSuccessfulFetch(req) && (
                          <span
                            data-testid={`good-fetch-badge-${tlang}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            title={`Successfully fetched subtitles for ${tlangName || tlang}`}
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Good Fetch</span>
                          </span>
                        )}

                        {isBodyEmpty && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-950/70 text-rose-300 border border-rose-800/70">
                            empty body — 0 chars
                          </span>
                        )}
                      </div>
                    )}

                    {/* Word-wrapped URL */}
                    <div className="font-mono text-xs text-neutral-300 break-all whitespace-pre-wrap break-words leading-relaxed select-text bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/70">
                      {renderHighlightedUrl(req.url)}
                    </div>

                    {/* First 250 chars preview accordion */}
                    <div className="text-xs font-mono bg-neutral-950/80 rounded-lg border border-neutral-800 overflow-hidden">
                      <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-neutral-850 transition"
                        onClick={(e) => toggleListItemExpand(e, req.id)}
                        title="Click to unfold / collapse response preview"
                      >
                        <div className="flex items-center gap-1.5 text-neutral-300 overflow-hidden mr-2">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-neutral-400 font-medium shrink-0">First 250 chars:</span>
                          {!isItemExpanded && (
                            <span className="text-emerald-300 font-semibold truncate">
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
                          className="text-neutral-400 hover:text-white p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                          aria-label={isItemExpanded ? "Collapse response preview" : "Unfold response preview"}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isItemExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      {isItemExpanded && (
                        <div className="px-3 py-2.5 border-t border-neutral-800 bg-neutral-950 text-emerald-300 break-all whitespace-pre-wrap break-words select-text max-h-48 overflow-y-auto leading-relaxed">
                          {isBodyEmpty
                            ? "[Empty response body — 0 chars]"
                            : req.responseBodyPreview || (req.isPending ? "loading…" : "[empty]")}
                          {req.fullResponseBody && req.fullResponseBody.length > 250 && (
                            <div className="mt-2 text-xs text-blue-400 font-sans font-medium">
                              (Select this request to expose the full {req.fullResponseBody.length} characters)
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

          {/* Right Column: Request Detail View (Accordion-Structured to Prevent Overlapping Elements) */}
          <div
            className={`md:col-span-6 lg:col-span-7 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm bg-neutral-900/50 ${
              activeMobileTab === "detail" ? "block" : "hidden md:block"
            }`}
          >
            {selectedRequest ? (
              <>
                {/* Detail Header Bar & Quick Accordion Expansion Controls */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs ${
                        isSuccessfulFetch(selectedRequest)
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-rose-950 text-rose-300 border border-rose-700"
                      }`}
                    >
                      {selectedRequest.status || "PENDING"}
                      {selectedRequest.status === 200 && !isSuccessfulFetch(selectedRequest)
                        ? " (Empty Body — 0 chars)"
                        : ""}
                    </span>

                    <span className="font-bold text-neutral-100 text-base font-mono">
                      {selectedRequest.method}
                    </span>

                    {/* Target Language Tag in Header */}
                    {extractTlang(selectedRequest.url) && (
                      <span
                        data-testid="detail-tlang-tag"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>
                          tlang: {extractTlang(selectedRequest.url)} (
                          {getLanguageName(extractTlang(selectedRequest.url))})
                        </span>
                      </span>
                    )}

                    {/* Good Fetch Badge in Header */}
                    {extractTlang(selectedRequest.url) && isSuccessfulFetch(selectedRequest) && (
                      <span
                        data-testid="detail-good-fetch-badge"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Good Fetch</span>
                      </span>
                    )}
                  </div>

                  {/* Accordion Expand/Collapse All Toggles */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllDetailAccordions(true)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition"
                      title="Expand all accordion panels"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllDetailAccordions(false)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition"
                      title="Collapse all accordion panels"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* ACCORDION 1: Request Overview, URL & Metadata */}
                <div className="border border-neutral-800 rounded-xl bg-neutral-950/70 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleDetailAccordion("overview")}
                    className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-850 text-left transition select-none"
                    aria-expanded={openDetailAccordions.overview}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                          openDetailAccordions.overview ? "rotate-180" : ""
                        }`}
                      />
                      <span className="text-neutral-200 font-bold text-xs uppercase tracking-wider">
                        Request Overview & URL
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-neutral-400">
                        {selectedRequest.type} · {selectedRequest.duration ?? "—"}ms
                      </span>
                    </div>
                  </button>

                  {openDetailAccordions.overview && (
                    <div className="p-4 space-y-3.5 border-t border-neutral-800">
                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                          <span className="text-neutral-400 block text-xs">Type</span>
                          <span className="font-mono text-neutral-100 font-semibold text-xs truncate block">{selectedRequest.type}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                          <span className="text-neutral-400 block text-xs">Duration</span>
                          <span className="font-mono text-neutral-100 font-semibold text-xs">
                            {selectedRequest.duration !== undefined ? `${selectedRequest.duration} ms` : "—"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                          <span className="text-neutral-400 block text-xs">Status</span>
                          <span className="font-mono text-neutral-100 font-semibold text-xs">
                            {selectedRequest.isPending ? "Pending" : selectedRequest.status || "Error"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800">
                          <span className="text-neutral-400 block text-xs">Target Lang</span>
                          <span className="font-mono text-neutral-100 font-semibold text-xs">
                            {extractTlang(selectedRequest.url) || "None"}
                          </span>
                        </div>
                      </div>

                      {/* Full URL with Word-Wrap & Copy Button */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-neutral-300 text-xs font-semibold uppercase tracking-wider">
                          <span>Full URL</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedRequest.url, "url")}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-sans font-medium"
                          >
                            {copiedDetail === "url" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Copied URL!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy URL</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          data-testid="detail-full-url"
                          className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs sm:text-sm text-neutral-200 break-all whitespace-pre-wrap break-words leading-relaxed select-text"
                        >
                          {renderHighlightedUrl(selectedRequest.url)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: Structured Query Parameters Table */}
                {parsedQueryParams.length > 0 && (
                  <div className="border border-neutral-800 rounded-xl bg-neutral-950/70 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleDetailAccordion("params")}
                      className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-850 text-left transition select-none"
                      aria-expanded={openDetailAccordions.params}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                            openDetailAccordions.params ? "rotate-180" : ""
                          }`}
                        />
                        <span className="text-neutral-200 font-bold text-xs uppercase tracking-wider">
                          Query Parameters Breakdown
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {parsedQueryParams.length} params
                      </span>
                    </button>

                    {openDetailAccordions.params && (
                      <div className="border-t border-neutral-800">
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                              <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 text-[11px]">
                                <th className="py-2.5 px-3.5 font-semibold">Parameter</th>
                                <th className="py-2.5 px-3.5 font-semibold">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-850">
                              {parsedQueryParams.map((p, idx) => (
                                <tr
                                  key={idx}
                                  className={p.isHighlighted ? "bg-amber-950/20" : "hover:bg-neutral-900/40"}
                                >
                                  <td className={`py-2 px-3.5 font-bold ${p.isHighlighted ? "text-amber-300" : "text-neutral-400"}`}>
                                    {p.key}
                                  </td>
                                  <td className={`py-2 px-3.5 break-all whitespace-pre-wrap break-words ${p.isHighlighted ? "text-amber-200 font-semibold" : "text-neutral-200"}`}>
                                    {p.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Error Alert Box */}
                {selectedRequest.error && (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                    <div className="space-y-1">
                      <div className="font-bold text-rose-100">Request Error Encountered</div>
                      <div className="break-all whitespace-pre-wrap break-words font-mono text-xs">
                        {selectedRequest.error}
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCORDION 3: Response Body (First 250 Chars Accordion) */}
                <details
                  className="border border-neutral-800 rounded-xl bg-neutral-950/70 overflow-hidden shadow-sm"
                  open
                >
                  <summary className="flex items-center justify-between p-3.5 cursor-pointer bg-neutral-900/80 hover:bg-neutral-850 select-none transition">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-200 font-bold text-xs uppercase tracking-wider">
                        Response Body (First 250 Chars Accordion)
                      </span>
                    </div>
                    <div>
                      <span className="text-xs px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 font-mono font-medium border border-neutral-700">
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

                  <div className="p-4 space-y-3 border-t border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="text-xs text-neutral-400">
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
                              onClick={() => {
                                setShowFullBody((prev) => {
                                  const next = !prev;
                                  announce(next ? "Full response body exposed" : "Showing first 250 characters");
                                  return next;
                                });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition active:scale-95"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition"
                          >
                            {copiedDetail === "body" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-neutral-300" />
                                <span>Copy Body</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs sm:text-sm text-emerald-300 whitespace-pre-wrap break-all break-words select-text max-h-[48vh] overflow-y-auto leading-relaxed shadow-inner"
                      data-testid="inspector-response-body"
                    >
                      {showFullBody
                        ? selectedRequest.fullResponseBody ||
                          (selectedRequest.status === 200
                            ? "empty body — 0 chars"
                            : "[Empty]")
                        : selectedRequest.responseBodyPreview
                          ? selectedRequest.responseBodyPreview
                          : selectedRequest.status === 200 &&
                              (!selectedRequest.fullResponseBody ||
                                selectedRequest.fullResponseBody.trim() === "")
                            ? "empty body — 0 chars"
                            : selectedRequest.isPending
                              ? "Request in progress…"
                              : "[Empty or Non-string response]"}
                    </div>
                  </div>
                </details>

                {/* ACCORDION 4: Complete Formatted Request Export */}
                <div className="border border-neutral-800 rounded-xl bg-neutral-950/70 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleDetailAccordion("raw")}
                    className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-850 text-left transition select-none"
                    aria-expanded={openDetailAccordions.raw}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                          openDetailAccordions.raw ? "rotate-180" : ""
                        }`}
                      />
                      <span className="text-neutral-200 font-bold text-xs uppercase tracking-wider">
                        Complete Formatted Request Export
                      </span>
                    </div>

                    <button
                      id="copy-full-request-button"
                      data-testid="copy-full-request-button"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyText(formatRequestForClipboard(selectedRequest), "request");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium border border-neutral-700 transition"
                    >
                      {copiedDetail === "request" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Copy Full Request</span>
                        </>
                      )}
                    </button>
                  </button>

                  {openDetailAccordions.raw && (
                    <div className="p-3.5 border-t border-neutral-800 bg-neutral-950">
                      <pre className="font-mono text-xs text-neutral-300 whitespace-pre-wrap break-all break-words leading-relaxed select-text max-h-56 overflow-y-auto">
                        {formatRequestForClipboard(selectedRequest)}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-neutral-400 space-y-2">
                <Code2 className="w-8 h-8 text-neutral-500 mx-auto" />
                <p className="font-medium text-neutral-300">No request selected</p>
                <p className="text-xs text-neutral-500">
                  Select a network request on the left to inspect its parameters, status, and response body.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
