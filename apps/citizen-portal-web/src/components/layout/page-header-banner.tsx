import type { ReactNode } from 'react';
import { PAGE_COLUMN_CLASS } from '@/components/layout/page-content';

/**
 * The shared citizen page-header (title band): an optional breadcrumb strip (full-width bottom
 * border), then the header body held to the standard page column with a `bcgov-gold` bottom rule
 * spanning that column. Render it as a sibling **above** {@link PageContent}, never inside it.
 *
 * It owns only the layout, the rule, and the breadcrumb slot — each caller supplies its header body
 * as `children`, normally a {@link PageTitle} plus any subtitle/meta/actions. Composed by
 * {@link SettingsPageHeader} for the Account settings surfaces.
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
