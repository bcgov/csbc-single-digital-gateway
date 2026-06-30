import { Badge } from '@repo/ui/badge';
import type { MyApplication } from '@/lib/catalog';

/**
 * One tracked application, linking to the application page (`/applications/:id`). First line: the
 * application (form) name + the status pill on the right; second line: the service; then the
 * reference + last-updated. Shared by "Track your applications" and a service's "Your activity".
 */
export function ApplicationRow({ application }: { application: MyApplication }) {
  return (
    <a
      href={`/applications/${application.id}`}
      className="block rounded-lg bg-background p-4 ring-1 ring-foreground/10 hover:ring-primary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-heading text-sm font-semibold text-primary">
          {application.formTitle}
        </span>
        <Badge variant="secondary" className="shrink-0">
          {application.statusLabel}
        </Badge>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{application.serviceTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {application.reference} · Last updated{' '}
        {new Date(application.lastUpdated).toLocaleDateString()}
      </p>
    </a>
  );
}
