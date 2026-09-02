import { formatPhone } from '@repo/ui/phone-input';
import { mdiEmail, mdiLink, mdiMapMarker, mdiPhone, mdiPrinter } from '@mdi/js';

/**
 * Shared model for the Service "contact methods" field (feature 130, revision 2). One source of truth
 * for the five method types, their per-type field shape, and the labels/icons used by BOTH the table
 * editor (`contact-methods-control.tsx` + `method-dialog.tsx`) and the read-only view
 * (`contact-methods-view.tsx`).
 *
 * `contact_methods` is a plain array — any type may repeat, order is user-controlled. Each method holds
 * ONE value (revision 1's `entries` list + rich-text `description` are gone).
 */

export type ContactMethodType = 'phone' | 'email' | 'address' | 'fax' | 'links';

/** A flat contact method: `value` for scalar types, the `address_*` fields for `address`. */
export interface ContactMethod {
  type: ContactMethodType;
  label: string;
  value?: string;
  address_one?: string;
  address_two?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
}

export type AddressFieldKey =
  | 'address_one'
  | 'address_two'
  | 'city'
  | 'province'
  | 'country'
  | 'postal_code';

export interface AddressField {
  key: AddressFieldKey;
  label: string;
}

export const ADDRESS_FIELDS: readonly AddressField[] = [
  { key: 'address_one', label: 'Address line 1' },
  { key: 'address_two', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'country', label: 'Country' },
  { key: 'postal_code', label: 'Postal code' },
];

interface ValueFieldConfig {
  kind: 'value';
  /** Label + input type for the single value field (phone number, email, fax number, URL). */
  valueLabel: string;
  inputType: 'tel' | 'email' | 'url' | 'text';
}

interface AddressFieldConfig {
  kind: 'address';
}

export type FieldConfig = ValueFieldConfig | AddressFieldConfig;

export interface ContactMethodMeta {
  type: ContactMethodType;
  /** Human label for the method type (type picker, table cell, card sub-label). */
  label: string;
  icon: string;
  field: FieldConfig;
}

export const CONTACT_METHOD_TYPES: readonly ContactMethodType[] = [
  'phone',
  'email',
  'address',
  'fax',
  'links',
];

export const CONTACT_METHOD_META: Record<ContactMethodType, ContactMethodMeta> = {
  phone: {
    type: 'phone',
    label: 'Phone',
    icon: mdiPhone,
    field: { kind: 'value', valueLabel: 'Number', inputType: 'tel' },
  },
  email: {
    type: 'email',
    label: 'Email',
    icon: mdiEmail,
    field: { kind: 'value', valueLabel: 'Email address', inputType: 'email' },
  },
  address: {
    type: 'address',
    label: 'Address',
    icon: mdiMapMarker,
    field: { kind: 'address' },
  },
  fax: {
    type: 'fax',
    label: 'Fax',
    icon: mdiPrinter,
    field: { kind: 'value', valueLabel: 'Fax number', inputType: 'tel' },
  },
  links: {
    type: 'links',
    label: 'Links',
    icon: mdiLink,
    field: { kind: 'value', valueLabel: 'URL', inputType: 'url' },
  },
};

export function isContactMethodType(value: unknown): value is ContactMethodType {
  return typeof value === 'string' && CONTACT_METHOD_TYPES.includes(value as ContactMethodType);
}

/** Phone-style types whose value is a dial-able number (rendered via react-phone-number-input). */
export function isPhoneType(type: ContactMethodType): boolean {
  return type === 'phone' || type === 'fax';
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Read `key` from the flat record, falling back to a revision-1 first-entry blob for compatibility. */
function readField(
  rec: Record<string, unknown>,
  entry0: Record<string, unknown> | undefined,
  key: string,
): string {
  return asString(rec[key]) || (entry0 ? asString(entry0[key]) : '');
}

/**
 * Coerce an unknown JSONB blob into a well-formed `ContactMethod[]` — used by every render path so a
 * partial or hand-edited value never throws (per CLAUDE.md "normalize before use"). Unknown types are
 * dropped; missing fields default to empty strings. **Backward-compatible with revision-1 data**: when a
 * flat `value`/`address_*` field is absent it reads the first `entries[]` element; any `description` is
 * dropped. The table editor does NOT use this (it edits the raw array so half-typed methods persist).
 */
export function normalizeContactMethods(raw: unknown): ContactMethod[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item): ContactMethod[] => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const rec = item as Record<string, unknown>;
    if (!isContactMethodType(rec.type)) {
      return [];
    }
    const entries = Array.isArray(rec.entries) ? rec.entries : [];
    const entry0 =
      entries[0] && typeof entries[0] === 'object'
        ? (entries[0] as Record<string, unknown>)
        : undefined;
    const label = readField(rec, entry0, 'label');
    if (rec.type === 'address') {
      return [
        {
          type: 'address',
          label,
          address_one: readField(rec, entry0, 'address_one'),
          address_two: readField(rec, entry0, 'address_two'),
          city: readField(rec, entry0, 'city'),
          province: readField(rec, entry0, 'province'),
          country: readField(rec, entry0, 'country'),
          postal_code: readField(rec, entry0, 'postal_code'),
        },
      ];
    }
    return [{ type: rec.type, label, value: readField(rec, entry0, 'value') }];
  });
}

/** The one-or-more display lines for a method — a single value, or the formatted address lines. */
export function methodDetailLines(method: ContactMethod): string[] {
  if (method.type === 'address') {
    const region = [method.city, method.province, method.postal_code].filter(Boolean).join(' ');
    return [method.address_one, method.address_two, region, method.country].filter(
      (line): line is string => Boolean(line),
    );
  }
  if (!method.value) {
    return [];
  }
  return [isPhoneType(method.type) ? formatPhone(method.value) : method.value];
}

/** A fresh empty method of the given type for the add-flow. */
export function emptyMethod(type: ContactMethodType): ContactMethod {
  return type === 'address' ? { type, label: '', address_one: '' } : { type, label: '', value: '' };
}
