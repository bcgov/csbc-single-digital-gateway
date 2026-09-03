import { test } from '../setup/db.fixture';
import {
  removeElements,
  selectForm,
  createTestService,
  createBasicForm,
  expectPreview,
  addLayoutElement,
  deleteTestService,
  addElementsToLayoutElement,
} from '../setup/platform.services.utils';

test.describe('Platform Services Basic Form Layout Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test.describe('Initialize test cases for layout elements', () => {
    test('Should create a new service successfully', async ({ page }) => {
      await createTestService(page);
    });

    test('Should create a basic form on a newly created service successfully', async ({ page }) => {
      await createBasicForm(page);
    });

    test('Should add and show layout elements for a basic form', async ({ page }) => {
      const mainSection = await selectForm(page, 'Test title');
      // Group element
      await addLayoutElement(page, 'Group', 1);
      // Horizontal element
      await addLayoutElement(page, 'Horizontal', 2);
      // Save form
      await mainSection.getByRole('button', { name: 'Save Form' }).click();
      // Expect preview
      await expectPreview(page, ['Group']);
      // Remove elements
      await removeElements(page, 2);
    });
  });

  test.describe('Group element E2E Tests', () => {
    test('Should add and display elements that are added to a group element for a basic form', async ({
      page,
    }) => {
      await selectForm(page, 'Test title');
      // Add elements to a group element
      const { coreElements, choiceElements, dateTimeElements, advancedElements } =
        await addElementsToLayoutElement(page, 'Group');
      // Expect preview
      await expectPreview(page, ['Group']);
      await expectPreview(page, ['Heading', 'Paragraph']);
      await expectPreview(page, coreElements, true);
      await expectPreview(page, choiceElements, true);
      await expectPreview(page, dateTimeElements, true);
      await expectPreview(page, advancedElements, true);
      // Remove elements
      await removeElements(page, 1);
    });
  });

  test.describe('Horizontal element E2E Tests', () => {
    test('Should add and display elements that are added to a horizontal element for a basic form', async ({
      page,
    }) => {
      await selectForm(page, 'Test title');
      // Add elements to a horizontal element
      const { coreElements, choiceElements, dateTimeElements, advancedElements } =
        await addElementsToLayoutElement(page, 'Horizontal');
      // Expect preview
      await expectPreview(page, ['Heading', 'Paragraph']);
      await expectPreview(page, coreElements, true);
      await expectPreview(page, choiceElements, true);
      await expectPreview(page, dateTimeElements, true);
      await expectPreview(page, advancedElements, true);
      // Remove elements
      await removeElements(page, 1);
    });
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
