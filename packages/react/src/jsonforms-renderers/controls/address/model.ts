/**
 * Shared model for the Address form field (feature 153). One source of truth for the value shape and
 * for the `normalize`/`empty` helpers used by BOTH the editable control (`address-control.tsx`) and
 * the read-only view (`address-view.tsx`) — mirrors the contact-methods model (feature 130).
 *
 * The address is stored inline in the submission `data` JSONB as a plain object. `country` holds the
 * country **display name** (e.g. `'Canada'`), not an ISO code — the control resolves the country
 * record by name to derive its iso2/id/flags at render time. `province` holds the state/province
 * **name** (from the country-filtered dropdown, or free text for countries with no subdivisions).
 */

export interface AddressValue {
  /** Country display name, e.g. `'Canada'`. The stored, human-readable value. */
  country: string;
  address_one: string;
  address_two: string;
  city: string;
  /** State / province / region name — dropdown selection or free text. */
  province: string;
  postal_code: string;
}

export type AddressFieldKey = keyof AddressValue;

/** The six address sub-fields, in render order. */
export const ADDRESS_FIELD_KEYS: readonly AddressFieldKey[] = [
  'country',
  'address_one',
  'address_two',
  'city',
  'province',
  'postal_code',
];

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Coerce an unknown JSONB blob into a well-formed {@link AddressValue} — used by every render path so
 * a partial or hand-edited value never throws (per CLAUDE.md "normalize before use"). Missing fields
 * default to empty strings. The editable control does NOT use this (it edits the raw object so
 * half-typed values persist).
 */
export function normalizeAddress(raw: unknown): AddressValue {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    country: asString(rec.country),
    address_one: asString(rec.address_one),
    address_two: asString(rec.address_two),
    city: asString(rec.city),
    province: asString(rec.province),
    postal_code: asString(rec.postal_code),
  };
}

/** A fresh, empty address value. */
export function emptyAddress(): AddressValue {
  return {
    country: '',
    address_one: '',
    address_two: '',
    city: '',
    province: '',
    postal_code: '',
  };
}

/** True when the address carries no data — used to render the em-dash empty state in the display view. */
export function isAddressEmpty(value: AddressValue): boolean {
  return ADDRESS_FIELD_KEYS.every((key) => value[key] === '');
}

/**
 * The display lines for an address, in postal order: line 1, line 2, `city province postal`, country.
 * Empty segments are dropped. Shared by the read-only view and any app-side rendering.
 */
export function addressDisplayLines(value: AddressValue): string[] {
  const region = [value.city, value.province, value.postal_code].filter(Boolean).join(' ');
  return [value.address_one, value.address_two, region, value.country].filter(
    (line): line is string => Boolean(line),
  );
}

// ── Per-sub-field options (feature 170) ──────────────────────────────────────────────────────────
//
// The address is a composite of six sub-fields, so per-sub-field presentation config is nested to
// parallel the value shape, namespaced under a single `fields` key in the uischema:
//
//   options: { format: 'address', fields: { country: { readOnly: true } } }
//
// The `fields` key is namespaced (rather than the six sub-field names sitting directly under
// `options`) because the form-builder codec's option drop-list runs for EVERY field type — bare
// `country` / `city` / `province` keys there would be stripped from any field's custom options.

/** Presentation options for a single address sub-field. */
export interface AddressFieldOptions {
  /**
   * Lock the sub-field: it renders showing its value but cannot be edited. Only meaningful where the
   * author also set a default to lock to. Defaults to `false`.
   */
  readOnly: boolean;
}

/** Options for every address sub-field — always fully populated, so callers never branch on absence. */
export type AddressFieldsOptions = Record<AddressFieldKey, AddressFieldOptions>;

/**
 * Coerce a uischema `options` blob into a complete {@link AddressFieldsOptions} (per CLAUDE.md
 * "normalize before use"). A hand-edited or partial definition must never throw a render path, so
 * anything unrecognised — a missing `fields` key, a non-object bag, a non-boolean `readOnly`, or a
 * key that is not an address sub-field — reads back as the default `readOnly: false`.
 */
export function readAddressFieldsOptions(options: unknown): AddressFieldsOptions {
  const bag = options && typeof options === 'object' ? (options as Record<string, unknown>) : {};
  const fields =
    bag.fields && typeof bag.fields === 'object' ? (bag.fields as Record<string, unknown>) : {};
  const result = {} as AddressFieldsOptions;
  for (const key of ADDRESS_FIELD_KEYS) {
    const entry = fields[key];
    const rec = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    result[key] = { readOnly: rec.readOnly === true };
  }
  return result;
}
