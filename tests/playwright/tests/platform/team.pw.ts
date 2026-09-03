import { test, expect } from '../setup/db.fixture';

test.describe('Platform Team E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Team' }).click();
  });

  test('Should display team header texts', async ({ page }) => {
    const headerSection = page.locator('header');
    await expect(headerSection.locator('h1').getByText('Team')).toBeVisible();
    await expect(
      headerSection.locator('p').getByText('People with access to this workspace.'),
    ).toBeVisible();
  });

  test('Should display team table content', async ({ page }) => {
    const mainSection = page.locator('main');
    // Table header content
    await expect(mainSection.locator('th').getByText('Member')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Email')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Role')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Joined')).toBeVisible();
    await expect(mainSection.locator('th').getByText('Status')).toBeVisible();
    // Table cell content
    await expect(mainSection.locator('td').getByText('Test User')).toBeVisible();
    await expect(mainSection.locator('td').getByText('test@example.com')).toBeVisible();
    await expect(mainSection.locator('td').getByText('Admin')).toBeVisible();
    await expect(mainSection.locator('td').getByText('Owner')).toBeVisible();
    await expect(mainSection.locator('td').getByText('7/7/2026')).toBeVisible();
    await expect(mainSection.locator('td').getByText('Active')).toBeVisible();
  });

  test('Should display search input component', async ({ page }) => {
    const mainSection = page.locator('main');
    const searchInput = mainSection.locator('input');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search name or email…');
    await searchInput.fill('hello');
    await expect(mainSection.getByText('No members match “hello”.')).toBeVisible();
  });

  test('Should display add member button', async ({ page }) => {
    const mainSection = page.locator('main');
    const addMemberButton = mainSection.getByRole('button', {
      name: 'Add member',
    });
    await expect(addMemberButton).toBeVisible();
    await addMemberButton.click();
    await expect(page.getByText('Add member')).toBeVisible();
    await expect(
      page.getByText('Search staff by name or email, then choose a role.'),
    ).toBeVisible();

    const searchInput = page.locator('[aria-label="Search staff"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search staff by name or email');
  });
});
