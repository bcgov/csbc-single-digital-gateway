import { test, expect } from '../setup/db.fixture';
import {
  removeElements,
  selectForm,
  createTestService,
  createBasicForm,
  addChoiceElement,
  expectPreview,
  deleteTestService,
} from '../setup/platform.services.utils';

test.describe('Platform Services Basic Form Choice Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test.describe('Initialize test cases for choice elements', () => {
    test('Should create a new service successfully', async ({ page }) => {
      await createTestService(page);
    });

    test('Should create a basic form on a newly created service successfully', async ({ page }) => {
      await createBasicForm(page);
    });

    test('Should add and display choice elements for a basic form', async ({ page }) => {
      const mainSection = await selectForm(page, 'Test title');
      // Checkbox group element
      await addChoiceElement(page, 'Checkbox group', 1);
      // Radio element
      await addChoiceElement(page, 'Radio', 2);
      // Select element
      await addChoiceElement(page, 'Select', 3);
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Expect preview
      await expectPreview(page, ['Checkbox group', 'Radio', 'Select'], true);
      // Checkbox group element
      await expect(
        mainSection.getByRole('checkbox', { name: 'Test checkbox group option 1' }),
      ).toBeVisible();
      await expect(
        mainSection.getByRole('checkbox', { name: 'Test checkbox group option 2' }),
      ).toBeVisible();
      // Radio element
      await expect(mainSection.getByRole('radio', { name: 'Test radio option 1' })).toBeVisible();
      await expect(mainSection.getByRole('radio', { name: 'Test radio option 2' })).toBeVisible();
      // Select element
      const selectDropDown = mainSection.locator('[aria-haspopup="listbox"]');
      await expect(selectDropDown).toBeVisible();
      await selectDropDown.click();
      const selectOptions = page.getByRole('listbox').locator('[data-slot="select-item"]');
      await expect(selectOptions).toHaveCount(2);
      await expect(page.getByRole('option', { name: 'Test select option 1' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Test select option 2' })).toBeVisible();
      await page.getByRole('option', { name: 'Test select option 2' }).click();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Checkbox Group Element E2E Tests', () => {
    test('Should add and display a checkbox group element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addChoiceElement(page, 'Checkbox group', 1);
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
        mainSection.getByRole('checkbox', { name: 'Test checkbox group option 1' }),
      ).toBeVisible();
      await expect(
        mainSection.getByRole('checkbox', { name: 'Test checkbox group option 2' }),
      ).toBeVisible();
      await expect(
        mainSection.getByText('Test checkbox group input *', { exact: true }),
      ).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Radio Element E2E Tests', () => {
    test('Should add and display a radio element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addChoiceElement(page, 'Radio', 1);
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
      await expect(mainSection.getByRole('radio', { name: 'Test radio option 1' })).toBeVisible();
      await expect(mainSection.getByRole('radio', { name: 'Test radio option 2' })).toBeVisible();
      await expect(mainSection.getByText('Test radio input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Select Element E2E Tests', () => {
    test('Should add and display a select element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addChoiceElement(page, 'Select', 1);
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
      await expect(mainSection.getByText('Test select input *', { exact: true })).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a select element when it is configured to allow multiple', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addChoiceElement(page, 'Select', 1);
      // Configuration for allow multiple
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('switch', { name: 'Allow multiple' }).click();
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      const selectValue = page.locator('[data-slot="select-value"]');
      await expect(selectValue).toHaveText('Select…');
      await mainSection.locator('[aria-haspopup="listbox"]').click();
      await page.getByRole('option', { name: 'Test select option 1' }).click();
      await page.getByRole('option', { name: 'Test select option 2' }).click();
      await page.keyboard.press('Escape');
      await expect(selectValue).toHaveText('Test select option 1, Test select option 2');
      // Remove elements
      await removeElements(page);
    });
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
