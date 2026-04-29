import type { ControlProps } from "@jsonforms/core";
import { and, isStringControl, optionIs, rankWith } from "@jsonforms/core";
import { withJsonFormsControlProps } from "@jsonforms/react";
import { RichTextInput } from "@repo/ui";

import { FieldWrapper } from "../util/FieldWrapper.js";

function RichTextControlRenderer({
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
      <RichTextInput
        value={data as string | undefined}
        onChange={(val) => handleChange(path, val)}
        placeholder={options.placeholder}
        height={options.height}
        disabled={!enabled}
      />
    </FieldWrapper>
  );
}

export const richTextControlTester = rankWith(
  5,
  and(isStringControl, optionIs("format", "richtext")),
);
export const RichTextControl = withJsonFormsControlProps(
  RichTextControlRenderer,
);
export const richTextControlEntry = {
  tester: richTextControlTester,
  renderer: RichTextControl,
};
