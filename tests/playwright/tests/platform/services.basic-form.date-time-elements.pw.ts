import { test, expect } from '../setup/db.fixture';
import {
  removeElements,
  selectForm,
  createTestService,
  createBasicForm,
  addDateTimeElement,
  expectPreview,
  deleteTestService,
} from '../setup/platform.services.utils';

test.describe('Platform Services Basic Form Date & Time Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test.describe('Initialize test cases for date & time elements', () => {
    test('Should create a new service successfully', async ({ page }) => {
      await createTestService(page);
    });

    test('Should create a basic form on a newly created service successfully', async ({ page }) => {
      await createBasicForm(page);
    });

    test('Should add and display date and time elements for a basic form', async ({ page }) => {
      const mainSection = await selectForm(page, 'Test title');
      // Date element
      await addDateTimeElement(page, 'Date', 1);
      // Date range element
      await addDateTimeElement(page, 'Date range', 2);
      // Date & Time element
      await addDateTimeElement(page, 'Date & time', 3);
      // Time element
      await addDateTimeElement(page, 'Time', 4);
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Expect preview
      await expectPreview(page, ['Date', 'Date range', 'Date & time', 'Time'], true);
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Date Element E2E Tests', () => {
    test('Should add and display a date element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addDateTimeElement(page, 'Date', 1);
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
      await expect(mainSection.getByText('Test date input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Date Range Element E2E Tests', () => {
    test('Should add and display a date range element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addDateTimeElement(page, 'Date range', 1);
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
      await expect(mainSection.getByText('Test date range input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Date & Time Element E2E Tests', () => {
    test('Should add and display a date & time element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addDateTimeElement(page, 'Date & time', 1);
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
      await expect(
        mainSection.getByText('Test date & time input *', { exact: true }),
      ).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Time Element E2E Tests', () => {
    test('Should add and display a time element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addDateTimeElement(page, 'Time', 1);
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
      await expect(mainSection.getByText('Test time input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
