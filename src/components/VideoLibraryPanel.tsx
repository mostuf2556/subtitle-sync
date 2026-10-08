import React, { useState, useMemo } from "react";
import { Play, Trash2, Clock, Search, RotateCcw, Video } from "lucide-react";
import { LibraryVideoItem } from "@/types";
import {
  getVideoThumbnailUrl,
  formatRelativeTime,
  removeVideoFromLibrary,
  clearVideoLibrary,
  loadVideoLibrary,
} from "@/utils/videoLibraryManager";
import { Button } from "@/components/ui/button";

export interface VideoLibraryPanelProps {
  currentVideoId: string;
  onSelectVideo: (videoId: string, url?: string) => void;
  className?: string;
}

export const VideoLibraryPanel: React.FC<VideoLibraryPanelProps> = ({
  currentVideoId,
  onSelectVideo,
  className = "",
}) => {
  const [items, setItems] = useState<LibraryVideoItem[]>(() => loadVideoLibrary());
  const [searchQuery, setSearchQuery] = useState("");

  const refreshItems = () => {
    setItems(loadVideoLibrary());
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeVideoFromLibrary(id);
    setItems(updated);
  };

  const handleClear = () => {
    if (window.confirm("Clear all watched video history?")) {
      clearVideoLibrary();
      setItems([]);
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  return (
    <div data-testid="video-library-panel" className={`space-y-4 ${className}`}>
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            data-testid="library-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search watched videos by title or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshItems}
            title="Refresh watch history"
            className="h-8 text-xs"
            data-testid="library-refresh-btn"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>

          {items.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              title="Clear all watch history"
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              data-testid="library-clear-btn"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Video Cards Grid */}
      {filteredItems.length === 0 ? (
        <div
          data-testid="library-empty-state"
          className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed text-muted-foreground"
        >
          <Video className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No videos found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? "No videos matching your search query."
              : "Videos you play will appear in your watch history for fast reload."}
          </p>
        </div>
      ) : (
        <div
          data-testid="library-items-list"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
        >
          {filteredItems.map((item) => {
            const isActive = item.id === currentVideoId;
            return (
              <div
                key={item.id}
                data-testid={`library-item-${item.id}`}
                onClick={() => onSelectVideo(item.id, item.originalUrl)}
                className={`group relative flex flex-col overflow-hidden rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full bg-black/20 overflow-hidden">
                  <img
                    src={getVideoThumbnailUrl(item.id)}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback placeholder if image fails to load
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-200"
                  />
                  {isActive && (
                    <span
                      data-testid={`library-active-badge-${item.id}`}
                      className="absolute top-2 left-2 flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Active
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col justify-between p-2.5 text-xs">
                  <div>
                    <h4
                      className="font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    <p className="font-mono text-[11px] text-muted-foreground mt-1">ID: {item.id}</p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground">
                      {isActive ? "Currently loaded" : "Click to load"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.title} from history`}
                      data-testid={`library-remove-btn-${item.id}`}
                      onClick={(e) => handleRemove(e, item.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default VideoLibraryPanel;
