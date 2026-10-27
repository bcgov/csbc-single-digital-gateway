import { expect } from '@playwright/test';
import { test as setup } from './playwright-test.fixture';

setup(
  'authenticate',
  async ({ page, testClientDevUrl, testClientUsername, testClientPassword }) => {
    await page.goto(testClientDevUrl);

    const headerSection = page.locator('header');
    await headerSection.getByRole('link', { name: 'Log in' }).click();

    // Perform login actions
    await page.getByRole('button', { name: 'Test with username and password' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(testClientUsername);
    await page.getByRole('textbox', { name: 'Password' }).fill(testClientPassword);
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for login redirection or dashboard state to verify success
    await page.waitForURL(testClientDevUrl);
    await expect(headerSection.locator('p')).toHaveText('Single Digital Gateway');
    await expect(page.getByText('Hi, CHASE')).toBeVisible();
    await expect(page.getByText('Welcome to MyBC.')).toBeVisible();

    // Save cookies and localStorage to the JSON file
    await page.context().storageState({ path: 'tests/k6/utils/cookies/client-auth-cookies.json' });
  },
);
