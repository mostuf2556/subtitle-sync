# Redesign plan

- Review the existing player source, controls, test selectors, Android bridge, and release workflows.
- Apply the selected modern utility design to the shared responsive interface without changing subtitle or deployment behavior.
- Preserve fixture-only subtitles on the web and live subtitle interception in Android.
- Run the existing focused tests, verify desktop and mobile layouts, then suggest a Cypress-style Android end-to-end report pairing each user action with its screenshot output.
