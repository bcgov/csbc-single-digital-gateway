import { test, expect } from '../../setup/db.fixture';
import {
  removeElements,
  selectForm,
  createTestService,
  createBasicForm,
  expectPreview,
  addAdvancedElement,
  deleteTestService,
} from '../../setup/platform.services.utils';

test.describe('Platform Services Basic Form Advanced Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test.describe('Initialize test cases for advanced elements', () => {
    test('Should create a new service successfully', async ({ page }) => {
      await createTestService(page);
    });

    test('Should create a basic form on a newly created service successfully', async ({ page }) => {
      await createBasicForm(page);
    });

    test('Should add and display advanced elements for a basic form', async ({ page }) => {
      const mainSection = await selectForm(page, 'Test title');
      // Address element
      await addAdvancedElement(page, 'Address', 1);
      // Rich text element
      await addAdvancedElement(page, 'Rich text', 2);
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Expect preview
      await expectPreview(page, ['Address', 'Rich text'], true);
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Address Element E2E Tests', () => {
    test('Should add and display a address element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addAdvancedElement(page, 'Address', 1);
      // Configuration for required field
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('switch', { name: 'Required' }).click();
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByText('Address line 1 *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('City *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('Postal code *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('This field is required').first()).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(1)).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(2)).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test("Should add and display a address element when it is configured to be required and it's country is not Canada", async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addAdvancedElement(page, 'Address', 1);
      // Configuration for required field
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('switch', { name: 'Required' }).click();
      await settingsContainer.getByRole('combobox', { name: 'Default country' }).fill('');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByText('Address line 1 *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('City *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('Country *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('State / Province *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('Postal code *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(0)).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(1)).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(2)).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(3)).toBeVisible();
      await expect(mainSection.getByText('This field is required').nth(4)).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();

      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Rich text Element E2E Tests', () => {
    test('Should add and display a rich text element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addAdvancedElement(page, 'Rich text', 1);
      // Configuration for required field
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('switch', { name: 'Required' }).click();
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByText('Test rich text input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
