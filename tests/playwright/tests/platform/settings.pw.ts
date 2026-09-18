import { test, expect } from '../setup/db.fixture';
import { addServiceAgreement, removeServiceAgreements } from '../setup/platform.services.utils';

test.describe('Platform Settings E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
  });

  test('Should display settings title text', async ({ page }) => {
    await expect(page.locator('h1').getByText('Settings')).toBeVisible();
    await expect(page.getByText('Workspace configuration.')).toBeVisible();
  });

  test('Should display correct tab content', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'General' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team' })).toBeVisible();
  });

  test('Should display correct general content', async ({ page }) => {
    await expect(page.locator('[data-slot="card-title"]').getByText('General')).toBeVisible();
    await expect(page.getByText('Basic workspace information.')).toBeVisible();
    await expect(page.getByLabel('Workspace name')).toBeVisible();
    const workspaceInput = page.getByRole('textbox', {
      name: 'Workspace name',
    });
    await expect(workspaceInput).toHaveValue('Sample1');
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    const saveButton = page.getByRole('button', {
      name: 'Save Changes',
    });
    await expect(cancelButton).toBeDisabled();
    await expect(saveButton).toBeDisabled();
    await workspaceInput.fill('Test Sample 2');
    await expect(cancelButton).not.toBeDisabled();
    await expect(saveButton).not.toBeDisabled();
    await saveButton.click();
    // Expect workspace name changed
    await expect(page.locator('button').getByText('Test Sample 2')).toBeVisible();
    // Revert the change
    await workspaceInput.fill('Sample1');
    await saveButton.click();
  });

  test('Should display default agreement content', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText('Default agreements', { exact: true })).toBeVisible();
    await expect(
      main.getByText(
        "Applied to every service in this workspace, in addition to a service's own agreements.",
      ),
    ).toBeVisible();
    await expect(main.getByText('No default agreements for this workspace.')).toBeVisible();
    const addDefaultButton = main.getByRole('button', {
      name: 'Add default',
    });
    await expect(addDefaultButton).toBeVisible();
    await addDefaultButton.click();
    await expect(page.getByText('Add a default agreement')).toBeVisible();
    await expect(
      page.getByText('Choose a published agreement to apply workspace-wide.'),
    ).toBeVisible();
    await expect(page.getByText('No published agreements available to add.')).toBeVisible();
  });

  test('Should add default agreement in settings', async ({ page, db }) => {
    // Add a service agreement
    await addServiceAgreement(page, db);
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    const addDefaultButton = page.getByRole('button', {
      name: 'Add default',
    });
    await addDefaultButton.click();
    await expect(page.getByText('Add a default agreement')).toBeVisible();
    await expect(
      page.getByText('Choose a published agreement to apply workspace-wide.'),
    ).toBeVisible();
    const serviceAgreementButton = page.getByRole('button', {
      name: 'Test service agreement title',
    });
    await expect(serviceAgreementButton).toBeVisible();
    await serviceAgreementButton.click();
    // Expect service agreement attached
    await expect(page.getByText('Test service agreement title')).toBeVisible();
    await expect(page.getByText('Optional')).toBeVisible();
    // Remove the default agreement
    const removeButton = page.getByRole('button', { name: 'Remove' });
    await expect(removeButton).toBeVisible();
    await removeButton.click();
  });

  test('Should display correct danger zone content', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText('Danger zone', { exact: true })).toBeVisible();
    await expect(main.getByText('Irreversible actions for this workspace.')).toBeVisible();
    await expect(
      main.getByText('Deleting a workspace removes all of its data and members.'),
    ).toBeVisible();
    const deleteButton = main.getByRole('button', {
      name: 'Delete workspace',
    });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.getByText('Delete Sample1?')).toBeVisible();
    await expect(
      page.getByText(
        'This permanently deletes the workspace and removes every member. This cannot be undone.',
      ),
    ).toBeVisible();
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete workspace' })).toBeVisible();
    await cancelButton.click();
  });

  test('Delete remaining service agreements', async ({ db }) => {
    await removeServiceAgreements(db);
  });
});
