import type { Locator, Page } from '@playwright/test';
import { expect } from './db.fixture';
import { Pool } from 'pg';

export const platformLogin = async (page: Page) => {
  await page.goto('http://localhost:3001');

  await page.getByRole('link', { name: 'Log in with IDIR' }).click();

  // Perform login actions
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Hello, Test')).toBeVisible();

  // Save cookies and localStorage to the JSON file
  await page.context().storageState({ path: 'tests/playwright/tests/setup/files/platform.json' });
};

export const selectTestService = async (page: Page) => {
  const main = page.locator('main');
  const testService = main.locator('td').getByText('Test service');
  await expect(testService).toBeVisible();
  await testService.click();
  const applicationMethodButton = main.locator('button').getByText('Application Methods');
  await expect(applicationMethodButton).toBeVisible();
  await applicationMethodButton.click();
  return main;
};

export const selectForm = async (page: Page, titleName: string) => {
  const main = await selectTestService(page);
  await main.getByRole('link', { name: titleName }).click();
  return main;
};

export const dragAndDropElement = async (
  page: Page,
  componentElement: Locator,
  targetTag?: string,
) => {
  const targetElement = targetTag
    ? page.locator(targetTag)
    : page.locator('[aria-label="Canvas"]').locator('div').last();
  if (targetTag) {
    await targetElement.click();
    await componentElement.click();
  } else {
    // Drag and drop element
    await componentElement.hover();
    await page.mouse.down();
    await targetElement.hover();
    await targetElement.hover();
    await page.mouse.up();
  }
};

export const fillLabelAndDescription = async (
  page: Page,
  component: string,
  elementNumber?: number,
  layoutCount?: number,
) => {
  const canvasContainer = page.locator('[aria-label="Canvas"]');
  const settingsContainer = page.locator('[aria-label="Inspector"]');
  canvasContainer.locator(`[aria-label="Select field 1"]`);
  if (elementNumber) {
    canvasContainer.locator('[aria-label="Select field 1"]');
    if (layoutCount) {
      const selectTag = canvasContainer.locator(`[aria-label="Select field ${elementNumber}"]`);
      if (layoutCount === 4 && elementNumber === 4) {
        await selectTag.first().click();
      } else if (layoutCount > 2) {
        await selectTag.nth(layoutCount - 2).click();
      } else {
        await selectTag.click();
      }
    } else {
      await canvasContainer.locator(`[aria-label="Select field ${elementNumber}"]`).click();
    }
    const labelInput = settingsContainer.getByRole('textbox', {
      name: 'Label',
      exact: true,
    });
    await expect(labelInput).toBeVisible();
    await labelInput.fill(`Test ${component.toLowerCase()} input`);
    const descriptionInput = settingsContainer.getByRole('textbox', {
      name: 'Field description',
      exact: true,
    });
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill(`Test ${component.toLowerCase()} input description`);
  }
  return { canvasContainer, settingsContainer };
};

export const addElement = async (
  page: Page,
  component: string,
  elementNumber?: number,
  layoutCount?: number,
) => {
  const layoutTag = layoutCount ? `[aria-label="Select section ${layoutCount}"]` : undefined;
  const componentElement = page.locator(`[aria-label="${component}"]`);
  await dragAndDropElement(page, componentElement, layoutTag);
  const { canvasContainer, settingsContainer } = await fillLabelAndDescription(
    page,
    component,
    elementNumber,
    layoutCount,
  );
  return { canvasContainer, settingsContainer };
};

export const addDisplayElement = async (page: Page, component: string, layoutCount?: number) => {
  const layoutTag = layoutCount ? `[aria-label="Select section ${layoutCount}"]` : undefined;
  if (component === 'Rich text') {
    const componentElement = page
      .locator(`[aria-label="${component}"]`)
      .filter({ hasText: 'Rich textDisplay only —' });
    await dragAndDropElement(page, componentElement, layoutTag);
    await fillLabelAndDescription(page, component);
    return;
  }
  const { canvasContainer } = await addElement(page, component, undefined, layoutCount);
  const textInput = canvasContainer.getByRole('textbox', {
    name: component,
  });
  await expect(textInput).toBeVisible();
  await textInput.click();
  await textInput.fill(`Test ${component.toLowerCase()}`);
  return;
};

