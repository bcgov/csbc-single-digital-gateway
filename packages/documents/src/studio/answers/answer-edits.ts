import type { DocumentContent } from '../document-types';
import type { PropertyRef } from '../property-ref';

// Doc 281: a document's answers live in `content.data` — a JSONForms answers object keyed by top-level schema
// properties, an object array's answer an array of rows. Pure, and every function returns the SAME content when the
// answers do not change, so a structural edit that concerns no answer keeps the content's identity.

type Answers = Record<string, unknown>;
type Value = string | number;

/** The answers, `{}` when there are none (rule 1). */
export function answersOf(content: DocumentContent): Answers {
  return isRecord(content.data) ? content.data : {};
}

/** Whether two answer objects hold the same answers — key order is not a difference, `{}` equals absent. */
export function sameAnswers(a: unknown, b: unknown): boolean {
  return stableJson(isRecord(a) ? a : {}) === stableJson(isRecord(b) ? b : {});
}

/** `content` with its answers replaced (rule 2): the SAME content when equal; an empty object removes the key. */
export function withAnswers(content: DocumentContent, data: Answers): DocumentContent {
  if (sameAnswers(content.data, data)) return content;
  const { data: _previous, ...rest } = content;
  return Object.keys(data).length === 0 ? rest : { ...rest, data };
}

/** A renamed top-level property's answer moved to its new key (rule 16). */
export function renameAnswer(content: DocumentContent, from: string, to: string): DocumentContent {
  const answers = answersOf(content);
  if (from === to || !Object.hasOwn(answers, from)) return content;
  return withAnswers(content, renamedKey(answers, from, to));
}

/** A renamed item key — a record field or a data-table column — moved in every row of `array`'s answer (rules 16, 19). */
export function renameItemAnswer(
  content: DocumentContent,
  array: string,
  from: string,
  to: string,
): DocumentContent {
  return mapRows(content, array, (row) =>
    Object.hasOwn(row, from) && from !== to ? renamedKey(row, from, to) : row,
  );
}

/**
 * A choice field's answers after its options are saved (rule 18): each value mapped through `renames`, then any value
 * not `offered` cleared. A single choice left with nothing is absent (never `''`), a multiple choice with none left is
 * absent (never `[]`). `ref` reaches a record item field's answers in every row.
 */
export function remapChoiceAnswers(
  content: DocumentContent,
  ref: PropertyRef,
  renames: ReadonlyMap<Value, Value>,
  offered: readonly Value[],
): DocumentContent {
  const remap = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const kept = value.map(remapOne).filter((v) => v !== undefined);
      return kept.length === 0 ? undefined : kept;
    }
    return remapOne(value);
  };
  const remapOne = (value: unknown): Value | undefined => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const next = renames.get(value) ?? value;
    return offered.includes(next) ? next : undefined;
  };
  if (ref.array !== undefined)
    return mapRows(content, ref.array, (row) =>
      Object.hasOwn(row, ref.key) ? withValue(row, ref.key, remap(row[ref.key])) : row,
    );
  const answers = answersOf(content);
  if (!Object.hasOwn(answers, ref.key)) return content;
  return withAnswers(content, withValue(answers, ref.key, remap(answers[ref.key])));
}

/**
 * Answers the form no longer asks for removed (rule 17): every key that left `schema.properties`, and — for an object
 * array — every row key that left its `items.properties`.
 */
export function pruneAnswers(content: DocumentContent): DocumentContent {
  const answers = answersOf(content);
  const properties = recordOf(content.schema['properties']) ?? {};
  const next: Answers = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!Object.hasOwn(properties, key)) continue;
    const columns = itemProperties(properties[key]);
    next[key] =
      columns === undefined || !Array.isArray(value)
        ? value
        : value.map((row: unknown) => (isRecord(row) ? onlyKeys(row, columns) : row));
  }
  return withAnswers(content, next);
}

/** `array`'s answer with every object row passed through `edit`; the SAME content when no row changes. */
function mapRows(
  content: DocumentContent,
  array: string,
  edit: (row: Answers) => Answers,
): DocumentContent {
  const answers = answersOf(content);
  const rows = answers[array];
  if (!Array.isArray(rows)) return content;
  const next = rows.map((row: unknown) => (isRecord(row) ? edit(row) : row));
  if (next.every((row, index) => row === rows[index])) return content;
  return withAnswers(content, { ...answers, [array]: next });
}

/** `record` with `from` renamed `to`, its position kept. */
function renamedKey(record: Answers, from: string, to: string): Answers {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k === from ? to : k, v]));
}

/** `record` with `key` set — an `undefined` value REMOVES the key. */
function withValue(record: Answers, key: string, value: unknown): Answers {
  const { [key]: _removed, ...rest } = record;
  return value === undefined ? rest : { ...record, [key]: value };
}

function onlyKeys(row: Answers, keep: Record<string, unknown>): Answers {
  const kept = Object.entries(row).filter(([key]) => Object.hasOwn(keep, key));
  return kept.length === Object.keys(row).length ? row : Object.fromEntries(kept);
}

/** An object array property's `items.properties`; `undefined` for anything else. */
function itemProperties(property: unknown): Record<string, unknown> | undefined {
  const items = recordOf(recordOf(property)?.['items']);
  return items?.['type'] === 'object' ? recordOf(items['properties']) : undefined;
}

/** JSON with object keys sorted at every depth, so key order never reads as a difference. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    isRecord(v)
      ? Object.fromEntries(Object.entries(v).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
