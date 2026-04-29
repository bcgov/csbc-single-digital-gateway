import type { Layout, LayoutProps } from "@jsonforms/core";
import { rankWith, uiTypeIs } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import { FieldGroup } from "@repo/ui";

function AccordionItemLayoutRenderer({
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
  );
}

export const accordionItemLayoutTester = rankWith(2, uiTypeIs("AccordionItem"));
export const AccordionItemLayout = withJsonFormsLayoutProps(
  AccordionItemLayoutRenderer,
);
export const accordionItemLayoutEntry = {
  tester: accordionItemLayoutTester,
  renderer: AccordionItemLayout,
};
