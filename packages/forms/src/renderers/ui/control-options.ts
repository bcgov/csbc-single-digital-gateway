import type { JsonSchema } from '@jsonforms/core';

// Schema constraints and uischema options for the renderers/ui controls (doc 182 rules 17-22b).
// Both are hand-authored JSON that nothing upstream validates, so each value is used only when it
// has the right type. A dropped value is an ABSENT key, never `undefined`, so the result spreads
// straight onto a component under `exactOptionalPropertyTypes`.

/** Doc 211 rule 8: exported so the plain-value formatters take the same authored bag these sanitisers do. */
export type AuthoredOptions = Record<string, unknown> | undefined;

/** Props derived for `Input` / `Textarea`. */
export interface StringInputProps {
  placeholder?: string;
  maxLength?: number;
}

/**
 * Doc 204 rules 5-6: the Text field's mask, kept apart from `StringInputProps` because it is NOT spread onto
 * the input — `mask` becomes a ref and `unmasked` decides what `onChange` stores. The Textarea reads neither
 * (rule 8), which is why this is a separate call rather than more keys on `stringInputProps`.
 */
export interface MaskConfig {
  mask?: string;
  unmasked?: boolean;
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

/**
 * Doc 204 rules 5-6: the authored mask pattern, and whether the form stores the raw characters instead of what
 * is shown. `unmasked` is read only when there IS a mask — a lone `maskUnmasked` means nothing and is dropped,
 * so a field can never claim to store an unmasked value it never masked.
 */
export function maskConfig(options: AuthoredOptions): MaskConfig {
  const mask = options?.['mask'];
  if (!isNonEmptyString(mask)) return {};
  return { mask, ...keep('unmasked', options?.['maskUnmasked'], isBoolean) };
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
    ...resolveNumberFormat(
      withDecimals(options?.['format'], options?.['decimals']),
      options?.['locale'],
    ),
  };
}

/** Doc 204 rule 14: fraction digits an author may set, and the most `Intl.NumberFormat` is asked for here. */
const MAX_DECIMALS = 10;

const isDecimals = (value: unknown): value is number =>
  isNonNegativeInteger(value) && (value as number) <= MAX_DECIMALS;

/**
 * Doc 204 rule 15: `options.decimals` DERIVED into the format rather than stored inside it — one authored key,
 * one source of truth, and the same key the citizen API's submit check already reads.
 *
 * It fixes the digits exactly (`min` = `max`), so `2` shows `1.50`, not `1.5`. An authored `format` keeps every
 * other key it has; its own fraction digits lose to `decimals`, which is the setting the author can SEE in the
 * inspector. A `decimals` that is not a 0-10 integer is ignored, leaving the authored format untouched.
 */
function withDecimals(format: unknown, decimals: unknown): unknown {
  if (!isDecimals(decimals)) return format;
  const authored = isPlainObject(format) ? format : {};
  return { ...authored, minimumFractionDigits: decimals, maximumFractionDigits: decimals };
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
