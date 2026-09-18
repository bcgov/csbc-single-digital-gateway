import { test, expect } from '../setup/db.fixture';
import {
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
} from '../setup/platform.services.utils';

test.describe('Platform Overview E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
  });

  test('Should display correct heading content', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('A snapshot of activity across your workspace.')).toBeVisible();
  });

  test('Should display correct create new service button and modal', async ({ page }) => {
    const main = page.locator('main');
    const createServiceButton = main.getByRole('button', { name: 'Create new service' });
    await expect(createServiceButton).toBeVisible();
    await createServiceButton.click();
    const createServiceModal = page.locator('[data-slot="dialog-content"]');
    await expect(
      createServiceModal.getByRole('heading', { name: 'Create New Service' }),
    ).toBeVisible();
    await expect(createServiceModal.getByText('Name & description')).toBeVisible();
    await expect(createServiceModal.getByLabel('Name of the service')).toBeVisible();
    await expect(createServiceModal.getByLabel('Short description')).toBeVisible();
    await expect(
      createServiceModal.getByRole('textbox', { name: 'Name of the service' }),
    ).toBeVisible();
    await expect(
      createServiceModal.getByRole('textbox', { name: 'Short description' }),
    ).toBeVisible();
    await expect(createServiceModal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(createServiceModal.getByRole('button', { name: 'Create service' })).toBeVisible();
  });

  test('Should display correct content for the analytics section', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText('Analytics')).toBeVisible();
    await expect(main.getByText('Page Views')).toBeVisible();
  });

  test('Should display correct content for the recently updated section', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.getByText('Services')).toBeVisible();
    await expect(main.getByText('No services yet — create one to get started.')).toBeVisible();
  });

  test('Should display correct content for the resources section', async ({ page }) => {
    const main = page.locator('main');
    const learnMoreAccordion = main.locator('[data-slot="accordion"]').first();
    await expect(learnMoreAccordion).toBeVisible();
    // Expect Learn More row to be visible
    await expect(learnMoreAccordion.locator('button').first()).toHaveText('Learn More');
    await expect(
      learnMoreAccordion.getByRole('link', { name: 'Service Catalogue Documentation' }),
    ).toBeVisible();
    await expect(
      learnMoreAccordion.getByRole('link', { name: 'Service Catalogue Playground' }),
    ).toBeVisible();
    // Expect Legal row to be visible
    const legalAccordion = main.locator('[data-slot="accordion"]').last();
    await legalAccordion.click();
    await expect(legalAccordion.locator('button').first()).toHaveText('Legal');
    await expect(legalAccordion.getByRole('link', { name: 'Disclaimer' })).toBeVisible();
    await expect(legalAccordion.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(legalAccordion.getByRole('link', { name: 'Terms of Use' })).toBeVisible();
    await expect(legalAccordion.getByRole('link', { name: 'Accessibility' })).toBeVisible();
    await expect(legalAccordion.getByRole('link', { name: 'Copyright' })).toBeVisible();
  });

  test('Should create new service from the overview page', async ({ page }) => {
    const main = page.locator('main');
    await main.getByRole('button', { name: 'Create new service' }).click();
    const createServiceModal = page.locator('[data-slot="dialog-content"]');
    await createServiceModal
      .getByRole('textbox', { name: 'Name of the service' })
      .fill('Test service');
    await createServiceModal
      .getByRole('textbox', { name: 'Short description' })
      .fill('Test service description');
    await createServiceModal.getByRole('button', { name: 'Create service' }).click();
    // Expect test service is created and displayed on the overview page
    await page.locator('header').getByRole('link', { name: 'Overview' }).click();
    await expect(main.getByRole('link', { name: 'Test service' })).toBeVisible();
    await expect(main.getByText('draft')).toBeVisible();
    await expect(main.getByText('Last updated')).toBeVisible();
  });

  test('Remove test services and submissions', async ({ db, page }) => {
    await removeSubmissions(db);
    await removeServiceAgreements(db);
    await removeServices(db);
    // Expect no services
    await page.goto('http://localhost:3000/services');
    await expect(page.getByText('No services found')).toBeVisible();
  });
});
