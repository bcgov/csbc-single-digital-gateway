import type { GroupLayout as GroupLayoutType, LayoutProps } from "@jsonforms/core";
import { rankWith, uiTypeIs } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldGroup,
} from "@repo/ui";

function GroupLayoutRenderer({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  if (!visible) {
    return null;
  }

  const layout = uischema as GroupLayoutType;
  const elements = layout.elements ?? [];

  return (
    <Card>
      {layout.label && (
        <CardHeader>
          <CardTitle>{layout.label}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <FieldGroup>
          {elements.map((element, index) => (
            <JsonFormsDispatch
              key={index}
              uischema={element}
              schema={schema}
              path={path}
              enabled={enabled}
              renderers={renderers}
              cells={cells}
            />
          ))}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

export const groupLayoutTester = rankWith(2, uiTypeIs("Group"));
export const GroupLayout = withJsonFormsLayoutProps(GroupLayoutRenderer);
export const groupLayoutEntry = {
  tester: groupLayoutTester,
  renderer: GroupLayout,
};
