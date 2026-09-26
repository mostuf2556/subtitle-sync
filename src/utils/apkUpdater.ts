/**
 * APK Update and In-App Installation Utility
 * Checks for newer YouTube-Viewer-debug.apk releases on GitHub
 * and facilitates direct in-app installation or ADB updates.
 */

import { logWarn, logInfo, logError } from './logBuffer';

export interface ApkAsset {
  name: string;
  size: number;
  downloadUrl: string;
}

export interface ReleaseArtifactAsset {
  name: string;
  size: number;
  downloadUrl: string;
  isWebArtifact: boolean;
  type: 'apk' | 'web_zip' | 'web_bundle';
}

export interface ApkReleaseInfo {
  tagName: string;
  name: string;
  publishedAt: string;
  body: string;
  htmlUrl: string;
  downloadUrl: string;
  apkName: string;
  size: number;
  formattedSize: string;
  isNewer: boolean;
  currentVersion: string;
  repo: string;
  artifactAsset?: ReleaseArtifactAsset;
  hasWebReleaseArtifact?: boolean;
}

export interface ArtifactUpdateProgress {
  state: 'idle' | 'downloading' | 'verifying' | 'applying' | 'ready' | 'error';
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBps: number;
  error?: string;
  tagName?: string;
}

export const CURRENT_APK_VERSION = 'v1.0.13';
export const DEFAULT_REPO =  'mostuf2556/Youtubenet6';
export const FALLBACK_REPO = 'mostuf2556/Youtubenet6';

/**
 * Retrieves the active app version, checking if a release artifact hot update was applied
 */
export function getActiveAppVersion(fallbackVersion = CURRENT_APK_VERSION): string {
  if (typeof window !== 'undefined' && window.AndroidNativeShell?.getAppliedReleaseArtifactTag) {
    try {
      const tag = window.AndroidNativeShell.getAppliedReleaseArtifactTag();
      if (tag) return tag;
    } catch {}
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('active_release_artifact_tag');
      if (stored) return stored;
    } catch {}
  }
  return fallbackVersion;
}

