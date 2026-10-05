/** What an object-array table's author configured (doc 266 rule 1), sanitised to safe defaults. */
export interface ArrayOptions {
  minRows: number;
  /** `undefined` = no limit. */
  maxRows: number | undefined;
  addRows: boolean;
  deleteRows: boolean;
  addLabel: string;
  pageSize: number;
}

export const DEFAULT_ADD_LABEL = 'Add row';
/** A record's Add button (doc 271 rule 6). */
export const DEFAULT_ADD_ITEM_LABEL = 'Add item';
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** The table's options from the schema's `minItems` / `maxItems` and the Control's `options` (rule 1). */
export function arrayOptions(
  schema: unknown,
  uischema: unknown,
  defaultLabel: string = DEFAULT_ADD_LABEL,
): ArrayOptions {
  const s = recordOf(schema);
  const options = recordOf(recordOf(uischema)?.['options']);
  const minRows = wholeNumber(s?.['minItems']) ?? 0;
  const max = wholeNumber(s?.['maxItems']);
  const label = options?.['addLabel'];
  const pageSize = wholeNumber(options?.['pageSize']);
  return {
    minRows,
    maxRows: max !== undefined && max >= Math.max(1, minRows) ? max : undefined,
    addRows: options?.['addRows'] !== false,
    deleteRows: options?.['deleteRows'] !== false,
    addLabel: typeof label === 'string' && label.trim() !== '' ? label.trim() : defaultLabel,
    pageSize:
      pageSize !== undefined && pageSize >= 1 && pageSize <= MAX_PAGE_SIZE
        ? pageSize
        : DEFAULT_PAGE_SIZE,
  };
}

/** How many rows a fillable table shows (rule 2): at least one, and at least the minimum. */
export function shownRowCount(written: number, options: ArrayOptions): number {
  return Math.max(written, 1, options.minRows);
}

function wholeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
