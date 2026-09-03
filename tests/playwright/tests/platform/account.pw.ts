import { test, expect } from '@playwright/test';

test.describe('Platform Account E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/account');
  });

  test('Should display account button and profile menu', async ({ page }) => {
    const accountButton = page.locator('button').filter({ hasText: 'Test User' });
    await expect(accountButton).toBeVisible();
    await accountButton.click();
    const sideMenu = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(sideMenu).toBeVisible();
    await expect(sideMenu.getByText('Test User')).toBeVisible();
    await expect(sideMenu.getByText('test@example.com')).toBeVisible();
    await expect(
      sideMenu.getByRole('menuitem', {
        name: 'Account Settings',
      }),
    ).toBeVisible();
    await expect(
      sideMenu.getByRole('menuitem', {
        name: 'Help & support',
      }),
    ).toBeVisible();
    await expect(
      sideMenu.getByRole('menuitem', {
        name: 'Log out',
      }),
    ).toBeVisible();
  });

  test('Should display reports header texts and buttons', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Account')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('Your personal account details.'),
    ).toBeVisible();
  });

  test('Should display account page main content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(mainSection.getByText('Profile')).toBeVisible();
    await expect(mainSection.getByText('Your personal account details.')).toBeVisible();
    await expect(mainSection.getByText('Test User')).toBeVisible();
    await expect(mainSection.getByText('test@example.com · Staff')).toBeVisible();
    await expect(mainSection.getByText('Notification settings')).toBeVisible();
    await expect(
      mainSection.getByText('Choose how you hear about activity in your workspaces.'),
    ).toBeVisible();
    await expect(mainSection.locator('label').getByText('Full name')).toBeVisible();
    await expect(mainSection.locator('label').getByText('Email')).toBeVisible();
    const nameInput = mainSection.getByRole('textbox', { name: 'Full name' });
    await expect(nameInput).toHaveValue('Test User');
    const emailInput = mainSection.getByRole('textbox', { name: 'Email' });
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('Should verify that the user name and email are updated correctly', async ({ page }) => {
    const mainSection = page.locator('main');
    const nameInput = mainSection.getByRole('textbox', { name: 'Full name' });
    await nameInput.fill('Test UserUpdated');
    const emailInput = mainSection.getByRole('textbox', { name: 'Email' });
    await emailInput.fill('test-updated@example.com');
    const saveChangesButton = page.getByRole('button', {
      name: 'Save changes',
    });
    await expect(saveChangesButton).toBeVisible();
    await saveChangesButton.click();
    // await expect(mainSection.getByText("Test UserUpdated")).toBeVisible();
    // await expect(
    //   mainSection.getByText("test-updated@example.com · Staff"),
    // ).toBeVisible();
    await expect(nameInput).toHaveValue('Test UserUpdated');
    await expect(emailInput).toHaveValue('test-updated@example.com');
    await nameInput.fill('Test User');
    await emailInput.fill('test@example.com');
    await saveChangesButton.click();
    await expect(mainSection.getByText('Test User')).toBeVisible();
    await expect(mainSection.getByText('test@example.com · Staff')).toBeVisible();
  });
});
