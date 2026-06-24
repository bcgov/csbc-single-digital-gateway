import { and, isEnumControl, optionIs, rankWith } from '@jsonforms/core';
import type { ControlProps, OwnPropsOfEnum, RankedTester } from '@jsonforms/core';
import { withJsonFormsEnumProps } from '@jsonforms/react';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { ControlWrapper } from '../util/control-wrapper';

// Opt in with `uischema.options.format = 'radio'`; outranks the select renderer.
export const enumRadioControlTester: RankedTester = rankWith(
  3,
  and(isEnumControl, optionIs('format', 'radio')),
);

function EnumRadioControlComponent({
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
  options,
}: ControlProps & OwnPropsOfEnum) {
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
      <RadioGroup
        value={data ?? null}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onValueChange={(value: unknown) => handleChange(path, value ?? undefined)}
      >
        {options?.map((option) => {
          const itemId = `${id}-${String(option.value)}`;
          return (
            <Field key={String(option.value)} orientation="horizontal">
              <RadioGroupItem id={itemId} value={option.value} />
              <FieldLabel htmlFor={itemId}>{option.label}</FieldLabel>
            </Field>
          );
        })}
      </RadioGroup>
    </ControlWrapper>
  );
}

export const EnumRadioControl = withJsonFormsEnumProps(EnumRadioControlComponent);
