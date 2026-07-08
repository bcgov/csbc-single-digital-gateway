import type { ReactNode, RefObject } from 'react';
import { DevPageNav, type DevNavItem } from '@/components/dev/dev-page-nav';
import { DevPagesMenu } from '@/components/dev/dev-pages-menu';

/**
 * Shared chrome for the /dev reference pages: header block + on-page nav + content column.
 * Replaces the old app's AuthenticatedLayout/SidebarProvider wrapping, which doesn't apply
 * here — these pages aren't behind citizen auth.
 */
export function DevPageLayout({
  title,
  description,
  navItems,
  navLabel,
  navClassName,
  contentRef,
  children,
}: {
  title: string;
  description: ReactNode;
  navItems: DevNavItem[];
  navLabel?: string | undefined;
  navClassName?: string | undefined;
  contentRef?: RefObject<HTMLDivElement | null> | undefined;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 py-10">
      <div className="border-b border-bcgov-gold pb-4">
        <div className="mx-4 flex items-start justify-between gap-3">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Developer reference</p>
            <h1 className="text-3xl">{title}</h1>
            <p className="max-w-3xl text-base text-muted-foreground">{description}</p>
          </div>
          <DevPagesMenu />
        </div>
      </div>
      <div className="flex gap-8">
        <DevPageNav items={navItems} label={navLabel} className={navClassName} />
        <div ref={contentRef} className="min-w-0 flex-1 space-y-10 pt-6 pr-6">
          {children}
        </div>
      </div>
    </div>
  );
}
