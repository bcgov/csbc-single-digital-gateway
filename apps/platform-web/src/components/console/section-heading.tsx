import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * A section title with the small gold accent tab above it — the shared `.section-heading` style from
 * `@repo/ui` (mirrors the citizen portal's `SectionHeading`). Used to head the sections on the service
 * details page (and any future console section pages).
 */
export function SectionHeading({ title, description, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="section-heading">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  );
}
