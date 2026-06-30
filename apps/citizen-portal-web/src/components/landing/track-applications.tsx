import { Badge } from '@repo/ui/badge';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '@/components/landing/section-heading';
import type { Application } from '@/lib/content';

interface TrackApplicationsProps {
  applications: readonly Application[];
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

/** A single tracked-application row: service, status badge, reference, and last-updated. */
function ApplicationRow({ application }: { application: Application }) {
  return (
    <a
      href="#"
      className="flex items-center justify-between gap-4 rounded-lg bg-background p-4 ring-1 ring-foreground/10 hover:ring-primary/40"
    >
      <div className="flex flex-col gap-1">
        <span className="font-heading text-sm font-semibold text-primary">
          {application.serviceTitle}
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{application.status}</Badge>
          <span>{application.reference}</span>
          <span aria-hidden>·</span>
          <span>Last updated {application.lastUpdated}</span>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

/** "Track your applications" section — empty state, or a list of the citizen's applications. */
export function TrackApplications({ applications }: TrackApplicationsProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Track your applications" />
      {applications.length === 0 ? (
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
