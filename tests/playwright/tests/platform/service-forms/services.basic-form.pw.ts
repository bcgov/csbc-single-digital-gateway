import { test } from '../../setup/db.fixture';
import {
  removeElements,
  expectPreview,
  selectForm,
  createTestService,
  createBasicForm,
  addDisplayElement,
  deleteTestService,
} from '../../setup/platform.services.utils';

test.describe('Platform Services Basic Form E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test('Should create a new service successfully', async ({ page }) => {
    await createTestService(page);
  });

  test('Should create a basic form on a newly created service successfully', async ({ page }) => {
    await createBasicForm(page);
  });

  test('Should add and show display elements for a basic form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Test title');
    // Heading element
    await addDisplayElement(page, 'Heading');
    // Save form
    await mainSection.getByRole('button', { name: 'Save Form' }).click();
    // Expect preview form
    await expectPreview(page, ['Heading']);
    // Remove elements
    await removeElements(page);
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
