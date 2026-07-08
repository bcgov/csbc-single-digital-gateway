import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** A section title with the small accent tab above it, matching the inspiration layout. */
export function SectionHeading({ title, description, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="section-heading">{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  );
}
