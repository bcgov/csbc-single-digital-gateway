import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  /** `dark` flips the text colours for use inside the blue "Available services" panel. */
  tone?: 'default' | 'dark';
  children?: ReactNode;
}

/** A section title with the small accent tab above it, matching the inspiration layout. */
export function SectionHeading({
  title,
  description,
  tone = 'default',
  children,
}: SectionHeadingProps) {
  const dark = tone === 'dark';
  return (
    <div className="flex flex-col gap-1">
      <span className="h-1 w-8 rounded-full bg-amber-500" aria-hidden />
      <h2
        className={`font-heading text-lg font-semibold ${dark ? 'text-white' : 'text-foreground'}`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`text-sm ${dark ? 'text-white/80' : 'text-muted-foreground'}`}>
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
