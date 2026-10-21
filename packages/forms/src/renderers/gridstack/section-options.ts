import type { HeadingLevel } from '@repo/ui/heading';

// The Section's authored settings and its derived heading level (doc 212 rules 9-10, 13-18), shaped exactly like
// `layout-gap.ts`: a frozen list of names, a default, a `Record` of WHOLE Tailwind classes, and one pure reader
// that turns an authored value into a name.
//
// Every reader falls back rather than throwing. The uischema is hand-authored JSON that the studio's code panel
// can write freely (doc 191), so a wrong-typed or misspelt value must render the default, not an error.

/** Rule 13: `plain` draws no box; `container` draws one. */
export const SECTION_VARIANTS = Object.freeze(['plain', 'container'] as const);

export type SectionVariant = (typeof SECTION_VARIANTS)[number];

/** Rule 13: what an absent or unrecognised `options.variant` reads as. */
export const DEFAULT_SECTION_VARIANT: SectionVariant = 'plain';

/**
 * Rule 15: the container's padding. No `none` — a box with no inset is a box whose border touches its content,
 * which is not a thing an author is ever choosing on purpose.
 */
export const SECTION_INSETS = Object.freeze(['xs', 'sm', 'md', 'lg', 'xl'] as const);

export type SectionInset = (typeof SECTION_INSETS)[number];

/** Rule 15: the default inset — `md`, the same 1rem the default gap is. */
export const DEFAULT_SECTION_INSET: SectionInset = 'md';

/**
 * Rule 15: each inset in rem, on the SAME scale the gap uses (`layout-gap.ts`'s `GAP_REM`) minus its `none`. One
 * scale for both means an author picking `lg` in two places gets the same 1.5rem in both.
 */
export const INSET_REM: Readonly<Record<SectionInset, number>> = Object.freeze({
  xs: 0.25,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
});

/** Rule 17: the Tailwind class per inset, written out in full — Tailwind generates no interpolated name. */
export const INSET_CLASS: Readonly<Record<SectionInset, string>> = Object.freeze({
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
});

const optionsOf = (elementOptions: unknown): Record<string, unknown> =>
  typeof elementOptions === 'object' && elementOptions !== null
    ? (elementOptions as Record<string, unknown>)
    : {};

/** Rules 13, 18: the authored `options.variant` when it is one of the names, else `plain`. */
export function sectionVariant(elementOptions: unknown): SectionVariant {
  const variant = optionsOf(elementOptions)['variant'];
  return (SECTION_VARIANTS as readonly unknown[]).includes(variant)
    ? (variant as SectionVariant)
    : DEFAULT_SECTION_VARIANT;
}

/** Rules 15, 18: the authored `options.inset` when it is one of the names, else `md`. */
export function sectionInset(elementOptions: unknown): SectionInset {
  const inset = optionsOf(elementOptions)['inset'];
  return (SECTION_INSETS as readonly unknown[]).includes(inset)
    ? (inset as SectionInset)
    : DEFAULT_SECTION_INSET;
}

/**
 * Rule 9: the heading level a Section at `depth` renders — `h2` at the top, one deeper per enclosing Section,
 * capped at `h6`.
 *
 * DERIVED, never authored, for the reason doc 180 rule 23 gives for item placement: a Form's title is `h1`
 * (doc 201 rule 8), so a top-level Section is the next level down, and the document's outline is correct by
 * construction rather than by an author remembering to set it. `h6` is the last real heading element, so a
 * Section nested past it repeats `h6` rather than emitting something that is not a heading at all.
 */
export const SECTION_TOP_LEVEL = 2;

export function sectionHeadingLevel(depth: number): HeadingLevel {
  const level = SECTION_TOP_LEVEL + Math.max(0, Math.trunc(depth));
  return Math.min(level, 6) as HeadingLevel;
}
