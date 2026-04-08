import type { Layout, LayoutProps, UISchemaElement } from "@jsonforms/core";
import { rankWith, uiTypeIs } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  FieldGroup,
} from "@repo/ui";

interface AccordionItemElement extends UISchemaElement {
  label?: string;
  elements?: UISchemaElement[];
}

function AccordionLayoutRenderer({
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

  const layout = uischema as Layout & { label?: string };
  const items = (layout.elements ?? []) as AccordionItemElement[];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {layout.label && (
        <div className="text-sm font-medium">{layout.label}</div>
      )}
      <Accordion defaultValue={items.map((_, i) => i)}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={index}>
          <AccordionTrigger>{item.label ?? `Section ${index + 1}`}</AccordionTrigger>
          <AccordionContent>
            <FieldGroup>
              {(item.elements ?? []).map((element, elementIndex) => (
                <JsonFormsDispatch
                  key={elementIndex}
                  uischema={element}
                  schema={schema}
                  path={path}
                  enabled={enabled}
                  renderers={renderers}
                  cells={cells}
                />
              ))}
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>
      ))}
      </Accordion>
    </div>
  );
}

export const accordionLayoutTester = rankWith(3, uiTypeIs("Accordion"));
export const AccordionLayout = withJsonFormsLayoutProps(AccordionLayoutRenderer);
export const accordionLayoutEntry = {
  tester: accordionLayoutTester,
  renderer: AccordionLayout,
};
