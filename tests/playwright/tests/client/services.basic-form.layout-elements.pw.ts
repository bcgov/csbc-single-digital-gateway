import {
  expectBooleanElement,
  expectCheckboxGroupElement,
  expectDateElement,
  expectDateRangeElement,
  expectDateTimeElement,
  expectNumberElement,
  expectRadioElement,
  expectSelectElement,
  expectTextElement,
  expectTimeElement,
} from '../setup/client.services.utils';
import { test, expect } from '../setup/db.fixture';
import {
  addDateTimeElementsToHorizontalElement,
  addElementsToLayoutElement,
  createBasicForm,
  createTestService,
  gotoApplication,
  platformLogin,
  removeServiceAgreements,
  removeServices,
  removeSubmissions,
} from '../setup/platform.services.utils';

test.describe('Client Services Layout Elements E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/services');
  });

  test.describe('Client Services Group Element E2E Tests', () => {
    test('Should create test service with a basic form and a group element as a platform admin', async ({
      page,
    }) => {
      await platformLogin(page);
      await createTestService(page);
      await createBasicForm(page);
      // Add elements to a group element
      await addElementsToLayoutElement(page, 'Group', {
        disableAdvancedElements: true,
      });
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

    test('Should verify that test service application with a basic form and a group element has correct fields and interfaces', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Test service', exact: true }).click();
      await page.getByRole('link', { name: 'Start an application' }).click();
      // Expect application title
      await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
      // Expect core elements
      await expectTextElement(page);
      await expectNumberElement(page);
      await expectBooleanElement(page);
      // Expect choice elements
      await expectCheckboxGroupElement(page);
      await expectRadioElement(page);
      await expectSelectElement(page);
      // // Expect date & time elements
      await expectDateElement(page);
      await expectDateRangeElement(page);
      await expectDateTimeElement(page);
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
      // Core elements
      await page.getByRole('textbox', { name: 'Test text input' }).fill('Test text response');
      await page.getByRole('spinbutton', { name: 'Test number input' }).fill('2');
      await page.getByRole('checkbox', { name: 'Test boolean input' }).click();
      // Choice elements
      await page.getByRole('checkbox', { name: 'Test checkbox group option 1' }).click();
      await page.getByRole('radio', { name: 'Test radio option 1' }).click();
      const selectDropDown = page
        .locator('[aria-haspopup="listbox"]')
        .filter({ hasText: 'Select' });
      await expect(selectDropDown).toBeVisible();
      await selectDropDown.click();
      await page.getByRole('option', { name: 'Test select option 1' }).click();
      // Date & time elements
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
      await expect(
        page.getByText('You can track its progress in your applications.'),
      ).toBeVisible();
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
      // Expect core elements
      await expectTextElement(page, 'Test text response');
      await expectNumberElement(page, '2');
      await expectBooleanElement(page, true);
      // Expect choice elements
      await expectCheckboxGroupElement(page, '1');
      await expectRadioElement(page, '1');
      await expectSelectElement(page, '1');
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

    test("Should verify that the test service application has correct values on platform's submissions", async ({
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
      // Expect core elements
      await expectTextElement(page, 'Test text response');
      await expectNumberElement(page, '2');
      await expectBooleanElement(page, true);
      // Expect choice elements
      await expectCheckboxGroupElement(page, '1');
      await expectRadioElement(page, '1');
      await expectSelectElement(page, '1');
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
      await expect(
        page.getByRole('textbox', { name: 'Add a note for the applicant' }),
      ).toBeVisible();
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

  test.describe('Client Services Horizontal Element E2E Tests', () => {
    test('Should create test service with a basic form and a horizontal element as a platform admin', async ({
      page,
    }) => {
      await platformLogin(page);
      await createTestService(page);
      await createBasicForm(page);
      // Add elements to a horizontal element
      const { layoutCount } = await addElementsToLayoutElement(page, 'Horizontal', {
        disableAdvancedElements: true,
        disableDateTimeElements: true,
      });
      // Add date & time elements
      await addDateTimeElementsToHorizontalElement(page, layoutCount);
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

    test('Should verify that test service application with a basic form and a horizontal element has correct fields and interfaces', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Test service', exact: true }).click();
      await page.getByRole('link', { name: 'Start an application' }).click();
      // Expect application title
      await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
      // Expect core elements
      await expectTextElement(page);
      await expectNumberElement(page);
      await expectBooleanElement(page);
      // Expect choice elements
      await expectCheckboxGroupElement(page);
      await expectRadioElement(page);
      await expectSelectElement(page);
      // Expect date & time element
      await expectDateElement(page);
      await expectDateRangeElement(page);
      await expectDateTimeElement(page);
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
      // Core elements
      await page.getByRole('textbox', { name: 'Test text input' }).fill('Test text response');
      await page.getByRole('spinbutton', { name: 'Test number input' }).fill('2');
      await page.getByRole('checkbox', { name: 'Test boolean input' }).click();
      // Choice elements
      await page.getByRole('checkbox', { name: 'Test checkbox group option 1' }).click();
      await page.getByRole('radio', { name: 'Test radio option 1' }).click();
      const selectDropDown = page
        .locator('[aria-haspopup="listbox"]')
        .filter({ hasText: 'Select' });
      await expect(selectDropDown).toBeVisible();
      await selectDropDown.click();
      await page.getByRole('option', { name: 'Test select option 1' }).click();
      // Date & time elements
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
      await expect(
        page.getByText('You can track its progress in your applications.'),
      ).toBeVisible();
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
      // Expect core elements
      await expectTextElement(page, 'Test text response');
      await expectNumberElement(page, '2');
      await expectBooleanElement(page, true);
      // Expect choice elements
      await expectCheckboxGroupElement(page, '1');
      await expectRadioElement(page, '1');
      await expectSelectElement(page, '1');
      // Expect date & time element
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

    test("Should verify that the test service application has correct values on platform's submissions", async ({
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
      // Expect core elements
      await expectTextElement(page, 'Test text response');
      await expectNumberElement(page, '2');
      await expectBooleanElement(page, true);
      // Expect choice elements
      await expectCheckboxGroupElement(page, '1');
      await expectRadioElement(page, '1');
      await expectSelectElement(page, '1');
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
      await expect(
        page.getByRole('textbox', { name: 'Add a note for the applicant' }),
      ).toBeVisible();
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
});
