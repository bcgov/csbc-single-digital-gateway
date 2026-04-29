import type { ControlProps } from "@jsonforms/core";
import { isNumberControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function NumberControlRenderer({
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
        step="any"
        value={data ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          handleChange(path, val === "" ? undefined : Number(val));
        }}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const numberControlTester = rankWith(2, isNumberControl);
export const NumberControl = withJsonFormsControlProps(NumberControlRenderer);
export const numberControlEntry = {
  tester: numberControlTester,
  renderer: NumberControl,
};
