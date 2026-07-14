import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { formatPhone } from '@repo/ui/phone-input';
import { DisplayField, EmptyValue } from '../util/display-field';

// Read-only counterpart to the phone control — renders the stored E.164 value in national format.
export const phoneDisplayTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'phone')),
);

function PhoneDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const text = formatPhone(typeof data === 'string' ? data : undefined);
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {text ? <span>{text}</span> : <EmptyValue />}
    </DisplayField>
  );
}

export const PhoneDisplay = withJsonFormsControlProps(PhoneDisplayComponent);