export const addCoreElement = async (
  page: Page,
  component: string,
  elementNumber: number,
  layoutCount?: number,
) => {
  await addElement(page, component, elementNumber, layoutCount);
};

export const addChoiceElement = async (
  page: Page,
  component: string,
  elementNumber: number,
  layoutCount?: number,
) => {
  const { settingsContainer } = await addElement(page, component, elementNumber, layoutCount);
  const addOptionButton = settingsContainer.getByRole('button', {
    name: 'Add option',
  });
  await addOptionButton.click();
  await expect(settingsContainer.getByRole('textbox', { name: 'Option' })).toHaveCount(4);
  await settingsContainer
    .getByRole('textbox', { name: 'Option 1' })
    .first()
    .fill(`Test ${component.toLowerCase()} option 1`);
  await settingsContainer
    .getByRole('textbox', { name: 'Option 2' })
    .first()
    .fill(`Test ${component.toLowerCase()} option 2`);
};

export const addDateTimeElement = async (
  page: Page,
  component: string,
  elementNumber: number,
  layoutCount?: number,
) => {
  await addElement(page, component, elementNumber, layoutCount);
};

export const addAdvancedElement = async (
  page: Page,
  component: string,
  elementNumber: number,
  layoutCount?: number,
) => {
  if (component === 'Rich text') {
    const layoutTag = layoutCount ? `[aria-label="Select section ${layoutCount}"]` : undefined;
    const componentElement = page
      .locator(`[aria-label="${component}"]`)
      .filter({ hasText: 'Rich textFormatted text with' });
    await dragAndDropElement(page, componentElement, layoutTag);
    await fillLabelAndDescription(page, component, elementNumber);
    return;
  }
  await addElement(page, component, elementNumber, layoutCount);
};

export const addLayoutElement = async (page: Page, component: string, layoutCount?: number) => {
  const layoutTag = layoutCount ? `[aria-label="Select section ${layoutCount}"]` : undefined;
  const componentElement = page.locator(`[aria-label="${component}"]`);
  await dragAndDropElement(page, componentElement, layoutTag);
  const canvasContainer = page.locator('[aria-label="Canvas"]');
  const settingsContainer = page.locator('[aria-label="Inspector"]');
  const newCount = layoutCount === undefined ? 1 : layoutCount + 1;
  const layoutElement = canvasContainer.locator(`[aria-label="Select section ${newCount}"]`);
  await expect(layoutElement).toBeVisible();
  await layoutElement.click();
  const sectionTitle = settingsContainer.getByRole('textbox', {
    name: 'Section title',
  });
  await expect(sectionTitle).toBeVisible();
  await sectionTitle.click();
  await sectionTitle.fill(`Test ${component.toLowerCase()}`);
  return;
};

export const removeElements = async (
  page: Page,
  groupNumber?: number | undefined,
  isMultiStageForm?: boolean,
) => {
  await page.locator('main').getByText('Build').click();
  if (isMultiStageForm) {
    await page.locator('main').getByRole('button', { name: 'Test page 1' }).click();
  }
  const canvasContainer = page.locator('[aria-label="Canvas"]');
  let removeButtonsCount =
    groupNumber || (await page.locator('[aria-label="Remove field"]').count());
  for (let i = 0; i < removeButtonsCount; i++) {
    try {
      const label = groupNumber
        ? canvasContainer.locator(`[aria-label="Select section 1"]`)
        : canvasContainer.locator('label').nth(2);
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await label.hover();
      // eslint-disable-next-line no-await-in-loop -- sequential UI click must happen in order
      await page.locator('[aria-label="Remove field"]').nth(0).click();
    } catch (error: any) {
      console.error(error);
      break;
    }
  }
  if (isMultiStageForm) {
    await page.locator('[data-slot="dialog-close"]').click();
  }
  const saveButton = page.getByRole('button', { name: 'Save Form' });
  await saveButton.click();
};

