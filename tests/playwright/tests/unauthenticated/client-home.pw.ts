import { test, expect } from '@playwright/test';

test.describe('Client Home Page - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Header Section', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection).toBeVisible();
    await expect(headerSection.locator('p')).toHaveText('Single Digital Gateway');
    await expect(
      headerSection.getByLabel('Primary').getByRole('link', { name: 'Home' }),
    ).toBeVisible();
    await expect(headerSection.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(headerSection.getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('Hero Section', async ({ page }) => {
    const heroSection = page.locator('section').filter({
      hasText: 'Access government services online',
    });
    await expect(heroSection).toBeVisible();
    await expect(heroSection.locator('p').getByText('Find and use Government of')).toBeVisible();
    await expect(
      heroSection.getByRole('link', {
        name: 'Log in with BC Services Card Account',
      }),
    ).toBeVisible();
  });

  test('What You Can Do Section', async ({ page }) => {
    const whatYouCanDoSection = page.locator('section').filter({
      hasText: 'What you can do',
    });
    await expect(whatYouCanDoSection).toBeVisible();
    await expect(
      whatYouCanDoSection.getByText(
        'The Single Digital Gateway makes it easier to find and use government services online.',
      ),
    ).toBeVisible();
    await expect(whatYouCanDoSection.getByText('Discover services')).toBeVisible();
    await expect(
      whatYouCanDoSection.getByText('Browse and search for government services.'),
    ).toBeVisible();

    await expect(whatYouCanDoSection.getByText('Apply and track your requests')).toBeVisible();
    await expect(
      whatYouCanDoSection.getByText(
        'Submit applications online and check the status of your requests.',
      ),
    ).toBeVisible();

    await expect(whatYouCanDoSection.getByText('Manage your information')).toBeVisible();
    await expect(
      whatYouCanDoSection.getByText('View and update your information in one place.'),
    ).toBeVisible();
  });

  test('Available Services Section', async ({ page }) => {
    const availableServicesSection = page.locator('section').filter({
      hasText: 'Available services',
    });
    await expect(availableServicesSection).toBeVisible();
    await expect(availableServicesSection.getByText('Available services')).toBeVisible();
    await expect(
      availableServicesSection.getByText(
        'Here are some services currently available through the Single Digital Gateway.',
      ),
    ).toBeVisible();
  });

  test('Get Started Section', async ({ page }) => {
    const getStartedSection = page.locator('section').filter({
      hasText: 'Log in to get started',
    });
    await expect(getStartedSection).toBeVisible();
    await expect(getStartedSection.getByText('Log in to get started')).toBeVisible();
    await expect(
      getStartedSection.getByText('Log in to apply for services and manage your requests.'),
    ).toBeVisible();
    await expect(
      getStartedSection.getByRole('link', {
        name: 'Log in with BC Services Card Account',
      }),
    ).toBeVisible();
  });

  test('Acknowledgement Section', async ({ page }) => {
    const acknowledgementSection = page.locator('footer').filter({
      hasText: 'The B.C. Public Service acknowledges',
    });
    await expect(acknowledgementSection).toBeVisible();
    await expect(
      acknowledgementSection.getByText(
        'We acknowledge the rights, interests, priorities, and concerns of all Indigenous Peoples',
      ),
    ).toBeVisible();
    await expect(
      acknowledgementSection.getByText(
        'acknowledging their distinct cultures, histories, rights, laws, and governments.',
      ),
    ).toBeVisible();
  });

  test('Footer Section', async ({ page }) => {
    const footerSection = page.locator('footer').filter({
      hasText: 'Single Digital Gateway',
    });
    await expect(footerSection).toBeVisible();
    await expect(footerSection.getByText('We can help in over 220 languages')).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Help' })).toBeVisible();

    await expect(footerSection.getByText('More info')).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'About gov.bc.ca' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'About CSBC' })).toBeVisible();

    await expect(footerSection.getByText('Legal')).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Disclaimer' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Accessibility' })).toBeVisible();
    await expect(footerSection.getByRole('link', { name: 'Copyright' })).toBeVisible();
  });
});
