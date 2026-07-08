import { Badge } from '@repo/ui/badge';
import { Card, CardIconAction, CardHeader, CardTitle, CardDescription } from '@repo/ui/card';
import { mdiCake, mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Link } from '@tanstack/react-router';
import type { MyApplication } from '@/lib/catalog';

/**
 * One tracked application, linking to the application page (`/applications/:id`). First line: the
 * application (form) name + the status pill on the right; second line: the service; then the
 * reference + last-updated. Shared by "Track your applications" and a service's "Your activity".
 */
export function ApplicationRow({ application }: { application: MyApplication }) {
  return (
    <Card column>
      <CardIconAction size="sm">
        <Icon path={mdiCake} size="32px" className="text-blue-80" aria-hidden={true} />
      </CardIconAction>
      <CardHeader>
        <CardTitle>
          <Link
            to="/applications/$id"
            params={{ id: application.id }}
            className="no-underline hover:underline"
          >
            {application.formTitle}
            <Icon
              path={mdiChevronRight}
              size="20px"
              className="inline-flex text-link"
              aria-hidden={true}
            />
          </Link>
        </CardTitle>
        <CardDescription>
          {application.serviceTitle}
          <br />
          <Badge color="yellow">{application.statusLabel}</Badge> &#8226; {application.formTitle}{' '}
          &#8226; {application.reference} &#8226; Last updated{' '}
          {new Date(application.lastUpdated).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
