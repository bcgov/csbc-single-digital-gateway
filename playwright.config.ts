import { defineConfig, devices } from '@playwright/test';
import { type TestOptions } from './tests/k6/utils/playwright-test.fixture';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<TestOptions>({
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
    testClientDevUrl: 'http://localhost:3000',
    testClientUsername: 'citizen',
    testClientPassword: 'password',
    testPlatformDevUrl: 'http://localhost:3001',
    testPlatformUsername: 'admin',
    testPlatformPassword: 'password',
    testPlatformWaitTime: 60000,
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
        baseURL: process.env.CLIENT_URL || 'http://localhost:3000',
      },
    },
    {
      name: 'Client Portal Project',
      testDir: './tests/playwright/tests/client',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.CLIENT_URL || 'http://localhost:3000',
        storageState: './tests/playwright/tests/setup/files/client.json',
      },
      dependencies: ['client-setup'],
    },
    {
      name: 'platform-setup',
      testMatch: 'platform.setup.ts',
      testDir: './tests/playwright/tests/setup',
      use: {
        baseURL: process.env.PLATFORM_URL || 'http://localhost:3001',
      },
    },
    {
      name: 'Platform Project',
      testDir: './tests/playwright/tests/platform',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.PLATFORM_URL || 'http://localhost:3001',
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
        baseURL: process.env.CLIENT_URL || 'http://localhost:3000',
      },
    },
    {
      name: 'Unauthenticated Platform Tests',
      testDir: './tests/playwright/tests/unauthenticated/platform',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL: process.env.PLATFORM_URL || 'http://localhost:3001',
      },
    },
    {
      name: 'K6 Client Dev Setup',
      testMatch: 'playwright-client-dev.setup.ts',
      testDir: './tests/k6/utils/',
      use: {
        testClientDevUrl: process.env.K6_CLIENT_DEV_URL,
        testClientUsername: process.env.K6_CLIENT_USERNAME,
        testClientPassword: process.env.K6_CLIENT_PASSWORD,
      },
    },
    {
      name: 'K6 Platform Dev Setup',
      testMatch: 'playwright-platform-dev.setup.ts',
      testDir: './tests/k6/utils/',
      use: {
        testPlatformDevUrl: process.env.K6_PLATFORM_DEV_URL,
        testPlatformUsername: process.env.K6_PLATFORM_USERNAME,
        testPlatformPassword: process.env.K6_PLATFORM_PASSWORD,
        testPlatformWaitTime: parseInt(process.env.K6_PLATFORM_WAIT_TIME || '60000'),
      },
    },
  ],
});
