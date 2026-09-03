import { test, expect } from '@playwright/test';

test.describe('Workspace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Should display an existing workspace', async ({ page }) => {
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

  test('Should create a new workspace', async ({ page }) => {
    const workspaceButton = page.locator('button').getByText('Sample1');
    await workspaceButton.click();
    const menuItem = page.locator('div').getByRole('menuitem', {
      name: 'Create workspace',
    });
    await menuItem.click();
    await expect(page.locator('label').getByText('Workspace name')).toBeVisible();
    const inputField = page.locator('form').locator('input');
    await expect(inputField).toBeVisible();
    await inputField.fill('Test1');
    const createWorkspaceButton = page.locator('button').getByText('Create workspace');
    await expect(createWorkspaceButton).toBeVisible();
    await createWorkspaceButton.click();
    await workspaceButton.click();
    const testMenuItem = page.locator('div').getByRole('menuitem', {
      name: 'Test1',
    });
    await expect(testMenuItem).toBeVisible();
    await testMenuItem.click();
    const testButton = page.locator('button').getByText('Test1');
    await expect(testButton).toBeVisible();
  });

  test('Should modify the name of an existing workspace', async ({ page }) => {
    let workspaceButton = page.locator('button').getByText('Test1');
    await expect(workspaceButton).toBeVisible();
    await workspaceButton.click();
    const testMenuItem = page.locator('div').getByRole('menuitem', {
      name: 'Test1',
    });
    await expect(testMenuItem).toBeVisible();
    await testMenuItem.click();
    const settingsButton = page.locator('a').getByText('Settings');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    const inputField = page.locator('form').locator('input');
    await expect(inputField).toBeVisible();
    await inputField.fill('Test1-updated');
    const saveChangesButton = page.locator('button').getByText('Save changes');
    await expect(saveChangesButton).toBeVisible();
    await saveChangesButton.click();
    workspaceButton = page.locator('button').getByText('Test1-updated');
    await expect(workspaceButton).toBeVisible();
    await workspaceButton.click();
    await expect(
      page.locator('div').getByRole('menuitem', {
        name: 'Test1-updated',
      }),
    ).toBeVisible();
  });

  test('Should delete an existing workspace', async ({ page }) => {
    const workspaceButton = page.locator('button').getByText('Test1-updated');
    await expect(workspaceButton).toBeVisible();
    const settingsButton = page.locator('a').getByText('Settings');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
    const deleteButton = page.locator('button').getByText('Delete workspace');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.getByText('Delete Test1-updated?')).toBeVisible();
    const confirmDeleteButton = page
      .locator('[data-slot="alert-dialog-footer"]')
      .locator('button')
      .getByText('Delete workspace');
    await expect(confirmDeleteButton).toBeVisible();
    await confirmDeleteButton.click();
    await expect(page.locator('button').getByText('Test1-updated')).not.toHaveCount(1);
    await expect(page.locator('button').getByText('Sample1')).toBeVisible();
  });
});
