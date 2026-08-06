import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { formatDateTime12Hour } from '@repo/ui/datetime-picker';
import { DisplayField, EmptyValue } from '../util/display-field';

// Read-only counterpart to DateTimeControl (feature 157) — gated on `options.format: 'datetime'`.
export const dateTimeDisplayTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'datetime')),
);

function DateTimeDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const text = formatDateTime12Hour(typeof data === 'string' ? data : undefined);
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {text || <EmptyValue />}
    </DisplayField>
  );
}

export const DateTimeDisplay = withJsonFormsControlProps(DateTimeDisplayComponent);
