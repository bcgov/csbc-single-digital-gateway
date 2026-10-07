import type { HeadingLevel } from '@repo/ui/heading';

// A Section's authored settings and derived heading level (doc 278 rules 1, 3, 6, 9-11) — doc 212's
// `section-options.ts` restated, since this package imports no forms renderers. Pure and React-free: the inspector's
// field definitions read it. Every reader falls back rather than throwing — the uischema is hand-authored JSON.

/** Rule 9: `plain` draws no box; `container` boxes the body. */
export const SECTION_VARIANTS = Object.freeze(['plain', 'container'] as const);
export type SectionVariant = (typeof SECTION_VARIANTS)[number];
export const DEFAULT_SECTION_VARIANT: SectionVariant = 'plain';

/** Rule 11: the container's padding — no `none`, a box whose border touches its content is never chosen on purpose. */
export const SECTION_INSETS = Object.freeze(['xs', 'sm', 'md', 'lg', 'xl'] as const);
export type SectionInset = (typeof SECTION_INSETS)[number];
export const DEFAULT_SECTION_INSET: SectionInset = 'md';

/** Each inset in rem — what the inspector's choices are titled with. */
export const INSET_REM: Readonly<Record<SectionInset, number>> = Object.freeze({
  xs: 0.25,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
});

/** The literal class per inset, so Tailwind sees each one. */
export const INSET_CLASS: Readonly<Record<SectionInset, string>> = Object.freeze({
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
});

/** Rule 6: a top-level Section's heading — one below a Form's `h1` title. */
export const SECTION_TOP_LEVEL = 2;

/** Rule 9: `options.variant` when it is one of the names, else `plain`. Takes the element's `options`. */
export function sectionVariant(options: unknown): SectionVariant {
  const variant = recordOf(options)?.['variant'];
  return (SECTION_VARIANTS as readonly unknown[]).includes(variant)
    ? (variant as SectionVariant)
    : DEFAULT_SECTION_VARIANT;
}

/** Rule 11: `options.inset` when it is one of the names, else `md`. Takes the element's `options`. */
export function sectionInset(options: unknown): SectionInset {
  const inset = recordOf(options)?.['inset'];
  return (SECTION_INSETS as readonly unknown[]).includes(inset)
    ? (inset as SectionInset)
    : DEFAULT_SECTION_INSET;
}

/** Rule 6: `h2` at depth 0, one deeper per enclosing Section, capped at `h6` (the last real heading element). */
export function sectionHeadingLevel(depth: number): HeadingLevel {
  const level = SECTION_TOP_LEVEL + Math.max(0, Math.trunc(depth));
  return Math.min(level, 6) as HeadingLevel;
}

/** Rule 5: a Section's title — its non-blank `label`, trimmed. */
export function sectionTitle(element: unknown): string | undefined {
  return nonBlank(recordOf(element)?.['label']);
}

/** Rule 3: a Section's description — its non-blank plain-text `options.description`, trimmed. */
export function sectionDescription(element: unknown): string | undefined {
  return nonBlank(recordOf(recordOf(element)?.['options'])?.['description']);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonBlank(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