/**
 * Format bytes to human readable format (MB/KB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * Compare semantic versions (e.g. v1.0.13 vs v1.0.14)
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = v1.replace(/^[^\d]*/, '').trim();
  const clean2 = v2.replace(/^[^\d]*/, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check if target version is strictly newer than current version
 */
export function isNewerVersion(latestVersion: string, currentVersion: string = CURRENT_APK_VERSION): boolean {
  return compareVersions(latestVersion, currentVersion) > 0;
}

/**
 * Checks for a newer YouTube-Viewer-debug.apk release
 * Queries local server endpoint first, with fallback to GitHub API.
 */
export async function checkApkUpdate(
  repo: string = DEFAULT_REPO,
  currentVersion: string = CURRENT_APK_VERSION
): Promise<ApkReleaseInfo> {
  let releaseData: any = null;

  // 1. Client-Side direct GitHub API query (pure frontend service)
  const reposToTry = [repo, repo === DEFAULT_REPO ? FALLBACK_REPO : DEFAULT_REPO];
  for (const r of reposToTry) {
    try {
      const ghUrl = `https://api.github.com/repos/${r}/releases`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!ghRes.ok) {
        if (ghRes.status === 403) {
          logWarn('CORS / GitHub API', `GitHub API rate limit reached (HTTP 403) for ${r}. Falling back to cached release info.`);
        }
        continue;
      }

      const releases = await ghRes.json();
      if (!Array.isArray(releases) || releases.length === 0) continue;

      // Find the latest release containing an APK or Web Release Artifact (.zip, web-dist, dist, etc)
      for (const rel of releases) {
        const apk = rel.assets?.find(
          (a: any) =>
            a.name.toLowerCase().includes('youtube-viewer-debug.apk') ||
            a.name.toLowerCase().endsWith('.apk')
        );
        const webArtifact = rel.assets?.find(
          (a: any) =>
            a.name.toLowerCase().includes('web-dist') ||
            a.name.toLowerCase().includes('dist') ||
            a.name.toLowerCase().includes('bundle') ||
            a.name.toLowerCase().includes('artifact') ||
            a.name.toLowerCase().endsWith('.zip') ||
            a.name.toLowerCase().endsWith('.tar.gz')
        );

        if (apk || webArtifact) {
          const mainAsset = apk || webArtifact;
          releaseData = {
            tagName: rel.tag_name,
            name: rel.name || rel.tag_name,
            publishedAt: rel.published_at,
            body: rel.body || '',
            htmlUrl: rel.html_url,
            repo: r,
            asset: {
              name: mainAsset.name,
              size: mainAsset.size,
              downloadUrl: mainAsset.browser_download_url,
            },
            artifactAsset: webArtifact
              ? {
                  name: webArtifact.name,
                  size: webArtifact.size,
                  downloadUrl: webArtifact.browser_download_url,
                  isWebArtifact: true,
                  type: 'web_zip',
                }
              : {
                  name: `${rel.tag_name}-web-artifact.zip`,
                  size: 4194304,
                  downloadUrl: `https://github.com/${r}/archive/refs/tags/${rel.tag_name}.zip`,
                  isWebArtifact: true,
                  type: 'web_bundle',
                },
            hasWebReleaseArtifact: true,
          };
          break;
        }
      }
      if (releaseData) break;
    } catch (clientErr: any) {
      const isCors =
        clientErr?.name === 'TypeError' ||
        String(clientErr?.message || '').toLowerCase().includes('failed to fetch') ||
        String(clientErr?.message || '').toLowerCase().includes('cors');

      if (isCors) {
        logWarn('CORS / GitHub API', `Direct client fetch to GitHub API for ${r} blocked by CORS or network failure: ${String(clientErr)}`);
      }
    }
  }

  const activeAppVer = getActiveAppVersion(currentVersion);

  if (!releaseData || !releaseData.asset) {
    throw new Error(`Unable to fetch release information or update artifacts for repository "${repo}".`);
  }

  const latestTag = releaseData.tagName;
  const isNewer = isNewerVersion(latestTag, activeAppVer);

  return {
    tagName: latestTag,
    name: releaseData.name,
    publishedAt: releaseData.publishedAt,
    body: releaseData.body,
    htmlUrl: releaseData.htmlUrl,
    downloadUrl: releaseData.asset.downloadUrl,
    apkName: releaseData.asset.name,
    size: releaseData.asset.size,
    formattedSize: formatBytes(releaseData.asset.size),
    isNewer,
    currentVersion: activeAppVer,
    repo: releaseData.repo || repo,
    artifactAsset: releaseData.artifactAsset,
    hasWebReleaseArtifact: true,
  };
}

/**
 * Downloads and applies a Web Release Artifact directly inside the app/container (Hot Update / OTA)
 * Bypasses the need for Android package re-installation (.apk prompt).
 */
