import { currencyOf, isMoneyControl } from './currency';

/**
 * A plain number schema (doc 248 rule 2): `type` exactly `'number'` or `'integer'` with no `enum`, `oneOf` or `const`
 * — a numeric choice (doc 246) stays with the choice renderer.
 */
export function isPlainNumber(schema: unknown): boolean {
  const s = recordOf(schema);
  return (
    s !== undefined &&
    (s['type'] === 'number' || s['type'] === 'integer') &&
    !('enum' in s) &&
    !('oneOf' in s) &&
    !('const' in s)
  );
}

/** What the number input reads (doc 248 rules 7-10), sanitised: a wrong-typed value is an ABSENT key. */
export interface NumberOptions {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  format?: Intl.NumberFormatOptions;
}

/** An integer shows — and so parses — no fraction digits (rule 10). */
const WHOLE: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

export function numberOptions(uischema: unknown, schema: unknown): NumberOptions {
  const s = recordOf(schema) ?? {};
  const integer = s['type'] === 'integer';
  const { minimum, maximum, multipleOf } = s;
  const placeholder = recordOf(recordOf(uischema)?.['options'])?.['placeholder'];
  const step = isPositive(multipleOf) ? multipleOf : integer ? 1 : undefined;
  return {
    ...(isFinite(minimum) && { min: minimum }),
    ...(isFinite(maximum) && { max: maximum }),
    ...(step !== undefined && { step }),
    ...(typeof placeholder === 'string' && placeholder !== '' && { placeholder }),
    ...(isMoneyControl(uischema)
      ? { format: moneyDigits(integer ? 0 : currencyOf(uischema).fractionDigits) }
      : integer && { format: WHOLE }),
  };
}

/** Doc 286 rule 3: a Money field always shows — and Base UI rounds to — exactly its currency's decimal places. */
function moneyDigits(digits: number): Intl.NumberFormatOptions {
  return { minimumFractionDigits: digits, maximumFractionDigits: digits };
}

function isFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositive(value: unknown): value is number {
  return isFinite(value) && value > 0;
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
