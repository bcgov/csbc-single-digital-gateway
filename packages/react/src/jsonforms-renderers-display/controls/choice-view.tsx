import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Badge } from '@repo/ui/badge';
import {
  type ChoiceOption,
  labelForValue,
  readChoiceOptions,
} from '../../jsonforms-renderers/controls/choice/model';
import { DisplayField, EmptyValue } from '../util/display-field';

/**
 * Read-only view of a choice value (feature 156, Step 2) — the display counterpart to
 * `ChoiceControl`. Single values render as their authored label; multi values as label badges.
 * Presentation (`select`/`radio`/`checkboxes`) is irrelevant here — read-only shows the same for all.
 */
export function ChoiceView({ value, choices }: { value: unknown; choices: ChoiceOption[] }) {
  const values = Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
  if (values.length === 0) {
    return <EmptyValue />;
  }
  if (!Array.isArray(value)) {
    return <>{labelForValue(choices, values[0])}</>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((entry) => (
        <Badge key={String(entry)} color="yellow">
          {labelForValue(choices, entry)}
        </Badge>
      ))}
    </div>
  );
}

export const choiceDisplayTester: RankedTester = rankWith(
  6,
  and(uiTypeIs('Control'), optionIs('format', 'choice')),
);

function ChoiceDisplayComponent({ data, label, description, visible, uischema }: ControlProps) {
  if (visible === false) {
    return null;
  }
  const { choices } = readChoiceOptions(uischema.options);
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      <ChoiceView value={data} choices={choices} />
    </DisplayField>
  );
}

export const ChoiceDisplay = withJsonFormsControlProps(ChoiceDisplayComponent);
