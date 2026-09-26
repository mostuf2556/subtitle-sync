# Current task

## Task 3: Add dynamic target-language selection to the app

Expose a target-language control built from the supported language list and make Android subtitle refreshes follow the selected languages. Include Spanish because the requested emulator flow changes to `tlang=es`.

## Done looks like

- The Languages panel has a labeled target-language control with dynamic options.
- Selecting a target language includes it in Android subtitle requests.
- The web fixture loader tolerates languages without a bundled fixture.
- The app builds and the focused lint scope passes.