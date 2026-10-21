// Doc 211 rules 1-4: how a subtree is being SHOWN, carried by JSONForms' `config` — the channel
// `hideRequiredAsterisk` and doc 202 rule 50's `readonly` already travel on.
//
// One axis with three positions rather than two independent booleans: "read-only" and "plain text" are not
// things that can both be half-true, and a single reader means dispatch, chrome and the runner can never
// disagree about which of them is on.

/**
 * Rule 1: the three ways the same document is drawn.
 *
 * - `fill` — the editable form.
 * - `readonly` — doc 202 rule 50's page: real inputs, full contrast, focusable; `readOnly` where HTML has it
 *   and `disabled` where it does not.
 * - `plain` — no input at all. The label and the formatted answer as text (rules 5-11).
 */
export type Presentation = 'fill' | 'readonly' | 'plain';

/** The shape read off `config`. Both keys are ours; neither is authorable (rule 4). */
interface PresentationConfig {
  presentation?: unknown;
  readonly?: unknown;
}

/**
 * Rules 1-3: which presentation this subtree is drawn in.
 *
 * `presentation: 'plain'` wins over a `readonly` flag set alongside it, and a plain config is EXPECTED to set
 * both: JSONForms itself reads `config.readonly` and reports `enabled: false` for the subtree, so setting only
 * `presentation` would leave its view of the tree disagreeing with ours.
 *
 * Anything unrecognised — a misspelt value, a non-object config, no config at all — reads as `fill`, the end
 * the author authored. A presentation is never authored (rule 4): only the component drawing the page sets one.
 */
export function presentationOf(config: unknown): Presentation {
  if (typeof config !== 'object' || config === null) return 'fill';
  const { presentation, readonly } = config as PresentationConfig;
  if (presentation === 'plain') return 'plain';
  if (presentation === 'readonly' || readonly === true) return 'readonly';
  return 'fill';
}

/**
 * Rule 2: whether this subtree may not be edited — true for BOTH read-only positions.
 *
 * Kept with exactly the meaning doc 202 rule 50 gave it, so every caller it already has keeps working with no
 * edit: a plain subtree is read-only too, it simply draws the fact differently.
 */
export const isReadonly = (config: unknown): boolean => presentationOf(config) !== 'fill';

/** The `config` a plain page hands `<JsonForms>` (rule 3). `readonly` is set deliberately — see above. */
export const PLAIN_CONFIG = { presentation: 'plain', readonly: true } as const;
