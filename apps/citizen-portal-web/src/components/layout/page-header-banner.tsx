import type { ReactNode } from 'react';

/**
 * The shared citizen page-header banner: a **full-width `bcgov-gold` bottom divider** whose content
 * is constrained to the standard `max-w-280` column with standard page padding. Render it as a
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
    <div className="border-b-2 border-bcgov-gold">
      {breadcrumb && (
        <div className="border-b bg-background">
          <div className="mx-auto px-4 md:px-8 py-2 w-full max-w-280 flex">{breadcrumb}</div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-280 flex-col gap-3 px-4 pt-10 pb-4 md:px-8">
        {children}
      </div>
    </div>
  );
}
