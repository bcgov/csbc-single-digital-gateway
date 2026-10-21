import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import type { CSSProperties } from 'react';
import { ALIGN_SELF, JUSTIFY_SELF } from './grid-layout';
import { GAP_CLASS, layoutGap } from './layout-gap';
import { rowPlacement } from './row-placement';
import { ChildDispatch, type VerticalBodyProps } from './vertical-layout';

/** `{ type: 'HorizontalLayout' }`, at the base rank (doc 261 rule 6). */
export const horizontalLayoutTester = rankWith(1, uiTypeIs('HorizontalLayout'));

/**
 * One row of the authored columns from 40rem of the row's OWN container (doc 261 rule 5) — one column in `elements`
 * order below. Literal classes, so Tailwind sees each one.
 */
const WIDE_ROW = '@min-[40rem]/row-layout:grid-cols-[repeat(var(--row-columns),minmax(0,1fr))]';
const WIDE_ITEM = '@min-[40rem]/row-layout:[grid-column:var(--row-column)]';

/** A HorizontalLayout on plain CSS grid (doc 261 rules 5-6): its children packed in one row, at their display spans. */
export function HorizontalLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  const layout = uischema as UISchemaElement & { elements?: UISchemaElement[] };
  const elements = layout.elements ?? [];
  const placement = rowPlacement(layout);
  const gap = layoutGap(uischema.options);
  const dispatch: Omit<VerticalBodyProps, 'elements' | 'gap'> = {
    schema: props.schema,
    path: props.path,
    enabled: props.enabled,
    renderers: props.renderers,
    cells: props.cells,
  };
  return (
    <div className="@container/row-layout">
      <div
        data-slot="row-layout"
        data-gap={gap}
        data-columns={placement.columns}
        data-justify={placement.justify}
        className={`grid grid-cols-1 ${GAP_CLASS[gap]} ${WIDE_ROW}`}
        style={{ '--row-columns': placement.columns } as CSSProperties}
      >
        {placement.items.map((item) => {
          const child = elements[item.index];
          return child === undefined ? null : (
            <div
              key={item.key}
              data-slot="row-layout-item"
              className={`min-w-0 ${ALIGN_SELF[item.align]} ${JUSTIFY_SELF[item.justify]} ${WIDE_ITEM}`}
              style={{ '--row-column': `${item.x + 1} / span ${item.w}` } as CSSProperties}
            >
              <ChildDispatch child={child} {...dispatch} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const horizontalLayoutEntry = {
  tester: horizontalLayoutTester,
  renderer: withJsonFormsLayoutProps(HorizontalLayoutRenderer),
};
