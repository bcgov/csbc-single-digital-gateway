import { RICH_TEXT_FEATURES, type RichTextFeature } from '@repo/ui/rich-text-input';

// Doc 207 rules 10-14 — the authored `uischema.options` of a rich text control, sanitised.
//
// Following `control-options.ts` (doc 182): the uischema is hand-authored JSON that nothing validates
// before it reaches a renderer, so every value is checked here, and a wrong-typed one becomes an ABSENT
// KEY rather than `undefined` — `exactOptionalPropertyTypes` treats those as different things.

export { RICH_TEXT_FEATURES };
export type { RichTextFeature };

/** Rule 13: a sane ceiling, so an authored `rows: 10000` cannot push the page off the screen. */
const MAX_ROWS = 50;

export interface RichTextConfig {
  /** Rule 11: ABSENT means every feature; an empty array means a toolbar-less editor. */
  readonly toolbar?: readonly RichTextFeature[];
  readonly placeholder?: string;
  readonly rows?: number;
  readonly readOnly?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFeature = (value: unknown): value is RichTextFeature =>
  typeof value === 'string' && (RICH_TEXT_FEATURES as readonly string[]).includes(value);

/**
 * Rule 11: the authored features, in the author's order, with unknown and repeated entries dropped.
 *
 * `undefined` for anything that is not an array, which then means "all of them" — an author who wrote
 * nonsense gets the default rather than an empty toolbar they did not ask for. An EMPTY array survives,
 * because asking for no toolbar is a different request from not asking.
 */
function toolbarOf(value: unknown): readonly RichTextFeature[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const features: RichTextFeature[] = [];
  for (const entry of value)
    if (isFeature(entry) && !features.includes(entry)) features.push(entry);
  return features;
}

/** Rule 13: a whole number of lines, at least 1, clamped rather than passed through. */
function rowsOf(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return undefined;
  return Math.min(value, MAX_ROWS);
}

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const booleanOf = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

/** Rule 10: the sanitised settings for a rich text control. Unknown keys are ignored entirely. */
export function richTextConfig(options: unknown): RichTextConfig {
  const bag = isRecord(options) ? options : {};
  const toolbar = toolbarOf(bag['toolbar']);
  const placeholder = textOf(bag['placeholder']);
  const rows = rowsOf(bag['rows']);
  const readOnly = booleanOf(bag['readOnly']);
  return {
    ...(toolbar === undefined ? {} : { toolbar }),
    ...(placeholder === undefined ? {} : { placeholder }),
    ...(rows === undefined ? {} : { rows }),
    ...(readOnly === undefined ? {} : { readOnly }),
  };
}
