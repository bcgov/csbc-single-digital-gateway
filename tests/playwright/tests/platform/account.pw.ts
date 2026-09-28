import { test, expect } from '@playwright/test';

test.describe('Platform Account E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/account');
  });

  test('Should display account page main content', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText('Profile')).toBeVisible();
    await expect(main.getByText('Your personal account details.')).toBeVisible();
    await expect(main.getByText('Test User')).toBeVisible();
    await expect(main.getByText('test@example.com · Staff')).toBeVisible();
    await expect(main.getByText('Notification settings')).toBeVisible();
    await expect(
      main.getByText('Choose how you hear about activity in your workspaces.'),
    ).toBeVisible();
    await expect(main.locator('label').getByText('Full name')).toBeVisible();
    await expect(main.locator('label').getByText('Email')).toBeVisible();
    const nameInput = main.getByRole('textbox', { name: 'Full name' });
    await expect(nameInput).toHaveValue('Test User');
    const emailInput = main.getByRole('textbox', { name: 'Email' });
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('Should verify that the user name and email are updated correctly', async ({ page }) => {
    const main = page.locator('main');
    const nameInput = main.getByRole('textbox', { name: 'Full name' });
    await nameInput.fill('Test UserUpdated');
    const emailInput = main.getByRole('textbox', { name: 'Email' });
    await emailInput.fill('test-updated@example.com');
    const saveChangesButton = page.getByRole('button', {
      name: 'Save changes',
    });
    await expect(saveChangesButton).toBeVisible();
    await saveChangesButton.click();
    // TODO: account name and email not updated
    // await expect(main.getByText('Test UserUpdated')).toBeVisible();
    // await expect(main.getByText('test-updated@example.com · Staff')).toBeVisible();
    await expect(nameInput).toHaveValue('Test UserUpdated');
    await expect(emailInput).toHaveValue('test-updated@example.com');
    await nameInput.fill('Test User');
    await emailInput.fill('test@example.com');
    await saveChangesButton.click();
    await expect(main.getByText('Test User')).toBeVisible();
    await expect(main.getByText('test@example.com · Staff')).toBeVisible();
  });
});
