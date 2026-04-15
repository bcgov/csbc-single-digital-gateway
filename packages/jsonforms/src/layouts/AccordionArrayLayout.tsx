import type { ArrayLayoutProps, ControlElement } from "@jsonforms/core";
import {
  and,
  composePaths,
  findUISchema,
  isObjectArrayControl,
  optionIs,
  rankWith,
  Resolve,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  useJsonForms,
  withJsonFormsArrayLayoutProps,
} from "@jsonforms/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  FieldGroup,
} from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function AccordionArrayLayoutRenderer({
  data,
  path,
  schema,
  uischema,
  rootSchema,
  uischemas,
  enabled,
  visible,
  label,
  description,
  errors,
  required,
  addItem,
  removeItems,
  renderers,
  cells,
}: ArrayLayoutProps) {
  const ctx = useJsonForms();

  if (!visible) {
    return null;
  }

  const controlElement = uischema as ControlElement;
  const detailUiSchema =
    (controlElement.options?.detail as ControlElement | undefined) ??
    findUISchema(
      uischemas ?? [],
      schema,
      uischema.scope,
      path,
      "VerticalLayout",
      controlElement,
      rootSchema,
    );

  const triggerScope = controlElement.options?.accordionTriggerScope as
    | string
    | undefined;
  const triggerProp = triggerScope
    ? triggerScope.replace(/^#\/properties\//, "")
    : undefined;

  const itemCount = data ?? 0;

  const getTriggerText = (index: number): string => {
    if (triggerProp && ctx.core?.data) {
      const itemData = Resolve.data(
        ctx.core.data,
        composePaths(path, `${index}`),
      );
      const value =
        itemData && typeof itemData === "object"
          ? (itemData as Record<string, unknown>)[triggerProp]
          : undefined;
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return `Item ${index + 1}`;
  };

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <FieldGroup className="gap-2">
        <Accordion>
          {Array.from({ length: itemCount }, (_, index) => (
            <AccordionItem key={index} value={index}>
              <AccordionTrigger>
                <span className="flex-1 text-left">{getTriggerText(index)}</span>
                {enabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove"
                    className="size-5 p-0 shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItems?.(path, [index])();
                    }}
                  >
                    ✕
                  </Button>
                )}
              </AccordionTrigger>
              <AccordionContent>
                {detailUiSchema != null && (
                  <JsonFormsDispatch
                    schema={schema}
                    uischema={detailUiSchema}
                    path={composePaths(path, `${index}`)}
                    enabled={enabled}
                    renderers={renderers}
                    cells={cells}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {enabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem(path, {})}
          >
            + Add {label ? label.replace(/s$/, "") : "Item"}
          </Button>
        )}
      </FieldGroup>
    </FieldWrapper>
  );
}

export const accordionArrayLayoutTester = rankWith(
  5,
  and(isObjectArrayControl, optionIs("format", "accordion")),
);
export const AccordionArrayLayout = withJsonFormsArrayLayoutProps(
  AccordionArrayLayoutRenderer,
);
export const accordionArrayLayoutEntry = {
  tester: accordionArrayLayoutTester,
  renderer: AccordionArrayLayout,
};
