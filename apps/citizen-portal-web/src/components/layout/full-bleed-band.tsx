import type { ReactNode } from 'react';
import { PAGE_COLUMN_CLASS } from '@/components/layout/page-content';

/**
 * A full-width band (its background/border runs edge to edge) whose content is held to the standard
 * page column — for landing-style sections like the home hero. Pass the band's background and
 * border as `className`; spacing inside belongs to the children.
 */
export function FullBleedBand({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className={PAGE_COLUMN_CLASS}>{children}</div>
    </div>
  );
}
