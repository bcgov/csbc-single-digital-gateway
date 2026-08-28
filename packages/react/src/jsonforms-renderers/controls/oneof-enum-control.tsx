import { isOneOfEnumControl, rankWith } from '@jsonforms/core';
import type { ControlProps, OwnPropsOfEnum, RankedTester } from '@jsonforms/core';
import { withJsonFormsOneOfEnumProps } from '@jsonforms/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { ControlWrapper, describedByIds } from '../util/control-wrapper';

// `oneOf` enums carry `{ const, title }` entries; the HOC normalises them into `options`.
export const oneOfEnumControlTester: RankedTester = rankWith(3, isOneOfEnumControl);

function OneOfEnumControlComponent({
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
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(errors)}
          aria-describedby={describedByIds(id, { description, errors })}
          className="w-full"
        >
          <SelectValue placeholder="Select…">
            {(current: unknown) =>
              current === undefined || current === null || current === ''
                ? 'Select…'
                : (options?.find((option) => option.value === current)?.label ?? String(current))
            }
          </SelectValue>
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

export const OneOfEnumControl = withJsonFormsOneOfEnumProps(OneOfEnumControlComponent);
