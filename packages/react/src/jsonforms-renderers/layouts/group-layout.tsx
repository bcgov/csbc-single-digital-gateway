import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { GroupLayout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';

export const groupLayoutTester: RankedTester = rankWith(1, uiTypeIs('Group'));

function GroupLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  const group = uischema as GroupLayout;
  return (
    <Card>
      {group.label ? (
        <CardHeader>
          <CardTitle>{group.label}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-4">
        {group.elements.map((child, index) => (
          <JsonFormsDispatch
            key={index}
            uischema={child}
            schema={schema}
            path={path}
            enabled={enabled}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export const GroupLayoutRenderer = withJsonFormsLayoutProps(GroupLayoutComponent);
