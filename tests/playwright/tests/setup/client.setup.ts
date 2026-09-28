import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/');

  const headerSection = page.locator('header');
  await headerSection.getByRole('link', { name: 'Log in' }).click();

  // Perform login actions
  await page.getByRole('textbox', { name: 'Username' }).fill('citizen1');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for login redirection or dashboard state to verify success
  await page.waitForURL('/');
  await expect(headerSection.locator('p')).toHaveText('Single Digital Gateway');
  await expect(page.getByText('Hi, citizen1@example.com')).toBeVisible();
  await expect(page.getByText('Welcome to MyBC.')).toBeVisible();

  // Save cookies and localStorage to the JSON file
  await page.context().storageState({ path: 'tests/playwright/tests/setup/files/client.json' });
});
