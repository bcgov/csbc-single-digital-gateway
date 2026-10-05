import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import type { CSSProperties } from 'react';
import { compareCells, gridPlacement, type GridAlign, type GridJustify } from './grid-placement';
import { GAP_CLASS, layoutGap } from './layout-gap';
import { ChildDispatch, type VerticalBodyProps } from './vertical-layout';

/** `{ type: 'Grid' }`, at the base rank (doc 260 rule 7). */
export const gridLayoutTester = rankWith(1, uiTypeIs('Grid'));

/**
 * The authored columns and rows from 40rem of the Grid's OWN container (doc 260 rule 5) — one column in reading order
 * below. Literal classes, so Tailwind sees each one.
 */
const WIDE_GRID =
  '@min-[40rem]/grid-layout:grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))] @min-[40rem]/grid-layout:grid-rows-[repeat(var(--grid-rows),1fr)]';
const WIDE_ITEM =
  '@min-[40rem]/grid-layout:[grid-column:var(--grid-column)] @min-[40rem]/grid-layout:[grid-row:var(--grid-row)]';

/** Each child's resolved alignment in its cell (doc 260 rule 31) — literal classes, so Tailwind sees each one. */
const ALIGN_SELF: Readonly<Record<GridAlign, string>> = Object.freeze({
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
});
const JUSTIFY_SELF: Readonly<Record<GridJustify, string>> = Object.freeze({
  start: 'justify-self-start',
  center: 'justify-self-center',
  end: 'justify-self-end',
  stretch: 'justify-self-stretch',
});

/**
 * A Grid on plain CSS grid (doc 260 rules 5-6): every child at its placed cells, rows of equal height — an `fr` row in
 * an auto-height grid is as tall as the tallest content.
 */
export function GridLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  const layout = uischema as UISchemaElement & { elements?: UISchemaElement[] };
  const elements = layout.elements ?? [];
  const placement = gridPlacement(layout);
  const gap = layoutGap(uischema.options);
  const dispatch: Omit<VerticalBodyProps, 'elements' | 'gap'> = {
    schema: props.schema,
    path: props.path,
    enabled: props.enabled,
    renderers: props.renderers,
    cells: props.cells,
  };
  // Reading order (rule 4), so the narrow single column reads as the wide grid does.
  const items = placement.items.toSorted(compareCells);
  return (
    <div className="@container/grid-layout">
      <div
        data-slot="grid-layout"
        data-gap={gap}
        data-columns={placement.columns}
        data-rows={placement.effectiveRows}
        className={`grid grid-cols-1 ${GAP_CLASS[gap]} ${WIDE_GRID}`}
        style={
          {
            '--grid-columns': placement.columns,
            '--grid-rows': placement.effectiveRows,
          } as CSSProperties
        }
      >
        {items.map((item) => {
          const child = elements[item.index];
          return child === undefined ? null : (
            <div
              key={item.key}
              data-slot="grid-layout-item"
              className={`min-w-0 ${ALIGN_SELF[item.align]} ${JUSTIFY_SELF[item.justify]} ${WIDE_ITEM}`}
              style={
                {
                  '--grid-column': `${item.x + 1} / span ${item.w}`,
                  '--grid-row': `${item.y + 1} / span ${item.h}`,
                } as CSSProperties
              }
            >
              <ChildDispatch child={child} {...dispatch} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const gridLayoutEntry = {
  tester: gridLayoutTester,
  renderer: withJsonFormsLayoutProps(GridLayoutRenderer),
};
