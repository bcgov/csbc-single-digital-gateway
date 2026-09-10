import { test, expect } from '@playwright/test';

test.describe('Platform Reports Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const navSection = page.locator('nav');
    await navSection.getByRole('link', { name: 'Reports' }).click();
  });

  test('Should display reports header texts', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Reports')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('Saved reports for this workspace.'),
    ).toBeVisible();
  });

  test('Should display reports main content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(mainSection.getByText('Saved reports for this workspace')).toBeVisible();
    await expect(mainSection.getByText('No saved reports yet')).toBeVisible();
    await expect(mainSection.getByText('Reports you save will appear here.')).toBeVisible();
  });
});
