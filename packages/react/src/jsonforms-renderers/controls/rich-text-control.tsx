import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { RichTextInput, type RichTextInputProps } from '@repo/ui/rich-text-input';
import { ControlWrapper } from '../util/control-wrapper';

// Matches a Control whose uischema sets `options.format = 'richtext'`. Ranked above the generic
// controls so it wins regardless of the (object) schema type backing the rich-text value.
export const richTextControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'richtext')),
);

function RichTextControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
      labelFor={false}
    >
      <RichTextInput
        id={id}
        value={(data ?? null) as Exclude<RichTextInputProps['value'], undefined>}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onChange={(value) => handleChange(path, value)}
      />
    </ControlWrapper>
  );
}

export const RichTextControl = withJsonFormsControlProps(RichTextControlComponent);
