import { Fragment, type ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg';

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
   * When set, the content spans the full screen width (with padding). When omitted (default), the
   * title/description/extra sit inside a centered max-width container.
   */
  fluid?: boolean;
  /** Optional passthrough on the outer (divider) wrapper. */
  className?: string;
}

/**
 * Console page header (feature 162) — replaces the section title/subtitle strip removed in feature
 * 160. The gold-bordered banner always spans the **full window width**: it bleeds past the console
 * `<main>` padding (`-mx-6 -mt-6`), so it must be rendered as the first child of a full-width column
 * (not inside a page's constrained `max-w-*` wrapper). Two lines — title (`<h1>`) + optional
 * right-aligned `extra`, then an optional description — over a `bcgov-gold` bottom divider. `size`
 * scales the type; `fluid` makes the content full-width (else it sits in a centered container).
 */
export function PageHeader({
  title,
  description,
  extra,
  size = 'md',
  fluid = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={`-mx-6 -mt-6 border-b-2 border-bcgov-gold ${className ?? ''}`}>
      <div className={`py-4 ${fluid ? 'w-full px-6' : CONTENT_CONTAINER}`}>
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
 * Page body container that lines up with the (non-fluid) {@link PageHeader} content column. It bleeds
 * past the console `<main>` padding (`-mx-6`) and re-applies the shared `max-w-6xl px-6` column, so a
 * page's body edges match its header's. Pass `className` for the body's own layout (e.g. `flex
 * flex-col gap-4`).
 */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="-mx-6">
      <div className={`${CONTENT_CONTAINER} ${className ?? ''}`}>{children}</div>
    </div>
  );
}
