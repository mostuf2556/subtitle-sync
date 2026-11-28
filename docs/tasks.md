# Active Tasks

## Task 465 (Prompt 230 Ch. 2): Fix Multi-Language TTS-Play Regression Since Performance Commit
- [ ] **Sub-task 465.1**: Diagnose why `tts-play` stopped speaking sentences in different languages since the performance commit (including default video `L2Ryrr6txwA`, why `ru` is unchecked, why non-Hebrew languages get skipped/cancelled, and any perf-commit state/mount regressions).
- [ ] **Sub-task 465.2**: Implement minimal targeted fix across shared logic (ensuring Expert & Beginner mode parity) and sync patch version (`2.1.138`).
- [ ] **Sub-task 465.3**: Add/update dedicated E2E + unit regression test (`scripts/verify-multi-language-tts-play.ts`), register in `package.json` & `docs/files.md`, run full verification + `compile_applet` + `lint_applet`, log in `docs/git.md`, and archive to `docs/done.md`.