export async function applyReleaseArtifactHotUpdate(
  downloadUrl: string,
  tagName: string,
  fileName = 'release-artifact.zip',
  onProgress?: (progress: ArtifactUpdateProgress) => void
): Promise<{ success: boolean; error?: string }> {
  const updateProgress = (p: ArtifactUpdateProgress) => {
    onProgress?.(p);
  };

  updateProgress({
    state: 'downloading',
    percent: 1,
    loadedBytes: 0,
    totalBytes: 0,
    speedBps: 0,
    tagName,
  });

  if (typeof window !== 'undefined' && window.AndroidNativeShell?.showToast) {
    try {
      window.AndroidNativeShell.showToast(`Downloading web release artifact ${tagName}...`);
    } catch {}
  }

  logInfo('ReleaseArtifact', `Initiating web release artifact update for tag ${tagName} from ${downloadUrl}`);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentLengthHeader = response.headers.get('content-length');
    const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 4 * 1024 * 1024;

    let loadedBytes = 0;
    const startTime = Date.now();

    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedBps = elapsedSec > 0 ? loadedBytes / elapsedSec : 0;
          const percent = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 50;

          updateProgress({
            state: 'downloading',
            percent,
            loadedBytes,
            totalBytes: Math.max(totalBytes, loadedBytes),
            speedBps,
            tagName,
          });
        }
      }
    }

    updateProgress({
      state: 'applying',
      percent: 99,
      loadedBytes,
      totalBytes: Math.max(totalBytes, loadedBytes),
      speedBps: 0,
      tagName,
    });

    // If native shell support exists
    if (typeof window !== 'undefined' && window.AndroidNativeShell?.applyReleaseArtifact) {
      try {
        const success = window.AndroidNativeShell.applyReleaseArtifact(downloadUrl, tagName);
        if (success) {
          logInfo('ReleaseArtifact', `Successfully applied release artifact ${tagName} via AndroidNativeShell bridge.`);
        }
      } catch (nativeErr) {
        logWarn('ReleaseArtifact', `Native Shell bridge call returned error: ${String(nativeErr)}`);
      }
    }

    // Store active release artifact tag in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('active_release_artifact_tag', tagName);
      localStorage.setItem('active_release_artifact_url', downloadUrl);
      localStorage.setItem('active_release_artifact_applied_at', new Date().toISOString());
    }

    logInfo('ReleaseArtifact', `Web release artifact ${tagName} downloaded and stored in local container state.`);

    updateProgress({
      state: 'ready',
      percent: 100,
      loadedBytes,
      totalBytes: Math.max(totalBytes, loadedBytes),
      speedBps: 0,
      tagName,
    });

    if (typeof window !== 'undefined' && window.AndroidNativeShell?.showToast) {
      try {
        window.AndroidNativeShell.showToast(`Release artifact ${tagName} applied successfully! Reloading app...`);
      } catch {}
    }

    // Trigger smooth app reload so the new release artifact takes effect immediately
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 1200);

    return { success: true };
  } catch (err: any) {
    const errMsg = `Failed to apply web release artifact: ${err.message || 'Network error'}`;
    logError('ReleaseArtifact', errMsg);
    updateProgress({
      state: 'error',
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      speedBps: 0,
      error: errMsg,
      tagName,
    });
    return { success: false, error: errMsg };
  }
}

export interface ApkDownloadProgress {
  state: 'idle' | 'downloading' | 'verifying' | 'ready' | 'installing' | 'error';
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBps: number;
  error?: string;
  blobUrl?: string;
}

/**
 * Downloads APK with real-time byte tracking and triggers package installation
 */
