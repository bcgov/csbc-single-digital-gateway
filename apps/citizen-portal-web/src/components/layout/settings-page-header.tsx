import type { ReactNode } from 'react';
import { Icon } from '@mdi/react';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';

/**
 * Shared page header for the citizen settings pages (account, notifications, service agreements):
 * a full-width `bcgov-gold` divider with a light-blue icon badge to the left of the title/subtitle,
 * and an optional breadcrumb rendered above the title. Composes {@link PageHeaderBanner} (the shared
 * divider + constrained-width layout) with the settings-specific icon-badge title row.
 */
export function SettingsPageHeader({
  icon,
  title,
  subtitle,
  meta,
  breadcrumb,
}: {
  icon: string;
  title: string;
  /** The line under the title. Falsy → the line is omitted. */
  subtitle?: string;
  /** An optional third line under the subtitle (e.g. a status line). */
  meta?: ReactNode;
  /** Optional breadcrumb, rendered above the title row (e.g. Account settings → Service Agreements). */
  breadcrumb?: ReactNode;
}) {
  return (
    <PageHeaderBanner breadcrumb={breadcrumb}>
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center bg-blue-10 p-2">
          <Icon path={icon} size="32px" className="text-blue-80" aria-hidden={true} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          {meta}
        </div>
      </div>
    </PageHeaderBanner>
  );
}
