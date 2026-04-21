import type { ControlProps } from "@jsonforms/core";
import { isIntegerControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function IntegerControlRenderer({
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
        type="number"
        step="1"
        value={data ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          handleChange(path, val === "" ? undefined : parseInt(val, 10));
        }}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const integerControlTester = rankWith(2, isIntegerControl);
export const IntegerControl = withJsonFormsControlProps(IntegerControlRenderer);
export const integerControlEntry = {
  tester: integerControlTester,
  renderer: IntegerControl,
};
