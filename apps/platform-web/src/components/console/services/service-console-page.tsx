import type { ReactNode } from 'react';
import { PageHeader } from '@/components/console/page-header';

/**
 * A service console section page (feature 164): the shared `PageHeader` (gold divider) over a body.
 * The header is `fluid` so it spans the full content-column width (not the centered `max-w-6xl`); the
 * body is a plain `pt-6` block that inherits the column's `p-6` inset, so it lines up with the header.
 * Omit `children` to show the default "coming soon" note. `extra` forwards to the header's
 * right-aligned slot (feature 174 puts the version picker there).
 */
export function ServiceConsolePage({
  title,
  children,
  extra,
}: {
  title: string;
  children?: ReactNode;
  /** Right-aligned items on the header's title row (feature 174: the version picker). */
  extra?: ReactNode[];
}) {
  return (
    <>
      {/* Spread rather than pass `extra={extra}` — `exactOptionalPropertyTypes` rejects an
          explicit `undefined` for an optional prop. */}
      <PageHeader title={title} fluid {...(extra === undefined ? {} : { extra })} />
      <div className="pt-6">
        {children ?? <p className="text-sm text-muted-foreground">This section is coming soon.</p>}
      </div>
    </>
  );
}
