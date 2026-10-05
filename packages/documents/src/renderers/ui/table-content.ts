/** A Table element's authored content (doc 265): headers, and rows of text cells as long as the headers. */
export interface TableContent {
  headers: string[];
  rows: string[][];
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
  return { headers, rows };
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
  };
}

/** Without column `index`; the last column is never removed (returns `content` itself). */
export function removeColumn(content: TableContent, index: number): TableContent {
  if (content.headers.length <= 1) return content;
  const keep = (_: string, i: number) => i !== index;
  return {
    headers: content.headers.filter(keep),
    rows: content.rows.map((cells) => cells.filter(keep)),
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
  return { headers: move(content.headers), rows: content.rows.map(move) };
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
