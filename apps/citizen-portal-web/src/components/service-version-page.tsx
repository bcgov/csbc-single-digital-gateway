import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb, ServiceContent } from '@/components/services/service-content';
import { type CatalogServiceVersion, serviceVersionQueryOptions } from '@/lib/catalog';

/** The date a version became effective: its publish date, else its archive date. */
function effectiveDate(version: CatalogServiceVersion): string | null {
  const iso = version.publishedAt ?? version.archivedAt;
  return iso ? new Date(iso).toLocaleDateString() : null;
}

/**
 * A historical service version (`/services/:serviceId/versions/:versionId`) — public (feature 60).
 * Renders a published or archived version exactly as it was, so a citizen can see the service their
 * application was made against. Drafts are not reachable (the API 404s them).
 */
export function ServiceVersionPage() {
  const { serviceId, versionId } = useParams({
    from: '/services/$serviceId/versions/$versionId',
  });
  const {
    data: version,
    isPending,
    isError,
  } = useQuery(serviceVersionQueryOptions(serviceId, versionId));

  return (
    <CitizenShell activeNav="services">
      <div className="flex flex-col gap-6">
        <Breadcrumb
          trail={[
            { label: 'Services', href: '/services' },
            { label: version?.title ?? 'Service', href: `/services/${serviceId}` },
            { label: version ? `Version ${version.version}` : 'Version' },
          ]}
        />

        {isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        ) : isError || !version ? (
          <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <h1 className="font-heading text-lg font-semibold">Version not available</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This version doesn’t exist or isn’t published.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              render={<a href={`/services/${serviceId}`} />}
            >
              Back to the service
            </Button>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold text-foreground">
                  {version.title}
                </h1>
                <Badge variant="secondary" className="capitalize">
                  {version.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Version {version.version}
                {effectiveDate(version) ? ` · as of ${effectiveDate(version)}` : ''}
              </p>
            </header>

            <div className="rounded-lg border-l-2 border-amber-500 bg-amber-50/50 p-3 text-xs text-muted-foreground">
              You’re viewing a historical version of this service, kept for reference with your
              applications.
            </div>

            <ServiceContent
              schema={version.schema}
              uischema={version.uischema}
              data={version.data}
              omit={['title']}
            />

            <a href={`/services/${serviceId}`} className="text-xs text-primary hover:underline">
              View the current service
            </a>
          </>
        )}
      </div>
    </CitizenShell>
  );
}
