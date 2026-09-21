import { slugify } from './option-draft';
import type { ParsedRow } from './option-bulk';

// Doc 208 rules 8-10 — pasted text becoming rows. Pure.
//
// Deliberately NOT a CSV library: this parses a list an author pasted out of a spreadsheet or a document,
// where the failure mode that matters is a wrong GUESS about the delimiter, not RFC 4180 conformance.

/** Rule 8: the separators tried, in order. `null` is a single column. */
export type ImportDelimiter = '\t' | ',' | '|' | null;

const CANDIDATES: readonly Exclude<ImportDelimiter, null>[] = ['\t', ',', '|'];

/** Rule 10: a first cell that names a column rather than an option. */
const HEADER_CELLS: ReadonlySet<string> = new Set(['label', 'value', 'name', 'option']);

const lines = (text: string) => text.split('\n').filter((line) => line.trim() !== '');

/**
 * Rule 8: tab, then comma, then pipe — the first that appears anywhere wins.
 *
 * Tab first because a spreadsheet paste is tab-separated and its cells routinely CONTAIN commas; picking
 * comma there would split one column into several.
 */
export function detectDelimiter(text: string): ImportDelimiter {
  const body = lines(text).join('\n');
  return CANDIDATES.find((candidate) => body.includes(candidate)) ?? null;
}

/** Rule 9: a cell, trimmed, with one layer of surrounding quotes removed. */
const cell = (raw: string): string => {
  const trimmed = raw.trim();
  const quoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
};

/**
 * Rules 8-10: pasted text as rows — `label, value, description`, extra columns ignored.
 *
 * A header row is skipped on its FIRST CELL alone (rule 10), not on a guess about the whole row: a real
 * option legitimately called "Name" is far likelier than a header whose first column is something else.
 */
export function parseImport(text: string): ParsedRow[] {
  const delimiter = detectDelimiter(text);
  const rows = lines(text).map((line) =>
    (delimiter === null ? [line] : line.split(delimiter)).map(cell),
  );

  const body =
    rows.length > 0 && HEADER_CELLS.has((rows[0]?.[0] ?? '').toLowerCase()) ? rows.slice(1) : rows;

  return body.flatMap((cells) => {
    const label = cells[0] ?? '';
    const value = (cells[1] ?? '') === '' ? slugify(label) : (cells[1] as string);
    const description = cells[2] ?? '';
    if (label === '' && value === '') return [];
    return [
      {
        label,
        value,
        ...(description === '' ? {} : { description }),
      },
    ];
  });
}
