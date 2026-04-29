import type { ControlProps } from "@jsonforms/core";
import { and, isObjectControl, optionIs, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { JsonInput } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function JsonControlRenderer({
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
  uischema,
}: ControlProps) {
  const options = uischema.options ?? {};

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <JsonInput
        value={data as Record<string, unknown> | undefined}
        onChange={(val) => handleChange(path, val)}
        jsonSchema={options.jsonSchema}
        height={options.height}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const jsonControlTester = rankWith(
  5,
  and(isObjectControl, optionIs("format", "json"))
);
export const JsonControl = withJsonFormsControlProps(JsonControlRenderer);
export const jsonControlEntry = {
  tester: jsonControlTester,
  renderer: JsonControl,
};
