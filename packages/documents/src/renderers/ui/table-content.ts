/** A column's alignment (doc 267 rule 5). */
export type Align = 'left' | 'center' | 'right';

/**
 * A Table element's authored content (doc 265): headers, rows of text cells as long as the headers, and each column's
 * alignment (doc 267).
 */
export interface TableContent {
  headers: string[];
  rows: string[][];
  align: Align[];
}

/** How a Table is drawn (doc 267 rule 4). */
export interface TableDisplay {
  caption: string | undefined;
  showHeader: boolean;
  rowHeaders: boolean;
  striped: boolean;
  bordered: boolean;
  compact: boolean;
}

/** A Table's display options from its `options` (rule 4); a wrong-typed value is the default. */
export function tableDisplay(options: unknown): TableDisplay {
  const record = recordOf(options);
  const caption = record?.['caption'];
  return {
    caption: typeof caption === 'string' && caption.trim() !== '' ? caption.trim() : undefined,
    showHeader: record?.['header'] !== false,
    rowHeaders: record?.['rowHeaders'] === true,
    striped: record?.['striped'] === true,
    bordered: record?.['bordered'] === true,
    compact: record?.['compact'] === true,
  };
}

/** `align` as stored (rule 5): absent when every column is left. */
export function alignOption(align: readonly Align[]): Align[] | undefined {
  return align.every((a) => a === 'left') ? undefined : [...align];
}

/** The `options` an edit writes: all three content keys, so the canvas sends one patch (doc 267 rule 7). */
export function contentOptions(content: TableContent): Record<string, unknown> {
  return { headers: content.headers, rows: content.rows, align: alignOption(content.align) };
}

/**
 * A Table's content from its `options` (rule 1), never throwing: non-string headers and cells become `''`, a non-array
 * row is dropped, and every row is padded with `''` or cut to the header count.
 */
export function tableContent(options: unknown): TableContent {
  const record = recordOf(options);
  const headers = Array.isArray(record?.['headers']) ? record['headers'].map(textOf) : [];
  const rows = Array.isArray(record?.['rows'])
    ? record['rows'].flatMap((row: unknown) =>
        Array.isArray(row) ? [headers.map((_, i) => textOf(row[i]))] : [],
      )
    : [];
  const align = Array.isArray(record?.['align']) ? (record['align'] as unknown[]) : [];
  return { headers, rows, align: headers.map((_, i) => alignOf(align[i])) };
}

const alignOf = (value: unknown): Align =>
  value === 'center' || value === 'right' ? value : 'left';

/** Column `index` aligned `align` (rule 5). */
export function setAlign(content: TableContent, index: number, align: Align): TableContent {
  return { ...content, align: content.align.map((a, i) => (i === index ? align : a)) };
}

/** Rule 2's pure edits: each returns NEW content and leaves its input untouched. */
export function setHeader(content: TableContent, index: number, text: string): TableContent {
  return { ...content, headers: content.headers.map((h, i) => (i === index ? text : h)) };
}

export function setCell(
  content: TableContent,
  row: number,
  column: number,
  text: string,
): TableContent {
  return {
    ...content,
    rows: content.rows.map((cells, r) =>
      r === row ? cells.map((cell, c) => (c === column ? text : cell)) : cells,
    ),
  };
}

/** Appends `Column <n>`, `n` the smallest from count + 1 that is free; every row gains an empty cell. */
export function addColumn(content: TableContent): TableContent {
  const used = new Set(content.headers);
  let n = content.headers.length + 1;
  while (used.has(`Column ${n}`)) n += 1;
  return {
    headers: [...content.headers, `Column ${n}`],
    rows: content.rows.map((cells) => [...cells, '']),
    align: [...content.align, 'left'],
  };
}

/** Without column `index`; the last column is never removed (returns `content` itself). */
export function removeColumn(content: TableContent, index: number): TableContent {
  if (content.headers.length <= 1) return content;
  const keep = (_: string, i: number) => i !== index;
  return {
    headers: content.headers.filter(keep),
    rows: content.rows.map((cells) => cells.filter(keep)),
    align: content.align.filter((_, i) => i !== index),
  };
}

/** Column `index` moved to `to`, clamped. */
export function moveColumn(content: TableContent, index: number, to: number): TableContent {
  const target = Math.min(Math.max(Math.trunc(to), 0), content.headers.length - 1);
  const move = <T>(list: T[]): T[] => {
    const next = list.filter((_, i) => i !== index);
    next.splice(target, 0, list[index]!);
    return next;
  };
  return {
    headers: move(content.headers),
    rows: content.rows.map(move),
    align: move(content.align),
  };
}

export function addRow(content: TableContent): TableContent {
  return { ...content, rows: [...content.rows, content.headers.map(() => '')] };
}

/** Without row `index`; a Table may have no rows. */
export function removeRow(content: TableContent, index: number): TableContent {
  return { ...content, rows: content.rows.filter((_, r) => r !== index) };
}

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
