import {
  expectDateElement,
  expectDateRangeElement,
  expectDateTimeElement,
  expectTimeElement,
} from '../setup/client.services.utils';
import { test, expect } from '../setup/db.fixture';
import {
  addDateTimeElement,
  createBasicForm,
  createTestService,
  gotoApplication,
  platformLogin,
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
} from '../setup/platform.services.utils';

test.describe('Client Services Date & Time elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/services');
  });

  test('Should create test service with a basic form and date & time elements as a platform admin', async ({
    page,
  }) => {
    await platformLogin(page);
    await createTestService(page);
    await createBasicForm(page);
    // Date element
    await addDateTimeElement(page, 'Date', 1);
    // Date range element
    await addDateTimeElement(page, 'Date range', 2);
    // Date & Time element
    await addDateTimeElement(page, 'Date & time', 3);
    // Time element
    await addDateTimeElement(page, 'Time', 4);
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

  test('Should verify that test service application with a basic form and date & time elements has correct fields and interfaces on client portal', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
    // Expect date element
    await expectDateElement(page);
    // Expect date range element
    await expectDateRangeElement(page);
    // Expect date & time element
    await expectDateTimeElement(page);
    // Expect time element
    await expectTimeElement(page);
    // Expect submit button is available
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();
  });

  test('Should verify that the test service application is successfully submitted by the client', async ({
    page,
  }) => {
    // Fill out the form
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    await page.getByRole('textbox', { name: 'Test date input', exact: true }).fill('01-01-2026');
    await page
      .getByRole('textbox', { name: 'Test date range input', exact: true })
      .fill('02-02-2026');
    await page
      .getByRole('textbox', { name: 'Test date & time input', exact: true })
      .fill('03-03-2026');
    // Select hour for date & time input
    const selectHour1 = page.locator('[aria-label="Hour"]').first();
    await expect(selectHour1).toBeVisible();
    await selectHour1.click();
    await page.getByRole('option', { name: '9', exact: true }).click();
    // Select minute for date & time input
    const selectMinute1 = page.locator('[aria-label="Minute"]').first();
    await expect(selectMinute1).toBeVisible();
    await selectMinute1.click();
    await page.getByRole('option', { name: '30', exact: true }).click();
    // Select meridiem for date & time input
    const selectMeridiem1 = page.locator('[aria-label="AM or PM"]').first();
    await expect(selectMeridiem1).toBeVisible();
    await selectMeridiem1.click();
    await page.getByRole('option', { name: 'PM', exact: true }).click();
    // Select hour for time input
    const selectHour2 = page.locator('[aria-label="Hour"]').last();
    await expect(selectHour2).toBeVisible();
    await selectHour2.click();
    await page.getByRole('option', { name: '12', exact: true }).click();
    // Select minute for time input
    const selectMinute2 = page.locator('[aria-label="Minute"]').last();
    await expect(selectMinute2).toBeVisible();
    await selectMinute2.click();
    await page.getByRole('option', { name: '59', exact: true }).click();
    // Select meridiem for time input
    const selectMeridiem2 = page.locator('[aria-label="AM or PM"]').last();
    await expect(selectMeridiem2).toBeVisible();
    await selectMeridiem2.click();
    await page.getByRole('option', { name: 'PM', exact: true }).click();
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
    // Expect date & time elements
    await expectDateElement(page, '01/01/2026');
    await expectDateRangeElement(page, '02/02/2026');
    await expectDateTimeElement(page, {
      date: '03/03/2026',
      hour: '9',
      minute: '30',
      meridiem: 'PM',
    });
    await expectTimeElement(page, { hour: '12', minute: '59', meridiem: 'PM' });
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
    // Expect date & time elements
    await expectDateElement(page, '01/01/2026');
    await expectDateRangeElement(page, '02/02/2026');
    await expectDateTimeElement(page, {
      date: '03/03/2026',
      hour: '9',
      minute: '30',
      meridiem: 'PM',
    });
    await expectTimeElement(page, { hour: '12', minute: '59', meridiem: 'PM' });
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
