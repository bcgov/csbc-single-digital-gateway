import { test, expect } from '@playwright/test';

test.describe('Platform Overview E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Should display workspace button and menu items', async ({ page }) => {
    const workspaceButton = page.locator('button').getByText('Sample1');
    await expect(workspaceButton).toBeVisible();
    await workspaceButton.click();
    const menuItem1 = page.locator('div').getByRole('menuitem', {
      name: 'Sample1',
    });
    await expect(menuItem1).toBeVisible();
    const menuItem2 = page.locator('div').getByRole('menuitem', {
      name: 'Create workspace',
    });
    await expect(menuItem2).toBeVisible();
  });

  test('Should display navigation links after successful login', async ({ page }) => {
    const navSection = page.locator('nav');
    await expect(navSection.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(navSection.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(navSection.getByRole('link', { name: 'Service Agreements' })).toBeVisible();
    await expect(navSection.getByRole('link', { name: 'Submissions' })).toBeVisible();
    await expect(navSection.getByRole('link', { name: 'Team' })).toBeVisible();
    await expect(navSection.getByRole('link', { name: 'Reports' })).toBeVisible();
  });

  test('Should display header text and buttons', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('button')).toHaveCount(4);
    const headerButtons = headerSection.locator('button');
    await expect(headerButtons).toHaveCount(4);
    await expect(headerSection.locator('h1').getByText('Overview')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('A snapshot of activity across your workspace.'),
    ).toBeVisible();
  });

  test('Should verify collapse button behaviors', async ({ page }) => {
    const headerSection = page.locator('header');
    const headerButtons = headerSection.locator('button');
    const collapseButton = headerButtons.first();
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();
    const workspaceButton = page.locator('button').getByText('Sample1');
    await expect(workspaceButton).not.toBeVisible();
    await collapseButton.click();
    await expect(workspaceButton).toBeVisible();
  });

  test('Should verify search button behaviors', async ({ page }) => {
    const headerSection = page.locator('header');
    const headerButtons = headerSection.locator('button');
    const searchButton = headerButtons.nth(1);
    await expect(searchButton).toBeVisible();
    await searchButton.click();
    await expect(page.getByText('Go to')).toBeVisible();
    const searchGroup = page.getByRole('group');
    await expect(searchGroup.locator('[data-slot="command-item"]')).toHaveCount(8);
    const searchList = [
      'Overview',
      'Services',
      'Service Agreements',
      'Submissions',
      'Team',
      'Reports',
      'Settings',
      'Account',
    ];
    for (const searchItem of searchList) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        searchGroup.locator('[data-slot="command-item"]', {
          hasText: searchItem,
        }),
      ).toBeVisible();
    }
    await searchGroup.locator('[data-slot="command-item"]').first().click();
  });

  test('Should verify notification button behaviors', async ({ page }) => {
    const headerSection = page.locator('header');
    const headerButtons = headerSection.locator('button');
    const notificationButton = headerButtons.nth(2);
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('No notifications')).toBeVisible();
  });

  test('Should verify create new button behaviors', async ({ page }) => {
    const headerSection = page.locator('header');
    const headerButtons = headerSection.locator('button');
    const createNewButton = headerButtons.nth(3);
    await expect(createNewButton).toBeVisible();
    await createNewButton.click();
    const createNewDialog = page.getByRole('dialog');
    await expect(createNewDialog.getByText('Create new')).toBeVisible();
    await expect(
      createNewDialog.getByText('What would you like to add to this workspace?'),
    ).toBeVisible();
    await expect(
      createNewDialog.getByRole('link', { name: 'Service A service-type' }).getByText('Service'),
    ).toHaveCount(2);
    await createNewDialog.getByRole('button', { name: 'Close' }).click();
    await expect(createNewDialog).not.toBeVisible();
  });
});
