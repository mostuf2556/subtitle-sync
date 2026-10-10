# Active Sub-task

## Subtask 49.2: Native Android Direct Caption Discovery via Innertube Player API
- In `MainActivity.kt`, add native endpoint discovery via YouTube's public free Innertube player endpoint (`https://www.youtube.com/youtubei/v1/player` with client `ANDROID`) when `lastObservedTimedTextUrl` is null.
- Extract and cache `baseUrl` from `playerCaptionsTracklistRenderer.captionTracks` so any video ID can immediately fetch captions in any target language even before the player fires timedtext.
- Implement dedicated test `scripts/verify-innertube-discovery.ts` and verify.
