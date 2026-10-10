#!/usr/bin/env bash
# ==============================================================================
# YouTube Viewer — Android Device & Emulator E2E Test Execution & Reporting Script
# ==============================================================================
# Executes Phase 4 E2E verification sequence on an active Android Emulator
# or connected physical hardware device, collects ADB telemetry, captures
# screenshots and screencast video, and compiles the HTML E2E Test Report.
# ==============================================================================

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_NAME="com.ytviewer.app"
MAIN_ACTIVITY="com.ytviewer.app/.MainActivity"
TARGET_VIDEO_URL="https://www.youtube.com/watch?v=vBURridJXZ0"
TARGET_LANG="es"
APK_PATH="${ROOT_DIR}/android-shell/app/build/outputs/apk/debug/app-debug.apk"
SCREENSHOT_OUT="${ROOT_DIR}/android-emulator-screenshot.png"
LOGCAT_OUT="${ROOT_DIR}/android-emulator-logcat.txt"
DEVICE_INFO_OUT="${ROOT_DIR}/android-emulator-device-info.json"
ANDROID_SERIAL="${ANDROID_SERIAL:-}"

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
    echo "✓ Detected connected Android device/emulator list:"
    echo "${CONNECTED_DEVICES}"
    
    # Select serial if not specified
    if [[ -z "${ANDROID_SERIAL}" ]]; then
      ANDROID_SERIAL=$(echo "${CONNECTED_DEVICES}" | head -n 1 | awk '{print $1}')
    fi
    echo "  Target Device Serial: ${ANDROID_SERIAL}"

    adb_cmd() {
      adb -s "${ANDROID_SERIAL}" "$@"
    }

    # Ensure device is awake, keyguard dismissed, and natural orientation locked
    echo "--> Ensuring device screen is awake, unlocked, and orientation locked..."
    adb_cmd shell input keyevent KEYCODE_WAKEUP 2>/dev/null || true
    adb_cmd shell wm dismiss-keyguard 2>/dev/null || true
    adb_cmd shell settings put system accelerometer_rotation 0 2>/dev/null || true

    # Collect rich device hardware & system telemetry
    DEVICE_MANUFACTURER=$(adb_cmd shell getprop ro.product.manufacturer 2>/dev/null || echo "Unknown")
    DEVICE_BRAND=$(adb_cmd shell getprop ro.product.brand 2>/dev/null || echo "Unknown")
    DEVICE_MODEL=$(adb_cmd shell getprop ro.product.model 2>/dev/null || echo "Android Device")
    DEVICE_API=$(adb_cmd shell getprop ro.build.version.sdk 2>/dev/null || echo "34")
    DEVICE_RELEASE=$(adb_cmd shell getprop ro.build.version.release 2>/dev/null || echo "14")
    DEVICE_ABI=$(adb_cmd shell getprop ro.product.cpu.abi 2>/dev/null || echo "arm64-v8a")
    DEVICE_RESOLUTION=$(adb_cmd shell wm size 2>/dev/null | grep -oE '[0-9]+x[0-9]+' | head -n 1 || echo "1080x2400")
    DEVICE_DENSITY=$(adb_cmd shell wm density 2>/dev/null | grep -oE '[0-9]+' | head -n 1 || echo "420")
    
    echo "  Manufacturer: ${DEVICE_MANUFACTURER} (${DEVICE_BRAND})"
    echo "  Device Model: ${DEVICE_MODEL}"
    echo "  Android Ver : ${DEVICE_RELEASE} (API ${DEVICE_API}, ABI: ${DEVICE_ABI})"
    echo "  Display Res : ${DEVICE_RESOLUTION} @ ${DEVICE_DENSITY}dpi"

    # Derive adaptive coordinates based on physical or emulated display resolution
    DEV_W=$(echo "${DEVICE_RESOLUTION}" | cut -d'x' -f1)
    DEV_H=$(echo "${DEVICE_RESOLUTION}" | cut -d'x' -f2)
    if [[ -z "${DEV_W}" || -z "${DEV_H}" || "${DEV_W}" -le 0 || "${DEV_H}" -le 0 ]]; then
      DEV_W=1080
      DEV_H=2400
    fi
    ADAPTIVE_TAP_X=$(( DEV_W * 50 / 100 ))
    ADAPTIVE_TAP_Y=$(( DEV_H * 22 / 100 ))

    adaptive_tap() {
      local rx="$1"
      local ry="$2"
      local tx=$(( DEV_W * rx / 100 ))
      local ty=$(( DEV_H * ry / 100 ))
      adb_cmd shell input tap "${tx}" "${ty}" 2>/dev/null || true
    }

    adaptive_swipe() {
      local rx1="$1"
      local ry1="$2"
      local rx2="$3"
      local ry2="$4"
      local dur="${5:-300}"
      local sx1=$(( DEV_W * rx1 / 100 ))
      local sy1=$(( DEV_H * ry1 / 100 ))
      local sx2=$(( DEV_W * rx2 / 100 ))
      local sy2=$(( DEV_H * ry2 / 100 ))
      adb_cmd shell input swipe "${sx1}" "${sy1}" "${sx2}" "${sy2}" "${dur}" 2>/dev/null || true
    }

    # Battery & connectivity checks
    BATTERY_INFO=$(adb_cmd shell dumpsys battery 2>/dev/null | grep -E "level|status|powered" | tr '\n' ' ' || echo "N/A")
    echo "  Battery Info: ${BATTERY_INFO}"
    if adb_cmd shell ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
      echo "  Connectivity: Verified (Internet ping OK)"
    else
      echo "  Connectivity: Caution (Ping unverified or captive network)"
    fi

    # Emit telemetry JSON
    cat <<EOF > "${DEVICE_INFO_OUT}"
{
  "serial": "${ANDROID_SERIAL}",
  "manufacturer": "${DEVICE_MANUFACTURER}",
  "brand": "${DEVICE_BRAND}",
  "model": "${DEVICE_MODEL}",
  "androidVersion": "${DEVICE_RELEASE}",
  "apiLevel": "${DEVICE_API}",
  "abi": "${DEVICE_ABI}",
  "resolution": "${DEVICE_RESOLUTION}",
  "density": "${DEVICE_DENSITY}",
  "battery": "${BATTERY_INFO}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    mkdir -p "${ROOT_DIR}/public/screenshots"
    cp -f "${DEVICE_INFO_OUT}" "${ROOT_DIR}/public/screenshots/android-emulator-device-info.json" 2>/dev/null || true
    echo "✓ Device telemetry written to: ${DEVICE_INFO_OUT}"

    # Install APK if available
    if [[ -f "${APK_PATH}" ]]; then
      echo "--> Installing APK: ${APK_PATH}"
      adb_cmd install -r "${APK_PATH}" || { echo "❌ adb install failed"; exit 1; }
    fi

    # Clear logcat buffer
    adb_cmd logcat -c 2>/dev/null || true

    echo "--> Launching MainActivity with Target URL: ${TARGET_VIDEO_URL}..."
    adb_cmd shell am start -n "${MAIN_ACTIVITY}" -d "${TARGET_VIDEO_URL}" || true

    echo "--> Waiting for WebView & Caption Interceptor initialization (8s)..."
    sleep 8

    echo "--> Enabling captions in WebView..."
    # Tap relative to screen resolution
    adb_cmd shell input tap "${ADAPTIVE_TAP_X}" "${ADAPTIVE_TAP_Y}" 2>/dev/null || true

    echo "--> Observing native subtitle interception without fixtures..."
    sleep 4

    echo "--> Testing target translation language switch (tlang=${TARGET_LANG})..."
    adb_cmd shell am broadcast -a "com.ytviewer.app.ACTION_SET_TARGET_LANG" --es "targetLang" "${TARGET_LANG}" 2>/dev/null || true

    echo "--> Capturing foreground activity state..."
    adb_cmd shell dumpsys activity "${PACKAGE_NAME}" | grep -E "mResumed|topResumedActivity|ActivityRecord" | head -n 10 || true

    # Start screencast recording in the background on the device
    RECORDING_PID=""
    VIDEO_REMOTE="/sdcard/android-emulator-video.mp4"
    VIDEO_OUT="${ROOT_DIR}/android-emulator-video.mp4"
    echo "--> Starting Android screencast recording via screenrecord..."
    adb_cmd shell rm -f "${VIDEO_REMOTE}" 2>/dev/null || true
    adb_cmd shell screenrecord --time-limit 180 --bit-rate 4000000 "${VIDEO_REMOTE}" >/dev/null 2>&1 &
    RECORDING_PID=$!
    echo "  screenrecord started (runner background PID: ${RECORDING_PID})"

    stop_recording_and_pull() {
      echo "--> Stopping screencast recording and pulling video..."
      if [[ -n "${RECORDING_PID}" ]] && kill -0 "${RECORDING_PID}" 2>/dev/null; then
        # Send SIGINT to adb screenrecord process so it finalizes MP4 container
        adb_cmd shell pkill -2 -f "screenrecord" 2>/dev/null || true
        wait "${RECORDING_PID}" 2>/dev/null || true
        sleep 3
      fi
      adb_cmd pull "${VIDEO_REMOTE}" "${VIDEO_OUT}" 2>/dev/null || true
      if [[ -f "${VIDEO_OUT}" && -s "${VIDEO_OUT}" ]]; then
        echo "✓ Video screencast pulled to: ${VIDEO_OUT}"
        mkdir -p "${ROOT_DIR}/public/screenshots" "${ROOT_DIR}/public/android/screenshots"
        cp -f "${VIDEO_OUT}" "${ROOT_DIR}/public/screenshots/android-emulator-video.mp4" 2>/dev/null || true
        cp -f "${VIDEO_OUT}" "${ROOT_DIR}/public/android/screenshots/android-emulator-video.mp4" 2>/dev/null || true
      else
        echo "ℹ️ No video file retrieved from emulator/device."
      fi
    }
    trap stop_recording_and_pull EXIT INT TERM ERR

    echo "--> Capturing device screenshot..."
    adb_cmd shell screencap -p /sdcard/android_test_screen.png
    adb_cmd pull /sdcard/android_test_screen.png "${SCREENSHOT_OUT}" || true
    echo "✓ Screenshot pulled to: ${SCREENSHOT_OUT}"

    echo "--> Extracting ADB Logcat for interceptor & tlang translation..."
    adb_cmd logcat -d -s "YT_CAPTION_INTERCEPTOR" "TTS_ENGINE" "ActivityTaskManager" | tail -n 60 > "${LOGCAT_OUT}" || true
    echo "✓ Logcat telemetry saved to: ${LOGCAT_OUT}"

    ANDROID_SERIAL="${ANDROID_SERIAL}" LOGCAT_OUT="${LOGCAT_OUT}" bash "${ROOT_DIR}/scripts/android-e2e-assert.sh" || {
      stop_recording_and_pull
      exit 1
    }
    echo "=================================================================="
    echo "✓ Android device/emulator E2E run complete!"
    echo "=================================================================="
    stop_recording_and_pull
    trap - EXIT INT TERM ERR
  else
    echo "❌ No active Android device/emulator detected via adb."
    exit 1
  fi
else
  echo "❌ ADB client not installed in current environment."
  exit 1
fi
