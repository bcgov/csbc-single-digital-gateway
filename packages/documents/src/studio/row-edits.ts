import { gridItemOf, itemAlignmentOf } from '../renderers/default/grid-placement';
import {
  arrivalWidth,
  DEFAULT_ROW_COLUMNS,
  fitWidths,
  rowPlacement,
  rowSettings,
  storedWidthOf,
} from '../renderers/default/row-placement';
import { elementKey } from '../renderers/default/vertical-layout';
import type { Uischema } from './document-types';

// Doc 261 rules 10-18: the pure edits that land, reorder, resize and copy children of a HorizontalLayout. A row stores
// only order and widths; every write leaves its widths fitting its columns.

export function isRow(node: Uischema | undefined): boolean {
  return node?.['type'] === 'HorizontalLayout';
}

/**
 * `child` sized `w` columns in a row (rule 16): its `gridItem` keeps only the alignment — a Grid's `x` / `y` / `h` are
 * dropped — and `w` is written only when wider than one column. The SAME child when that is what it already holds.
 */
export function withRowWidth(child: Uischema, w: number): Uischema {
  const next = { ...itemAlignmentOf(child), ...(w > 1 && { w }) };
  const options = recordOf(child['options']) ?? {};
  const current = recordOf(options['gridItem']);
  if (current !== undefined && sameRecord(current, next)) return child;
  if (current === undefined && Object.keys(next).length === 0) return child;
  const { gridItem: _gridItem, ...rest } = options;
  const kept = Object.keys(next).length === 0 ? rest : { ...rest, gridItem: next };
  const { options: _options, ...bare } = child;
  return Object.keys(kept).length === 0 ? bare : { ...bare, options: kept };
}

/** `children` with `widths` written (rule 14); the SAME array when no child changed. */
function sized(children: readonly unknown[], widths: readonly number[]): unknown[] {
  const next = children.map((child, i) =>
    isRecord(child) ? withRowWidth(child, widths[i] ?? 1) : child,
  );
  return next.every((child, i) => child === children[i]) ? [...children] : next;
}

/**
 * `row` with `element` landed at `index` (rules 10-11, 16): the arrival width, the others re-fitted around it in the same
 * edit. `undefined` when the row cannot make room (as many children as columns).
 */
export function landInRow(row: Uischema, index: number, element: Uischema): Uischema | undefined {
  const children = childrenOf(row);
  const { columns } = rowSettings(row['options']);
  const at = Math.min(Math.max(index, 0), children.length);
  const widths = children.map(storedWidthOf);
  widths.splice(at, 0, arrivalWidth(children.length, columns));
  const fitted = fitWidths(widths, columns, new Set([at]));
  if (fitted === undefined) return undefined;
  const elements = [...children.slice(0, at), element, ...children.slice(at)];
  return { ...row, elements: sized(elements, fitted) };
}

/**
 * The row's children in `order` (by key) with `widths` (by key) — the studio's reorder / resize write (rules 14-15),
 * re-fitted to the columns with the changed children kept. The SAME array when nothing changed.
 */
export function rowElements(
  row: Uischema,
  order: readonly string[],
  widths: ReadonlyMap<string, number>,
): readonly unknown[] {
  const children = childrenOf(row);
  const byKey = new Map(children.map((child, i) => [elementKey(child, i), child] as const));
  const keys = order.filter((key) => byKey.has(key));
  if (keys.length !== children.length) return children;
  const ordered = keys.map((key) => byKey.get(key));
  const wanted = keys.map((key, i) => widths.get(key) ?? storedWidthOf(ordered[i]));
  const changed = new Set(keys.flatMap((key, i) => (widths.has(key) ? [i] : [])));
  const { columns } = rowSettings(row['options']);
  const fitted = fitWidths(wanted, columns, changed) ?? fitWidths(wanted, columns) ?? wanted;
  const next = sized(ordered, fitted);
  return next.every((child, i) => child === children[i]) ? children : next;
}

