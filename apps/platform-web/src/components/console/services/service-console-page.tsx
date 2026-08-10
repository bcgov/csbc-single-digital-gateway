import type { ReactNode } from 'react';
import { PageHeader } from '@/components/console/page-header';

/**
 * A service console section page (feature 164): the shared `PageHeader` (gold divider) over a body.
 * The header is `fluid` so it spans the full content-column width (not the centered `max-w-6xl`); the
 * body is a plain `pt-6` block that inherits the column's `p-6` inset, so it lines up with the header.
 * The five sidebar sections are placeholder scaffolds for now — omit `children` to show the default
 * "coming soon" note; later features fill each body in.
 */
export function ServiceConsolePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} fluid />
      <div className="pt-6">
        {children ?? <p className="text-sm text-muted-foreground">This section is coming soon.</p>}
      </div>
    </>
  );
}
