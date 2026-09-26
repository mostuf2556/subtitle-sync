import { defineConfig, devices } from '@playwright/test';

const rawBaseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;

const isExternalServer = Boolean(
  process.env.PLAYWRIGHT_BASE_URL &&
  !process.env.PLAYWRIGHT_BASE_URL.includes('localhost') &&
  !process.env.PLAYWRIGHT_BASE_URL.includes('127.0.0.1')
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    video: 'off',
    trace: 'off',
    screenshot: 'on',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  },
  outputDir: 'test-results',
  webServer: isExternalServer
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        timeout: 30000,
      },
  projects: [
    {
      name: 'web',
      testMatch: /.*web\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        video: 'off',
      },
    },
    {
      name: 'emulation',
      testMatch: /.*emulation\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        video: 'off',
      },
    },
    {
      name: 'app',
      testMatch: /.*app\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        video: 'off',
      },
    },
  ],
});
