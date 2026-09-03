import { test, expect } from '../setup/db.fixture';

test.describe('Platform Submissions E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Submission' }).click();
  });

  test('Should display submissions header texts', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Submissions')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('Applications submitted for review.'),
    ).toBeVisible();
  });

  test('Should display status tabs content', async ({ page }) => {
    const mainSection = page.locator('main');
    // Header content
    await expect(mainSection.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(mainSection.getByRole('tab', { name: 'Pending' })).toBeVisible();
    await expect(mainSection.getByRole('tab', { name: 'In review' })).toBeVisible();
    await expect(mainSection.getByRole('tab', { name: 'Needs changes' })).toBeVisible();
    await expect(mainSection.getByRole('tab', { name: 'Approved' })).toBeVisible();
  });

  test('Should display submissions table content', async ({ page }) => {
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
