import type { Layout, LayoutProps } from "@jsonforms/core";
import { rankWith, uiTypeIs } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import { FieldGroup } from "@repo/ui";

function HorizontalLayoutRenderer({
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

  const layout = uischema as Layout;
  const elements = layout.elements ?? [];

  return (
    <FieldGroup className="flex-row">
      {elements.map((element, index) => (
        <div key={index} className="flex-1">
          <JsonFormsDispatch
            uischema={element}
            schema={schema}
            path={path}
            enabled={enabled}
            renderers={renderers}
            cells={cells}
          />
        </div>
      ))}
    </FieldGroup>
  );
}

export const horizontalLayoutTester = rankWith(
  2,
  uiTypeIs("HorizontalLayout")
);
export const HorizontalLayout = withJsonFormsLayoutProps(
  HorizontalLayoutRenderer
);
export const horizontalLayoutEntry = {
  tester: horizontalLayoutTester,
  renderer: HorizontalLayout,
};
