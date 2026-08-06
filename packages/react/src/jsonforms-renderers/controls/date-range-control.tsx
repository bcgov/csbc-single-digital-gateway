import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DateRangePicker, type DateRange } from '@repo/ui/date-range-picker';
import { ControlWrapper } from '../util/control-wrapper';
import { parseISODate, toISODate } from './date-util';

// Dispatched by `options.format: 'daterange'`; the data is an object `{ start, end }` of ISO dates.
export const dateRangeControlTester: RankedTester = rankWith(
  4,
  and(uiTypeIs('Control'), optionIs('format', 'daterange')),
);

interface RangeData {
  start?: unknown;
  end?: unknown;
}

function DateRangeControlComponent({
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
  const range = (data && typeof data === 'object' ? data : {}) as RangeData;
  const from = parseISODate(range.start);
  const to = parseISODate(range.end);
  const value: DateRange | undefined = from || to ? { from, to } : undefined;

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <DateRangePicker
        id={id}
        value={value}
        disabled={enabled === false}
        invalid={Boolean(errors)}
        onChange={(next) => {
          if (!next || (!next.from && !next.to)) {
            handleChange(path, undefined);
            return;
          }
          const out: { start?: string; end?: string } = {};
          if (next.from) {
            out.start = toISODate(next.from);
          }
          if (next.to) {
            out.end = toISODate(next.to);
          }
          handleChange(path, out);
        }}
      />
    </ControlWrapper>
  );
}

export const DateRangeControl = withJsonFormsControlProps(DateRangeControlComponent);
