import { isEnumControl, rankWith } from '@jsonforms/core';
import type { ControlProps, OwnPropsOfEnum, RankedTester } from '@jsonforms/core';
import { withJsonFormsEnumProps } from '@jsonforms/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { ControlWrapper } from '../util/control-wrapper';

export const enumControlTester: RankedTester = rankWith(2, isEnumControl);

function EnumControlComponent({
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
    >
      <Select
        value={data ?? null}
        disabled={enabled === false}
        onValueChange={(value: unknown) => handleChange(path, value ?? undefined)}
      >
        <SelectTrigger id={id} aria-invalid={Boolean(errors)} className="w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={String(option.value)} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ControlWrapper>
  );
}

export const EnumControl = withJsonFormsEnumProps(EnumControlComponent);
