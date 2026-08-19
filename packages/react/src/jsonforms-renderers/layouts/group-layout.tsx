import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { GroupLayout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

export const groupLayoutTester: RankedTester = rankWith(1, uiTypeIs('Group'));

function GroupLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const group = uischema as GroupLayout;
  return (
    <>
      {group.label ? (
        <div className="flex flex-col gap-1">
          <h2 className="section-heading">{group.label}</h2>
          {group.options?.description ? (
            <p className="text-sm text-muted-foreground">{group.options.description}</p>
          ) : null}
        </div>
      ) : null}

      {group.elements.map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={schema}
          path={path}
          enabled={enabled}
        />
      ))}
    </>
  );
}

export const GroupLayoutRenderer = withJsonFormsLayoutProps(GroupLayoutComponent);
