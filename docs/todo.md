# Current Subtask

## Subtask 59.1: Compact per-language settings (rate/voice) and fix voice selection

- Verify compact per-language settings layout in Favorites panel (rate slider with numeric display, ratio preset selector, accessible label).
- Ensure voice selection dropdown persists selected voices to localStorage (`yt_tts_voice_selections_v1`) and correctly applies chosen voice URI during speech playback.
- Ensure device default voice fallback works properly when no custom voice is selected or when voices are unavailable on Android.
- Create dedicated verification test for compact per-language settings and voice selection.
- Run verification tests, compile applet, lint applet, and perform git commit.
