import { Link, Mail, MapPin, Phone, Printer, type LucideIcon } from 'lucide-react';

/**
 * Shared model for the Service "contact methods" field (feature 130). One source of truth for the
 * five method types, their per-type entry shape, and the labels/icons used by BOTH the editable
 * control (`contact-methods-control.tsx`) and the read-only view (`contact-methods-view.tsx`).
 *
 * `contact_methods` is a plain array — any type may repeat (the one-per-type constraint was dropped).
 */

export type ContactMethodType = 'phone' | 'email' | 'address' | 'fax' | 'links';

/** phone | email | fax | links — a labelled scalar value. */
export interface ValueEntry {
  label?: string;
  value: string;
}

/** address — a labelled postal address. `address_one` is the only structurally-required field. */
export interface AddressEntry {
  label?: string;
  address_one: string;
  address_two?: string;
  city?: string;
  province?: string;
  country?: string;
  postal_code?: string;
}

export type ContactEntry = ValueEntry | AddressEntry;

export interface ContactMethod {
  type: ContactMethodType;
  label: string;
  /** Optional Lexical `SerializedEditorState` object (feature 37 richtext), or absent. */
  description?: unknown;
  entries: ContactEntry[];
}

/** A field the address entry editor/view renders, in order. */
export interface AddressField {
  key: keyof AddressEntry;
  label: string;
}

export const ADDRESS_FIELDS: readonly AddressField[] = [
  { key: 'label', label: 'Label' },
  { key: 'address_one', label: 'Address line 1' },
  { key: 'address_two', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'province', label: 'Province' },
  { key: 'country', label: 'Country' },
  { key: 'postal_code', label: 'Postal code' },
];

interface ValueEntryConfig {
  kind: 'value';
  /** Label + input type for the single value field (phone number, email, fax number, URL). */
  valueLabel: string;
  inputType: 'tel' | 'email' | 'url' | 'text';
  /** Accessible label for the "add another entry" button. */
  addEntryLabel: string;
}

interface AddressEntryConfig {
  kind: 'address';
  addEntryLabel: string;
}

export type EntryConfig = ValueEntryConfig | AddressEntryConfig;

export interface ContactMethodMeta {
  type: ContactMethodType;
  /** Human label for the method type (badge + card heading fallback). */
  label: string;
  /** Accessible label for the "add a method of this type" button (e.g. "Add phone"). */
  addLabel: string;
  icon: LucideIcon;
  entry: EntryConfig;
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
    addLabel: 'Add phone',
    icon: Phone,
    entry: {
      kind: 'value',
      valueLabel: 'Number',
      inputType: 'tel',
      addEntryLabel: 'Add phone number',
    },
  },
  email: {
    type: 'email',
    label: 'Email',
    addLabel: 'Add email',
    icon: Mail,
    entry: {
      kind: 'value',
      valueLabel: 'Email address',
      inputType: 'email',
      addEntryLabel: 'Add email address',
    },
  },
  address: {
    type: 'address',
    label: 'Address',
    addLabel: 'Add address',
    icon: MapPin,
    entry: { kind: 'address', addEntryLabel: 'Add address' },
  },
  fax: {
    type: 'fax',
    label: 'Fax',
    addLabel: 'Add fax',
    icon: Printer,
    entry: {
      kind: 'value',
      valueLabel: 'Fax number',
      inputType: 'tel',
      addEntryLabel: 'Add fax number',
    },
  },
  links: {
    type: 'links',
    label: 'Links',
    addLabel: 'Add links',
    icon: Link,
    entry: { kind: 'value', valueLabel: 'URL', inputType: 'url', addEntryLabel: 'Add link' },
  },
};

export function isContactMethodType(value: unknown): value is ContactMethodType {
  return typeof value === 'string' && CONTACT_METHOD_TYPES.includes(value as ContactMethodType);
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function normalizeEntry(type: ContactMethodType, raw: unknown): ContactEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const rec = raw as Record<string, unknown>;
  const label = asString(rec.label);
  const labelPart = label ? { label } : {};
  if (type === 'address') {
    return [
      {
        ...labelPart,
        address_one: asString(rec.address_one),
        address_two: asString(rec.address_two),
        city: asString(rec.city),
        province: asString(rec.province),
        country: asString(rec.country),
        postal_code: asString(rec.postal_code),
      },
    ];
  }
  return [{ ...labelPart, value: asString(rec.value) }];
}

/**
 * Coerce an unknown JSONB blob into a well-formed `ContactMethod[]` — used by the render path so a
 * partial or hand-edited value never throws (per CLAUDE.md "normalize before use"). Unknown types
 * and non-object entries are dropped; missing fields default to empty strings. The editable control
 * does NOT use this (it edits the raw array so half-typed entries persist).
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
    const entriesRaw = Array.isArray(rec.entries) ? rec.entries : [];
    return [
      {
        type: rec.type,
        label: asString(rec.label),
        ...(rec.description !== undefined && rec.description !== null
          ? { description: rec.description }
          : {}),
        entries: entriesRaw.flatMap((entry) =>
          normalizeEntry(rec.type as ContactMethodType, entry),
        ),
      },
    ];
  });
}

/** A fresh empty entry for the given type (one blank row when a method is added / "add entry"). */
export function emptyEntry(type: ContactMethodType): ContactEntry {
  return type === 'address' ? { address_one: '' } : { value: '' };
}

/** A fresh empty method of the given type, seeded with one blank entry row. */
export function emptyMethod(type: ContactMethodType): ContactMethod {
  return { type, label: '', entries: [emptyEntry(type)] };
}

/** True when a value/address entry carries something worth displaying. */
export function entryHasContent(type: ContactMethodType, entry: ContactEntry): boolean {
  if (type === 'address') {
    const a = entry as AddressEntry;
    return Boolean(
      a.address_one || a.address_two || a.city || a.province || a.country || a.postal_code,
    );
  }
  return Boolean((entry as ValueEntry).value);
}
