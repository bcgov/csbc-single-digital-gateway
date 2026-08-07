import { Skeleton } from '@repo/ui/skeleton';
import { Info } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/console/page-header';

/**
 * The Overview screen ships as a placeholder dashboard (matching the prototype) until the workspace
 * owner chooses what to track: a notice, four stat tiles, a trend panel and an activity feed, all
 * rendered as skeletons.
 */
export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Overview"
        description="A snapshot of activity across your workspace."
        size="lg"
      />
      <PageBody className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          Overview is being set up — placeholder layout shown until you choose what to track.
        </div>

        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="mb-3.5 h-3 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-1.5 h-3.5 w-36" />
            <Skeleton className="mb-5 h-2.5 w-24" />
            <div className="flex h-40 items-end gap-2.5">
              {[54, 72, 40, 84, 60, 92, 48, 76, 66, 88].map((height, index) => (
                <Skeleton key={index} className="flex-1" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="mb-4 h-3.5 w-28" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-1.5 h-2.5 w-3/5" />
                    <Skeleton className="h-2 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
