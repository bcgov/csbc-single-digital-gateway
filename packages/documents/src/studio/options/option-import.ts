import { nanoid } from 'nanoid';
import { slugify, type Option } from './option-draft';

// Doc 255 rules 9-10 (ported from @repo/forms doc 208 rules 5-10; its Bulk mode is not) — pasted text becoming rows,
// and rows keeping their identity. Pure.
//
// Deliberately NOT a CSV library: this parses a list an author pasted out of a spreadsheet or a document,
// where the failure mode that matters is a wrong GUESS about the delimiter, not RFC 4180 conformance.

/** A row as TEXT describes it: no id, because text carries none. */
export interface ParsedRow {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}

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

/**
 * Rules 5-6: parsed rows as draft rows, reusing an EXISTING row's id wherever the value matches.
 *
 * THIS IS THE FEATURE'S CORRECTNESS CENTRE. Doc 255 rule 11 cascades a renamed const into Funnel Condition
 * clauses, and that works only because a row's id is stable: `originalConsts` maps opening ids to the consts
 * they started as. `draftFrom` mints fresh ids, so a naive parse would produce rows matching nothing — and
 * BOTH halves of the cascade would fail silently. Every original const would read as DELETED, firing the
 * delete warning across an untouched list, and no rename would ever be detected, stranding exactly the
 * clauses rule 21 exists to protect.
 *
 * Matching is on VALUE, the only identity text preserves. A CHANGED value therefore gets a fresh id and
 * reads as delete-plus-add, which is the honest reading: nothing in the text distinguishes a rename from a
 * replacement, and guessing would rewrite the author's Flow logic without being asked. Renames made in the list,
 * where row identity survives, still cascade.
 *
 * Each existing id is taken at most ONCE (rule 6), so a list with repeated values cannot make two rows claim
 * the same id — which would corrupt the diff rather than merely lose it.
 */
export function carryIds(parsed: readonly ParsedRow[], existing: readonly Option[]): Option[] {
  const available = new Map<string, string[]>();
  for (const row of existing) {
    const queue = available.get(row.value);
    if (queue) queue.push(row.id);
    else available.set(row.value, [row.id]);
  }

  return parsed.map((row) => ({
    id: available.get(row.value)?.shift() ?? nanoid(8),
    label: row.label,
    value: row.value,
    ...(row.description === undefined ? {} : { description: row.description }),
    // The value came from text, so it is explicit: a later label edit must not re-slug it (doc 206 r11).
    touched: true,
  }));
}
