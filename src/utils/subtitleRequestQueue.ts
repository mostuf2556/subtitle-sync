/**
 * Subtitle Request Queue & Pacing Coordinator
 *
 * Implements strict single-flight execution (Concurrency = 1) for YouTube timedtext
 * requests, randomized pacing jitter between calls, selective retry filtering
 * (only retrying failed languages), and exponential backoff on HTTP 429 errors.
 *
 * See docs/auto-retry.md for architectural specifications.
 */

import { getRandomRetryDelayMs } from "../lib/playback-preferences";

export interface QueuedSubtitleTask {
  id: string;
  videoId: string;
  lang: string;
  isRetry: boolean;
  execute: () => Promise<boolean>;
  resolve: (success: boolean) => void;
  reject: (err: unknown) => void;
  addedAt: number;
}

export interface SubtitleQueueState {
  currentVideoId: string | null;
  currentlyFetchingLang: string | null;
  pendingLangs: string[];
  failedLangs: string[];
  succeededLangs: string[];
  isExecuting: boolean;
  isPaused: boolean;
  consecutiveErrors: number;
  cooldownUntil: number;
  lastFetchTimestamp: number;
  windowFrameSeconds: number;
}

export type QueueStateListener = (state: SubtitleQueueState) => void;

class SubtitleRequestQueue {
  private queue: QueuedSubtitleTask[] = [];
  private isExecuting = false;
  private isPaused = false;
  private currentVideoId: string | null = null;
  private currentlyExecutingTask: QueuedSubtitleTask | null = null;

  // Window frame rate-limiting (never >1 fetch per window of X seconds)
  private windowFrameMs: number = 5000;
  private lastFetchTimestamp: number = 0;

  // Language status sets scoped to currentVideoId
  private succeededLanguages = new Set<string>();
  private failedLanguages = new Set<string>();

  // Backoff tracking
  private consecutiveErrors = 0;
  private cooldownUntil = 0;
  private activeDelayTimer: NodeJS.Timeout | null = null;

  // Listeners
  private listeners: Set<QueueStateListener> = new Set();

  /** Forget success/failure state so the video can be fetched from scratch. */
  public resetVideo(videoId: string) {
    if (this.currentVideoId !== videoId) return;
    if (this.activeDelayTimer) {
      clearTimeout(this.activeDelayTimer);
      this.activeDelayTimer = null;
    }
    this.succeededLanguages.clear();
    this.failedLanguages.clear();
    this.consecutiveErrors = 0;
    this.cooldownUntil = 0;
    this.notifyState();
  }

  /**
   * Set the active video context. When changing video ID, any pending requests
   * for the previous video are cancelled and state is cleanly reset.
   */
  public setVideoContext(videoId: string | null) {
    if (this.currentVideoId === videoId) return;

    // Video changed: abort pending items for old video
    if (this.currentVideoId && this.queue.length > 0) {
      const remainingTasks = this.queue.splice(0, this.queue.length);
      remainingTasks.forEach((t) => t.resolve(false));
    }

    if (this.activeDelayTimer) {
      clearTimeout(this.activeDelayTimer);
      this.activeDelayTimer = null;
    }

    this.currentVideoId = videoId;
    this.succeededLanguages.clear();
    this.failedLanguages.clear();
    this.consecutiveErrors = 0;
    this.cooldownUntil = 0;

    this.notifyState();
  }

  /**
   * Register a language as already succeeded (e.g. loaded from cache or previous fetch).
   * Prevents any future requests for this language on the current video.
   */
  public markSucceeded(videoId: string, lang: string) {
    if (this.currentVideoId === videoId) {
      this.succeededLanguages.add(lang);
      this.failedLanguages.delete(lang);
      // Remove any pending queued item for this lang
      this.queue = this.queue.filter((item) => {
        if (item.videoId === videoId && item.lang === lang) {
          item.resolve(true);
          return false;
        }
        return true;
      });
      this.notifyState();
    }
  }

  /**
   * Register a language as failed on the current video.
   */
  public markFailed(videoId: string, lang: string) {
    if (this.currentVideoId === videoId) {
      this.succeededLanguages.delete(lang);
      this.failedLanguages.add(lang);
      this.notifyState();
    }
  }

  /**
   * Check if a language has already succeeded for the current video.
   */
  public hasSucceeded(videoId: string, lang: string): boolean {
    return this.currentVideoId === videoId && this.succeededLanguages.has(lang);
  }

  /**
   * Check if a language is currently queued or in-flight for the given video.
   */
  public isLangQueuedOrExecuting(videoId: string, lang: string): boolean {
    if (
      this.currentlyExecutingTask &&
      this.currentlyExecutingTask.videoId === videoId &&
      this.currentlyExecutingTask.lang === lang
    ) {
      return true;
    }
    return this.queue.some((item) => item.videoId === videoId && item.lang === lang);
  }

  /**
   * Remove a language from queue and tracking (e.g., user removed from favorites).
   */
  public removeLanguage(lang: string) {
    this.succeededLanguages.delete(lang);
    this.failedLanguages.delete(lang);
    this.queue = this.queue.filter((item) => {
      if (item.lang === lang) {
        item.resolve(false);
        return false;
      }
      return true;
    });
    this.notifyState();
  }

