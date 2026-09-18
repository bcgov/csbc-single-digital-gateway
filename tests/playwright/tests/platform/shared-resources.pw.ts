import { test, expect } from '../setup/db.fixture';
import { removeServiceAgreements } from '../setup/platform.services.utils';

test.describe('Platform Shared Resources E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Shared Resources' }).click();
  });

  test('Should display correct shared resources content', async ({ page }) => {
    await expect(page.locator('h1').getByText('Shared Resources')).toBeVisible();
    await expect(
      page.getByText('Resources shared across the services in this workspace.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Service Agreements' })).toBeVisible();
    await expect(page.getByText('Terms applicants approve before applying.')).toBeVisible();
  });

  test('Should display table content', async ({ page }) => {
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    const main = page.locator('main');
    await expect(main.locator('th').getByText('Title')).toBeVisible();
    await expect(main.locator('th').getByText('Status')).toBeVisible();
    await expect(main.locator('th').getByText('Updated')).toBeVisible();
    await expect(
      main.getByText('No service agreements yet — create one with the New button.'),
    ).toBeVisible();
  });

  test('Should display correct service agreement content', async ({ page }) => {
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    const newAgreementButton = page.getByRole('button', { name: 'New agreement' });
    await expect(newAgreementButton).toBeVisible();
    await newAgreementButton.click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await expect(modal.getByText('New service agreement')).toBeVisible();
    await expect(
      modal.getByText(
        'Give the agreement a title and description — you can write its content and options after it’s created.',
      ),
    ).toBeVisible();
    await expect(modal.getByLabel('Title')).toBeVisible();
    await expect(modal.getByLabel('Description')).toBeVisible();
    await expect(modal.getByRole('textbox', { name: 'Title' })).toBeVisible();
    await expect(modal.getByRole('textbox', { name: 'Description' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Create agreement' })).toBeVisible();
  });

  test('Should create a new service agreement successfully', async ({ page }) => {
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    await page.getByRole('button', { name: 'New agreement' }).click();
    const modal = page.locator('[data-slot="dialog-content"]');
    await modal.getByRole('textbox', { name: 'Title' }).fill('Test service agreement title');
    await modal
      .getByRole('textbox', { name: 'Description' })
      .fill('Test service agreement description');
    await modal.getByRole('button', { name: 'Create agreement' }).click();
    // Expect service agreement form fields
    await expect(page.getByRole('heading', { name: 'Test service agreement title' })).toBeVisible();
    await expect(page.getByText('Associated services')).toBeVisible();
    await expect(
      page.getByText(
        "Not attached to any service yet — attach it from a service's Service agreements tab.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel('Title')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByLabel('Content')).toBeVisible();
    await expect(page.getByLabel('Approve label')).toBeVisible();
    await expect(page.getByLabel('Reject label')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Title' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Test service agreement title',
    );
    await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Test service agreement description',
    );
    await expect(page.getByRole('textbox', { name: 'Content' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Approve label' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Reject label' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Optional' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Version v1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    // Fill service agreement form
    await page.getByRole('textbox', { name: 'Content' }).fill('Test service agreement content');
    await page.getByRole('textbox', { name: 'Approve label' }).fill('Approved');
    await page.getByRole('textbox', { name: 'Reject label' }).fill('Rejected');
    await page.getByRole('checkbox', { name: 'Optional' }).click();
    // Save and publish the form
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    // Expect workspace default version button
    await expect(page.getByRole('switch', { name: 'Workspace default' })).toBeVisible();
    // Expect version v1 published
    await page.getByRole('button', { name: 'Version v1' }).click();
    await expect(page.getByRole('menuitem', { name: 'v1 published' })).toBeVisible();
    // Expect new version button
    await expect(page.getByRole('button', { name: 'New version' })).toBeVisible();
  });

  test('Should display updated table content after a service agreement is published', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    await expect(page.getByRole('row')).toHaveCount(2);
    await expect(page.getByRole('row').first()).toContainText('Title');
    await expect(page.getByRole('row').first()).toContainText('Status');
    await expect(page.getByRole('row').first()).toContainText('Updated');
    await expect(page.getByRole('row').last()).toContainText('Test service agreement title');
    await expect(page.getByRole('row').last()).toContainText('published');
    await expect(page.getByRole('row').last()).toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });

  test('Should update the service agreement version successfully', async ({ page }) => {
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    await page.getByRole('link', { name: 'Test service agreement title' }).click();
    await page.getByRole('button', { name: 'New version' }).click();
    await page
      .getByRole('textbox', { name: 'Title' })
      .fill('Test service agreement title version 2');
    await page
      .getByRole('textbox', { name: 'Description' })
      .fill('Test service agreement content version 2');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    // Expect version v2 published
    await page.getByRole('button', { name: 'Version v2' }).click();
    await expect(page.getByRole('menuitem', { name: 'v2 published' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'v1 archived' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'v2 published' }).click();
    // Expect updated table content
    await page.getByRole('link', { name: 'Service agreements' }).click();
    await expect(page.getByRole('row').last()).toContainText(
      'Test service agreement title version 2',
    );
    // Expect updated title
    await page.getByRole('link', { name: 'Test service agreement title version 2' }).click();
    await expect(
      page.getByRole('heading', { name: 'Test service agreement title version 2' }),
    ).toBeVisible();
  });

  test('Remove test services and submissions', async ({ db, page }) => {
    await removeServiceAgreements(db);
    // Expect no service agreements
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Shared Resources' }).click();
    await page.getByRole('link', { name: 'Service Agreements' }).click();
    await expect(
      page.getByText('No service agreements yet — create one with the New button.'),
    ).toBeVisible();
  });
});
