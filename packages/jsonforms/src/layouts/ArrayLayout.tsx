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
      <FieldGroup>
        {Array.from({ length: itemCount }, (_, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
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
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeItems?.(path, [index])()}
                  >
                    Remove
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
