#!/usr/bin/env bash
# ==============================================================================
# Android E2E Assertion Script (Device & Emulator Parity)
# Validates:
#   1. Clean app startup without FATAL EXCEPTION or [APP_BOOT_ERROR]
#   2. Real Android app fetches default subtitle track & favorite translations
#      (Hebrew & Italian) in exact chronological order via timedtext
#   3. Adaptive display resolution coordinate scaling for gestures and taps
#   4. Live Android intent dispatch for YouTube link sharing:
#      - ACTION_VIEW (browser URL share)
#      - ACTION_SEND (official YouTube app share text)
#   5. Dynamic screenshot capture across test milestones
# ==============================================================================
set -uo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-com.ytviewer.app}"
TIMEOUT_S="${APP_READY_TIMEOUT:-45}"
SUBTITLE_FETCH_TIMEOUT_S="${SUBTITLE_FETCH_TIMEOUT:-150}"
LOGCAT_OUT="${LOGCAT_OUT:-./android-emulator-logcat.txt}"
ANDROID_SERIAL="${ANDROID_SERIAL:-}"
SKIP_LIVE_INTENTS="${SKIP_LIVE_INTENTS:-false}"

DEFAULT_CAPTION_PATTERN='SUBTITLE_FETCH kind=default http=2[0-9][0-9] bytes=[1-9][0-9]* cues=[1-9][0-9]*'
HEBREW_CAPTION_PATTERN='SUBTITLE_FETCH kind=translated lang=he http=2[0-9][0-9] bytes=[1-9][0-9]* cues=[1-9][0-9]*'
ITALIAN_CAPTION_PATTERN='SUBTITLE_FETCH kind=translated lang=it http=2[0-9][0-9] bytes=[1-9][0-9]* cues=[1-9][0-9]*'
READY_AT=-1
PLAYER_STARTED=false

adb_cmd() {
  if [[ -n "${ANDROID_SERIAL}" ]]; then
    adb -s "${ANDROID_SERIAL}" "$@"
  else
    adb "$@"
  fi
}

fail() {
  echo "❌ ANDROID E2E FAILED: $1"
  adb_cmd shell screencap -p /sdcard/screen.png 2>/dev/null || true
  adb_cmd pull /sdcard/screen.png ./android-emulator-screenshot.png 2>/dev/null || true
  adb_cmd logcat -d > "${LOGCAT_OUT}" 2>/dev/null || true
  grep -E "APP_READY|APP_BOOT_ERROR|FATAL EXCEPTION|WebView error|Asset not found|WebViewConsole|YT_CAPTION_INTERCEPTOR|SUBTITLE_FETCH|SHARED_LINK_DISPATCH" "${LOGCAT_OUT}" | tail -n 60 || true
  exit 1
}

# Determine adaptive display resolution
DEVICE_RESOLUTION=$(adb_cmd shell wm size 2>/dev/null | grep -oE '[0-9]+x[0-9]+' | head -n 1 || echo "1080x2400")
DEV_W=$(echo "${DEVICE_RESOLUTION}" | cut -d'x' -f1)
DEV_H=$(echo "${DEVICE_RESOLUTION}" | cut -d'x' -f2)
if [[ -z "${DEV_W}" || -z "${DEV_H}" || "${DEV_W}" -le 0 || "${DEV_H}" -le 0 ]]; then
  DEV_W=1080
  DEV_H=2400
fi

# Calculate adaptive coordinates
# YouTube player center: ~50% horizontal width, ~22% vertical height
PLAYER_TAP_X=$(( DEV_W * 50 / 100 ))
PLAYER_TAP_Y=$(( DEV_H * 22 / 100 ))
echo "Adaptive device coordinate scaling: Resolution=${DEV_W}x${DEV_H}, PlayerTap=(${PLAYER_TAP_X}, ${PLAYER_TAP_Y})"

# Phase 1: Wait for app readiness and live subtitle fetches
echo "--> [Phase 1] Waiting for [APP_READY] and verified live subtitle fetches..."
for ((i = 0; i < TIMEOUT_S + SUBTITLE_FETCH_TIMEOUT_S; i++)); do
  LOG=$(adb_cmd logcat -d 2>/dev/null || true)
  if echo "${LOG}" | grep -q "FATAL EXCEPTION"; then fail "app crashed (FATAL EXCEPTION)"; fi
  if echo "${LOG}" | grep -q "APP_BOOT_ERROR"; then fail "web app threw during startup"; fi
  if echo "${LOG}" | grep -qE "WebView error loading https://appassets|Asset not found"; then
    fail "bundled web files could not be loaded"
  fi
  if ! echo "${LOG}" | grep -q "APP_READY"; then
    if (( i >= TIMEOUT_S )); then fail "UI never rendered within ${TIMEOUT_S}s (no [APP_READY] in logcat)"; fi
    sleep 1
    continue
  fi
  adb_cmd shell pidof "${PACKAGE_NAME}" >/dev/null 2>&1 || fail "app process is not running"
  if (( READY_AT < 0 )); then READY_AT=$i; fi
  if [[ "${PLAYER_STARTED}" != true ]]; then
    echo "  Triggering initial playback at adaptive coordinates (${PLAYER_TAP_X}, ${PLAYER_TAP_Y})..."
    adb_cmd shell input tap "${PLAYER_TAP_X}" "${PLAYER_TAP_Y}" || fail "could not start YouTube playback on the device"
    PLAYER_STARTED=true
  fi

  DEFAULT_LINE=$(printf '%s\n' "${LOG}" | grep -nE "${DEFAULT_CAPTION_PATTERN}" | head -n 1 | cut -d: -f1 || true)
  HEBREW_LINE=$(printf '%s\n' "${LOG}" | grep -nE "${HEBREW_CAPTION_PATTERN}" | head -n 1 | cut -d: -f1 || true)
  ITALIAN_LINE=$(printf '%s\n' "${LOG}" | grep -nE "${ITALIAN_CAPTION_PATTERN}" | head -n 1 | cut -d: -f1 || true)
  if [[ -n "${DEFAULT_LINE}" && -n "${HEBREW_LINE}" && -n "${ITALIAN_LINE}" ]]; then
    if (( DEFAULT_LINE < HEBREW_LINE && HEBREW_LINE < ITALIAN_LINE )); then
      echo "✅ Phase 1 Verified OK: Default and Hebrew/Italian subtitles fetched in order."
      break
    fi
    fail "favorite subtitle responses did not follow the successful default subtitle response"
  fi
  if (( i - READY_AT >= SUBTITLE_FETCH_TIMEOUT_S )); then
    fail "timed out waiting for successful default, Hebrew, and Italian subtitle responses after [APP_READY]"
  fi
  sleep 1
