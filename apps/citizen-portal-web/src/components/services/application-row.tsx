import { Badge } from '@repo/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { MyApplication } from '@/lib/catalog';

/**
 * One tracked application. A thick blue left accent; the title (with the status pill to its right)
 * and a single metadata line below it.
 *
 * Doc 292 rule 7: the row links again — a draft back to its apply page (when a published service still offers its
 * method), anything else to its application page.
 */
export function ApplicationRow({ application }: { application: MyApplication }) {
  return (
    <RowLink application={application}>
      <Card className="border-l-4 border-l-blue-70 transition-colors group-hover/row:bg-muted/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{application.formTitle ?? 'Application'}</CardTitle>
            <Badge color="yellow" className="shrink-0">
              {application.statusLabel}
            </Badge>
          </div>
          <CardDescription>
            Ref #{application.reference} &#8226;{' '}
            {new Date(application.lastUpdated).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>
    </RowLink>
  );
}

function RowLink({ application, children }: { application: MyApplication; children: ReactNode }) {
  const className = 'group/row block rounded-xl focus-visible:outline-2 focus-visible:outline-ring';
  if (application.status === 'draft' && application.serviceId !== null)
    return (
      <Link
        to="/services/$serviceId/apply/$methodId"
        params={{ serviceId: application.serviceId, methodId: application.formId }}
        className={className}
      >
        {children}
      </Link>
    );
  return (
    <Link
      to="/applications/$applicationId"
      params={{ applicationId: application.id }}
      className={className}
    >
      {children}
    </Link>
  );
}
