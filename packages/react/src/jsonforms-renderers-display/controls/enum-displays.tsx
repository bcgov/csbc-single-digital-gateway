import {
  and,
  hasType,
  isEnumControl,
  isOneOfEnumControl,
  optionIs,
  rankWith,
  schemaMatches,
  uiTypeIs,
} from '@jsonforms/core';
import type { ControlProps, JsonSchema, OwnPropsOfEnum, RankedTester } from '@jsonforms/core';
import {
  withJsonFormsEnumProps,
  withJsonFormsMultiEnumProps,
  withJsonFormsOneOfEnumProps,
} from '@jsonforms/react';
import { Badge } from '@repo/ui/badge';
import { DisplayField, EmptyValue } from '../util/display-field';

const isEnumArray = (schema: JsonSchema): boolean => {
  const items = schema.items;
  if (!items || Array.isArray(items)) return false;
  const itemSchema = items as JsonSchema;
  return Boolean(itemSchema.enum) || Boolean(itemSchema.oneOf);
};

export const enumDisplayTester: RankedTester = rankWith(2, isEnumControl);
export const enumRadioDisplayTester: RankedTester = rankWith(
  3,
  and(isEnumControl, optionIs('format', 'radio')),
);
export const oneOfEnumDisplayTester: RankedTester = rankWith(3, isOneOfEnumControl);
export const multiEnumDisplayTester: RankedTester = rankWith(
  5,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => hasType(schema, 'array') && isEnumArray(schema)),
  ),
);

/** The human label for a value among `{ label, value }` options, falling back to the raw value. */
function labelOf(options: OwnPropsOfEnum['options'], value: unknown): string {
  return options?.find((option) => option.value === value)?.label ?? String(value);
}

function SingleEnumDisplayComponent({
  data,
  label,
  description,
  visible,
  options,
}: ControlProps & OwnPropsOfEnum) {
  if (visible === false) return null;
  const empty = data === undefined || data === null || data === '';
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {empty ? <EmptyValue /> : labelOf(options, data)}
    </DisplayField>
  );
}

export const EnumDisplay = withJsonFormsEnumProps(SingleEnumDisplayComponent);
export const EnumRadioDisplay = withJsonFormsEnumProps(SingleEnumDisplayComponent);
export const OneOfEnumDisplay = withJsonFormsOneOfEnumProps(SingleEnumDisplayComponent);

function MultiEnumDisplayComponent({
  data,
  label,
  description,
  visible,
  options,
}: ControlProps & OwnPropsOfEnum) {
  if (visible === false) return null;
  const selected: unknown[] = Array.isArray(data) ? data : [];
  return (
    <DisplayField label={label} {...(description ? { description } : {})}>
      {selected.length === 0 ? (
        <EmptyValue />
      ) : (
        <div className="flex flex-wrap gap-1">
          {selected.map((value) => (
            <Badge key={String(value)} color="yellow">
              {labelOf(options, value)}
            </Badge>
          ))}
        </div>
      )}
    </DisplayField>
  );
}

export const MultiEnumDisplay = withJsonFormsMultiEnumProps(MultiEnumDisplayComponent);
