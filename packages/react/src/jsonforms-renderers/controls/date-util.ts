/**
 * Shared date <-> ISO helpers for the date/range/datetime controls (feature 157). Dates are built at
 * **local midnight** and read with **local getters**, so the `'YYYY-MM-DD'` round-trip never drifts
 * across a timezone boundary.
 */

/** Format a Date as a local ISO date `'YYYY-MM-DD'`. */
export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Parse a `'YYYY-MM-DD'` string into a Date at local midnight, or `undefined` for empty/non-string. */
export const parseISODate = (value: unknown): Date | undefined =>
  typeof value === 'string' && value ? new Date(`${value}T00:00:00`) : undefined;
