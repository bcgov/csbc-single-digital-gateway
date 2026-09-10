import { test, expect } from '@playwright/test';

test.describe('Platform Dashboard E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('Should display correct texts and buttons for the header component', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Operations Portal' })).toBeVisible();
    await expect(header.locator('[aria-label="Notifications"]')).toBeVisible();
    // Settings button
    const settingsButton = header.locator('[aria-label="Open account menu"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    // Settings menu
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

  test('Should display correct header texts and buttons for the main workspace selection', async ({
    page,
  }) => {
    const main = page.locator('main');
    await expect(main.getByText('Hello, Test')).toBeVisible();
    await expect(main.getByText('Select a workspace')).toBeVisible();
    await expect(main.getByRole('button', { name: 'New Workspace' })).toBeVisible();
    await expect(main.getByRole('link', { name: 'Sample1 Admin' })).toBeVisible();
  });

  test('Should display correct texts and buttons for create new workspace modal', async ({
    page,
  }) => {
    const createNewWorkspaceButton = page.getByRole('button', { name: 'New Workspace' });
    await createNewWorkspaceButton.click();
    // Create new workspace modal
    const createNewWorkspaceModal = page.locator('[data-slot="dialog-content"]');
    await expect(createNewWorkspaceModal).toBeVisible();
    await expect(
      createNewWorkspaceModal.getByRole('heading', { name: 'Create workspace' }),
    ).toBeVisible();
    await expect(
      createNewWorkspaceModal.getByText('Add a new workspace to organise your services.'),
    ).toBeVisible();
    await expect(createNewWorkspaceModal.getByLabel('Workspace name')).toBeVisible();
    const workspaceInput = createNewWorkspaceModal.getByRole('textbox', { name: 'Workspace name' });
    await expect(workspaceInput).toBeVisible();
    await expect(workspaceInput).toHaveAttribute('placeholder', 'e.g. City of Riverton');
    await expect(
      createNewWorkspaceModal.getByRole('button', { name: 'Create workspace' }),
    ).toBeVisible();
    const cancelButton = createNewWorkspaceModal.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    await expect(createNewWorkspaceModal).not.toBeVisible();
  });

  test('Should create new workspace', async ({ page }) => {
    const createNewWorkspaceButton = page.getByRole('button', { name: 'New Workspace' });
    await createNewWorkspaceButton.click();
    const createNewWorkspaceModal = page.locator('[data-slot="dialog-content"]');
    const workspaceInput = createNewWorkspaceModal.getByRole('textbox', { name: 'Workspace name' });
    await workspaceInput.fill('Test workspace');
    const createButton = createNewWorkspaceModal.getByRole('button', { name: 'Create workspace' });
    await createButton.click();
    // Expect URL to be redirected upon creation
    await expect(createNewWorkspaceModal).not.toBeVisible();
    await page.waitForURL(/\/app\/[a-zA-Z0-9]{8}/);
    // Expect Test workspace to be displayed on dashboard
    await page.goto('/app');
    await expect(page.getByRole('link', { name: 'Test workspace Admin' })).toBeVisible();
  });

  test('Should delete the new workspace', async ({ page }) => {
    const newWorkspace = page.getByRole('link', { name: 'Test workspace Admin' });
    await newWorkspace.click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    // Expect new workspace to be deleted
    await page.goto('app');
    await expect(page.getByRole('link', { name: 'Test workspace Admin' })).not.toBeVisible();
  });
});
