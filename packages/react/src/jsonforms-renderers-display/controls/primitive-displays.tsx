import {
  and,
  isBooleanControl,
  isDateControl,
  isIntegerControl,
  isMultiLineControl,
  isNumberControl,
  isRangeControl,
  isStringControl,
  optionIs,
  or,
  rankWith,
} from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DisplayField, EmptyValue } from '../util/display-field';

// Display renderers reuse the SAME testers/ranks as the form controls so dispatch is identical;
// only the rendered output differs (read-only text instead of inputs).

export const textDisplayTester: RankedTester = rankWith(1, isStringControl);
export const multilineDisplayTester: RankedTester = rankWith(3, isMultiLineControl);
export const numberDisplayTester: RankedTester = rankWith(1, or(isNumberControl, isIntegerControl));
export const sliderDisplayTester: RankedTester = rankWith(4, isRangeControl);
export const booleanDisplayTester: RankedTester = rankWith(2, isBooleanControl);
export const booleanToggleDisplayTester: RankedTester = rankWith(
  3,
  and(isBooleanControl, optionIs('toggle', true)),
);
export const dateDisplayTester: RankedTester = rankWith(3, isDateControl);

function TextDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  const value = typeof data === 'string' ? data : '';
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {value ? value : <EmptyValue />}
    </DisplayField>
  );
}
export const TextDisplay = withJsonFormsControlProps(TextDisplayComponent);

function MultilineDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  const value = typeof data === 'string' ? data : '';
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {value ? <span className="whitespace-pre-line">{value}</span> : <EmptyValue />}
    </DisplayField>
  );
}
export const MultilineDisplay = withJsonFormsControlProps(MultilineDisplayComponent);

function NumberDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {typeof data === 'number' ? String(data) : <EmptyValue />}
    </DisplayField>
  );
}
export const NumberDisplay = withJsonFormsControlProps(NumberDisplayComponent);
export const SliderDisplay = NumberDisplay;

function BooleanDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {typeof data === 'boolean' ? data ? 'Yes' : 'No' : <EmptyValue />}
    </DisplayField>
  );
}
export const BooleanDisplay = withJsonFormsControlProps(BooleanDisplayComponent);
export const BooleanToggleDisplay = BooleanDisplay;

function DateDisplayComponent({ data, label, description, visible }: ControlProps) {
  if (visible === false) return null;
  const formatted =
    typeof data === 'string' && data ? new Date(`${data}T00:00:00`).toLocaleDateString() : '';
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {formatted ? formatted : <EmptyValue />}
    </DisplayField>
  );
}
export const DateDisplay = withJsonFormsControlProps(DateDisplayComponent);
