import type { JsonSchema } from '@jsonforms/core';

// Schema constraints and uischema options for the renderers/ui controls (doc 182 rules 17-22b).
// Both are hand-authored JSON that nothing upstream validates, so each value is used only when it
// has the right type. A dropped value is an ABSENT key, never `undefined`, so the result spreads
// straight onto a component under `exactOptionalPropertyTypes`.

type AuthoredOptions = Record<string, unknown> | undefined;

/** Props derived for `Input` / `Textarea`. */
export interface StringInputProps {
  placeholder?: string;
  maxLength?: number;
}

/** Props derived for `NumberInput`. */
export interface NumberInputConfig {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  smallStep?: number;
  largeStep?: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  allowWheelScrub?: boolean;
  snapOnStep?: boolean;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isPositive = (value: unknown): value is number => isFiniteNumber(value) && value > 0;
const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `{ [key]: value }` when `guard` accepts `value`, otherwise `{}`. */
function keep<K extends string, T>(
  key: K,
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
): Partial<Record<K, T>> {
  return guard(value) ? ({ [key]: value } as Record<K, T>) : {};
}

/** `placeholder` from options and `maxLength` from the schema. */
export function stringInputProps(schema: JsonSchema, options: AuthoredOptions): StringInputProps {
  return {
    ...keep('placeholder', options?.['placeholder'], isNonEmptyString),
    ...keep('maxLength', schema.maxLength, isNonNegativeInteger),
  };
}

/** `placeholder` from options, for the Combobox (doc 188 rule 12). */
export function choiceInputProps(options: AuthoredOptions): Pick<StringInputProps, 'placeholder'> {
  return keep('placeholder', options?.['placeholder'], isNonEmptyString);
}

/** The Switch size: `'sm'` only when `options.size` is exactly `'sm'` (doc 188 rule 19). */
export function switchSize(options: AuthoredOptions): 'sm' | 'default' {
  return options?.['size'] === 'sm' ? 'sm' : 'default';
}

/**
 * `min`/`max` from the schema; `step` from `options.step`, else the schema's `multipleOf`; the rest
 * from options, with `format`/`locale` checked against `Intl` by `resolveNumberFormat`.
 */
export function numberInputProps(schema: JsonSchema, options: AuthoredOptions): NumberInputConfig {
  const authoredStep = options?.['step'];
  return {
    ...keep('placeholder', options?.['placeholder'], isNonEmptyString),
    ...keep('min', schema.minimum, isFiniteNumber),
    ...keep('max', schema.maximum, isFiniteNumber),
    ...keep('step', isPositive(authoredStep) ? authoredStep : schema.multipleOf, isPositive),
    ...keep('smallStep', options?.['smallStep'], isPositive),
    ...keep('largeStep', options?.['largeStep'], isPositive),
    ...keep('allowWheelScrub', options?.['allowWheelScrub'], isBoolean),
    ...keep('snapOnStep', options?.['snapOnStep'], isBoolean),
    ...resolveNumberFormat(options?.['format'], options?.['locale']),
  };
}

/**
 * Keeps `locale` only if `Intl.NumberFormat` accepts it, then `format` only if `Intl.NumberFormat`
 * accepts it with that locale — each dropped independently. NumberField builds an
 * `Intl.NumberFormat` while rendering, so an options object Intl rejects (e.g.
 * `{ style: 'currency' }` with no `currency`) would otherwise throw and take the form down.
 */
export function resolveNumberFormat(
  format: unknown,
  locale: unknown,
): Pick<NumberInputConfig, 'format' | 'locale'> {
  const keptLocale =
    isNonEmptyString(locale) && intlAccepts(locale, undefined) ? locale : undefined;
  const keptFormat = isPlainObject(format) && intlAccepts(keptLocale, format) ? format : undefined;
  return {
    ...(keptLocale === undefined ? {} : { locale: keptLocale }),
    ...(keptFormat === undefined ? {} : { format: keptFormat }),
  };
}

function intlAccepts(locale: string | undefined, format: Intl.NumberFormatOptions | undefined) {
  try {
    new Intl.NumberFormat(locale, format).format(0);
    return true;
  } catch {
    // Rejection is the answer, not a failure: the caller drops the authored value (rule 22).
    return false;
  }
}
