import { isIntegerControl, isNumberControl, or, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { ControlWrapper } from '../util/control-wrapper';

// Slider variants (options.slider) are handled by the higher-ranked slider renderer.
export const numberControlTester: RankedTester = rankWith(1, or(isNumberControl, isIntegerControl));

function NumberControlComponent({
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
  schema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const isInteger =
    schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.includes('integer'));

  const parse = (raw: string): number | undefined => {
    if (raw === '') {
      return undefined;
    }
    const value = isInteger ? Number.parseInt(raw, 10) : Number(raw);
    return Number.isNaN(value) ? undefined : value;
  };

  return (
    <ControlWrapper
      id={id}
      label={label}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
    >
      <Input
        id={id}
        type="number"
        step={isInteger ? 1 : 'any'}
        value={typeof data === 'number' ? String(data) : ''}
        disabled={enabled === false}
        aria-invalid={Boolean(errors)}
        onChange={(event) => handleChange(path, parse(event.target.value))}
      />
    </ControlWrapper>
  );
}

export const NumberControl = withJsonFormsControlProps(NumberControlComponent);
