import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { Layout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

export const horizontalLayoutTester: RankedTester = rankWith(1, uiTypeIs('HorizontalLayout'));

function HorizontalLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const layout = uischema as Layout;
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${layout.elements.length}, minmax(0, 1fr))` }}
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

export const HorizontalLayoutRenderer = withJsonFormsLayoutProps(HorizontalLayoutComponent);
