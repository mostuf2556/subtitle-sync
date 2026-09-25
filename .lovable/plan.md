# Configurable workspace plan

## Build
- Turn the player, playback status, parser, languages, and subtitle table into independent accordion sections.
- Add up/down controls to reorder those sections while preserving their content and behavior.
- Add a switch controlling automatic focus and scrolling to the current subtitle row.
- Add a switch controlling a readable current spoken-subtitle overlay above the video.

## Technical details
- Keep the existing YouTube playback, subtitle segmentation, speech highlighting, and language ordering intact.
- Use the existing design tokens and button components for all new controls.
- Keep section order and open/closed state stable during the current session.

## Verify
- Check section folding and ordering, both toggles, overlay updates, and desktop/mobile layouts.