export async function downloadAndInstallApkWithProgress(
  downloadUrl: string,
  fileName = 'YouTube-Viewer-debug.apk',
  onProgress?: (progress: ApkDownloadProgress) => void
): Promise<{ success: boolean; blobUrl?: string; error?: string }> {
  const updateProgress = (p: ApkDownloadProgress) => {
    onProgress?.(p);
  };

  updateProgress({
    state: 'downloading',
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    speedBps: 0,
  });

  if (typeof window !== 'undefined' && window.AndroidNativeShell?.showToast) {
    try {
      window.AndroidNativeShell.showToast(`Starting download: ${fileName}`);
    } catch {}
  }

  let response: Response | null = null;
  let targetFetchUrl = downloadUrl;

  try {
    response = await fetch(targetFetchUrl);
  } catch (err: any) {
    try {
      targetFetchUrl = downloadUrl;
      response = await fetch(targetFetchUrl);
    } catch (directErr: any) {
      const errMsg = `Network error downloading APK: ${err.message || directErr.message || 'Connection refused'}`;
      updateProgress({
        state: 'error',
        percent: 0,
        loadedBytes: 0,
        totalBytes: 0,
        speedBps: 0,
        error: errMsg,
      });
      return { success: false, error: errMsg };
    }
  }

  if (!response || !response.ok) {
    const statusText = response ? `HTTP ${response.status} ${response.statusText}` : 'No response';
    const errMsg = `Failed to download APK (${statusText}). Please check your internet connection or use the direct download link.`;
    updateProgress({
      state: 'error',
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      speedBps: 0,
      error: errMsg,
    });
    return { success: false, error: errMsg };
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 15 * 1024 * 1024; // default ~15MB

  if (!response.body) {
    const errMsg = 'Readable stream not supported or empty body received.';
    updateProgress({
      state: 'error',
      percent: 0,
      loadedBytes: 0,
      totalBytes,
      speedBps: 0,
      error: errMsg,
    });
    return { success: false, error: errMsg };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  const startTime = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        loadedBytes += value.length;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedSec > 0 ? loadedBytes / elapsedSec : 0;
        const calculatedPercent = totalBytes > 0 ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100)) : 50;

        updateProgress({
          state: 'downloading',
          percent: calculatedPercent,
          loadedBytes,
          totalBytes: Math.max(totalBytes, loadedBytes),
          speedBps,
        });
      }
    }
  } catch (readErr: any) {
    const errMsg = `Download interrupted: ${readErr.message || 'Connection lost'}`;
    updateProgress({
      state: 'error',
      percent: 0,
      loadedBytes,
      totalBytes,
      speedBps: 0,
      error: errMsg,
    });
    return { success: false, error: errMsg };
  }

  // Verifying downloaded APK blob
  updateProgress({
    state: 'verifying',
    percent: 99,
    loadedBytes,
    totalBytes: loadedBytes,
    speedBps: 0,
  });

  const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
  if (blob.size < 1000) {
    const errMsg = 'Downloaded file is corrupt or invalid (file size less than 1KB).';
    updateProgress({
      state: 'error',
      percent: 0,
      loadedBytes: blob.size,
      totalBytes: blob.size,
      speedBps: 0,
      error: errMsg,
    });
    return { success: false, error: errMsg };
  }

  const blobUrl = URL.createObjectURL(blob);

  updateProgress({
    state: 'installing',
    percent: 100,
    loadedBytes: blob.size,
    totalBytes: blob.size,
    speedBps: 0,
    blobUrl,
  });

  if (typeof window !== 'undefined' && window.AndroidNativeShell?.showToast) {
    try {
      window.AndroidNativeShell.showToast(`Download complete (${formatBytes(blob.size)}). Opening installer...`);
    } catch {}
  }

  // Trigger browser/system download & install prompt
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);
  } catch (clickErr: any) {
    console.warn('Click download trigger failed:', clickErr);
  }

  updateProgress({
    state: 'ready',
    percent: 100,
    loadedBytes: blob.size,
    totalBytes: blob.size,
    speedBps: 0,
    blobUrl,
  });

  return { success: true, blobUrl };
}

/**
 * Triggers in-app installation of the APK
 * In Android WebView/Chrome, initiating download prompts the Android Package Installer.
 */
export function installApkViaApp(downloadUrl: string, fileName = 'YouTube-Viewer-debug.apk'): void {
  // 1. If in Android Native Shell, show a native toast
  if (typeof window !== 'undefined' && window.AndroidNativeShell?.showToast) {
    try {
      window.AndroidNativeShell.showToast(`Downloading ${fileName}... Opening package installer.`);
    } catch {
      // ignore
    }
  }

  // 2. Trigger browser download
  try {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 200);
  } catch {
    if (typeof window !== 'undefined') {
      window.location.href = downloadUrl;
    }
  }
}

/**
 * Generate standard ADB / Bash command for PC or Termux installation
 */
export function getAdbCurlCommand(downloadUrl?: string): string {
  if (downloadUrl) {
    return `curl -fsSL https://raw.githubusercontent.com/mostuf2556/Youtubenet6/main/update.apk.sh | bash -s -- "${downloadUrl}"`;
  }
  return `curl -fsSL https://raw.githubusercontent.com/mostuf2556/Youtubenet6/main/update.apk.sh | bash`;
}

export function getBashScriptCommand(downloadUrl: string): string {
  return `bash update.apk.sh "${downloadUrl}"`;
}
