import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/playwright/tests',
  testMatch: '**/*.pw.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  outputDir: './tests/playwright/test-results',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    [
      'html',
      {
        outputFolder: 'tests/playwright/playwright-report', // Change your folder name here
        open: 'never',
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'client-setup',
      testMatch: 'client.setup.ts',
      testDir: './tests/playwright/tests/setup',
      use: {
        baseURL: process.env.clientURL || 'http://localhost:3000',
      },
    },
    {
      name: 'Client Portal Project',
      testDir: './tests/playwright/tests/client',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.clientURL || 'http://localhost:3000',
        storageState: './tests/playwright/tests/setup/files/client.json',
      },
      dependencies: ['client-setup'],
    },
    {
      name: 'platform-setup',
      testMatch: 'platform.setup.ts',
      testDir: './tests/playwright/tests/setup',
      use: {
        baseURL: process.env.platformURL || 'http://localhost:3001',
      },
    },
    {
      name: 'Platform Project',
      testDir: './tests/playwright/tests/platform',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.platformURL || 'http://localhost:3001',
        storageState: './tests/playwright/tests/setup/files/platform.json',
      },
      dependencies: ['platform-setup'],
    },
    {
      name: 'Unauthenticated Client Tests',
      testDir: './tests/playwright/tests/unauthenticated/client',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.clientURL || 'http://localhost:3000',
      },
    },
    {
      name: 'Unauthenticated Platform Tests',
      testDir: './tests/playwright/tests/unauthenticated/platform',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.platformURL || 'http://localhost:3001',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
