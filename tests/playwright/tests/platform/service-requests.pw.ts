import { test, expect } from '../setup/db.fixture';

test.describe('Platform Service Requests E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Sample1 Admin' }).click();
    await page.getByRole('link', { name: 'Service Requests' }).click();
  });

  test('Should display service requests title text', async ({ page }) => {
    await expect(page.locator('h1').getByText('Service Requests')).toBeVisible();
  });

  test('Should display status tabs content', async ({ page }) => {
    const main = page.locator('main');
    // Header content
    await expect(main.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(main.getByRole('tab', { name: 'Pending' })).toBeVisible();
    await expect(main.getByRole('tab', { name: 'In review' })).toBeVisible();
    await expect(main.getByRole('tab', { name: 'Needs changes' })).toBeVisible();
    await expect(main.getByRole('tab', { name: 'Approved' })).toBeVisible();
  });

  test('Should display table content', async ({ page }) => {
    const mainSection = page.locator('main');
    await expect(mainSection.locator('th').getByText('Applicant')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Service')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Application')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Status')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Submitted')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Updated')).toBeVisible();
    await expect(
      mainSection.getByText('No submissions yet — they appear here once applicants submit.'),
    ).toBeVisible();
  });

  test('Should display search input component', async ({ page }) => {
    const mainSection = page.locator('main');
    const searchInput = mainSection.locator('input');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search applicant, service, ref…');
    await searchInput.fill('hello');
    await expect(mainSection.getByText('No submissions match “hello”.')).toBeVisible();
  });
});
