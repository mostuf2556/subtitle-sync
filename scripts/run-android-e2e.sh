#!/usr/bin/env bash
# ==============================================================================
# YouTube Viewer — Android Emulator E2E Test Execution & Reporting Script
# ==============================================================================
# Executes Phase 4 E2E verification sequence on an active Android Emulator
# or connected device, collects ADB telemetry, captures screenshots, and
# compiles the HTML E2E Test Report.
# ==============================================================================

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_NAME="com.ytviewer.app"
MAIN_ACTIVITY="com.ytviewer.app/.MainActivity"
TARGET_VIDEO_URL="https://www.youtube.com/watch?v=n9qwEOsqsoo"
TARGET_LANG="es"
APK_PATH="${ROOT_DIR}/android-shell/app/build/outputs/apk/debug/app-debug.apk"
SCREENSHOT_OUT="${ROOT_DIR}/android-emulator-screenshot.png"
LOGCAT_OUT="${ROOT_DIR}/android-emulator-logcat.txt"

echo "=================================================================="
echo "   Android Native Shell — E2E Test Runner & Report Generator"
echo "=================================================================="
echo " Working Dir : ${ROOT_DIR}"
echo " Target App  : ${PACKAGE_NAME}"
echo " Target Video: ${TARGET_VIDEO_URL} (NO FIXTURES)"
echo " Target Lang : ${TARGET_LANG} (Testing tlang replacement)"
echo "=================================================================="

# 0. Validate default video subtitles for both Web Demo App and Android
echo "--> [Step 0] Validating default video subtitles for Web Demo App and Android..."
npx tsx "${ROOT_DIR}/scripts/verify-default-video-subtitles-e2e.ts" || {
  echo "❌ Default video subtitles verification failed!"
  exit 1
}

# 1. Check ADB availability
if command -v adb &> /dev/null; then
  echo "✓ Found ADB client at: $(command -v adb)"
  
  # Check if an emulator or physical device is connected
  CONNECTED_DEVICES=$(adb devices | grep -E '\b(device|emulator)\b' | grep -v "List of" || true)

  if [[ -n "${CONNECTED_DEVICES}" ]]; then
    echo "✓ Detected connected Android device/emulator:"
    echo "${CONNECTED_DEVICES}"
    
    DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null || echo "Android Device")
    DEVICE_API=$(adb shell getprop ro.build.version.sdk 2>/dev/null || echo "34")
    DEVICE_RELEASE=$(adb shell getprop ro.build.version.release 2>/dev/null || echo "14")
    echo "  Device Model: ${DEVICE_MODEL}"
    echo "  Android Ver : ${DEVICE_RELEASE} (API ${DEVICE_API})"

    # Install APK if available
    if [[ -f "${APK_PATH}" ]]; then
      echo "--> Installing APK: ${APK_PATH}"
      adb install -r "${APK_PATH}" || { echo "❌ adb install failed"; exit 1; }
    fi

    # Clear logcat buffer
    adb logcat -c 2>/dev/null || true

    echo "--> Launching MainActivity with Target URL: ${TARGET_VIDEO_URL}..."
    adb shell am start -n "${MAIN_ACTIVITY}" -d "${TARGET_VIDEO_URL}" || true

    echo "--> Waiting for WebView & Caption Interceptor initialization (8s)..."
    sleep 8

    echo "--> Enabling captions in WebView..."
    # Dispatch JavaScript click on caption toggle button if accessible via WebView inspect
    adb shell input tap 450 320 2>/dev/null || true

    echo "--> Observing native subtitle interception without fixtures..."
    sleep 4

    echo "--> Testing target translation language switch (tlang=${TARGET_LANG})..."
    adb shell am broadcast -a "com.ytviewer.app.ACTION_SET_TARGET_LANG" --es "targetLang" "${TARGET_LANG}" 2>/dev/null || true

    echo "--> Capturing foreground activity state..."
    adb shell dumpsys activity "${PACKAGE_NAME}" | grep -E "mResumed|topResumedActivity|ActivityRecord" | head -n 10 || true

    # Start screencast recording in the background on the emulator
    RECORDING_PID=""
    VIDEO_REMOTE="/sdcard/android-emulator-video.mp4"
    VIDEO_OUT="${ROOT_DIR}/android-emulator-video.mp4"
    echo "--> Starting Android emulator screencast recording via screenrecord..."
    adb shell rm -f "${VIDEO_REMOTE}" 2>/dev/null || true
    adb shell screenrecord --time-limit 180 --bit-rate 4000000 "${VIDEO_REMOTE}" >/dev/null 2>&1 &
    RECORDING_PID=$!
    echo "  screenrecord started (runner background PID: ${RECORDING_PID})"

    stop_recording_and_pull() {
      echo "--> Stopping screencast recording and pulling video..."
      if [[ -n "${RECORDING_PID}" ]] && kill -0 "${RECORDING_PID}" 2>/dev/null; then
        # Send SIGINT to adb screenrecord process so it finalizes MP4 container
        adb shell pkill -2 -f "screenrecord" 2>/dev/null || true
        wait "${RECORDING_PID}" 2>/dev/null || true
        sleep 2
      fi
      adb pull "${VIDEO_REMOTE}" "${VIDEO_OUT}" 2>/dev/null || true
      if [[ -f "${VIDEO_OUT}" ]]; then
        echo "✓ Video screencast pulled to: ${VIDEO_OUT}"
        mkdir -p "${ROOT_DIR}/public/screenshots"
        cp -f "${VIDEO_OUT}" "${ROOT_DIR}/public/screenshots/android-emulator-video.mp4" 2>/dev/null || true
      else
        echo "ℹ️ No video file retrieved from emulator."
      fi
    }
    trap stop_recording_and_pull EXIT

    echo "--> Capturing device screenshot..."
    adb shell screencap -p /sdcard/android_test_screen.png
    adb pull /sdcard/android_test_screen.png "${SCREENSHOT_OUT}" || true
    echo "✓ Screenshot pulled to: ${SCREENSHOT_OUT}"

    echo "--> Extracting ADB Logcat for interceptor & tlang translation..."
    adb logcat -d -s "YT_CAPTION_INTERCEPTOR" "TTS_ENGINE" "ActivityTaskManager" | tail -n 60 > "${LOGCAT_OUT}" || true
    echo "✓ Logcat telemetry saved to: ${LOGCAT_OUT}"

    LOGCAT_OUT="${LOGCAT_OUT}" bash "${ROOT_DIR}/scripts/android-e2e-assert.sh" || exit 1
    echo "=================================================================="
    echo "✓ Android device/emulator E2E run complete!"
    echo "=================================================================="
    stop_recording_and_pull
    trap - EXIT
  else
    echo "❌ No active Android device/emulator detected via adb."
    exit 1
  fi
else
  echo "❌ ADB client not installed in current environment."
  exit 1
fi

