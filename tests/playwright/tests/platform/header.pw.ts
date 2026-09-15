import { test, expect } from '@playwright/test';

test.describe('Platform Header E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
  });

  test('Should display the operations portal', async ({ page }) => {
    const header = page.locator('header');
    const operationsPortal = header.getByRole('link', { name: 'Operations Portal' });
    await expect(operationsPortal).toBeVisible();
    await operationsPortal.click();
    // Expect URL to be redirected to the dashboard
    await expect(page).toHaveURL('/app');
    await expect(page.getByRole('heading', { name: 'Hello, Test' })).toBeVisible();
  });

  test('Should display the workspace selection dropdown', async ({ page }) => {
    const header = page.locator('header');
    const workspaceDropDown = header.getByRole('button', { name: 'Sample1' });
    await expect(workspaceDropDown).toBeVisible();
    await workspaceDropDown.click();
    const workspaceContent = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(workspaceContent.getByText('Switch workspace')).toBeVisible();
    await expect(workspaceContent.getByRole('menuitem', { name: 'Sample1' })).toBeVisible();
    await expect(
      workspaceContent.getByRole('menuitem', { name: 'Create Workspace' }),
    ).toBeVisible();
  });

  test('Should create workspace from the workspace selection dropdown', async ({ page }) => {
    const header = page.locator('header');
    const workspaceDropDown = header.getByRole('button', { name: 'Sample1' });
    await expect(workspaceDropDown).toBeVisible();
    await workspaceDropDown.click();
    await page.getByRole('menuitem', { name: 'Create Workspace' }).click();
    await page.getByRole('textbox', { name: 'Workspace name' }).fill('Test workspace');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    // Expect test workspace on the dropdown
    await expect(header.getByRole('button', { name: 'Test workspace' })).toBeVisible();
    // Delete test workspace
    await header.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    // Expect new workspace to be deleted
    await page.goto('app');
    await expect(page.getByRole('link', { name: 'Test workspace Admin' })).not.toBeVisible();
  });

  test('Should display correct texts and buttons for create new workspace modal from the header dropdown', async ({
    page,
  }) => {
    const header = page.locator('header');
    await expect(header.getByRole('button', { name: 'Sample1' })).toBeVisible();
    await header.getByRole('button', { name: 'Sample1' }).click();
    await page.getByRole('menuitem', { name: 'Create Workspace' }).click();
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
    await expect(createNewWorkspaceModal).toBeHidden();
  });

  test('Should create new workspace from the header dropdown', async ({ page }) => {
    const header = page.locator('header');
    await header.getByRole('button', { name: 'Sample1' }).click();
    await page.getByRole('menuitem', { name: 'Create Workspace' }).click();
    const createNewWorkspaceModal = page.locator('[data-slot="dialog-content"]');
    const workspaceInput = createNewWorkspaceModal.getByRole('textbox', { name: 'Workspace name' });
    await workspaceInput.fill('Test workspace');
    const createButton = createNewWorkspaceModal.getByRole('button', { name: 'Create workspace' });
    await createButton.click();
    // Expect URL to be redirected upon creation
    await expect(createNewWorkspaceModal).toBeHidden();
    await page.waitForURL(/\/app\/[a-zA-Z0-9]{8}/);
    // Expect Test workspace to be displayed on dashboard
    await page.goto('/app');
    await expect(page.getByRole('link', { name: 'Test workspace Admin' })).toBeVisible();
  });

  test('Should delete the new workspace from the header dropdown', async ({ page }) => {
    const header = page.locator('header');
    await header.getByRole('button', { name: 'Sample1' }).click();
    await page.getByRole('menuitem', { name: 'Test workspace' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    await page.getByRole('button', { name: 'Delete workspace' }).click();
    // Expect new workspace to be deleted
    await page.goto('app');
    await expect(page.getByRole('link', { name: 'Test workspace Admin' })).not.toBeVisible();
  });

  test('Should display navigation menu items', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Service Requests' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Shared Resources' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('Should display search input, notification icon and account menu', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.locator('[aria-label="Search"]')).toBeVisible();
    await expect(header.locator('[aria-label="Notifications"]')).toBeVisible();
    await expect(header.locator('[aria-label="Open account menu"]')).toBeVisible();
  });

  test('Should display menu items for search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    // Expect items in the search modal
    const searchModal = page.locator('[data-slot="dialog-content"]');
    await expect(searchModal.locator('[data-slot="command-input"]')).toBeVisible();
    await expect(searchModal.getByText('Go to')).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Overview' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Services' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Service Requests' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Shared Resources' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Service Agreements' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Team' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Settings' })).toBeVisible();
    await expect(searchModal.getByRole('option', { name: 'Account' })).toBeVisible();
  });

  test('Should redirect to overview page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Overview' })
      .click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });

  test('Should redirect to services page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Services' })
      .click();
    await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible();
  });

  test('Should redirect to service requests page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Service Requests' })
      .click();
    await expect(page.getByRole('heading', { name: 'Service Requests' })).toBeVisible();
  });

  test('Should redirect to shared resources page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Shared Resources' })
      .click();
    await expect(page.getByRole('heading', { name: 'Shared Resources' })).toBeVisible();
  });

  test('Should redirect to service agreements page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Service Agreements' })
      .click();
    await expect(page.getByRole('button', { name: 'New agreement' })).toBeVisible();
  });

  test('Should redirect to team page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Team' })
      .click();
    await expect(page.getByRole('button', { name: 'Add member' })).toBeVisible();
  });

  test('Should redirect to settings page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Settings' })
      .click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('Should redirect to account page from the search modal', async ({ page }) => {
    await page.locator('header').locator('[aria-label="Search"]').click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole('option', { name: 'Account' })
      .click();
    await expect(page.getByText('Profile')).toBeVisible();
  });

  test('Should display correct notifications content', async ({ page }) => {
    await page.locator('[aria-label="Notifications"]').click();
    const notificationsPanel = page.locator('[data-slot="popover-content"]');
    await expect(notificationsPanel.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(notificationsPanel.getByText('No notifications')).toBeVisible();
    await expect(
      notificationsPanel.getByText('Updates about your applications will appear here.'),
    ).toBeVisible();
    const settingsButton = notificationsPanel.locator('[aria-label="Notification settings"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    await expect(page.getByText('Profile')).toBeVisible();
  });
});
