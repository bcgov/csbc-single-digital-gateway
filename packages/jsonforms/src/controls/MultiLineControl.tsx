import type { ControlProps } from "@jsonforms/core";
import { isMultiLineControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Textarea } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function MultiLineControlRenderer({
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
      <Textarea
        value={data ?? ""}
        onChange={(e) => handleChange(path, e.target.value || undefined)}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const multiLineControlTester = rankWith(3, isMultiLineControl);
export const MultiLineControl = withJsonFormsControlProps(
  MultiLineControlRenderer
);
export const multiLineControlEntry = {
  tester: multiLineControlTester,
  renderer: MultiLineControl,
};
