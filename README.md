# Subtitle Sync

1. [Docs](./docs/)
2. [Demo Website (GitHub Pages)](https://mostuf25561.github.io/subtitle-sync/)
3. [Report (GitHub Pages)](https://mostuf25561.github.io/subtitle-sync/android-emulator-report.html)
4. [Test Coverage & QA Report (GitHub Pages)](https://mostuf25561.github.io/subtitle-sync/coverage/)
5. [Storybook (GitHub Pages)](https://mostuf25561.github.io/subtitle-sync/storybook/)


<!-- CI_STATUS_INDICATOR_START -->
## 🚨 Latest CI Build & Test Status: FAILED

> ⚠️ **Automated CI Failure Detected**: `Android Emulator Screencast & Report Video Flow` (Step: `Broken Video Link Detection in android-emulator-report.html`)
>
> If screencasts, logs, or reports are missing, copy the diagnostic block below and paste it directly into your AI Assistant prompt to reproduce and resolve the failure immediately:

```markdown
# AI FIX PROMPT: CI Failure in Android Emulator Screencast & Report Video Flow
- **Repository**: mostuf25561/subtitle-sync
- **Workflow / Checker**: Android Emulator Screencast & Report Video Flow
- **Failing Step**: Broken Video Link Detection in android-emulator-report.html
- **Report URL**: https://mostuf25561.github.io/subtitle-sync/android-emulator-report.html
- **Run URL**: https://github.com/mostuf25561/subtitle-sync/actions/runs/42734617393

### Failure Log & Diagnosis:
Report at android-emulator-report.html contains broken video link (screencast video missing or HTTP 404).

### Instructions for AI Assistant:
1. Examine the root cause, broken link(s), and diagnostic details above.
2. If the screencast video link returned 404 in android-emulator-report.html, trigger the 'Android Emulator E2E Tests' workflow (emulation.yml) to record and publish android-emulator-video.mp4 to GitHub Pages.
3. Fix broken target paths, restore missing files, or fix failing application code with targeted edits.
4. Verify that `npm run test:readme-links` and all automated test suites pass cleanly.
```
<!-- CI_STATUS_INDICATOR_END -->
