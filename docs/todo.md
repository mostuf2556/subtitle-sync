# Current Subtask

## Subtask 54.2: Adaptive Device Interaction, Live Intent Assertions & Multi-Scenario Video Capture

- Add adaptive coordinate scaling based on device display resolution for gestures and taps.
- Implement real device live intent dispatch (`ACTION_VIEW` and `ACTION_SEND`) with verification of UI response in `scripts/android-e2e-assert.sh`.
- Ensure video screencast recording and screenshot generation dynamically handle physical device screens and rotation gracefully.
- Update `e2e/emulation.spec.ts` and Cypress emulation tests to reflect physical device and emulator parity.
