import { clsx, type ClassValue } from 'clsx';
import type { ComponentProps } from 'react';
import { extendTailwindMerge } from 'tailwind-merge';

/** Both knobs run 1-6: `level` picks the element, `size` picks the scale. */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Visual scale, indexed on the *app* heading scale — not the BCDS one. The app deliberately
 * compresses the scale (`--app-text-h1` maps to BCDS h4, `--app-text-h2` to BCDS h5; see
 * `src/styles/tokens.css` and the rationale in `src/styles/base.css`), so `size={1}` means
 * "the app's largest heading", not "BCDS h1".
 *
 * `6` intentionally maps to `text-lg` rather than `text-h6`: both tokens resolve to
 * `--bcds-typography-font-size-large-body`, so the two render identically.
 */
const SIZE: Record<HeadingLevel, string> = {
  1: 'text-h1 font-bold',
  2: 'text-h2 font-bold',
  3: 'text-h3 font-bold',
  4: 'text-h4 font-bold',
  5: 'text-h5 font-bold',
  6: 'text-lg font-bold',
};

/**
 * The shared `cn()` can't merge this component's classes correctly: stock tailwind-merge doesn't
 * know `text-h1`…`text-h6` are font sizes, so it files them under text-*color*. That both fails to
 * let a caller's `text-sm` displace `text-h1` and — worse — makes an unrelated `text-red-500` from
 * the caller *delete* the size class. Teaching a local merge about the custom scale fixes both.
 * Scoped to this file on purpose; the shared `cn()` is left alone.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'display', 'label'] }],
    },
  },
});

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface HeadingProps extends ComponentProps<'h1'> {
  /** Semantic element rendered: `1` → `<h1>` … `6` → `<h6>`. Default `1`. */
  level?: HeadingLevel;
  /**
   * Rendered size, independent of `level`. Omit it and no size class is emitted at all — the bare
   * element picks up the base layer (`src/styles/base.css`), which already gives `h1`-`h6` the
   * matching font size, bold weight and normal leading.
   */
  size?: HeadingLevel;
}

/**
 * A heading whose outline position and visual weight are set independently — `level` for the
 * semantics, `size` for the scale — so neither has to be compromised to get the other right.
 */
function Heading({ level = 1, size, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;

  // No `size` → pass `className` through untouched, so a caller-less heading emits no `class` at
  // all rather than an empty attribute.
  return <Tag className={size === undefined ? className : cn(SIZE[size], className)} {...props} />;
}

export { Heading, SIZE as headingSizes };
export type { HeadingLevel, HeadingProps };
