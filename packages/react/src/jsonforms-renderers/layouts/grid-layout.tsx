import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { Layout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

export const gridLayoutTester: RankedTester = rankWith(1, uiTypeIs('GridLayout'));

/** A definable-column grid (feature 169) — unlike HorizontalLayout, the column count is authored
 * (`uischema.options.columns`), not derived from the child count, so children wrap onto new rows once
 * it fills up. Defaults to 2 columns when the option is absent or malformed (never throws). */
function GridLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const layout = uischema as Layout;
  const rawColumns = (layout as { options?: { columns?: unknown } }).options?.columns;
  const columns = typeof rawColumns === 'number' && rawColumns > 0 ? rawColumns : 2;
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {layout.elements.map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={schema}
          path={path}
          enabled={enabled}
        />
      ))}
    </div>
  );
}

export const GridLayoutRenderer = withJsonFormsLayoutProps(GridLayoutComponent);
