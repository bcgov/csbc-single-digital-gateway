import { test, expect } from '../setup/db.fixture';
import {
  addCoreElement,
  addServiceAgreement,
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
  selectTestService,
} from '../setup/platform.services.utils';

test.describe('Platform Services E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Services' }).click();
  });

  test('Should display services texts when there is no service', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Services' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'New' })).toBeVisible();
    await expect(main.getByText('No services yet — create one with the New button.')).toBeVisible();
  });

  test('Should create a new service successfully', async ({ page }) => {
    const main = page.locator('main');
    await main.getByRole('button', { name: 'New' }).click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await expect(modal.getByText('Create New service')).toBeVisible();
    await expect(modal.getByText('Name & description')).toBeVisible();
    await expect(modal.getByLabel('Name of the service')).toBeVisible();
    await expect(modal.getByLabel('Short description')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create service' })).toBeVisible();
    await modal.getByRole('textbox', { name: 'Name of the service' }).fill('Test service');
    await modal
      .getByRole('textbox', { name: 'Short description' })
      .fill('Test service description');
    await modal.getByRole('button', { name: 'Create service' }).click();
    // Expect test service is created and displayed on the overview page
    await page.locator('header').getByRole('link', { name: 'Overview' }).click();
    await expect(main.getByRole('link', { name: 'Test service' })).toBeVisible();
    await expect(main.getByText('draft')).toBeVisible();
    await expect(main.getByText('Last updated')).toBeVisible();
  });

  test('Should display correct service sections for a newly created service', async ({ page }) => {
    await page.getByRole('link', { name: 'Test service' }).click();
    const nav = page.locator('[aria-label="Service sections"]');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Service details' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Service requests' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.locator('main').getByText('Test service')).toBeVisible();
    // Expect dashboard content
    await expect(page.getByText('Dashboard')).toHaveCount(2);
    await expect(page.getByText('This section is coming soon.')).toBeVisible();
  });

  test('Should display correct service details content for a newly created service', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service' }).click();
    const nav = page.locator('[aria-label="Service sections"]');
    await nav.getByRole('link', { name: 'Service details' }).click();
    // Expect service details content
    await expect(page.getByText('Service details')).toHaveCount(2);
    await expect(page.getByText('This section is coming soon.')).toBeVisible();
  });

  test('Should display correct service requests content for a newly created service', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service' }).click();
    const nav = page.locator('[aria-label="Service sections"]');
    await nav.getByRole('link', { name: 'Service requests' }).click();
    // Expect service requests content
    await expect(page.getByText('Service requests')).toHaveCount(3);
    await expect(page.getByText('This section is coming soon.')).toBeVisible();
  });

  test('Should display correct analytics content for a newly created service', async ({ page }) => {
    await page.getByRole('link', { name: 'Test service' }).click();
    const nav = page.locator('[aria-label="Service sections"]');
    await nav.getByRole('link', { name: 'Analytics' }).click();
    // Expect analytics content
    await expect(page.getByText('Analytics')).toHaveCount(2);
    await expect(page.getByText('This section is coming soon.')).toBeVisible();
  });

  test('Should display correct settings content for a newly created service', async ({ page }) => {
    await page.getByRole('link', { name: 'Test service' }).click();
    const nav = page.locator('[aria-label="Service sections"]');
    await nav.getByRole('link', { name: 'Settings' }).click();
    // Expect settings content
    await expect(page.getByText('Settings')).toHaveCount(3);
    await expect(page.getByText('This section is coming soon.')).toBeVisible();
  });

  test.skip('Should display correct contents in application method modal for a newly created service', async ({
    page,
  }) => {
    const main = await selectTestService(page);
    await expect(main.getByText('Application methods', { exact: true })).toBeVisible();
    await expect(
      main.getByText('No application methods yet — add a form a user can apply through.'),
    ).toBeVisible();
    const addButton = main.getByRole('button', {
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

  test.skip('Should create and attach a test service agreement to an existing test service', async ({
    page,
    db,
  }) => {
    await addServiceAgreement(page, db);
    // Attach the test service agreement
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
    const testService = page.locator('td').getByText('Test service');
    await expect(testService).toBeVisible();
    await testService.click();
    const serviceAgreementsTab = page.locator('button').getByText('Service agreements');
    await serviceAgreementsTab.click();
    await page.getByRole('button', { name: 'Add service agreement' }).click();
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

  test.skip('Should create a basic form on a newly created service successfully', async ({
    page,
  }) => {
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
  });

  test.skip('Should publish a service for a test service with an application method for a basic form', async ({
    page,
  }) => {
    const main = await selectTestService(page);
    await main.locator('button').getByText('Application Methods').click();
    await main.getByRole('link', { name: 'Test title' }).click();
    await addCoreElement(page, 'Text', 1);
    await page.getByRole('button', { name: 'Save Form' }).click();
    const previewButton = main.getByText('Preview');
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expect(main.getByText('Test text input', { exact: true })).toBeVisible();
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

  test.skip('Should delete an existing services and service agreements', async ({ page }) => {
    const deleteDropdown = page.locator('td').locator('[aria-haspopup="menu"]');
    await expect(deleteDropdown).toBeVisible();
    await deleteDropdown.click();
    await expect(page.getByRole('menuitem', { name: 'Delete service' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Delete service' }).click();
    await expect(page.getByText('Delete this service?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('No services yet — create one with the New button.')).toBeVisible();
  });

  test('Remove test services and submissions', async ({ db, page }) => {
    await removeSubmissions(db);
    await removeServiceAgreements(db);
    await removeServices(db);
    // Expect no services
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Services' }).click();
    await expect(page.getByText('No services yet — create one with the New button.')).toBeVisible();
  });
});
