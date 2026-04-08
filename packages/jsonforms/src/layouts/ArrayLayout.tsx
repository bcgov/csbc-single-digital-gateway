import type { ArrayLayoutProps, ControlElement } from "@jsonforms/core";
import {
  composePaths,
  findUISchema,
  isObjectArrayControl,
  rankWith,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsArrayLayoutProps,
} from "@jsonforms/react";
import { Button, Card, CardContent, FieldGroup } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function ArrayLayoutRenderer({
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
  if (!visible) {
    return null;
  }

  const itemUiSchema = findUISchema(
    uischemas ?? [],
    schema,
    uischema.scope,
    path,
    "VerticalLayout",
    uischema as ControlElement,
    rootSchema,
  );
  const itemCount = data ?? 0;

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <FieldGroup className="gap-2">
        {Array.from({ length: itemCount }, (_, index) => (
          <Card key={index} className="py-2 gap-2">
            <CardContent className="p-2">
              <div className="flex items-start gap-1">
                <div className="flex-1 min-w-0 [&_[data-slot=field-group]]:gap-2">
                  {itemUiSchema != null && (
                    <JsonFormsDispatch
                      schema={schema}
                      uischema={itemUiSchema}
                      path={composePaths(path, `${index}`)}
                      enabled={enabled}
                      renderers={renderers}
                      cells={cells}
                    />
                  )}
                </div>
                {enabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove"
                    className="size-5 p-0 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeItems?.(path, [index])()}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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

export const arrayLayoutTester = rankWith(3, isObjectArrayControl);
export const ArrayLayoutComponent = withJsonFormsArrayLayoutProps(
  ArrayLayoutRenderer,
);
export const arrayLayoutEntry = {
  tester: arrayLayoutTester,
  renderer: ArrayLayoutComponent,
};