/**
 * The widths to STORE for what gridstack displays (rule 15): a child whose display width changed is stored at that width
 * minus the Flex share it was shown with (never below 1); the rest keep their stored width.
 */
export function storedWidths(
  row: Uischema,
  displayed: ReadonlyMap<string, number>,
): Map<string, number> {
  const stored = new Map<string, number>();
  for (const item of rowPlacement(row).items) {
    const shown = displayed.get(item.key);
    const changed = shown !== undefined && shown !== item.w;
    stored.set(item.key, changed ? Math.max(1, shown - (item.w - item.stored)) : item.stored);
  }
  return stored;
}

/** The widest a row child can be (rule 20b): every other child at one column. */
export function maxRowWidth(row: Uischema): number {
  const { columns } = rowSettings(row['options']);
  return Math.max(1, columns - (childrenOf(row).length - 1));
}

/** `row` with the child `childId` at `w` columns and the others re-fitted (rule 20b); the same row when refused. */
export function resizeRowChild(row: Uischema, childId: string, w: number): Uischema {
  const children = childrenOf(row);
  const at = children.findIndex((child, i) => elementKey(child, i) === childId);
  if (at === -1 || w < 1 || w > maxRowWidth(row)) return row;
  const widths = children.map(storedWidthOf);
  widths[at] = w;
  const fitted = fitWidths(widths, rowSettings(row['options']).columns, new Set([at]));
  if (fitted === undefined) return row;
  const elements = sized(children, fitted);
  return elements.every((child, i) => child === children[i]) ? row : { ...row, elements };
}

/** `row` with a copy of the child at `at` inserted right after it at its width (rule 18); `undefined` when refused. */
export function copyInRow(row: Uischema, at: number, copy: Uischema): Uischema | undefined {
  const children = childrenOf(row);
  const original = children[at];
  if (original === undefined) return undefined;
  const widths = children.map(storedWidthOf);
  widths.splice(at + 1, 0, storedWidthOf(original));
  const fitted = fitWidths(widths, rowSettings(row['options']).columns, new Set([at + 1]));
  if (fitted === undefined) return undefined;
  const elements = [...children.slice(0, at + 1), copy, ...children.slice(at + 1)];
  return { ...row, elements: sized(elements, fitted) };
}

/** Whether a row can take one more child (rule 12): fewer children than columns. */
export function rowHasRoom(row: Uischema): boolean {
  return childrenOf(row).length < rowSettings(row['options']).columns;
}

/** A child's `gridItem` placement keys a row never keeps (rule 16) — `true` when it still carries any. */
export function hasGridPlacement(child: unknown): boolean {
  const { x, y, h } = gridItemOf(child);
  return x !== undefined || y !== undefined || h !== undefined;
}

function childrenOf(node: Uischema): unknown[] {
  return Array.isArray(node['elements']) ? (node['elements'] as unknown[]) : [];
}

function sameRecord(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(b);
  return keys.length === Object.keys(a).length && keys.every((key) => a[key] === b[key]);
}

function isRecord(value: unknown): value is Uischema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

/**
 * `row` at `columns` (doc 261 rule 19): never fewer than its children; the children's widths re-fitted (rule 2) and
 * written in the same edit, the count an absent key at the default. The SAME row when nothing changed.
 */
export function resizeRow(row: Uischema, columns: number): Uischema {
  const children = childrenOf(row);
  if (!Number.isInteger(columns) || columns < Math.max(1, children.length)) return row;
  const fitted = fitWidths(children.map(storedWidthOf), columns) ?? children.map(() => 1);
  const { columns: _columns, ...rest } = recordOf(row['options']) ?? {};
  const options = columns === DEFAULT_ROW_COLUMNS ? rest : { ...rest, columns };
  const elements = sized(children, fitted);
  const sameElements = elements.every((child, i) => child === children[i]);
  if (sameElements && rowSettings(row['options']).columns === columns) return row;
  const { options: _options, ...bare } = row;
  return {
    ...bare,
    ...(Object.keys(options).length > 0 && { options }),
    elements: sameElements ? children : elements,
  };
}
