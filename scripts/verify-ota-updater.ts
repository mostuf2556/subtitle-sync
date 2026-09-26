import {
  getActiveAppVersion,
  isNewerVersion,
  checkApkUpdate,
  applyReleaseArtifactHotUpdate,
  CURRENT_APK_VERSION,
  DEFAULT_REPO,
  ArtifactUpdateProgress,
} from '../src/utils/apkUpdater';

async function runOtaUpdaterVerification() {
  console.log('====================================================');
  console.log('🧪 Starting OTA Release Artifact Updater Test Suite');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Active App Version Resolution
  console.log('\n--- Test 1: Active Version Resolution ---');
  const initialVersion = getActiveAppVersion('v1.0.13');
  assert(typeof initialVersion === 'string' && initialVersion.length > 0, `Initial active version resolved: "${initialVersion}"`);

  // Mock localStorage
  const mockStorage: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  };

  mockStorage['active_release_artifact_tag'] = 'v1.0.50';
  const updatedVersion = getActiveAppVersion('v1.0.13');
  assert(updatedVersion === 'v1.0.50', `Active version resolves from localStorage: "${updatedVersion}"`);

  // Mock AndroidNativeShell bridge
  (globalThis as any).window = {
    localStorage: (globalThis as any).localStorage,
    location: { reload: () => {} },
    AndroidNativeShell: {
      getAppliedReleaseArtifactTag: () => 'v1.0.99',
      applyReleaseArtifact: (url: string, tag: string) => true,
      showToast: (msg: string) => {},
    },
  };

  const bridgeVersion = getActiveAppVersion('v1.0.13');
  assert(bridgeVersion === 'v1.0.99', `Active version prioritizes AndroidNativeShell bridge tag: "${bridgeVersion}"`);

  // TEST 2: Version Comparison Logic (isNewerVersion)
  console.log('\n--- Test 2: Version Comparison (isNewerVersion) ---');
  assert(isNewerVersion('v1.0.18', 'v1.0.13') === true, 'v1.0.18 is newer than v1.0.13');
  assert(isNewerVersion('v1.0.13', 'v1.0.13') === false, 'v1.0.13 is NOT newer than v1.0.13');
  assert(isNewerVersion('v1.0.12', 'v1.0.13') === false, 'v1.0.12 is NOT newer than v1.0.13');
  assert(isNewerVersion('v2.0.0', 'v1.9.9') === true, 'v2.0.0 is newer than v1.9.9');

  // TEST 3: Check Release Update Metadata
  console.log('\n--- Test 3: GitHub Release Artifact Metadata Check ---');
  // Mock GitHub API releases response
  const mockGitHubReleases = [
    {
      tag_name: 'v1.0.25',
      name: 'YouTube Viewer v1.0.25',
      published_at: new Date().toISOString(),
      body: 'Latest OTA release artifact update',
      html_url: 'https://github.com/mostuf2556/youtubenet6/releases/tag/v1.0.25',
      assets: [
        {
          name: 'web-dist.zip',
          size: 5242880,
          browser_download_url: 'https://github.com/mostuf2556/youtubenet6/releases/download/v1.0.25/web-dist.zip',
        },
        {
          name: 'YouTube-Viewer-debug.apk',
          size: 15728640,
          browser_download_url: 'https://github.com/mostuf2556/youtubenet6/releases/download/v1.0.25/YouTube-Viewer-debug.apk',
        },
      ],
    },
  ];

  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('api.github.com/repos')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockGitHubReleases,
      };
    }
    return {
      ok: false,
      status: 404,
    };
  };

  delete (globalThis as any).window.AndroidNativeShell;
  delete mockStorage['active_release_artifact_tag'];

  try {
    const releaseInfo = await checkApkUpdate(DEFAULT_REPO, 'v1.0.0');
    assert(!!releaseInfo, 'Release info object returned from checkApkUpdate');
    assert(releaseInfo.tagName === 'v1.0.25', `Release tag dynamically resolved from GitHub API: "${releaseInfo.tagName}"`);
    assert(releaseInfo.isNewer === true, 'isNewer flag calculated dynamically against current version');
    assert(releaseInfo.hasWebReleaseArtifact === true, 'hasWebReleaseArtifact flag is true');
    assert(!!releaseInfo.artifactAsset, 'artifactAsset object present in release info');
    assert(releaseInfo.artifactAsset?.isWebArtifact === true, 'artifactAsset marked as isWebArtifact');
    assert(typeof releaseInfo.artifactAsset?.downloadUrl === 'string', `Web artifact download URL: ${releaseInfo.artifactAsset?.downloadUrl}`);
  } catch (err) {
    console.error('Error during checkApkUpdate test:', err);
    assert(false, 'checkApkUpdate executed without throwing');
  }

  // TEST 4: Hot Update Application Flow (applyReleaseArtifactHotUpdate)
  console.log('\n--- Test 4: Hot Update Download & Apply Pipeline ---');
  const progressEvents: ArtifactUpdateProgress[] = [];

  // Mock global fetch for zip artifact download
  const sampleZipContent = new Uint8Array([80, 75, 3, 4, 20, 0, 0, 0]); // ZIP magic header PK..
  (globalThis as any).fetch = async (url: string) => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (headerName: string) => (headerName.toLowerCase() === 'content-length' ? '8' : null),
      },
      body: {
        getReader: () => {
          let readCount = 0;
          return {
            read: async () => {
              if (readCount === 0) {
                readCount++;
                return { done: false, value: sampleZipContent };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    };
  };

  const testTag = 'v1.0.20-test';
  const updateResult = await applyReleaseArtifactHotUpdate(
    'https://example.com/test-web-dist.zip',
    testTag,
    'test-web-dist.zip',
    (p) => progressEvents.push(p)
  );

  assert(updateResult.success === true, 'applyReleaseArtifactHotUpdate returned success: true');
  assert(progressEvents.some((p) => p.state === 'downloading'), 'Progress emitted "downloading" state');
  assert(progressEvents.some((p) => p.state === 'applying'), 'Progress emitted "applying" state');
  assert(progressEvents.some((p) => p.state === 'ready'), 'Progress emitted "ready" state');
  assert(
    mockStorage['active_release_artifact_tag'] === testTag,
    `localStorage updated with target tag: "${mockStorage['active_release_artifact_tag']}"`
  );

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOtaUpdaterVerification().catch((err) => {
  console.error('Fatal error running OTA verification:', err);
  process.exit(1);
});
