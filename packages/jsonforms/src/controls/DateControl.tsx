import type { ControlProps } from "@jsonforms/core";
import { isDateControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function DateControlRenderer({
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
        type="date"
        value={data ?? ""}
        onChange={(e) => handleChange(path, e.target.value || undefined)}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const dateControlTester = rankWith(2, isDateControl);
export const DateControl = withJsonFormsControlProps(DateControlRenderer);
export const dateControlEntry = {
  tester: dateControlTester,
  renderer: DateControl,
};
