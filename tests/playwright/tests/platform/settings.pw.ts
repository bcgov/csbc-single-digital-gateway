import { test, expect } from '../setup/db.fixture';
import { addServiceAgreement, removeServiceAgreements } from '../setup/platform.services.utils';

test.describe('Platform Settings E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();
  });

  test('Should display settings header texts', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Settings')).toBeVisible();
    await expect(headerSection.locator('p').getByText('Workspace configuration.')).toBeVisible();
  });

  test('Should display general content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(mainSection.getByText('General')).toBeVisible();
    await expect(mainSection.getByText('Basic workspace information.')).toBeVisible();
    await expect(mainSection.getByLabel('Workspace name')).toBeVisible();
    const workspaceInput = mainSection.getByRole('textbox', {
      name: 'Workspace name',
    });
    await expect(workspaceInput).toHaveValue('Sample1');
    const cancelButton = mainSection.getByRole('button', { name: 'Cancel' });
    const saveButton = mainSection.getByRole('button', {
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
    const mainSection = page.locator('main');
    await expect(mainSection.getByText('Default agreements', { exact: true })).toBeVisible();
    await expect(
      mainSection.getByText(
        "Applied to every service in this workspace, in addition to a service's own agreements.",
      ),
    ).toBeVisible();
    await expect(mainSection.getByText('No default agreements for this workspace.')).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Add default' })).toBeVisible();
  });

  test('Should add default agreement in settings', async ({ page, db }) => {
    // Add a service agreement
    const mainSection = await addServiceAgreement(page, db);
    await page.goto('/');
    await page.getByRole('link', { name: 'Settings' }).click();
    const addDefaultButton = mainSection.getByRole('button', {
      name: 'Add default',
    });
    await addDefaultButton.click();
    await expect(page.getByText('Add a default agreement')).toBeVisible();
    await expect(
      page.getByText('Choose a published agreement to apply workspace-wide.'),
    ).toBeVisible();
    const serviceAgreementButton = page.getByRole('button', {
      name: 'Test service agreement',
    });
    await expect(serviceAgreementButton).toBeVisible();
    await serviceAgreementButton.click();
    // Expect service agreement attached
    await expect(
      mainSection.getByText('No default agreements for this workspace.'),
    ).not.toBeVisible();
    await expect(mainSection.getByText('Test service agreement')).toBeVisible();
    await expect(mainSection.getByText('Required')).toBeVisible();
    const removeButton = mainSection.getByRole('button', { name: 'Remove' });
    await expect(removeButton).toBeVisible();
    // Revert the change
    await removeButton.click();
  });

  test('Should display danger zone content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(mainSection.getByText('Danger zone', { exact: true })).toBeVisible();
    await expect(mainSection.getByText('Irreversible actions for this workspace.')).toBeVisible();
    await expect(
      mainSection.getByText('Deleting a workspace removes all of its data and members.'),
    ).toBeVisible();
    const deleteButton = mainSection.getByRole('button', {
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
