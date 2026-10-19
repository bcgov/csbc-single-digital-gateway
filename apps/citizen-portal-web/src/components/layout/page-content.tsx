import type { ReactNode } from 'react';

/**
 * citizen-portal-web's standard page-body column: centered, width-constrained, horizontally padded.
 * This is the "standard `max-w-285` column" {@link PageHeaderBanner} already names in its own doc
 * comment — exported here so the two stay in sync instead of each hard-coding the width separately.
 */
export const PAGE_COLUMN_CLASS = 'mx-auto w-full max-w-285 px-4 md:px-3';

const GAP_CLASS = {
  0: '',
  3: 'gap-3',
  6: 'gap-6',
  9: 'gap-9',
} as const;

interface PageContentProps {
  children: ReactNode;
  /**
   * Vertical gap between stacked children. `9` (default) is the common case for a page's main
   * content stack; `3`/`6` suit tighter stacks (e.g. a loading skeleton), `0` a single block with
   * no siblings to space out.
   */
  gap?: keyof typeof GAP_CLASS;
  className?: string;
}

/**
 * The standard citizen-portal-web page body: a centered, width-constrained, padded flex column with
 * a `my-6` top/bottom margin. Every page under `apps/citizen-portal-web` renders its main content
 * through this component instead of hand-rolling the same Tailwind string — see the rules in
 * `src/catalog/README.md`.
 */
export function PageContent({ children, gap = 9, className }: PageContentProps) {
  const gapClass = GAP_CLASS[gap];
  return (
    <div
      className={`${PAGE_COLUMN_CLASS} my-6 flex flex-col${gapClass ? ` ${gapClass}` : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}
