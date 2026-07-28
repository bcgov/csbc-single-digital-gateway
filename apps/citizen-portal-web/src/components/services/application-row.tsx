import { Badge } from '@repo/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@repo/ui/card';
import { mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Link } from '@tanstack/react-router';
import type { MyApplication } from '@/lib/catalog';

/**
 * One tracked application, linking to the application page (`/applications/:id`). A thick blue left
 * accent; the title (with the status pill to its right) and a single metadata line below it. Shared
 * by "Track your applications" (home) and a service's "Your activity"; `titleBy` selects which name
 * leads:
 * - `'service'` (default, home — disambiguates across services): title = service name; meta =
 *   `<application name> • Ref #<reference> • <last updated>`.
 * - `'application'` (a service's own "Your activity", where the service is implicit): title =
 *   application/form name; meta = `Ref #<reference> • <last updated>` (the form name is the title,
 *   so it is not repeated).
 */
export function ApplicationRow({
  application,
  titleBy = 'service',
}: {
  application: MyApplication;
  titleBy?: 'service' | 'application';
}) {
  const byApplication = titleBy === 'application';
  return (
    <Card className="border-l-4 border-l-blue-70">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>
            <Link
              to="/applications/$id"
              params={{ id: application.id }}
              className="no-underline hover:underline"
            >
              {byApplication ? application.formTitle : application.serviceTitle}
              <Icon
                path={mdiChevronRight}
                size="20px"
                className="inline-flex text-link"
                aria-hidden={true}
              />
            </Link>
          </CardTitle>
          <Badge color="yellow" className="shrink-0">
            {application.statusLabel}
          </Badge>
        </div>
        <CardDescription>
          {byApplication ? null : <>{application.formTitle} &#8226; </>}
          Ref #{application.reference} &#8226;{' '}
          {new Date(application.lastUpdated).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
