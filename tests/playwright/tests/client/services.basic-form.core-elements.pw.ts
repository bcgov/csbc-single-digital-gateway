import {
  expectBooleanElement,
  expectNumberElement,
  expectTextElement,
} from '../setup/client.services.utils';
import { test, expect } from '../setup/db.fixture';
import {
  addCoreElement,
  createBasicForm,
  createTestService,
  gotoApplication,
  platformLogin,
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
} from '../setup/platform.services.utils';

test.describe('Client Services Core Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/services');
  });

  test('Should create test service with a basic form and core elements as a platform admin', async ({
    page,
  }) => {
    await platformLogin(page);
    await createTestService(page);
    await createBasicForm(page);
    // Text element
    await addCoreElement(page, 'Text', 1);
    // Number element
    await addCoreElement(page, 'Number', 2);
    // Boolean element
    await addCoreElement(page, 'Boolean', 3);
    // Save form
    await page.getByRole('button', { name: 'Save Form' }).click();
    // Publish service
    await page.goto('http://localhost:3001/');
    await page.locator('nav').getByRole('link', { name: 'Services' }).click();
    await page.locator('td').getByText('Test service').click();
    await page.getByRole('button', { name: 'Publish service' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await page
      .locator('nav')
      .getByRole('link', { name: 'Services', description: 'Services' })
      .click();
    // Expect test service is published
    await expect(page.locator('td').getByText('published')).toBeVisible();
    // Expect published test service is available on client portal
    await page.goto('http://localhosT:3000/services');
    await expect(page.getByRole('link', { name: 'Test service', exact: true })).toBeVisible();
  });

  test('Should verify that test service application with a basic form and core elements has correct fields and interfaces', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
    // Expect text element
    await expectTextElement(page);
    // Expect number element
    await expectNumberElement(page);
    // Expect boolean element
    await expectBooleanElement(page);
    // Expect submit button is available
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();
  });

  test('Should verify that the test service application is successfully submitted by the client', async ({
    page,
  }) => {
    // Fill out the form
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    await page.getByRole('textbox', { name: 'Test text input' }).fill('Test text response');
    await page.getByRole('spinbutton', { name: 'Test number input' }).fill('2');
    await page.getByRole('checkbox', { name: 'Test boolean input' }).click();
    // Submit application
    await page.getByRole('button', { name: 'Submit application' }).click();
    // Expect application response page
    await expect(page.getByText('Application submitted')).toBeVisible();
    await expect(page.getByText('You can track its progress in your applications.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Track your applications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the service' })).toBeVisible();
    // Expect submitted status
    await page.goto('http://localhost:3000/services');
    await page.getByRole('link', { name: 'Test service' }).click();
    await expect(page.locator('#your-activity').getByText('Submitted')).toBeVisible();
  });

  test('Should verify that submitted test service application has correct values on the client portal', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.locator('#your-activity').getByRole('link', { name: 'Test title' }).click();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Test title' }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Test service' })).toBeVisible();
    // Expect application received
    await expect(page.getByText('Application received')).toBeVisible();
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
    await expect(
      page.getByText('We’ve received your application — it’s waiting to be reviewed.'),
    ).toBeVisible();
    // Expect application data
    await expect(page.getByText('Your answers')).toBeVisible();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Test title' }).last()).toBeVisible();
    await expect(page.getByText('Test title description')).toBeVisible();
    // Expect core elements
    await expectTextElement(page, 'Test text response');
    await expectNumberElement(page, '2');
    await expectBooleanElement(page, true);
  });

  test("Should verify that the test service application is pending on platform's submissions", async ({
    page,
  }) => {
    await platformLogin(page);
    await page.goto('http://localhost:3001');
    await page.getByRole('link', { name: 'Submissions' }).click();
    // Expect a pending application is available
    const applicationRow = page.getByRole('row', { name: 'Casey Citizen' });
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(1)).toHaveText('Test service');
    await expect(applicationRow.getByRole('cell').nth(2)).toHaveText('Test title');
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Pending');
    // Expect the application on pending tab
    await page.getByRole('tab', { name: 'Pending' }).click();
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Pending');
    // Expect the application is available upon searching
    const searchInput = page.getByRole('searchbox', { name: 'Search' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Casey Citizen');
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Pending');
    await searchInput.clear();
  });

  test("Should verify that the test service application has correct values on platform's submissions", async ({
    page,
  }) => {
    await gotoApplication(page);
    // Expect application title
    await expect(page.getByRole('link', { name: 'All submissions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Casey Citizen' })).toBeVisible();
    await expect(page.getByText('Test service · Test title')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    // Expect values for core elements
    await expectTextElement(page, 'Test text response');
    await expectNumberElement(page, '2');
    await expectBooleanElement(page, true);
    // Expect review content
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Add a note for the applicant' })).toBeVisible();
    // Buttons
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
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
