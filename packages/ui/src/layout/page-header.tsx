import { cn } from '@ui/lib/utils';
import { Fragment, type ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg';

/**
 * `plain` — just the title/description block. Safe anywhere, including inside a form pane.
 * `banner` — the console treatment: full-window bleed past the shell's `p-6` plus the brand divider.
 */
type Variant = 'plain' | 'banner';

/** Title + description sizing driven by one `size` knob. */
const TITLE_SIZE: Record<Size, string> = {
  sm: 'text-base font-semibold',
  md: 'text-xl font-semibold',
  lg: 'text-2xl font-bold',
};
const DESCRIPTION_SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};
/** Extra-container height pinned to the title's line-height so `extra` never grows the header. */
const EXTRA_HEIGHT: Record<Size, string> = {
  sm: 'h-6', // text-base line-height (1.5rem)
  md: 'h-7', // text-xl line-height (1.75rem)
  lg: 'h-8', // text-2xl line-height (2rem)
};

/**
 * The console treatment, isolated so it stays opt-in (feature 176). The negative margins
 * deliberately bleed past the console `<main>`'s `p-6` so the divider spans the whole window; the
 * `bcgov-gold` border is the brand divider. Both are wrong inside a form pane, which is why
 * `variant` defaults to `plain`.
 */
const BANNER = '-mx-6 -mt-6 border-b-2 border-bcgov-gold';

/**
 * The shared page content column: a window-centered `max-w-6xl` container with `px-6`. Used for the
 * header's (non-fluid) content and by {@link PageBody} so page bodies line up with the header.
 */
const CONTENT_CONTAINER = 'mx-auto w-full max-w-6xl px-6';

interface PageHeaderProps {
  /** Line 1 — rendered as an `<h1>`. */
  title: ReactNode;
  /** Line 2 — optional; nothing renders on the second line when omitted. */
  description?: ReactNode;
  /** Optional items rendered right-aligned on the title row. */
  extra?: ReactNode[];
  /** Scales the title and description together. Default `md`. */
  size?: Size;
  /**
   * `plain` (default) renders the title block alone. `banner` adds the console's full-window bleed
   * and `bcgov-gold` divider — only correct as the first child of a full-width console column.
   */
  variant?: Variant;
  /**
   * When set, the content spans the full screen width (with padding). When omitted (default), the
   * title/description/extra sit inside a centered max-width container.
   */
  fluid?: boolean;
  /** Optional passthrough on the outer wrapper. */
  className?: string;
}

/**
 * Shared page header (feature 162, promoted to `@repo/ui` in feature 176). Two lines — title
 * (`<h1>`) + optional right-aligned `extra`, then an optional description. `size` scales the type;
 * `fluid` makes the content full-width (else it sits in a centered container).
 *
 * **`variant` is the promotion's whole point.** The component was born inside the platform console
 * and hard-coded that shell's chrome: a `-mx-6 -mt-6` bleed past the `<main>` padding and a
 * `bcgov-gold` divider. Shared code can't assume either — `@repo/react`'s Categorization flow layout
 * renders this header inside a form pane, where a full-window bleed would tear through the pane's
 * edges. So the chrome moved behind `variant="banner"` and the default became `plain`; the console
 * opts back in through its own re-export, leaving all of its pages rendering unchanged.
 */
export function PageHeader({
  title,
  description,
  extra,
  size = 'md',
  variant = 'plain',
  fluid = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(variant === 'banner' && BANNER, className)}>
      <div className={fluid ? 'w-full px-6 py-4' : `py-4 ${CONTENT_CONTAINER}`}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className={TITLE_SIZE[size]}>{title}</h1>
            {extra && extra.length > 0 ? (
              // Height pinned to the title's line-height + centered, so tall items never grow the header.
              <div className={`flex shrink-0 items-center gap-2 ${EXTRA_HEIGHT[size]}`}>
                {extra.map((item, index) => (
                  <Fragment key={index}>{item}</Fragment>
                ))}
              </div>
            ) : null}
          </div>
          {description ? (
            <p className={`text-muted-foreground ${DESCRIPTION_SIZE[size]}`}>{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Page body container that lines up with the (non-fluid) {@link PageHeader} content column. It
 * bleeds past the console `<main>` padding (`-mx-6`) and re-applies the shared `max-w-6xl px-6`
 * column, so a page's body edges match its header's. Pass `className` for the body's own layout
 * (e.g. `flex flex-col gap-4`).
 */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="-mx-6">
      <div className={cn(CONTENT_CONTAINER, className)}>{children}</div>
    </div>
  );
}