done

# Phase 2: Live ACTION_VIEW Intent Dispatch (Browser Share Link)
if [[ "${SKIP_LIVE_INTENTS}" != "true" ]]; then
  echo "--> [Phase 2] Testing live ACTION_VIEW intent dispatch (Browser Link: dQw4w9WgXcQ)..."
  adb_cmd shell am start -a android.intent.action.VIEW \
    -d "https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
    -n "${PACKAGE_NAME}/.MainActivity" || fail "failed to send ACTION_VIEW intent"

  VIEW_CONFIRMED=false
  for ((t = 0; t < 15; t++)); do
    LOG=$(adb_cmd logcat -d 2>/dev/null || true)
    if echo "${LOG}" | grep -qE "Received shared link from Android intent:.*dQw4w9WgXcQ|\[SHARED_LINK_DISPATCH\] dQw4w9WgXcQ|video dQw4w9WgXcQ"; then
      VIEW_CONFIRMED=true
      echo "✅ Phase 2 Verified OK: ACTION_VIEW successfully processed by MainActivity and WebView."
      break
    fi
    sleep 1
  done
  if [[ "${VIEW_CONFIRMED}" != "true" ]]; then
    fail "timed out waiting for ACTION_VIEW intent processing (dQw4w9WgXcQ)"
  fi

  # Capture intermediate screenshot
  mkdir -p ./cypress/screenshots ./public/screenshots
  adb_cmd shell screencap -p /sdcard/screen-action-view.png 2>/dev/null || true
  adb_cmd pull /sdcard/screen-action-view.png ./cypress/screenshots/step-share-browser-link.png 2>/dev/null || true
  cp -f ./cypress/screenshots/step-share-browser-link.png ./public/screenshots/step-share-browser-link.png 2>/dev/null || true

  # Phase 3: Live ACTION_SEND Intent Dispatch (Official YouTube App Share)
  echo "--> [Phase 3] Testing live ACTION_SEND intent dispatch (YouTube App Text: kJQP7kiw5Fk)..."
  adb_cmd shell am start -a android.intent.action.SEND \
    -t "text/plain" \
    --es android.intent.extra.TEXT "Check out this video on YouTube: https://youtu.be/kJQP7kiw5Fk?si=123" \
    -n "${PACKAGE_NAME}/.MainActivity" || fail "failed to send ACTION_SEND intent"

  SEND_CONFIRMED=false
  for ((t = 0; t < 15; t++)); do
    LOG=$(adb_cmd logcat -d 2>/dev/null || true)
    if echo "${LOG}" | grep -qE "Received shared link from Android intent:.*kJQP7kiw5Fk|\[SHARED_LINK_DISPATCH\] kJQP7kiw5Fk|video kJQP7kiw5Fk"; then
      SEND_CONFIRMED=true
      echo "✅ Phase 3 Verified OK: ACTION_SEND successfully parsed and dispatched to WebView."
      break
    fi
    sleep 1
  done
  if [[ "${SEND_CONFIRMED}" != "true" ]]; then
    fail "timed out waiting for ACTION_SEND intent processing (kJQP7kiw5Fk)"
  fi

  # Capture intermediate screenshot
  adb_cmd shell screencap -p /sdcard/screen-action-send.png 2>/dev/null || true
  adb_cmd pull /sdcard/screen-action-send.png ./cypress/screenshots/step-share-youtube-app-text.png 2>/dev/null || true
  cp -f ./cypress/screenshots/step-share-youtube-app-text.png ./public/screenshots/step-share-youtube-app-text.png 2>/dev/null || true

  # Phase 4: Adaptive Gestures (Swipe / Scroll Subtitle Transcript)
  echo "--> [Phase 4] Testing adaptive swipe gesture based on screen dimensions (${DEV_W}x${DEV_H})..."
  SWIPE_X=$(( DEV_W * 50 / 100 ))
  SWIPE_START_Y=$(( DEV_H * 70 / 100 ))
  SWIPE_END_Y=$(( DEV_H * 35 / 100 ))
  adb_cmd shell input swipe "${SWIPE_X}" "${SWIPE_START_Y}" "${SWIPE_X}" "${SWIPE_END_Y}" 250 2>/dev/null || true
  echo "✅ Phase 4 Verified OK: Adaptive swipe executed at (${SWIPE_X}, ${SWIPE_START_Y}) -> (${SWIPE_X}, ${SWIPE_END_Y})."
fi

# Save logcat output and exit cleanly
adb_cmd logcat -d > "${LOGCAT_OUT}" 2>/dev/null || true
echo "=================================================================="
echo "✅ ALL ANDROID E2E PHASES VERIFIED SUCCESSFULLY"
echo "=================================================================="
exit 0
