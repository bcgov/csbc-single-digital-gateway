import type { CombinatorRendererProps, JsonSchema } from "@jsonforms/core";
import {
  Generate,
  isOneOfControl,
  rankWith,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsOneOfProps,
} from "@jsonforms/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function OneOfControlRenderer({
  handleChange,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
  schema,
  indexOfFittingSchema,
  renderers,
  cells,
}: CombinatorRendererProps) {
  if (!visible) {
    return null;
  }

  const oneOfSchemas = (schema.oneOf ?? []) as JsonSchema[];
  const selectedIndex =
    indexOfFittingSchema !== undefined && indexOfFittingSchema >= 0
      ? indexOfFittingSchema
      : -1;

  const handleVariantChange = (value: string | null) => {
    if (value === null) return;
    const newIndex = parseInt(value, 10);
    const variant = oneOfSchemas[newIndex];
    if (!variant) return;

    const initial: Record<string, unknown> = {};
    if (variant.properties?.["type"]) {
      initial.type = (variant.properties["type"] as JsonSchema).const;
    }
    handleChange(path, initial);
  };

  const selectedSchema = selectedIndex >= 0 ? oneOfSchemas[selectedIndex] : undefined;
  const selectedUiSchema = selectedSchema
    ? Generate.uiSchema(selectedSchema)
    : undefined;

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <div className="flex flex-col gap-3">
        <Select
          value={selectedIndex >= 0 ? String(selectedIndex) : ""}
          onValueChange={handleVariantChange}
          disabled={!enabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {oneOfSchemas.map((variant, index) => (
              <SelectItem key={index} value={String(index)}>
                {variant.title ?? `Option ${index + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSchema && selectedUiSchema && (
          <JsonFormsDispatch
            schema={selectedSchema}
            uischema={selectedUiSchema}
            path={path}
            enabled={enabled}
            renderers={renderers}
            cells={cells}
          />
        )}
      </div>
    </FieldWrapper>
  );
}

export const oneOfControlTester = rankWith(3, isOneOfControl);
export const OneOfControl = withJsonFormsOneOfProps(OneOfControlRenderer);
export const oneOfControlEntry = {
  tester: oneOfControlTester,
  renderer: OneOfControl,
};
