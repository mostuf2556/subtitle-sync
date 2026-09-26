# Subtitle playback controls plan

## Build

- Add a README task checklist and mark each item done as its implementation completes.
- Highlight each spoken word from the browser speech boundary events, including the active subtitle cell.
- Add a three-way light, dark, and dark-blue theme switch with a saved device preference.
- Replace the shared speech rate with per-language rate and available voice selection controls.
- Add language reordering controls; use the same order for subtitle columns and sequential speech playback.

## Technical details

- Keep browser-native speech synthesis and the existing fixture subtitle workflow.
- Maintain stable React state for per-language voice/rate settings, speaking word range, theme, and language order.
- Apply themes through semantic design tokens, with browser storage accessed only after hydration.
- Preserve existing parsing, YouTube playback, and pause/resume behavior.

## Verify

- Check the project build signal and exercise theme switching, language ordering, and settings in desktop and mobile layouts.
- Confirm the README checklist shows all four items as done only after verification.
