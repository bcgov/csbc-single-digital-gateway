import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { PhoneInput } from '@repo/ui/phone-input';
import { ControlWrapper } from '../util/control-wrapper';

// A phone-number control: any Control whose uischema sets `options.format = 'phone'` renders the
// react-phone-number-input widget (country selector, CA default). The stored value is E.164.
export const phoneControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'phone')),
);

function PhoneControlComponent({
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
    >
      <PhoneInput
        id={id}
        value={typeof data === 'string' ? data : undefined}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onChange={(value) => handleChange(path, value)}
      />
    </ControlWrapper>
  );
}

export const PhoneControl = withJsonFormsControlProps(PhoneControlComponent);
