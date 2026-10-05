import {
  choiceOptions,
  isMultiChoice,
  isSingleChoice,
  itemsChoiceType,
  multiChoiceOptions,
  type ChoiceOption,
  type ChoiceType,
} from './choice-options';

/**
 * A column's type as the table reads it (doc 263 rule 10, doc 268 rule 1): a single / multiple choice by the field
 * renderers' own predicates, else by JSON type; `other` for anything else authored.
 */
export type ColumnType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'choice'
  | 'multi-choice'
  | 'other';

/** The column types an author can pick (rule 22), in menu order. */
export type AuthoredColumnType = Exclude<ColumnType, 'other'>;

export const COLUMN_TYPES: readonly AuthoredColumnType[] = Object.freeze([
  'string',
  'number',
  'integer',
  'boolean',
  'choice',
  'multi-choice',
]);

/** Each column type as the studio names it (rules 22, 24). */
export const COLUMN_TYPE_NAMES: Readonly<Record<ColumnType, string>> = Object.freeze({
  string: 'Text',
  number: 'Number',
  integer: 'Whole number',
  boolean: 'Yes/No',
  choice: 'Select',
  'multi-choice': 'Multi-select',
  other: 'Other',
});

export interface TableColumn {
  key: string;
  title: string;
  type: ColumnType;
  /** A choice column's options and their const type (doc 268 rule 1). */
  options?: ChoiceOption[];
  choiceType?: ChoiceType;
}

/**
 * Whether `schema` is an object array (rule 8): `type: 'array'` whose `items` are `type: 'object'` with a
 * `properties` object, which may be empty. The ONE predicate — both renderers and the inspector call it.
 */
export function isObjectArray(schema: unknown): boolean {
  const s = recordOf(schema);
  const items = recordOf(s?.['items']);
  return (
    s?.['type'] === 'array' &&
    items?.['type'] === 'object' &&
    recordOf(items['properties']) !== undefined
  );
}

/** The table's columns, in `items.properties` order (rule 10); a non-object entry is skipped. */
export function tableColumns(schema: unknown): TableColumn[] {
  if (!isObjectArray(schema)) return [];
  const properties = recordOf(recordOf(recordOf(schema)?.['items'])?.['properties']) ?? {};
  return Object.entries(properties).flatMap(([key, value]) => {
    const property = recordOf(value);
    if (property === undefined) return [];
    const title = property['title'];
    const base = {
      key,
      title: typeof title === 'string' && title.trim() !== '' ? title.trim() : key,
    };
    const choice = choiceColumn(property);
    if (choice !== undefined) return [{ ...base, ...choice }];
    return [{ ...base, type: columnType(property['type']) }];
  });
}

/** A choice column's type, options and const type (doc 268 rule 1), by the field renderers' own predicates. */
function choiceColumn(
  property: Record<string, unknown>,
): Pick<TableColumn, 'type' | 'options' | 'choiceType'> | undefined {
  if (isSingleChoice(property))
    return {
      type: 'choice',
      options: choiceOptions(property) ?? [],
      choiceType: property['type'] as ChoiceType,
    };
  const items = recordOf(property['items']);
  const itemsType = items === undefined ? undefined : itemsChoiceType(items);
  if (!isMultiChoice(property) || itemsType === undefined) return undefined;
  return {
    type: 'multi-choice',
    options: multiChoiceOptions(property) ?? [],
    choiceType: itemsType,
  };
}

/** The data's plain-object rows (rule 11): anything not an array is no rows, a non-object entry is dropped. */
export function tableRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const record = recordOf(row);
    return record === undefined ? [] : [record];
  });
}

/**
 * A cell's text (rule 12), decided by the VALUE so a mistyped one still shows; never HTML. With a choice column's
 * `options` (doc 268 rule 2), a value shows its option's label and an array its labels in authoring order.
 */
export function formatCell(value: unknown, options?: readonly ChoiceOption[]): string {
  if (value === undefined || value === null) return '';
  if (options !== undefined) {
    const labelOf = (v: unknown) => options.find((option) => option.value === v)?.label;
    if (Array.isArray(value)) {
      const chosen = options.filter((option) => value.includes(option.value));
      if (chosen.length === value.length) return chosen.map((option) => option.label).join(', ');
    } else {
      const label = labelOf(value);
      if (label !== undefined) return label;
    }
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
}

/** Doc 257's key alphabet: every generated `nanoid(8)` key already matches. */
const KEY_ALPHABET = /^[A-Za-z0-9_-]+$/;

/**
 * Why the column `from` cannot take the data key `to` (doc 264 rule 10) — doc 257's rule against the COLUMN set — or
 * `undefined` when it can, including when it is unchanged.
 */
export function columnKeyProblem(schema: unknown, from: string, to: string): string | undefined {
  const key = to.trim();
  if (key === '') return 'A key is required.';
  if (!KEY_ALPHABET.test(key)) return 'Use letters, numbers, _ or -.';
  if (key === '__proto__') return `${key} is reserved.`;
  if (key !== from && tableColumns(schema).some((column) => column.key === key))
    return `${key} is already used.`;
  return undefined;
}

function columnType(type: unknown): ColumnType {
  return type === 'string' || type === 'number' || type === 'integer' || type === 'boolean'
    ? type
    : 'other';
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
