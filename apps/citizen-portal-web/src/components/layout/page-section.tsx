import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** A section's `<h2>` with the small accent tab above it (the `.section-heading` style). */
export function SectionHeading({ title, description, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="section-heading">{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}

const GAP_CLASS = {
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
} as const;

interface PageSectionProps {
  title: string;
  /** Muted supporting line under the heading. */
  description?: ReactNode;
  /** Anchor id — set it when the section is an "On this page" rail target. */
  id?: string;
  /** Vertical gap between the heading and each child. */
  gap?: keyof typeof GAP_CLASS;
  className?: string;
  children: ReactNode;
}

/**
 * A titled `<section>` inside a page body: {@link SectionHeading} followed by its content. With an
 * `id` it also gets `scroll-mt-6`, so a jump from {@link PageWithRail}'s nav doesn't land flush
 * against the viewport top.
 */
export function PageSection({
  title,
  description,
  id,
  gap = 3,
  className,
  children,
}: PageSectionProps) {
  const classes = ['flex flex-col', GAP_CLASS[gap], id ? 'scroll-mt-6' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <section id={id} className={classes}>
      <SectionHeading title={title}>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </SectionHeading>
      {children}
    </section>
  );
}
