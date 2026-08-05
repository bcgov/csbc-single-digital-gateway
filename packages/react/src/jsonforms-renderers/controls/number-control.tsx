import { isIntegerControl, isNumberControl, or, rankWith } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { ControlWrapper } from '../util/control-wrapper';

// Slider variants (options.slider) are handled by the higher-ranked slider renderer.
export const numberControlTester: RankedTester = rankWith(1, or(isNumberControl, isIntegerControl));

/** Digits after the decimal point in a number's canonical string form (exponent-aware). */
function decimalCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const s = value.toString().toLowerCase();
  if (s.includes('e-')) {
    const [mantissa, expPart] = s.split('e-');
    return (mantissa?.split('.')[1] ?? '').length + Number(expPart);
  }
  return (s.split('.')[1] ?? '').length;
}

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
  uischema,
}: ControlProps) {
  if (visible === false) {
    return null;
  }
  const isInteger =
    schema.type === 'integer' || (Array.isArray(schema.type) && schema.type.includes('integer'));

  // Client-side bound hints (feature 155). The authoritative min/max check is server-side Ajv on submit.
  const min = typeof schema.minimum === 'number' ? schema.minimum : undefined;
  const max = typeof schema.maximum === 'number' ? schema.maximum : undefined;

  // Decimal-places limit (feature 155): `options.decimals` on a decimal field. Drives the input step
  // and a client-side over-precision check; the submit service is the authoritative gate.
  const rawDecimals = (uischema.options as Record<string, unknown> | undefined)?.decimals;
  const decimals = !isInteger && typeof rawDecimals === 'number' ? rawDecimals : undefined;
  const overPrecision =
    decimals !== undefined && typeof data === 'number' && decimalCount(data) > decimals;
  const decimalsError = overPrecision
    ? `Enter at most ${decimals} decimal place${decimals === 1 ? '' : 's'}.`
    : '';
  const combinedErrors = [errors, decimalsError].filter(Boolean).join('\n');

  const step = isInteger ? 1 : decimals !== undefined ? 10 ** -decimals : 'any';

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
      errors={combinedErrors}
    >
      <Input
        id={id}
        type="number"
        step={step}
        {...(min !== undefined ? { min } : {})}
        {...(max !== undefined ? { max } : {})}
        value={typeof data === 'number' ? String(data) : ''}
        disabled={enabled === false}
        aria-invalid={Boolean(combinedErrors)}
        onChange={(event) => handleChange(path, parse(event.target.value))}
      />
    </ControlWrapper>
  );
}

export const NumberControl = withJsonFormsControlProps(NumberControlComponent);
