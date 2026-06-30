import { Skeleton } from '@repo/ui/skeleton';
import { SectionHeading } from '@/components/landing/section-heading';
import { ApplicationRow } from '@/components/services/application-row';
import type { MyApplication } from '@/lib/catalog';

interface TrackApplicationsProps {
  applications: readonly MyApplication[];
  loading?: boolean;
}

/** Empty-state card shown when the citizen has no applications in flight. */
function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-amber-50/60 p-6 text-center">
      <p className="text-sm font-semibold text-foreground">You have no applications to track</p>
      <p className="mt-1 text-xs text-muted-foreground">
        When you apply for a service, you’ll be able to track its status here.
      </p>
    </div>
  );
}

/** "Track your applications" section — empty state, or a list of the citizen's applications. */
export function TrackApplications({ applications, loading = false }: TrackApplicationsProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Track your applications" />
      {loading ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : applications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </section>
  );
}
