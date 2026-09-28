import { modifySubmission } from '../setup/client.services.utils';
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

test.describe('Client Services E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/services');
  });

  test('Should create a test service with basic form and a text element as a platform admin for a client user to use', async ({
    page,
  }) => {
    await platformLogin(page);
    await createTestService(page);
    await createBasicForm(page);
    // Heading element
    await addDisplayElement(page, 'Heading');
    // Paragraph element
    await addDisplayElement(page, 'Paragraph');
    // Text element
    await addCoreElement(page, 'Text', 3);
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

  test('Should verify that published test service is accessible on client portal', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    // Expect header content
    await expect(page.getByRole('heading', { name: 'Test service' })).toBeVisible();
    await expect(page.getByText('Test service description')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start an application' })).toBeVisible();
    // Expect index content
    await expect(page.getByText('On this page')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Eligibility criteria' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'How to apply' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Your activity' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Help and information' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact information' }).first()).toBeVisible();
    // Expect overview content
    await expect(page.getByRole('heading', { name: 'Overview' }).last()).toBeVisible();
    await expect(page.getByText('Cost')).toBeVisible();
    await expect(page.getByText('Free')).toBeVisible();
    await expect(page.getByText('Processing time')).toBeVisible();
    await expect(page.getByText('2–4 weeks')).toBeVisible();
    await expect(page.locator('#overview').getByText('How to apply')).toBeVisible();
    await expect(page.getByText('Online')).toBeVisible();
    await expect(page.getByText('About', { exact: true })).toBeVisible();
    await expect(page.getByText('Test service content')).toBeVisible();
    // Expect eligibility criteria content
    await expect(page.getByText('Eligibility criteria').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Age' })).toBeVisible();
    // Age
    await page.getByRole('button', { name: 'Age' }).click();
    await expect(
      page.getByText('You must be 19 years of age or older to apply on your own behalf.'),
    ).toBeVisible();
    // Income
    await expect(page.getByRole('button', { name: 'Income' })).toBeVisible();
    await page.getByRole('button', { name: 'Income' }).click();
    await expect(
      page.getByText('Your household income and assets must be below the program thresholds.'),
    ).toBeVisible();
    // Residency
    await expect(page.getByRole('button', { name: 'Residency' })).toBeVisible();
    await page.getByRole('button', { name: 'Residency' }).click();
    await expect(
      page.getByText('You must be a resident of British Columbia and eligible to work in Canada.'),
    ).toBeVisible();
    // Expect how to apply content
    await expect(page.getByRole('heading', { name: 'How to apply' }).last()).toBeVisible();
    await expect(page.locator('#how-to-apply').getByText('Test title')).toBeVisible();
    await expect(page.getByText('Apply through the Single Digital Gateway.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start an application' })).toBeVisible();
    // Expect your activity content
    await expect(page.getByRole('heading', { name: 'Your activity' }).last()).toBeVisible();
    await expect(page.getByText('No applications yet')).toBeVisible();
    await expect(
      page.getByText(
        'When you apply for this service, you’ll see your applications and their status here.',
      ),
    ).toBeVisible();
    // Expect help and information
    await expect(page.getByRole('heading', { name: 'Help and information' }).last()).toBeVisible();
    await page.getByRole('button', { name: 'Guides and resources' }).click();
    await expect(
      page.getByText('Step-by-step guides and frequently asked questions for this service.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Policy and legislation' }).click();
    await expect(
      page.getByText('The policies and legislation that govern this service.'),
    ).toBeVisible();
    // Expect contact information
    await expect(page.getByRole('heading', { name: 'Contact information' }).last()).toBeVisible();
    await expect(page.getByText('No contact information for this service yet.')).toBeVisible();
  });

  test('Should verify that test service application has correct fields and interfaces', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    // Expect application title
    await expect(page.getByRole('heading', { name: 'Apply — Test title' })).toBeVisible();
    // Expect application heading and paragraph
    await expect(page.getByText('Test heading')).toBeVisible();
    await expect(page.getByText('Test paragraph')).toBeVisible();
    // Expect text field is visible
    await expect(page.getByText('Test text input', { exact: true })).toBeVisible();
    await expect(page.getByText('Test text input description')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toBeVisible();
    // Expect submit button is available
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();
    // Expect the draft version is created
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await expect(page.locator('#your-activity').getByText('Draft')).toBeVisible();
  });

  test('Should verify that the test service application is successfully submitted', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Test service', exact: true }).click();
    await page.getByRole('link', { name: 'Start an application' }).click();
    await page.getByRole('textbox', { name: 'Test text input' }).fill('test text response');
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

  test('Should verify that submitted test service application has correct data', async ({
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
    // Expect text field has correct value
    await expect(page.getByText('Test text input', { exact: true })).toBeVisible();
    await expect(page.getByText('Test text input description')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toHaveValue(
      'test text response',
    );
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

  test('Should verify that the test service application has correct answers', async ({ page }) => {
    await gotoApplication(page);
    // Expect application title
    await expect(page.getByRole('link', { name: 'All submissions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Casey Citizen' })).toBeVisible();
    await expect(page.getByText('Test service · Test title')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    // Expect application heading and paragraph
    await expect(page.getByText('Test heading')).toBeVisible();
    await expect(page.getByText('Test paragraph')).toBeVisible();
    // Expect text field has correct value
    await expect(page.getByText('Test text input', { exact: true })).toBeVisible();
    await expect(page.getByText('Test text input description')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toBeVisible();
    // Expect review content
    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Add a note for the applicant' })).toBeVisible();
    // Buttons
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
  });

  test('Should verify the status of the test service application when it is approved', async ({
    page,
  }) => {
    await gotoApplication(page);
    // Expect review content
    await page.getByRole('textbox', { name: 'Add a note for the applicant' }).fill('Approved');
    // Buttons
    await page.getByRole('button', { name: 'Approve' }).click();
    // Expect history
    await expect(
      page.getByText('This submission is Approved and has been actioned.'),
    ).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Approved' })).toHaveCount(2);
    // Expect approved status on submissions page
    await page.getByRole('link', { name: 'Submissions', description: 'Submissions' }).click();
    const applicationRow = page.getByRole('row', { name: 'Casey Citizen' });
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Approved');
    // Expect approved application on approved tab
    await page.getByRole('tab', { name: 'Approved' }).click();
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Approved');
    // Expect the application is available upon searching
    await page.getByRole('searchbox', { name: 'Search' }).fill('Casey Citizen');
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Approved');
  });

  test('Should verify that the test service application is approved on the client portal', async ({
    page,
  }) => {
    // Expect the approved status on the dashboard page
    await page.goto('http://localhost:3000');
    await expect(page.getByText('Approved')).toBeVisible();
    // Expect the approved status on the application page
    await page
      .locator('section')
      .filter({ hasText: 'Track your applicationsTest' })
      .getByRole('link', { name: 'Test service' })
      .click();
    await expect(page.getByText('Approved')).toBeVisible();
  });

  test('Should verify the status of the test service application when it needs changes', async ({
    page,
    db,
  }) => {
    await modifySubmission(db, 'needs_changes', 'Needs changes');
    // Expect changes on platform portal
    await gotoApplication(page);
    // Expect history
    await expect(
      page.getByText('This submission is Needs changes and has been actioned.'),
    ).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Needs changes' })).toHaveCount(2);
    // Expect Needs changes status on submissions page
    await page.getByRole('link', { name: 'Submissions', description: 'Submissions' }).click();
    const applicationRow = page.getByRole('row', { name: 'Casey Citizen' });
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Needs changes');
    // Expect Needs changes application on Needs changes tab
    await page.getByRole('tab', { name: 'Needs changes' }).click();
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Needs changes');
    // Expect the application is available upon searching
    await page.getByRole('searchbox', { name: 'Search' }).fill('Casey Citizen');
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Needs changes');
    // Expect the Action needed status on the dashboard page
    await page.goto('http://localhost:3000');
    await expect(page.getByText('Action needed')).toBeVisible();
    // Expect the Action needed status on the application page
    await page
      .locator('section')
      .filter({ hasText: 'Track your applicationsTest' })
      .getByRole('link', { name: 'Test service' })
      .click();
    await expect(page.getByText('Action needed')).toBeVisible();
    await expect(
      page.getByText('The reviewer has asked for some changes before this can go ahead.'),
    ).toBeVisible();
    await expect(page.getByText('“Needs changes')).toBeVisible();
    const makeChangesButton = page.getByRole('button', { name: 'Make changes' });
    await expect(makeChangesButton).toBeVisible();
    // Expect input fields are available for making changes
    await makeChangesButton.click();
    await expect(page.getByText('Test text input', { exact: true })).toBeVisible();
    await expect(page.getByText('Test text input description')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toBeVisible();
    // Apply changes to text field
    await page.getByRole('textbox', { name: 'Test text input' }).fill('test make changes response');
    await page.getByRole('button', { name: 'Submit application' }).click();
    // Expect application status after making changes
    await expect(page.getByText('Application received')).toBeVisible();
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
    await expect(
      page.getByText('We’ve received your application — it’s waiting to be reviewed.'),
    ).toBeVisible();
    // Expect application's pending status on platform portal after making changes
    await page.goto('http://localhost:3001');
    await page.getByRole('link', { name: 'Submissions' }).click();
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Pending');
    // Expect text field is changed on the application on platform portal
    await page.locator('td').getByRole('link', { name: 'Casey Citizen' }).click();
    await expect(page.getByRole('textbox', { name: 'Test text input' })).toHaveValue(
      'test make changes response',
    );
  });

  test('Should verify the status of the test service application when it rejected', async ({
    page,
    db,
  }) => {
    await modifySubmission(db, 'rejected', 'Rejected');
    // Expect changes on platform portal
    await gotoApplication(page);
    // Expect history
    await expect(
      page.getByText('This submission is Rejected and has been actioned.'),
    ).toBeVisible();
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Rejected' })).toHaveCount(2);
    // Expect Rejected status on submissions page
    await page.getByRole('link', { name: 'Submissions', description: 'Submissions' }).click();
    const applicationRow = page.getByRole('row', { name: 'Casey Citizen' });
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Rejected');
    // Expect the application is available upon searching
    await page.getByRole('searchbox', { name: 'Search' }).fill('Casey Citizen');
    await expect(applicationRow).toBeVisible();
    await expect(applicationRow.getByRole('cell').nth(3)).toHaveText('Rejected');
    // Expect the Rejected status on the dashboard page
    await page.goto('http://localhost:3000');
    await expect(page.getByText('Rejected')).toBeVisible();
    // Expect the Rejected status on the application page
    await page
      .locator('section')
      .filter({ hasText: 'Track your applicationsTest' })
      .getByRole('link', { name: 'Test service' })
      .click();
    await expect(page.getByText('Rejected')).toBeVisible();
    await expect(page.getByText('Not approved', { exact: true })).toBeVisible();
    await expect(page.getByText('This application was not approved.')).toBeVisible();
    await expect(page.getByText('“Rejected”')).toBeVisible();
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
