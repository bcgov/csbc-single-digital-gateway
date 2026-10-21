// The layout gap scale (doc 193 rules 1-2, 11): one authored `options.gap` name per layout, read by the fillable CSS
// layouts (a gap class), the studio's gridstack layouts (a grid margin), the inspector and the uischema metaschema.

export const LAYOUT_GAPS = Object.freeze(['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const);

export type LayoutGap = (typeof LAYOUT_GAPS)[number];

/** Rule 1: what an absent or invalid `options.gap` reads as — today's 1rem between items. */
export const DEFAULT_LAYOUT_GAP: LayoutGap = 'md';

/** The size of each gap, in rem. */
export const GAP_REM: Readonly<Record<LayoutGap, number>> = Object.freeze({
  none: 0,
  xs: 0.25,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
});

/** Rule 4: the Tailwind class for each gap — written out in full, Tailwind only generates literal classes. */
export const GAP_CLASS: Readonly<Record<LayoutGap, string>> = Object.freeze({
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
});

const isLayoutGap = (value: unknown): value is LayoutGap =>
  typeof value === 'string' && (LAYOUT_GAPS as readonly string[]).includes(value);

/** Rule 1: a layout's authored `options.gap` when it is one of the names, else the default. */
export function layoutGapOf(elementOptions: unknown): LayoutGap {
  const gap =
    typeof elementOptions === 'object' && elementOptions !== null
      ? (elementOptions as { gap?: unknown }).gap
      : undefined;
  return isLayoutGap(gap) ? gap : DEFAULT_LAYOUT_GAP;
}

/**
 * Rule 11: the gridstack `margin` that shows `gap` between items. gridstack insets every item by its margin on each
 * side, so neighbours sit twice the margin apart.
 */
export const gridMarginFor = (gap: LayoutGap): string => `${GAP_REM[gap] / 2}rem`;
