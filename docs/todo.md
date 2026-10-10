# Active Sub-task

## Subtask 48.1: Robust APK Installation & Version Code Handling in Update Script
- Update `update.apk.sh` to handle package collisions (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`, `INSTALL_FAILED_VERSION_DOWNGRADE`, `INSTALL_FAILED_CONFLICTING_PROVIDER`), performing a multi-level purge (`pm uninstall`, `pm uninstall --user 0`, `pm clear`) and retrying cleanly.
- Ensure `package.json` defines a standard `"version"` field (e.g. `1.0.0`) and `release-apk.yml` correctly propagates version code and version name.
- In `README.md`, ensure the APK section links to the all releases page (`https://github.com/ofer-shaham/subtitle-sync/releases`).
- Add dedicated test `scripts/verify-apk-updater-robustness.ts` and verify.
