import type { ControlProps } from "@jsonforms/core";
import { isBooleanControl, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { Checkbox } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function BooleanControlRenderer({
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
      orientation="horizontal"
    >
      <Checkbox
        checked={!!data}
        onCheckedChange={(checked) => handleChange(path, checked)}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const booleanControlTester = rankWith(2, isBooleanControl);
export const BooleanControl = withJsonFormsControlProps(BooleanControlRenderer);
export const booleanControlEntry = {
  tester: booleanControlTester,
  renderer: BooleanControl,
};
