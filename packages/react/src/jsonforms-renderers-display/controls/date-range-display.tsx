import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { format as formatDate } from 'date-fns';
import { DisplayField, EmptyValue } from '../util/display-field';

// Read-only counterpart to DateRangeControl (feature 157) — gated on `options.format: 'daterange'`.
export const dateRangeDisplayTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'daterange')),
);

const fmt = (iso: unknown): string | null =>
  typeof iso === 'string' && iso ? formatDate(new Date(`${iso}T00:00:00`), 'MM/dd/yyyy') : null;

function DateRangeDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const range = (data && typeof data === 'object' ? data : {}) as {
    start?: unknown;
    end?: unknown;
  };
  const start = fmt(range.start);
  const end = fmt(range.end);
  const text = start && end ? `${start} – ${end}` : (start ?? end);

  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {text ?? <EmptyValue />}
    </DisplayField>
  );
}

export const DateRangeDisplay = withJsonFormsControlProps(DateRangeDisplayComponent);
