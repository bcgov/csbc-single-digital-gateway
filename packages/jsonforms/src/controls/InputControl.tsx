import type { ControlProps } from "@jsonforms/core";
import { isStringControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function InputControlRenderer({
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
}: ControlProps) {
  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <Input
        value={data ?? ""}
        onChange={(e) => handleChange(path, e.target.value || undefined)}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const inputControlTester = rankWith(2, isStringControl);
export const InputControl = withJsonFormsControlProps(InputControlRenderer);
export const inputControlEntry = {
  tester: inputControlTester,
  renderer: InputControl,
};
