import type { ControlProps, OwnPropsOfEnum } from "@jsonforms/core";
import { isOneOfEnumControl, rankWith } from "@jsonforms/core";
import { withJsonFormsOneOfEnumProps } from "@jsonforms/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function OneOfEnumControlRenderer({
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  visible,
  required,
  enabled,
  options,
}: ControlProps & OwnPropsOfEnum) {
  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <Select
        value={data ?? ""}
        onValueChange={(val) => handleChange(path, val || undefined)}
        disabled={!enabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

export const oneOfEnumControlTester = rankWith(2, isOneOfEnumControl);
export const OneOfEnumControl = withJsonFormsOneOfEnumProps(
  OneOfEnumControlRenderer
);
export const oneOfEnumControlEntry = {
  tester: oneOfEnumControlTester,
  renderer: OneOfEnumControl,
};
