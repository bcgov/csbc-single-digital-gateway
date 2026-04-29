import type { ControlProps } from "@jsonforms/core";
import { and, optionIs, rankWith, uiTypeIs } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { SelectInput, type SelectOption } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function isSelectOption(value: unknown): value is SelectOption {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { value?: unknown }).value === "string" &&
    typeof (value as { label?: unknown }).label === "string"
  );
}

function SelectControlRenderer({
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
  const rawChoices = options.choices;
  const choices: SelectOption[] = Array.isArray(rawChoices)
    ? rawChoices
        .map((c) => {
          if (typeof c === "string") return { value: c, label: c };
          if (isSelectOption(c)) return c;
          return null;
        })
        .filter((c): c is SelectOption => c !== null)
    : [];

  return (
    <FieldWrapper
      label={label}
      description={description}
      errors={errors}
      visible={visible}
      required={required}
    >
      <SelectInput
        value={data as string | string[] | undefined}
        onChange={(val) => handleChange(path, val)}
        options={choices}
        isMulti={options.isMulti ?? false}
        placeholder={options.placeholder as string | undefined}
        isClearable={options.isClearable ?? true}
        isDisabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const selectControlTester = rankWith(
  5,
  and(uiTypeIs("Control"), optionIs("format", "select")),
);
export const SelectControl = withJsonFormsControlProps(SelectControlRenderer);
export const selectControlEntry = {
  tester: selectControlTester,
  renderer: SelectControl,
};
