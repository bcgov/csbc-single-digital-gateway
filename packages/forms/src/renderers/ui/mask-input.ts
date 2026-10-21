import { useMemo } from 'react';
import { withMask } from 'use-mask-input';

// Doc 204 rules 3, 6-7 — the one place `use-mask-input` is touched. Everything else in the package sees a ref
// callback and two pure readers, so the library stays swappable and the renderers stay testable.

/** What `withMask` hands back: a ref callback that also reads the masked element it was attached to. */
export type MaskRef = ReturnType<typeof withMask>;

/**
 * Rule 3: the ref callback for `pattern`, or `undefined` when no mask is authored.
 *
 * MEMOISED ON THE PATTERN, and that is the whole point: gridstack and JSONForms re-render these controls
 * constantly, and a fresh ref callback identity makes React detach and re-attach the ref — inputmask then
 * re-initialises on the live element and the caret jumps to the end mid-typing. `withMask` rather than the
 * library's `useMaskInput` hook, so a field with no mask calls no hook at all and the rules of hooks are not
 * bent by an optional mask.
 */
export function useMaskRef(pattern: string | undefined): MaskRef | undefined {
  return useMemo(() => (pattern === undefined ? undefined : withMask(pattern)), [pattern]);
}

/**
 * Rules 6-7: what a masked field stores for the element's current value — the raw characters when the field is
 * authored `maskUnmasked`, else the masked text exactly as shown.
 *
 * An empty result is `undefined`, never `''` (doc 182 rule 15): Ajv counts `''` as present, so a `required`
 * field would never fail. An unmasked read that comes back empty falls back to nothing for the same reason —
 * a mask with no characters typed yet reads as its literals alone, which is not an answer.
 */
export function maskedValue(
  shown: string,
  ref: MaskRef | undefined,
  unmasked: boolean | undefined,
): string | undefined {
  if (unmasked !== true || ref === undefined) return shown || undefined;
  return ref.unmaskedValue() || undefined;
}
