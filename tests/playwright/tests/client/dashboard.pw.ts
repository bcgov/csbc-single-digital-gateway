import { test, expect } from '@playwright/test';

test.describe('Client Dashboard E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Should display header content after successful login', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.getByText('Single Digital Gateway')).toBeVisible();
    await expect(
      headerSection.getByLabel('Primary').getByRole('link', { name: 'Home' }),
    ).toBeVisible();
    await expect(
      headerSection.getByLabel('Primary').getByRole('link', { name: 'Services' }),
    ).toBeVisible();
  });

  test('Should display greeting content after successful login', async ({ page }) => {
    await expect(page.getByText('Hi, citizen1@example.com')).toBeVisible();
    await expect(page.getByText('Welcome to MyBC.')).toBeVisible();
  });

  test('Should display track your applications component when there is no application after successful login', async ({
    page,
  }) => {
    await expect(page.getByText('Track your applications')).toBeVisible();
    await expect(page.getByText('You have no applications to track')).toBeVisible();
    await expect(
      page.getByText('When you apply for a service, you’ll  be able to track its status here.'),
    ).toBeVisible();
  });

  test('Should display available services when there is no available services after successful login', async ({
    page,
  }) => {
    await expect(page.getByText('Available services')).toBeVisible();
    await expect(
      page.getByText(
        'Here are some services currently available through the Single Digital Gateway.',
      ),
    ).toBeVisible();
  });

  test('Should display what you can do component after successful login', async ({ page }) => {
    await expect(page.getByText('What you can do')).toBeVisible();
    await expect(
      page.getByText(
        'The Single Digital Gateway makes it easier to find and use government services online.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'The Single Digital Gateway makes it easier to find and use government services online.',
      ),
    ).toBeVisible();
    // Discover services
    await expect(page.getByText('Discover services')).toBeVisible();
    await expect(page.getByText('Browse and search for government services.')).toBeVisible();
    // Apply and track your requests
    await expect(page.getByText('Apply and track your requests')).toBeVisible();
    await expect(
      page.getByText('Submit applications online and check the status of your requests.'),
    ).toBeVisible();
    // Manage your information
    await expect(page.getByText('Manage your information')).toBeVisible();
    await expect(page.getByText('View and update your information in one place.')).toBeVisible();
  });

  test('Should display footer component after successful login', async ({ page }) => {
    // Acknowledgement
    await expect(
      page.getByText(
        'The B.C. Public Service acknowledges the territories of First Nations around B.C.',
      ),
    ).toBeVisible();
    // Languages
    await expect(page.getByText('We can help in over 220 languages')).toBeVisible();
    // Single Digital Gateway
    await expect(page.getByRole('banner').getByText('Single Digital Gateway')).toBeVisible();
    await expect(
      page
        .getByLabel('Single Digital Gateway', { exact: true })
        .getByRole('link', { name: 'Home' }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel('Single Digital Gateway', { exact: true })
        .getByRole('link', { name: 'Services' }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel('Single Digital Gateway', { exact: true })
        .getByRole('link', { name: 'Help' }),
    ).toBeVisible();
    // More info
    await expect(page.getByText('More info')).toBeVisible();
    await expect(page.getByRole('link', { name: 'About gov.bc.ca' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About CSBC' })).toBeVisible();
    // Legal
    await expect(page.getByText('Legal')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Disclaimer' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Accessibility' })).toBeVisible();
    await expect(page.getByText('Copyright')).toBeVisible();
  });
});
