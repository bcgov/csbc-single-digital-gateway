import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { Layout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

export const verticalLayoutTester: RankedTester = rankWith(1, uiTypeIs('VerticalLayout'));

function VerticalLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const layout = uischema as Layout;
  return (
    <div className="flex flex-col gap-4">
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

export const VerticalLayoutRenderer = withJsonFormsLayoutProps(VerticalLayoutComponent);