  /**
   * Pause or resume queue execution.
   */
  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (this.activeDelayTimer && paused) {
      clearTimeout(this.activeDelayTimer);
      this.activeDelayTimer = null;
    }
    this.notifyState();
    if (!paused) {
      this.processNext();
    }
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Enqueue a subtitle fetch task.
   * Enforces:
   * 1. Concurrency = 1 (strictly serial).
   * 2. Selective filter: skips languages that already succeeded.
   * 3. De-duplication: skips languages already queued for this video.
   */
  public enqueue(params: {
    videoId: string;
    lang: string;
    isRetry?: boolean;
    execute: () => Promise<boolean>;
  }): Promise<boolean> {
    const { videoId, lang, isRetry = false, execute } = params;

    // Selective filter: if already succeeded, skip network call immediately
    if (this.hasSucceeded(videoId, lang)) {
      return Promise.resolve(true);
    }

    // Check if task is already in-flight or already queued
    const alreadyQueued = this.queue.some((item) => item.videoId === videoId && item.lang === lang);
    if (alreadyQueued) {
      return Promise.resolve(false);
    }
    if (
      this.currentlyExecutingTask &&
      this.currentlyExecutingTask.videoId === videoId &&
      this.currentlyExecutingTask.lang === lang
    ) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve, reject) => {
      const task: QueuedSubtitleTask = {
        id: `${videoId}-${lang}-${Date.now()}`,
        videoId,
        lang,
        isRetry,
        execute,
        resolve,
        reject,
        addedAt: Date.now(),
      };

      this.queue.push(task);
      this.notifyState();
      this.processNext();
    });
  }

  /**
   * Process the next task in the queue with strict Concurrency = 1.
   */
  private async processNext() {
    if (this.isExecuting || this.isPaused || this.queue.length === 0) {
      return;
    }

    // Respect cooldown window if backoff is active
    const now = Date.now();
    if (this.cooldownUntil > now) {
      const remainingMs = this.cooldownUntil - now;
      if (!this.activeDelayTimer) {
        this.activeDelayTimer = setTimeout(() => {
          this.activeDelayTimer = null;
          this.processNext();
        }, remainingMs);
      }
      return;
    }

    // Rate-limiting protection: never try to fetch more than 1 subtitle in a window frame of X seconds
    const elapsedSinceLast = now - this.lastFetchTimestamp;
    if (this.lastFetchTimestamp > 0 && elapsedSinceLast < this.windowFrameMs) {
      const remainingWindowMs = this.windowFrameMs - elapsedSinceLast;
      if (!this.activeDelayTimer) {
        this.activeDelayTimer = setTimeout(() => {
          this.activeDelayTimer = null;
          this.processNext();
        }, remainingWindowMs);
      }
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    // Verify video context is still valid
    if (this.currentVideoId && task.videoId !== this.currentVideoId) {
      task.resolve(false);
      this.notifyState();
      this.processNext();
      return;
    }

    // Double-check if language succeeded in the meantime
    if (this.hasSucceeded(task.videoId, task.lang)) {
      task.resolve(true);
      this.notifyState();
      this.processNext();
      return;
    }

    this.isExecuting = true;
    this.lastFetchTimestamp = Date.now();
    this.currentlyExecutingTask = task;
    this.notifyState();

    let success = false;
    try {
      success = await task.execute();
    } catch (_err) {
      success = false;
    }

    if (success) {
      this.succeededLanguages.add(task.lang);
      this.failedLanguages.delete(task.lang);
      this.consecutiveErrors = 0;
      this.cooldownUntil = 0;
    } else {
      this.failedLanguages.add(task.lang);
      this.consecutiveErrors += 1;
      // Exponential backoff capped at 60s
      const backoffDelay = Math.min(
        getRandomRetryDelayMs(3, 8) * Math.pow(1.5, Math.min(this.consecutiveErrors, 5)),
        60000,
      );
      this.cooldownUntil = Date.now() + backoffDelay;
    }

    task.resolve(success);
    this.currentlyExecutingTask = null;
    this.isExecuting = false;
    this.notifyState();

    // Enforce window frame pacing before executing the next queued task
    if (this.queue.length > 0 && !this.isPaused) {
      const elapsed = Date.now() - this.lastFetchTimestamp;
      const windowRemainingMs = Math.max(0, this.windowFrameMs - elapsed);
      const pacingDelayMs = Math.max(getRandomRetryDelayMs(3, 8), windowRemainingMs);
      this.activeDelayTimer = setTimeout(() => {
        this.activeDelayTimer = null;
        this.processNext();
      }, pacingDelayMs);
    }
  }

  public setWindowFrameSeconds(seconds: number) {
    this.windowFrameMs = Math.max(1, Math.round(seconds)) * 1000;
  }

  public setWindowSeconds(seconds: number) {
    this.setWindowFrameSeconds(seconds);
  }

  public getWindowFrameSeconds(): number {
    return Math.round(this.windowFrameMs / 1000);
  }

  public getWindowSeconds(): number {
    return this.getWindowFrameSeconds();
  }

  public getLastFetchTimestamp(): number {
    return this.lastFetchTimestamp;
  }

  public subscribe(listener: QueueStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SubtitleQueueState {
    return {
      currentVideoId: this.currentVideoId,
      currentlyFetchingLang: this.currentlyExecutingTask?.lang ?? null,
      pendingLangs: this.queue.map((t) => t.lang),
      failedLangs: Array.from(this.failedLanguages),
      succeededLangs: Array.from(this.succeededLanguages),
      isExecuting: this.isExecuting,
      isPaused: this.isPaused,
      consecutiveErrors: this.consecutiveErrors,
      cooldownUntil: this.cooldownUntil,
      lastFetchTimestamp: this.lastFetchTimestamp,
      windowFrameSeconds: this.getWindowFrameSeconds(),
    };
  }

  private notifyState() {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch {}
    });
  }
}

export const subtitleRequestQueue = new SubtitleRequestQueue();
