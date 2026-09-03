import { test, expect } from '../setup/db.fixture';
import {
  removeElements,
  expectPreview,
  selectTestService,
  selectForm,
  deleteTestService,
  createTestService,
  addDisplayElement,
  addCoreElement,
  addChoiceElement,
  addDateTimeElement,
  addAdvancedElement,
  addLayoutElement,
  addElementsToLayoutElement,
} from '../setup/platform.services.utils';

test.describe('Platform Services Multi-Stage Form E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test('Should create a new service successfully', async ({ page }) => {
    await createTestService(page);
  });

  test('Should create a multi-stage form on a newly created service successfully', async ({
    page,
  }) => {
    const mainSection = await selectTestService(page);
    await mainSection.locator('button').getByText('Application Methods').click();
    await mainSection
      .getByRole('button', {
        name: 'Add application method',
      })
      .click();
    const formsModal = page.getByRole('dialog');
    await formsModal.getByRole('button', { name: 'Multi-stage Form' }).click();
    await expect(mainSection.getByText('Build')).toBeVisible();
    await expect(mainSection.getByText('Preview')).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Cancel' })).toBeVisible();
    const saveButton = mainSection.getByRole('button', { name: 'Save Form' });
    await expect(saveButton).toBeVisible();
    const formNameInput = mainSection.locator('#stage-form-name');
    const formDescriptionInput = mainSection.locator('#stage-form-description');
    await expect(formNameInput).toBeVisible();
    await expect(formDescriptionInput).toBeVisible();
    await expect(mainSection.getByRole('textbox', { name: 'Stage name' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Remove stage' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Page 1' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Add page' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Remove page' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Add stage before' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Add stage after' })).toBeVisible();
    await formNameInput.fill('Untitled multi-stage form');
    await formDescriptionInput.fill('Untitled multi-stage form description');
    await saveButton.click();
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
    await selectTestService(page);
    await expect(page.getByRole('link', { name: 'Untitled multi-stage form' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('Should edit an existing page title and description and stage title for a multi-stage form', async ({
    page,
  }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    // Page button
    const pageButton = mainSection.getByRole('button', { name: 'Page 1' });
    await expect(pageButton).toBeVisible();
    await pageButton.click();
    // Title and description
    const titleInput = page.locator('#canvas-form-title');
    const descriptionInput = page.locator('#canvas-form-description');
    await expect(titleInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await titleInput.fill('Test page 1');
    await descriptionInput.fill('Test page 1 description');
    // Close button
    const closeButton = page.locator('[data-slot="dialog-close"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    // Expect title to be changed
    await expect(mainSection.getByRole('button', { name: 'Test page 1' })).toBeVisible();
    // Stage input
    const stageInput = mainSection.getByRole('textbox', { name: 'Stage name' });
    await stageInput.fill('Test stage 1');
    const saveButton = mainSection.getByRole('button', { name: 'Save Form' });
    await saveButton.click();
    // Expect changes on preview
    const previewButton = mainSection.getByText('Preview');
    await previewButton.click();
    await expect(mainSection.getByText('Test Stage 1')).toBeVisible();
    await expect(mainSection.getByText('Test page 1')).toBeVisible();
  });

  test('Should add and show display elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Heading element
    await addDisplayElement(page, 'Heading');
    // Paragraph element
    await addDisplayElement(page, 'Paragraph');
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    await expectPreview(page, ['Heading', 'Paragraph']);
    // Remove elements
    await removeElements(page, undefined, true);
  });

  test('Should add and display core elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Core elements
    const coreElements = ['Text', 'Number', 'Boolean'];
    for (let i = 0; i < coreElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addCoreElement(page, coreElements[i]!, i + 1);
    }
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, coreElements, true);
    await expect(mainSection.getByRole('textbox', { name: 'Test text input' })).toBeVisible();
    await expect(mainSection.getByRole('spinbutton', { name: 'Test number input' })).toBeVisible();
    await expect(mainSection.getByRole('checkbox', { name: 'Test boolean input' })).toBeVisible();
    // Remove elements
    await removeElements(page, undefined, true);
  });

  test('Should add and display choice elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Choice elements
    const choiceElements = ['Checkbox group', 'Radio', 'Select'];
    for (let i = 0; i < choiceElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addChoiceElement(page, choiceElements[i]!, i + 1);
    }
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, choiceElements, true);
    // Remove elements
    await removeElements(page, undefined, true);
  });

  test('Should add and display date & time elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Date & time elements
    const dateTimeElements = ['Date', 'Date range', 'Date & time', 'Time'];
    for (let i = 0; i < dateTimeElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addDateTimeElement(page, dateTimeElements[i]!, i + 1);
    }
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, dateTimeElements, true);
    // Remove elements
    await removeElements(page, undefined, true);
  });

  test('Should add and display advanced elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Advanced elements
    const advancedElements = ['Address', 'Rich text'];
    for (let i = 0; i < advancedElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addAdvancedElement(page, advancedElements[i]!, i + 1);
    }
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, advancedElements, true);
    // Remove elements
    await removeElements(page, undefined, true);
  });

  test('Should add and display layout elements for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Layout elements
    const layoutElements = ['Group', 'Horizontal'];
    for (let i = 0; i < layoutElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addLayoutElement(page, layoutElements[i]!, i + 1);
    }
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, ['Group']);
    // Remove elements
    await removeElements(page, 2, true);
  });

  test('Should add and display elements that are added to a group element for a multi-stage form', async ({
    page,
  }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Add elements to a group element
    const { coreElements, choiceElements, dateTimeElements, advancedElements } =
      await addElementsToLayoutElement(page, 'Group');
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, ['Group']);
    await expectPreview(page, ['Heading', 'Paragraph']);
    await expectPreview(page, coreElements, true);
    await expectPreview(page, choiceElements, true);
    await expectPreview(page, dateTimeElements, true);
    await expectPreview(page, advancedElements, true);
    // Remove elements
    await removeElements(page, 1, true);
  });

  test('Should add and display elements that are added to a horizontal element for a multi-stage form', async ({
    page,
  }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    const pageButton = mainSection.getByRole('button', { name: 'Test page 1' });
    await pageButton.click();
    // Add elements to a horizontal element
    const { coreElements, choiceElements, dateTimeElements, advancedElements } =
      await addElementsToLayoutElement(page, 'Horizontal');
    // Close modal
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect preview form
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expectPreview(page, ['Heading', 'Paragraph']);
    await expectPreview(page, coreElements, true);
    await expectPreview(page, choiceElements, true);
    await expectPreview(page, dateTimeElements, true);
    await expectPreview(page, advancedElements, true);
    // Remove elements
    await removeElements(page, 1, true);
  });

  test('Should add new pages for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    // Page 1
    const pageButton = mainSection.getByRole('button', { name: 'Test Page 1' });
    await expect(pageButton).toBeVisible();
    // Add page button
    const addPageButton = mainSection.getByRole('button', { name: 'Add page' });
    await expect(addPageButton).toBeVisible();
    await addPageButton.click();
    // Page 2
    const newPage = mainSection.getByRole('button', { name: 'Untitled page' });
    await expect(newPage).toBeVisible();
    await newPage.click();
    // Title and description
    const titleInput = page.locator('#canvas-form-title');
    const descriptionInput = page.locator('#canvas-form-description');
    await expect(titleInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await titleInput.fill('Test page 2');
    await descriptionInput.fill('Test page 2 description');
    await page.locator('[data-slot="dialog-close"]').click();
    // Page 3
    await addPageButton.click();
    await newPage.click();
    // Title and description
    await expect(titleInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await titleInput.fill('Test page 3');
    await descriptionInput.fill('Test page 3 description');
    await page.locator('[data-slot="dialog-close"]').click();
    // Expect title to be changed
    await expect(mainSection.getByRole('button', { name: 'Test page 2' })).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Test page 3' })).toBeVisible();
    // Expect changes on preview
    const previewButton = mainSection.getByText('Preview');
    await previewButton.click();
    await expect(mainSection.getByText('Test page 2')).toBeVisible();
    await expect(mainSection.getByText('Test page 3')).toBeVisible();
    // Remove page
    await page.getByText('Build').click();
    await page.getByRole('button', { name: 'Remove page' }).last().click();
    await page.getByRole('button', { name: 'Remove page' }).last().click();
    // Expect pages to be deleted
    await expect(mainSection.getByRole('button', { name: 'Test page 2' })).not.toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Test page 3' })).not.toBeVisible();
    await mainSection.getByRole('button', { name: 'Save Form' }).click();
  });

  test('Should add stage before and after for a multi-stage form', async ({ page }) => {
    const mainSection = await selectForm(page, 'Untitled multi-stage form');
    // Add stage before
    const addStageBefore = mainSection.getByRole('button', {
      name: 'Add stage before',
    });
    await addStageBefore.click();
    const stageBeforeInput = mainSection
      .getByRole('textbox', {
        name: 'Stage name',
      })
      .first();
    await stageBeforeInput.fill('Test stage before');
    await mainSection.getByRole('button', { name: 'Untitled page' }).click();
    await page.locator('#canvas-form-title').fill('Test page before');
    await page.locator('[data-slot="dialog-close"]').click();
    // Add stage after
    const addStageAfter = mainSection.getByRole('button', {
      name: 'Add stage after',
    });
    await addStageAfter.click();
    const stageAfterInput = mainSection.getByRole('textbox', { name: 'Stage name' }).last();
    await stageAfterInput.fill('Test stage after');
    await mainSection.getByRole('button', { name: 'Untitled page' }).click();
    await page.locator('#canvas-form-title').fill('Test page after');
    await page.locator('[data-slot="dialog-close"]').click();
    await page.getByRole('button', { name: 'Save Form' }).click();
    // Expect preview form
    await mainSection.getByText('Preview').click();
    await expect(page.getByText('test stage before')).toBeVisible();
    await expect(page.getByText('Test page before')).toBeVisible();
    await expect(page.getByText('Test stage after')).toBeVisible();
    await expect(page.getByText('Test page after')).toBeVisible();
  });

  test('Should delete an existing test service', async ({ page }) => {
    await deleteTestService(page);
  });
});
