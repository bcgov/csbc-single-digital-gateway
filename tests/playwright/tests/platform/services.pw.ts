import { test, expect } from '../setup/db.fixture';
import {
  addCoreElement,
  addServiceAgreement,
  removeServiceAgreements,
  selectTestService,
} from '../setup/platform.services.utils';

test.describe('Platform Services E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
  });

  test('Should display services header texts', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Services')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('Service documents that group related applications.'),
    ).toBeVisible();
  });

  test('Should display services main content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(
      mainSection.getByText('No services yet — create one with the New button.'),
    ).toBeVisible();
    await expect(mainSection.locator('button').getByText('New service')).toBeVisible();
    await expect(mainSection.locator('input')).toHaveAttribute('placeholder', 'Search services…');
  });

  test('Should create a new service successfully', async ({ page }) => {
    const mainSection = page.locator('main');
    await mainSection.locator('button').getByText('New service').click();
    await expect(page.getByRole('dialog').getByText('New service')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText('Give the service a title and description'),
    ).toBeVisible();
    const form = page.getByRole('dialog').locator('form');
    const titleInput = form.getByRole('textbox', { name: 'Title' });
    const descriptionInput = form.getByRole('textbox', { name: 'Description' });
    const createServiceButton = form.getByRole('button', {
      name: 'Create service',
    });
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toBeEmpty();
    await expect(descriptionInput).toBeVisible();
    await expect(descriptionInput).toBeEmpty();
    await expect(createServiceButton).toBeVisible();
    await titleInput.fill('Test service');
    await descriptionInput.fill('Test service description');
    await createServiceButton.click();
    await expect(mainSection.locator('button').getByText('Service details')).toBeVisible();
    await expect(mainSection.locator('button').getByText('Application Methods')).toBeVisible();
    await expect(mainSection.locator('button').getByText('Service agreements')).toBeVisible();
    await expect(mainSection.getByRole('textbox', { name: 'Title' })).toHaveValue('Test service');
    await expect(mainSection.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Test service description',
    );
    const contentInput = mainSection.locator('[id="#/properties/about2"]');
    await contentInput.fill('Test');
    await contentInput.fill('Test service content');
    const draftButton = mainSection.getByRole('button', { name: 'Save draft' });
    await draftButton.click();
    await page
      .locator('nav')
      .getByRole('link', { name: 'Services', description: 'Services' })
      .click();
    await expect(page.locator('td').getByText('Test service')).toBeVisible();
    await expect(page.locator('td').getByText('draft')).toBeVisible();
  });

  test('Should display correct contents in application method modal for a newly created service', async ({
    page,
  }) => {
    const mainSection = await selectTestService(page);
    await expect(mainSection.getByText('Application methods', { exact: true })).toBeVisible();
    await expect(
      mainSection.getByText('No application methods yet — add a form a user can apply through.'),
    ).toBeVisible();
    const addButton = mainSection.getByRole('button', {
      name: 'Add application method',
    });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('New application method')).toBeVisible();
    await expect(modal.getByText('Choose how applicants apply for this service.')).toBeVisible();
    await expect(modal.getByText('Basic Form')).toBeVisible();
    await expect(
      modal.getByText('A single page of fields applicants complete and submit in one go.'),
    ).toBeVisible();
    await expect(modal.getByText('Multi-stage Form')).toBeVisible();
    await expect(
      modal.getByText('A guided flow split into stages, with conditional logic between them.'),
    ).toBeVisible();
    await expect(modal.getByText('External link')).toBeVisible();
    await expect(
      modal.getByText('Send applicants to a form or service hosted elsewhere.'),
    ).toBeVisible();
  });

  test('Should create and attach a test service agreement to an existing test service', async ({
    page,
    db,
  }) => {
    const mainSection = await addServiceAgreement(page, db);
    // Attach the test service agreement
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
    const testService = mainSection.locator('td').getByText('Test service');
    await expect(testService).toBeVisible();
    await testService.click();
    const serviceAgreementsTab = mainSection.locator('button').getByText('Service agreements');
    await serviceAgreementsTab.click();
    await mainSection.getByRole('button', { name: 'Add service agreement' }).click();
    await expect(page.getByText('Add a service agreement', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Choose a published agreement to attach.', {
        exact: true,
      }),
    ).toBeVisible();
    const testAgreementButton = page.getByRole('button', {
      name: 'Test service agreement',
    });
    await expect(testAgreementButton).toBeVisible();
    await testAgreementButton.click();
    await serviceAgreementsTab.click();
    // Expect test service agreement to be attached and displayed
    await expect(page.locator('li').getByText('Test service agreement')).toBeVisible();
    await expect(page.locator('li').getByText('Required')).toBeVisible();
    const removeAgreementButton = page.getByRole('button', { name: 'Remove' });
    await expect(removeAgreementButton).toBeVisible();
    await removeAgreementButton.click();
    // Expect test service agreement to be detached
    await expect(page.getByText('Remove this agreement from the service?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('li').getByText('Test service agreement')).not.toBeVisible();
    await expect(page.locator('li').getByText('Required')).not.toBeVisible();
    await expect(removeAgreementButton).not.toBeVisible();
  });

  test('Should create a basic form on a newly created service successfully', async ({ page }) => {
    const mainSection = await selectTestService(page);
    await mainSection.locator('button').getByText('Application Methods').click();
    await mainSection
      .getByRole('button', {
        name: 'Add application method',
      })
      .click();
    const formsModal = page.getByRole('dialog');
    await formsModal.getByRole('button', { name: 'Basic Form' }).click();
    await expect(mainSection.getByText('Build')).toBeVisible();
    await expect(mainSection.getByText('Preview')).toBeVisible();
    await expect(mainSection.getByRole('button', { name: 'Cancel' })).toBeVisible();
    const saveButton = mainSection.getByRole('button', { name: 'Save Form' });
    await expect(saveButton).toBeVisible();
    const titleInput = mainSection.locator('#canvas-form-title');
    const descriptionInput = mainSection.locator('#canvas-form-description');
    await expect(titleInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await titleInput.fill('Test title');
    await descriptionInput.fill('Test title description');
    await saveButton.click();
  });

  test('Should publish a service for a test service with an application method for a basic form', async ({
    page,
  }) => {
    const mainSection = await selectTestService(page);
    await mainSection.locator('button').getByText('Application Methods').click();
    await mainSection.getByRole('link', { name: 'Test title' }).click();
    await addCoreElement(page, 'Text', 1);
    await page.getByRole('button', { name: 'Save Form' }).click();
    const previewButton = mainSection.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expect(mainSection.getByText('Test text input', { exact: true })).toBeVisible();
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
    await page.locator('td').getByText('Test service').click();
    await page.locator('button').getByText('Application Methods').click();
    const publishButton = page.getByRole('button', {
      name: 'Publish service',
    });
    await expect(publishButton).toBeVisible();
    await publishButton.click();
    await expect(page.getByText('Publish service?')).toBeVisible();
    await expect(
      page.getByText('Publishing makes the service and its application methods live.'),
    ).toBeVisible();
    await expect(page.getByLabel('Publish service?').getByText('Test title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    await page.getByRole('button', { name: 'Publish' }).click();
    await page
      .locator('nav')
      .getByRole('link', { name: 'Services', description: 'Services' })
      .click();
    await expect(page.locator('td').getByText('published')).toBeVisible();
  });

  test('Should delete an existing services and service agreements', async ({ page }) => {
    const deleteDropdown = page.locator('td').locator('[aria-haspopup="menu"]');
    await expect(deleteDropdown).toBeVisible();
    await deleteDropdown.click();
    await expect(page.getByRole('menuitem', { name: 'Delete service' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Delete service' }).click();
    await expect(page.getByText('Delete this service?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('No services yet — create one with the New button.')).toBeVisible();
  });

  test('Delete remaining service agreements', async ({ db }) => {
    await removeServiceAgreements(db);
  });
});