export const expectPreview = async (
  page: Page,
  componentNames: string[],
  hasHelpText?: boolean,
) => {
  const main = page.locator('main');
  const previewButton = main.getByRole('tab', { name: 'Preview' });
  await expect(previewButton).toBeVisible();
  await previewButton.click();
  const expectPromises = [];
  for (const component of componentNames) {
    const lowerCaseComponentName = component.toLowerCase();
    const testText = hasHelpText
      ? `Test ${lowerCaseComponentName} input`
      : `Test ${lowerCaseComponentName}`;
    expectPromises.push(expect(main.getByText(testText, { exact: true })).toBeVisible());
    if (hasHelpText) {
      expectPromises.push(
        expect(main.getByText(`Test ${lowerCaseComponentName} input description`)).toBeVisible(),
      );
    }
  }
  await Promise.all(expectPromises);
};

export const removeSubmissions = async (db: Pool) => {
  await db.query('DELETE FROM submission_versions');
  await db.query('DELETE FROM submissions');
  await db.query('DELETE FROM reviews');
};

export const removeServices = async (db: Pool) => {
  await db.query('DELETE FROM documents WHERE title = $1', ['Test service']);
  await db.query('DELETE FROM document_versions');
};

export const removeServiceAgreements = async (db: Pool) => {
  // Remove any existing test service agreement in the database
  await db.query('DELETE FROM document_references');
  await db.query('DELETE from document_versions');
  await db.query('DELETE FROM workspace_default_agreements');
  await db.query('DELETE FROM documents WHERE title LIKE $1', ['Test service agreement%']);
};

export const addServiceAgreement = async (page: Page, db: Pool) => {
  // Remove any existing test service agreement in the database
  await removeServiceAgreements(db);
  // Create a test service agreement
  await page.goto('/');
  await page.getByRole('link', { name: 'Sample1 Admin' }).click();
  await page.getByRole('link', { name: 'Shared Resources' }).click();
  await page.getByRole('link', { name: 'Service Agreements' }).click();
  await page.getByRole('button', { name: 'New agreement' }).click();
  const modal = page.locator('[data-slot="dialog-content"]');
  await modal.getByRole('textbox', { name: 'Title' }).fill('Test service agreement title');
  await modal
    .getByRole('textbox', { name: 'Description' })
    .fill('Test service agreement description');
  await modal.getByRole('button', { name: 'Create agreement' }).click();
  // Fill service agreement form
  await page.getByRole('textbox', { name: 'Content' }).fill('Test service agreement content');
  await page.getByRole('textbox', { name: 'Approve label' }).fill('Approved');
  await page.getByRole('textbox', { name: 'Reject label' }).fill('Rejected');
  await page.getByRole('checkbox', { name: 'Optional' }).click();
  // Save and publish the form
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Publish' }).click();
};

export const createTestService = async (page: Page) => {
  await page.goto('http://localhost:3001/');
  await page.getByRole('link', { name: 'Sample1 Admin' }).click();
  await page.getByRole('link', { name: 'Services' }).click();
  const main = page.locator('main');
  await main.locator('button').getByText('New').click();
  const modal = page.locator('[data-slot="dialog-content"]');
  await modal.getByRole('textbox', { name: 'Name of the service' }).fill('Test service');
  await modal.getByRole('textbox', { name: 'Short description' }).fill('Test service description');
  await modal.getByRole('button', { name: 'Create service' }).click();
  const contentInput = main.locator('[id="#/properties/about2"]');
  await contentInput.fill('Test');
  await contentInput.fill('Test service content');
  const draftButton = main.getByRole('button', { name: 'Save draft' });
  await draftButton.click();
};

export const createBasicForm = async (page: Page) => {
  await page.goto('http://localhost:3001/');
  await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  const main = await selectTestService(page);
  await main.locator('button').getByText('Application Methods').click();
  await main
    .getByRole('button', {
      name: 'Add application method',
    })
    .click();
  const formsModal = page.getByRole('dialog');
  await formsModal.getByRole('button', { name: 'Basic Form' }).click();
  await expect(main.getByText('Build')).toBeVisible();
  await expect(main.getByText('Preview')).toBeVisible();
  await expect(main.getByRole('button', { name: 'Cancel' })).toBeVisible();
  const saveButton = main.getByRole('button', { name: 'Save Form' });
  await expect(saveButton).toBeVisible();
  const titleInput = main.locator('#canvas-form-title');
  const descriptionInput = main.locator('#canvas-form-description');
  await expect(titleInput).toBeVisible();
  await expect(descriptionInput).toBeVisible();
  await titleInput.fill('Test title');
  await descriptionInput.fill('Test title description');
  await saveButton.click();
};

