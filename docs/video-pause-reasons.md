# Video Playback Pauses: Root Causes, Diagnostics & Explanations (`docs/video-pause-reasons.md`)

This document details the architectural reasons why a video may pause during playback in the application, and the diagnostic mechanisms implemented to provide complete transparency to the user.

---

## 1. Why Does the Video Pause Automatically?

In standard video players, videos only pause when the user clicks Pause. In this application, playback is coordinated with multi-language subtitle tracks and Text-To-Speech (TTS) speech synthesis engines (Web Speech API and Alternative TTS services).

The primary reasons for automated or unexplained pauses are:

### A. Section-by-Section Speech Synchronization (`pauseMode`)

- **Mechanism**: When "Video First" sync mode (`pauseMode`) is active (or enabled via playback preferences), the application allows the video to play until the end of a subtitle section.
- **Why it pauses**: It calls `p.pauseVideo()` at the section boundary so that target-language speech synthesis (TTS) can speak the translation without being drowned out by the video's original audio or advancing past the sentence.
- **Resume condition**: Once TTS synthesis finishes speaking all selected languages for that row, the player automatically unpauses and jumps to the start of the next subtitle row.

### B. Advance TTS Synthesis (`ttsFirstMode`)

- **Mechanism**: When "TTS First" mode is enabled, at the very beginning of a subtitle row, the video pauses (`p.pauseVideo()`) before any video playback of that line occurs.
- **Why it pauses**: It speaks the subtitle in advance so the learner hears the translation first.
- **Resume condition**: Once speech completes, video playback resumes from the start of the row.

### C. Slow or Multi-Language Speech Synthesis Delay

- **Mechanism**: When multiple languages are marked for speech (e.g. English + Hebrew + Spanish), speech synthesis requests are queued sequentially.
- **Why it pauses**: The video remains paused for the entire duration of all speech synthesis items. If the device's TTS engine is slow, downloading voices, or rate-limited, the video pause lasts longer than expected.

### D. End of Subtitle Track Reached

- **Mechanism**: In `pauseMode`, when the video reaches the final subtitle section in the transcript, there are no subsequent subtitle cues to jump to.
- **Why it pauses**: The player stops automatically at the end of the subtitle stream to prevent uncontrolled overrun.

### E. Background Audio Focus / MediaSession Interruption

- **Mechanism**: Android and desktop browsers trigger `navigator.mediaSession` pause handlers when another media app, tab, or notification claims audio focus.
- **Why it pauses**: `initBackgroundMediaManager` intercepts OS-level pause commands. `BackgroundAudioService.kt` ignores internal same-process AudioFocus transitions from WebView `<video>` / Android `TextToSpeech` so the app never self-evicts into `"Paused via system media controls"` when speech completes or video resumes, and `initBackgroundMediaManager` suppresses spurious resume-window focus bounces (`SPURIOUS_MEDIA_PAUSE_IGNORED`).

### F. Setup Mode Pause (`isSetupPaused`)

- **Mechanism**: The floating draggable pause toggle or setup pause button pauses all video player instances to allow the user to adjust settings, select languages, or configure parser rules.

### G. YouTube Player Events (Buffering, Embed Restrictions, Rate Limiting)

- **Mechanism**: The native YouTube iframe emits state events (`event.data === 2` for pause, `event.data === 3` for buffering, `event.data === 0` for ended, or `onError` with code 150/101 for restricted embeds).
- **Why it pauses**: Network lag, ad interception, or YouTube embed restrictions can halt playback. Unexpected pauses shortly after play or TTS completion are recorded as `UNEXPECTED_PLAYER_PAUSE` and immediate resume bounces are auto-recovered.

---

## 2. On-Screen Pause Explanations

To ensure the user is never confused about why playback paused, the UI displays clear, real-time feedback:

1. **Pause Reason Banner (`data-testid="video-pause-reason-banner"`)**:
   - Rendered directly beneath/alongside the video player controls whenever the video is paused.
   - Explains the exact reason in plain text:
     - _"Waiting for speech synthesis ([Languages]) before playing"_
     - _"Section complete: speaking translation ([Languages])"_
     - _"Reached end of subtitle track"_
     - _"Paused by user"_
     - _"Paused for setup"_
     - _"Paused via system media controls"_
2. **Player Control Pause Reason (`data-testid="player-control-pause-reason"`)**:
   - Tagged inside `VideoPlaybackControls` status ribbon next to the Paused status indicator.
3. **State Machine Action Logs**:
   - `PLAYBACK_PAUSE_REQUESTED`, `PLAYER_STATE_CHANGED`, `MEDIA_SESSION_PAUSE_RECEIVED`, `SPURIOUS_MEDIA_PAUSE_IGNORED`, and `UNEXPECTED_PLAYER_PAUSE` events are recorded in `src/utils/logBuffer.ts` and surfaced in the developer diagnostics report (`logBuffer.generateTroubleshootingPrompt()`).

