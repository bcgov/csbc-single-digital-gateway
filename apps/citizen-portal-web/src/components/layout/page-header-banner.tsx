import type { ReactNode } from 'react';
import { PAGE_COLUMN_CLASS } from '@/components/layout/page-content';

/**
 * The shared citizen page-header banner: a **full-width `bcgov-gold` bottom divider** whose content
 * is constrained to the standard `max-w-285` column with standard page padding. Render it as a
 * full-width sibling above the constrained page body so the rule spans the whole main area.
 *
 * It owns only the divider, the constrained width, and an optional breadcrumb slot — each caller
 * supplies its own header body as `children`. Used directly by `/services` and the service detail
 * page, and composed by {@link SettingsPageHeader} for the Account settings surfaces.
 */
export function PageHeaderBanner({
  breadcrumb,
  children,
}: {
  /** Optional breadcrumb, rendered above the header content. Omitted → nothing renders above. */
  breadcrumb?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      {breadcrumb && (
        <div className="border-b bg-background">
          <div className={`${PAGE_COLUMN_CLASS} py-2 flex`}>{breadcrumb}</div>
        </div>
      )}
      <div
        className={`${PAGE_COLUMN_CLASS} flex flex-col gap-3 pt-10 pb-4 border-b-2 border-bcgov-gold`}
      >
        {children}
      </div>
    </div>
  );
}
