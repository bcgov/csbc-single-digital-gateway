/** A column's type as the table reads it (doc 263 rule 10); `other` for anything else authored. */
export type ColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'other';

/** The column types an author can pick (rule 22), in menu order. */
export type AuthoredColumnType = Exclude<ColumnType, 'other'>;

export const COLUMN_TYPES: readonly AuthoredColumnType[] = Object.freeze([
  'string',
  'number',
  'integer',
  'boolean',
]);

/** Each column type as the studio names it (rules 22, 24). */
export const COLUMN_TYPE_NAMES: Readonly<Record<ColumnType, string>> = Object.freeze({
  string: 'Text',
  number: 'Number',
  integer: 'Whole number',
  boolean: 'Yes/No',
  other: 'Other',
});

export interface TableColumn {
  key: string;
  title: string;
  type: ColumnType;
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
    return [
      {
        key,
        title: typeof title === 'string' && title.trim() !== '' ? title.trim() : key,
        type: columnType(property['type']),
      },
    ];
  });
}

/** The data's plain-object rows (rule 11): anything not an array is no rows, a non-object entry is dropped. */
export function tableRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const record = recordOf(row);
    return record === undefined ? [] : [record];
  });
}

/** A cell's text (rule 12), decided by the VALUE so a mistyped one still shows; never HTML. */
export function formatCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
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
