import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { formatTime12Hour } from '@repo/ui/time-picker';
import { DisplayField, EmptyValue } from '../util/display-field';

// Read-only counterpart to TimeControl (feature 157) — gated on `options.format: 'time'`.
export const timeDisplayTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'time')),
);

function TimeDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const text = formatTime12Hour(typeof data === 'string' ? data : undefined);
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {text || <EmptyValue />}
    </DisplayField>
  );
}

export const TimeDisplay = withJsonFormsControlProps(TimeDisplayComponent);
