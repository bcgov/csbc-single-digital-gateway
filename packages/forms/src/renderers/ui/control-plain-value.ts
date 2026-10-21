import type { JsonSchema } from '@jsonforms/core';
import { formatWithMask } from 'use-mask-input';
import { choiceOptions } from './choice-control';
import { maskConfig, numberInputProps, type AuthoredOptions } from './control-options';
import { multiChoiceOptions } from './multi-choice-control';

// Doc 211 rules 8-12 — a stored answer as the text it was entered as, one pure formatter per control kind.
//
// PURE and React-free on purpose: doc 182's TEST TRAP records that JSONForms' Ajv refuses an invalid schema
// keyword before any renderer runs, so the edge cases here can only be reached by calling these directly. The
// one control whose plain value is not text — RichText — passes its own `RichTextView` node instead (rule 11).
//
// TWO RULES HOLD THROUGHOUT:
//   Rule 9  — `undefined` means "no answer". A formatter NEVER returns the wording for it; `PlainField` owns
//             that, so every control says it identically.
//   Rule 10 — a stored value the schema no longer admits is returned as its raw string, never dropped. This is
//             a view of what was submitted, and nothing submitted may be invisible in it.

/**
 * Rule 10: anything not worth formatting, shown as itself. Absent stays absent (rule 9).
 *
 * Exported as `plainFallback` because `PlainField` uses the SAME reader when a control passes no value of its
 * own (rule 8) — so a control that opts out and a value its schema no longer admits are shown identically.
 */
export function plainFallback(data: unknown): string | undefined {
  if (data === undefined || data === null) return undefined;
  if (typeof data === 'object') return JSON.stringify(data);
  return String(data) || undefined;
}

/**
 * Rules 11-12: a string answer — re-masked when the field stores raw characters.
 *
 * Doc 204 rules 6-7: `maskUnmasked` stores what was typed WITHOUT the mask's literals, so displaying it
 * unformatted would show a reviewer a different string from the one the citizen saw. A field that stores its
 * masked text is already display-ready, and an unmasked field is untouched by any of this.
 *
 * `formatWithMask` is the library's own pure formatter — documented for exactly this, displaying persisted
 * unmasked values — so the mask is never re-implemented here. A mask it cannot apply leaves the value raw
 * rather than losing it.
 */
export function plainText(data: unknown, options: AuthoredOptions): string | undefined {
  if (typeof data !== 'string') return plainFallback(data);
  if (data.length === 0) return undefined;
  const { mask, unmasked } = maskConfig(options);
  if (mask === undefined || unmasked !== true) return data;
  try {
    return formatWithMask(data, mask) || data;
  } catch {
    // The pattern is the author's and nothing validates it; an unusable one must not cost the answer.
    return data;
  }
}

/**
 * Rule 11: a number answer, formatted as the field formatted it.
 *
 * The format and locale come from `numberInputProps`, so `options.decimals`, an authored `format` and a
 * rejected `locale` all resolve exactly once — a plain page showing `1.5` where the field showed `1.50` would
 * be a different answer to a reviewer's eye.
 */
export function plainNumber(
  data: unknown,
  schema: JsonSchema,
  options: AuthoredOptions,
): string | undefined {
  if (typeof data !== 'number' || !Number.isFinite(data)) return plainFallback(data);
  const { format, locale } = numberInputProps(schema, options);
  // `resolveNumberFormat` has already checked both against `Intl`, so this cannot throw.
  return new Intl.NumberFormat(locale, format).format(data);
}

/**
 * Rule 11: a single choice answer as the option's LABEL, never the stored const — the const is an authoring
 * detail, and `business-bc` is not what the citizen chose.
 */
export function plainChoice(schema: JsonSchema | undefined, data: unknown): string | undefined {
  const chosen = choiceOptions(schema)?.find((option) => option.value === data);
  // Rule 10: a const the schema no longer lists still shows, as itself.
  return chosen?.label ?? plainFallback(data);
}

/**
 * Rule 11: a multi-choice answer as the chosen labels, in AUTHORING order — the order doc 205 rule 8 already
 * gives the fillable control, so two submissions of the same answers read identically.
 *
 * Rule 10: a stored entry that is no longer an option is kept, as itself, after the ones that are. `undefined`
 * for an absent or empty array (rule 9) — doc 182 rule 15's reasoning, one step on: an empty array is not an
 * answer.
 */
export function plainMultiChoice(
  schema: JsonSchema | undefined,
  data: unknown,
): string[] | undefined {
  if (!Array.isArray(data) || data.length === 0) return undefined;
  const options = multiChoiceOptions(schema) ?? [];
  const known = options.filter((option) => data.includes(option.value));
  const unknown = data.filter((entry) => !options.some((option) => option.value === entry));
  const labels = [
    ...known.map((option) => option.label),
    ...unknown.map((entry) => plainFallback(entry) ?? ''),
  ].filter((label) => label.length > 0);
  return labels.length > 0 ? labels : undefined;
}

/**
 * Rule 11: a boolean answer as Yes or No.
 *
 * An ABSENT property is `undefined`, not `No` (rule 9). A checkbox nobody touched and a checkbox deliberately
 * left unticked are the same answer to Ajv, but they are not the same thing to a reviewer, and the one this
 * can tell apart — no property at all — is worth telling apart.
 */
export function plainBoolean(data: unknown): string | undefined {
  if (typeof data === 'boolean') return data ? 'Yes' : 'No';
  return plainFallback(data);
}
