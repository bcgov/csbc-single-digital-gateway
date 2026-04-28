import type { ControlProps } from "@jsonforms/core";
import { isObjectControl, rankWith } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsControlProps,
} from "@jsonforms/react";
import { FieldGroup } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";
import { generateFilteredUiSchema } from "../util/generateFilteredUiSchema.js";

function ObjectControlRenderer({
  schema,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
  renderers,
  cells,
}: ControlProps) {
  if (!visible) {
    return null;
  }

  const uiSchema = generateFilteredUiSchema(schema);

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <FieldGroup>
        {uiSchema.type === "VerticalLayout" &&
        "elements" in uiSchema &&
        Array.isArray(uiSchema.elements)
          ? uiSchema.elements.map((element, index) => (
              <JsonFormsDispatch
                key={index}
                uischema={element}
                schema={schema}
                path={path}
                enabled={enabled}
                renderers={renderers}
                cells={cells}
              />
            ))
          : (
              <JsonFormsDispatch
                uischema={uiSchema}
                schema={schema}
                path={path}
                enabled={enabled}
                renderers={renderers}
                cells={cells}
              />
            )}
      </FieldGroup>
    </FieldWrapper>
  );
}

export const objectControlTester = rankWith(2, isObjectControl);
export const ObjectControl = withJsonFormsControlProps(ObjectControlRenderer);
export const objectControlEntry = {
  tester: objectControlTester,
  renderer: ObjectControl,
};
