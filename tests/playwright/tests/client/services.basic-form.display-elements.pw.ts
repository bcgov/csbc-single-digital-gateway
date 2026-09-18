import { expectTextElement } from '../setup/client.services.utils';
import { test, expect } from '../setup/db.fixture';
import {
  addCoreElement,
  addDisplayElement,
  createBasicForm,
  createTestService,
  gotoApplication,
  platformLogin,
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
} from '../setup/platform.services.utils';

test.describe('Client Services Display Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/services');
  });

  test('Should create test service with a basic form and display elements as a platform admin', async ({
    page,
  }) => {
    await platformLogin(page);
    await createTestService(page);
    await createBasicForm(page);
    // Heading element
    await addDisplayElement(page, 'Heading');
    // Paragraph element
    await addDisplayElement(page, 'Paragraph');
    // Rich text element
    await addDisplayElement(page, 'Rich text');
    // Text element
    await addCoreElement(page, 'Text', 4);
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

  test('Should verify that test service application with a basic form and display elements has correct texts', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
    // Expect application heading and paragraph
    await expect(page.getByText('Test heading')).toBeVisible();
    await expect(page.getByText('Test paragraph')).toBeVisible();
    // Expect text element
    await expect(page.getByText('Test text input', { exact: true })).toBeVisible();
    await expect(page.getByText('Test text input description')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toBeVisible();
    // Expect submit button is available
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();
  });

  test('Should verify that the test service application is successfully submitted by the client', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    await page.getByRole('textbox', { name: 'Test text input' }).fill('Test text response');
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
    // Expect application title, heading and paragraph
    await expect(page.getByRole('heading', { name: 'Test title' }).last()).toBeVisible();
    await expect(page.getByText('Test title description')).toBeVisible();
    await expect(page.getByText('Test heading')).toBeVisible();
    await expect(page.getByText('Test paragraph')).toBeVisible();
    // Expect text element
    await expectTextElement(page, 'Test text response');
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

  test("Should verify that the test service application has correct answers on platform's submissions page", async ({
    page,
  }) => {
    await gotoApplication(page);
    // Expect application title
    await expect(page.getByRole('link', { name: 'All submissions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Casey Citizen' })).toBeVisible();
    await expect(page.getByText('Test service · Test title')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    // Expect application heading and paragraph
    await expect(page.getByText('Test heading')).toBeVisible();
    await expect(page.getByText('Test paragraph')).toBeVisible();
    // Expect text element
    await expectTextElement(page, 'Test text response');
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
