import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Link, useParams } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/console/page-header';

/**
 * Shared Resources hub (feature 160). A landing page for resources shared across the services in a
 * workspace. Today it surfaces Service Agreements; it is framed as a hub so more shared resources
 * (e.g. form/field templates) can be added without another IA change.
 */
export function SharedResourcesPage() {
  const { slug } = useParams({ strict: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shared Resources"
        description="Resources shared across the services in this workspace."
        size="lg"
      />

      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/app/$slug/service-agreements"
            params={{ slug: slug ?? '' }}
            className="no-underline"
          >
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <span className="mb-1 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileSignature className="size-[18px]" aria-hidden />
                </span>
                <CardTitle>Service Agreements</CardTitle>
                <CardDescription>Terms applicants approve before applying.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </PageBody>
    </div>
  );
}
