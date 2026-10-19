import type { ReactNode } from 'react';
import { OnThisPageLayout, type OnThisPageItem } from '@/components/layout/on-this-page';

/**
 * A detail-page body with the sticky "On this page" jump-nav beside a stack of
 * {@link PageSection}s. Each item's `id` must match a child `PageSection`'s `id`. Place it inside
 * {@link PageContent}.
 */
export function PageWithRail({
  items,
  children,
}: {
  items: readonly OnThisPageItem[];
  children: ReactNode;
}) {
  return (
    <OnThisPageLayout items={items}>
      <div className="flex min-w-0 flex-1 flex-col gap-10">{children}</div>
    </OnThisPageLayout>
  );
}
