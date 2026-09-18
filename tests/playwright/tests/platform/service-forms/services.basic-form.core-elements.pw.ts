import { test, expect } from '../../setup/db.fixture';
import {
  removeElements,
  selectForm,
  createTestService,
  createBasicForm,
  addCoreElement,
  expectPreview,
  deleteTestService,
} from '../../setup/platform.services.utils';

test.describe('Platform Services Basic Form Core Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test.describe('Initialize test cases for core elements', () => {
    test('Should create a new service successfully', async ({ page }) => {
      await createTestService(page);
    });

    test('Should create a basic form on a newly created service successfully', async ({ page }) => {
      await createBasicForm(page);
    });

    test('Should add and display core elements for a basic form', async ({ page }) => {
      const mainSection = await selectForm(page, 'Test title');
      // Text element
      await addCoreElement(page, 'Text', 1);
      // Number element
      await addCoreElement(page, 'Number', 2);
      // Boolean element
      await addCoreElement(page, 'Boolean', 3);
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Expect preview
      await expectPreview(page, ['Text', 'Number', 'Boolean'], true);
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Text Element E2E Tests', () => {
    test('Should add and display a text element when the it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Text', 1);
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
      await expect(mainSection.getByLabel('Test text input *')).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a text element when the it is configured to have a placeholder', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Text', 1);
      // Configuration for placeholder
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer
        .getByRole('textbox', { name: 'placeholder' })
        .fill('Test placeholder');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByPlaceholder('Test placeholder')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a text element when the it is configured to multiline', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Text', 1);
      // Configuration for multiline
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('switch', { name: 'Multiline' }).click();
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.locator('[data-slot="textarea"]')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a text element when the it is configured with an input mask', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Text', 1);
      // Configuration for input mask
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('textbox', { name: 'input mask' }).fill('(999) 999 - 9999');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      const textInput = mainSection.getByRole('textbox', { name: 'Test text input' });
      await textInput.fill('1111111111');
      await expect(textInput).toHaveValue('(111) 111 - 1111');
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a text element when the it is configured with a max length', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Text', 1);
      // Configuration for max length
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('spinbutton', { name: 'Max length' }).fill('10');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByText('0/10')).toBeVisible();
      const textInput = mainSection.getByRole('textbox', { name: 'Test text input' });
      await textInput.fill('12345678901');
      await expect(textInput).toHaveValue('1234567890');
      await expect(mainSection.getByText('10/10')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Number Element E2E Tests', () => {
    test('Should add and display a number element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Number', 1);
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
      await expect(mainSection.getByLabel('Test number input *')).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a number element when it is configured to decimal with min and max values', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Number', 1);
      // Configuration for min and max values
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('spinbutton', { name: 'Decimal places' }).fill('1');
      // await settingsContainer.getByRole('button', { name: 'Integer' }).click();
      await settingsContainer.getByRole('spinbutton', { name: 'Min' }).fill('1');
      await settingsContainer.getByRole('spinbutton', { name: 'Max' }).fill('10');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      const numberInput = mainSection.getByRole('spinbutton', { name: 'Test number input' });
      await expect(numberInput).toBeVisible();
      await numberInput.fill('10');
      await expect(numberInput).toHaveValue('10');
      await numberInput.fill('1.1');
      await expect(numberInput).toHaveValue('1.1');
      await numberInput.fill('1.12');
      await expect(mainSection.getByText('Enter at most 1 decimal place.')).toBeVisible();
      await numberInput.fill('0');
      await expect(mainSection.getByText('must be >= 1')).toBeVisible();
      await numberInput.fill('20');
      await expect(mainSection.getByText('must be <= 10')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a number element when it is configured to integer with min and max values', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Number', 1);
      // Configuration for min and max values
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('button', { name: 'Integer' }).click();
      await settingsContainer.getByRole('spinbutton', { name: 'Min' }).fill('1');
      await settingsContainer.getByRole('spinbutton', { name: 'Max' }).fill('10');
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      const numberInput = mainSection.getByRole('spinbutton', { name: 'Test number input' });
      await expect(numberInput).toBeVisible();
      await numberInput.fill('10');
      await expect(numberInput).toHaveValue('10');
      await numberInput.fill('1.1');
      await expect(numberInput).toHaveValue('1');
      await numberInput.fill('0');
      await expect(mainSection.getByText('must be >= 1')).toBeVisible();
      await numberInput.fill('20');
      await expect(mainSection.getByText('must be <= 10')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test.describe('Boolean Element E2E Tests', () => {
    test('Should add and display a boolean element when it is configured to be required', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Boolean', 1);
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
        mainSection.getByRole('checkbox', { name: 'Test boolean input *' }),
      ).toBeVisible();
      await expect(mainSection.getByText('is a required property')).toBeVisible();
      // Remove elements
      await removeElements(page);
    });

    test('Should add and display a boolean element when it is configured with toggle', async ({
      page,
    }) => {
      const mainSection = await selectForm(page, 'Test title');
      await addCoreElement(page, 'Boolean', 1);
      // Configuration for toggle
      const settingsContainer = page.locator('[aria-label="Inspector"]');
      await settingsContainer.getByRole('button', { name: 'Toggle' }).click();
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Preview
      const previewButton = mainSection.getByText('Preview');
      await expect(previewButton).toBeVisible();
      await previewButton.click();
      // Expect
      await expect(mainSection.getByRole('switch', { name: 'Test boolean input' })).toBeVisible();
      // Remove elements
      await removeElements(page);
    });
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