export const deleteTestService = async (page: Page) => {
  const deleteDropdown = page.locator('td').locator('[aria-haspopup="menu"]');
  await expect(deleteDropdown).toBeVisible();
  await deleteDropdown.click();
  await expect(page.getByRole('menuitem', { name: 'Delete service' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Delete service' }).click();
  await expect(page.getByText('Delete this service?')).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No services yet — create one with the New button.')).toBeVisible();
};

export const addElementsToSingleLayoutElement = async (
  page: Page,
  elementType: 'Group' | 'Horizontal',
  options?: {
    disableCoreElements?: boolean;
    disableChoiceElements?: boolean;
    disableDateTimeElements?: boolean;
    disableAdvancedElements?: boolean;
  },
) => {
  await addLayoutElement(page, elementType, 1);
  // Display elements
  const displayElements = ['Heading', 'Paragraph', 'Rich text'];
  let displayCount = 0;
  for (let i = 0; i < displayElements.length; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await addDisplayElement(page, displayElements[i]!, 1);
    displayCount++;
  }
  // Core elements
  const coreElements = ['Text', 'Number', 'Boolean'];
  let coreCount = 0;
  if (!options?.disableCoreElements) {
    for (let i = 0; i < coreElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addCoreElement(page, coreElements[i]!, i + 1, 1);
      coreCount++;
    }
  }
  // Choice elements
  const choiceElements = ['Checkbox group', 'Radio', 'Select'];
  let choiceCount = 0;
  if (!options?.disableChoiceElements) {
    await addLayoutElement(page, elementType, 1);
    for (let i = 0; i < choiceElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addChoiceElement(page, choiceElements[i]!, i + displayCount + coreCount + 1, 1);
      choiceCount++;
    }
  }
  // Date & time elements
  const dateTimeElements = ['Date', 'Date range', 'Date & time', 'Time'];
  let dateTimeCount = 0;
  if (!options?.disableDateTimeElements) {
    for (let i = 0; i < dateTimeElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addDateTimeElement(
        page,
        dateTimeElements[i]!,
        i + displayCount + coreCount + choiceCount + 1,
        1,
      );
      dateTimeCount++;
    }
  }
  // Advanced elements
  const advancedElements = ['Address', 'Rich text'];
  let advancedCount = 0;
  if (!options?.disableAdvancedElements) {
    for (let i = 0; i < advancedElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addAdvancedElement(
        page,
        advancedElements[i]!,
        i + displayCount + coreCount + choiceCount + dateTimeCount + 1,
        1,
      );
      advancedCount++;
    }
  }
  return { coreElements, choiceElements, dateTimeElements, advancedElements };
};

export const addElementsToLayoutElement = async (
  page: Page,
  elementType: 'Group' | 'Horizontal',
  options?: {
    disableCoreElements?: boolean;
    disableChoiceElements?: boolean;
    disableDateTimeElements?: boolean;
    disableAdvancedElements?: boolean;
  },
) => {
  await addLayoutElement(page, elementType);
  // Display elements
  let layoutCount = 1;
  const displayElements = ['Heading', 'Paragraph', 'Rich text'];
  for (let i = 0; i < displayElements.length; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await addDisplayElement(page, displayElements[i]!, layoutCount);
  }
  layoutCount++;
  // Core elements
  const coreElements = ['Text', 'Number', 'Boolean'];
  let coreCount = 0;
  if (!options?.disableCoreElements) {
    await addLayoutElement(page, elementType);
    for (let i = 0; i < coreElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addCoreElement(page, coreElements[i]!, i + 1, layoutCount);
      coreCount++;
    }
    layoutCount++;
  }
  // Choice elements
  const choiceElements = ['Checkbox group', 'Radio', 'Select'];
  let choiceCount = 0;
  if (!options?.disableChoiceElements) {
    await addLayoutElement(page, elementType);
    for (let i = 0; i < choiceElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addChoiceElement(page, choiceElements[i]!, i + 1, layoutCount);
      choiceCount++;
    }
    layoutCount++;
  }
  // Date & time elements
  const dateTimeElements = ['Date', 'Date range', 'Date & time', 'Time'];
  let dateTimeCount = 0;
  if (!options?.disableDateTimeElements) {
    await addLayoutElement(page, elementType);
    for (let i = 0; i < dateTimeElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addDateTimeElement(page, dateTimeElements[i]!, i + 1, layoutCount);
      dateTimeCount++;
    }
    layoutCount++;
  }
  // Advanced elements
  const advancedElements = ['Address', 'Rich text'];
  let advancedCount = 0;
  if (!options?.disableAdvancedElements) {
    await addLayoutElement(page, elementType);
    for (let i = 0; i < advancedElements.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await addAdvancedElement(page, advancedElements[i]!, i + 1, layoutCount);
      advancedCount++;
    }
    layoutCount++;
  }
  return { layoutCount, coreElements, choiceElements, dateTimeElements, advancedElements };
};

export const addDateTimeElementsToHorizontalElement = async (page: Page, layoutCount: number) => {
  // Date & time elements
  const dateTimeElements = ['Date', 'Date range', 'Date & time', 'Time'];
  for (let i = 0; i < dateTimeElements.length; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await addLayoutElement(page, 'Horizontal');
    const component = dateTimeElements[i]!;
    const layoutTag = `[aria-label="Select section ${layoutCount + i}"]`;
    const componentElement = page.locator(`[aria-label="${component}"]`);
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await dragAndDropElement(page, componentElement, layoutTag);
    const canvasContainer = page.locator('[aria-label="Canvas"]');
    const settingsContainer = page.locator('[aria-label="Inspector"]');
    if (layoutCount > 6) {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await canvasContainer.locator(`[aria-label="Select field 1"]`).click();
    } else {
      // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
      await canvasContainer
        .locator(`[aria-label="Select field 1"]`)
        .nth(layoutCount + i - 2)
        .click();
    }
    // await canvasContainer.locator(`[aria-label="Select field ${elementNumber}"]`).click();
    const labelInput = settingsContainer.getByRole('textbox', {
      name: 'Label',
      exact: true,
    });
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await labelInput.fill(`Test ${component.toLowerCase()} input`);
    const descriptionInput = settingsContainer.getByRole('textbox', {
      name: 'Field description',
      exact: true,
    });
    // eslint-disable-next-line no-await-in-loop -- sequential UI hover must happen in order
    await descriptionInput.fill(`Test ${component.toLowerCase()} input description`);
  }
};

export const setupCreateTestService = async (db: Pool) => {
  const documentTypeId = await db
    .query('SELECT id FROM document_types WHERE name = $1', ['Service'])
    .then((res) => res.rows[0].id);
  const workSpaceId = await db
    .query('SELECT id FROM workspaces WHERE name =$1', ['Sample1'])
    .then((res) => res.rows[0].id);
  const testServiceId = await db
    .query(
      'INSERT INTO documents (type_id, workspace_id, title, kind) values ($1, $2, $3, $4) RETURNING id',
      [documentTypeId, workSpaceId, 'Test service', 'service'],
    )
    .then((res) => res.rows[0].id);
  const documentTypeVersionId = await db
    .query('SELECT id FROM document_type_versions WHERE type_id = $1', [documentTypeId])
    .then((res) => res.rows[0].id);
  await db
    .query(
      'INSERT INTO document_versions (document_id, type_id, type_version_id, version, data) values ($1, $2, $3, $4, $5) RETURNING id',
      [
        testServiceId,
        documentTypeId,
        documentTypeVersionId,
        1,
        {
          title: 'Test service',
          description: 'Test service description',
        },
      ],
    )
    .then((res) => res.rows[0].id);
};

export const gotoApplication = async (page: Page) => {
  await platformLogin(page);
  await page.goto('http://localhost:3001');
  await page.getByRole('link', { name: 'Submissions' }).click();
  await page.locator('td').getByRole('link', { name: 'Casey Citizen' }).click();
};
