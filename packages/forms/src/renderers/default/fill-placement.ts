import type { UISchemaElement } from '@jsonforms/core';
import { horizontalColumns, horizontalWidth } from '../gridstack/grid-layouts';

// Pure placement for fillable HorizontalLayouts and Grids (doc 193 rules 6-7): a column count for the container and,
// per child, a CSS `grid-column` value and an optional min-height. No gridstack involved.

export interface FillChild {
  readonly element: UISchemaElement;
  /** The child's position in `elements` — a stable React key. */
  readonly index: number;
  /** The CSS `grid-column` from the `sm` breakpoint up, e.g. `span 3` or `4 / span 6`. */
  readonly column: string;
  /** A Grid child's authored height as a CSS length (rule 7). */
  readonly minHeight?: string;
}

export interface FillPlacement {
  readonly columns: number;
  readonly children: readonly FillChild[];
}

/** A Grid's columns when `options.column` says nothing usable (rule 7). */
export const FILL_GRID_COLUMNS = 12;

const integerOf = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) ? value : undefined;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/** Rule 6: the row's `horizontalColumns`, each child spanning its `horizontalWidth`, in `elements` order. */
export function rowPlacement(
  elementOptions: unknown,
  elements: readonly UISchemaElement[],
): FillPlacement {
  const columns = horizontalColumns(elementOptions, elements.length);
  return {
    columns,
    children: elements.map((element, index) => ({
      element,
      index,
      column: `span ${horizontalWidth(element, columns)}`,
    })),
  };
}

/** Rule 7: an authored integer `options.column` from 1 to 12, else 12. */
export function fillGridColumns(elementOptions: unknown): number {
  const column = integerOf(recordOf(elementOptions)['column']);
  return column !== undefined && column >= 1 && column <= FILL_GRID_COLUMNS
    ? column
    : FILL_GRID_COLUMNS;
}

/** Sorts `undefined` after every number, and ties stay in `elements` order. */
const position = (value: number | undefined) => value ?? Number.POSITIVE_INFINITY;

/**
 * Rule 7: children in `(y, x)` order — those without a `y` (or `x`) after the rest, in `elements` order — each starting
 * at its integer `x` (clamped so its span fits) and spanning its integer `w` (clamped 1..columns, default 1). A positive
 * integer `h` becomes a rem min-height.
 */
export function gridPlacement(
  elementOptions: unknown,
  elements: readonly UISchemaElement[],
): FillPlacement {
  const columns = fillGridColumns(elementOptions);
  const placed = elements.map((element, index) => {
    const gridItem = recordOf(element.options?.['gridItem']);
    const w = clamp(integerOf(gridItem['w']) ?? 1, 1, columns);
    const authoredX = integerOf(gridItem['x']);
    const x = authoredX === undefined ? undefined : clamp(authoredX, 0, columns - w);
    const h = integerOf(gridItem['h']);
    return {
      element,
      index,
      x,
      y: integerOf(gridItem['y']),
      column: x === undefined ? `span ${w}` : `${x + 1} / span ${w}`,
      minHeight: h !== undefined && h > 0 ? `${h}rem` : undefined,
    };
  });
  const children = placed
    .toSorted(
      (a, b) => position(a.y) - position(b.y) || position(a.x) - position(b.x) || a.index - b.index,
    )
    .map(
      ({ element, index, column, minHeight }): FillChild =>
        minHeight === undefined
          ? { element, index, column }
          : { element, index, column, minHeight },
    );
  return { columns, children };
}
