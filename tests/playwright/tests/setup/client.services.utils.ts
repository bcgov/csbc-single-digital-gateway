import type { Pool } from 'pg';
import type { Page } from 'playwright-core';
import { expect } from '../setup/db.fixture';

export const modifySubmission = async (db: Pool, status: string, reason: string) => {
  const userId = await db
    .query('SELECT id FROM users WHERE display_name = $1', ['Casey Citizen'])
    .then((res) => res.rows[0].id);
  const submissionId = await db
    .query('SELECT id FROM submissions WHERE user_id = $1', [userId])
    .then((res) => res.rows[0].id);
  await db.query('UPDATE submission_versions SET status = $1 WHERE submission_id = $2', [
    status,
    submissionId,
  ]);
  await db.query('UPDATE reviews SET decision = $1, reason = $2 WHERE submission_id = $3', [
    status,
    reason,
    submissionId,
  ]);
};

export const expectBasicText = async (page: Page, element: string) => {
  await expect(
    page.getByText(`Test ${element.toLowerCase()} input`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Test ${element.toLowerCase()} input description`)).toBeVisible();
};

export const expectTextElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'text');
  const textInput = page.getByRole('textbox', { name: 'Test text input' });
  await expect(textInput).toBeVisible();
  if (expectValue) {
    await expect(textInput).toHaveValue(expectValue);
  }
};

export const expectNumberElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'number');
  const numberInput = page.getByRole('spinbutton', { name: 'Test number input' });
  await expect(numberInput).toBeVisible();
  if (expectValue) {
    await expect(numberInput).toHaveValue(expectValue);
  }
};

export const expectBooleanElement = async (page: Page, expectValue?: boolean) => {
  await expectBasicText(page, 'boolean');
  const booleanInput = page.getByRole('checkbox', { name: 'Test boolean input' });
  await expect(booleanInput).toBeVisible();
  if (expectValue) {
    await expect(booleanInput).toBeChecked();
  }
};

export const expectCheckboxGroupElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'checkbox group');
  if (expectValue) {
    await expect(
      page.getByRole('checkbox', { name: `Test checkbox group option ${expectValue}` }),
    ).toBeChecked();
  } else {
    await expect(
      page.getByRole('checkbox', { name: 'Test checkbox group option 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Test checkbox group option 2' }),
    ).toBeVisible();
  }
};

export const expectRadioElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'radio');
  if (expectValue) {
    await expect(
      page.getByRole('radio', { name: `Test radio option ${expectValue}` }),
    ).toBeChecked();
  } else {
    await expect(page.getByRole('radio', { name: 'Test radio option 1' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Test radio option 2' })).toBeVisible();
  }
};

export const expectSelectElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'select');
  if (expectValue) {
    await expect(
      page
        .locator('[data-slot="select-value"]')
        .filter({ hasText: `Test select option ${expectValue}` }),
    ).toBeVisible();
  } else {
    const selectDropDown = page.locator('[aria-haspopup="listbox"]').filter({ hasText: 'Select' });
    // .locator('[data-slot="select-trigger"]');
    await expect(selectDropDown).toBeVisible();
    await selectDropDown.click();
    const selectOptions = page.getByRole('listbox').locator('[data-slot="select-item"]');
    await expect(selectOptions).toHaveCount(2);
    await expect(page.getByRole('option', { name: 'Test select option 1' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Test select option 2' })).toBeVisible();
  }
};

export const expectDateElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'date');
  const dateInput = page.getByRole('textbox', { name: 'Test date input' });
  await expect(dateInput).toBeVisible();
  if (expectValue) {
    await expect(dateInput).toHaveValue(expectValue);
  }
};

export const expectDateRangeElement = async (page: Page, expectValue?: string) => {
  await expectBasicText(page, 'date range');
  const dateRangeInput = page.getByRole('textbox', { name: 'Test date range input' });
  await expect(dateRangeInput).toBeVisible();
  if (expectValue) {
    // TODO: needs to remove ' - mm/dd/yyyy' from the expected value
    await expect(dateRangeInput).toHaveValue(`${expectValue} - mm/dd/yyyy`);
  }
};

export const expectDateTimeElement = async (
  page: Page,
  expectValue?: { date: string; hour: string; minute: string; meridiem: string },
) => {
  await expectBasicText(page, 'date & time');
  const dateTimeInput = page.getByRole('textbox', { name: 'Test date & time input' });
  await expect(dateTimeInput).toBeVisible();
  await expect(page.locator('[aria-label="Hour"]').first()).toBeVisible();
  await expect(page.locator('[aria-label="Minute"]').first()).toBeVisible();
  await expect(page.locator('[aria-label="AM or PM"]').first()).toBeVisible();
  if (expectValue) {
    await expect(dateTimeInput).toHaveValue(expectValue.date);
    await expect(page.locator('[aria-label="Hour"]').first()).toContainText(expectValue.hour);
    await expect(page.locator('[aria-label="Minute"]').first()).toContainText(expectValue.minute);
    await expect(page.locator('[aria-label="AM or PM"]').first()).toContainText(
      expectValue.meridiem,
    );
  }
};

export const expectTimeElement = async (
  page: Page,
  expectValue?: { hour: string; minute: string; meridiem: string },
) => {
  await expectBasicText(page, 'time');
  await expect(page.locator('[aria-label="Hour"]').last()).toBeVisible();
  await expect(page.locator('[aria-label="Minute"]').last()).toBeVisible();
  await expect(page.locator('[aria-label="AM or PM"]').last()).toBeVisible();
  if (expectValue) {
    await expect(page.locator('[aria-label="Hour"]').last()).toContainText(expectValue.hour);
    await expect(page.locator('[aria-label="Minute"]').last()).toContainText(expectValue.minute);
    await expect(page.locator('[aria-label="AM or PM"]').last()).toContainText(
      expectValue.meridiem,
    );
  }
};

export const expectAddressElement = async (page: Page) => {
  await expectBasicText(page, 'address');
};
