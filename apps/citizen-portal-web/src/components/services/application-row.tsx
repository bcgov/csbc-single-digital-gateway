import { Badge } from '@repo/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import type { MyApplication } from '@/lib/catalog';

/**
 * One tracked application. A thick blue left accent; the title (with the status pill to its right)
 * and a single metadata line below it.
 *
 * Feature 217: the row used to link to `/applications/:id` and to lead with the owning SERVICE's
 * name. The application page went with the `@repo/react` renderers, and a submission no longer
 * knows its service, so the row leads with the form it was made on and is not a link. Both come
 * back when `@repo/forms` renders a submission and documents can reference one another again.
 */
export function ApplicationRow({ application }: { application: MyApplication }) {
  return (
    <Card className="border-l-4 border-l-blue-70">
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
  );
}
