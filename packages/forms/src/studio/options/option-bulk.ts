import { nanoid } from 'nanoid';
import { keptRows, slugify, type Option } from './option-draft';

// Doc 208 rules 3-7 — the Bulk edit text form, and the ids that let the rename cascade survive it. Pure.

/** A row as TEXT describes it: no id, because text carries none. */
export interface ParsedRow {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}

const SEPARATOR = '|';

/**
 * Rule 3: the draft as `Label | value | Description`, one option per line.
 *
 * Wholly empty rows are left out, because doc 206 rule 19 drops them on save anyway — serialising them
 * would round-trip a blank row into a real one with an empty label AND value, which is a row the author
 * never asked for.
 */
export const serialiseBulk = (draft: readonly Option[]): string =>
  keptRows(draft)
    .map((row) =>
      [row.label, row.value, row.description ?? '']
        .slice(0, row.description ? 3 : 2)
        .join(` ${SEPARATOR} `),
    )
    .join('\n');

/**
 * Rules 3-4, 7: text back to rows.
 *
 * Split on the FIRST TWO separators only — a description may legitimately contain `|`, and splitting
 * greedily would silently truncate it on every round-trip. A missing value is slugged from the label with
 * the same `slugify` typing uses, so the two entry paths cannot disagree.
 */
export function parseBulk(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;

    const first = line.indexOf(SEPARATOR);
    const second = first === -1 ? -1 : line.indexOf(SEPARATOR, first + 1);
    const label = (first === -1 ? line : line.slice(0, first)).trim();
    const rawValue = first === -1 ? '' : line.slice(first + 1, second === -1 ? undefined : second);
    const description = second === -1 ? '' : line.slice(second + 1).trim();
    const value = rawValue.trim() === '' ? slugify(label) : rawValue.trim();

    rows.push({
      label,
      value,
      // `exactOptionalPropertyTypes`: an absent description is an ABSENT KEY, never `undefined`.
      ...(description === '' ? {} : { description }),
    });
  }
  return rows;
}

/**
 * Rules 5-6: parsed rows as draft rows, reusing an EXISTING row's id wherever the value matches.
 *
 * THIS IS THE FEATURE'S CORRECTNESS CENTRE. Doc 206 rules 21-22 cascade a renamed const into Flow Condition
 * clauses, and that works only because a row's id is stable: `originalConsts` maps opening ids to the consts
 * they started as. `draftFrom` mints fresh ids, so a naive parse would produce rows matching nothing — and
 * BOTH halves of the cascade would fail silently. Every original const would read as DELETED, firing the
 * delete warning across an untouched list, and no rename would ever be detected, stranding exactly the
 * clauses rule 21 exists to protect.
 *
 * Matching is on VALUE, the only identity text preserves. A CHANGED value therefore gets a fresh id and
 * reads as delete-plus-add, which is the honest reading: nothing in the text distinguishes a rename from a
 * replacement, and guessing would rewrite the author's Flow logic without being asked. Renames made in LIST
 * mode, where row identity survives, still cascade exactly as before.
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
