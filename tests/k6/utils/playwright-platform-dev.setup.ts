import { expect } from '@playwright/test';
import { test as setup } from './playwright-test.fixture';

setup(
  'authenticate',
  async ({
    page,
    testPlatformDevUrl,
    testPlatformUsername,
    testPlatformPassword,
    testPlatformWaitTime,
  }) => {
    // Increase this specific test's timeout to accommodate the wait time (e.g., 90 seconds)
    setup.setTimeout(testPlatformWaitTime + 30000);
    await page.goto(testPlatformDevUrl);

    await expect(page.getByText('To continue, log in:')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in with IDIR' })).toBeVisible();
    await page.getByRole('link', { name: 'Log in with IDIR' }).click();

    // Perform login actions
    await expect(page.getByRole('textbox')).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(testPlatformUsername);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(testPlatformPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Force Playwright to pause for the wait time for platform user to enter the verification code and Yes/No prompts
    await page.waitForTimeout(testPlatformWaitTime);

    // Wait for login redirection or dashboard state to verify success
    await page.waitForURL(`${testPlatformDevUrl}app`);
    await expect(page.getByText('Select a workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Workspace' })).toBeVisible();

    // Save cookies and localStorage to the JSON file
    await page
      .context()
      .storageState({ path: 'tests/k6/utils/cookies/platform-auth-cookies.json' });
  },
);
