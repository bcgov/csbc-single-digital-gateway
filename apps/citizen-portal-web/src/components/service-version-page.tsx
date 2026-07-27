import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { type ApplicationMethod, ServiceSections } from '@/components/services/detail-sections';
import { Breadcrumb } from '@/components/services/service-content';
import {
  type CatalogServiceVersion,
  serviceQueryOptions,
  serviceVersionQueryOptions,
} from '@/lib/catalog';

const fmt = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString() : null;

/** "Valid from X" (still-published) or "Valid X – Y" (archived). */
function validityRange(version: CatalogServiceVersion): string {
  const from = fmt(version.publishedAt) ?? fmt(version.createdAt);
  const to = fmt(version.archivedAt);
  if (from && to) return `Valid ${from} – ${to}`;
  if (from) return `Valid from ${from}`;
  return '';
}

/** The loaded historical version, laid out exactly like the detail page + a historical header. */
function VersionDetail({
  serviceId,
  version,
  applications,
}: {
  serviceId: string;
  version: CatalogServiceVersion;
  applications: readonly ApplicationMethod[];
}) {
  const description = version.data['description'];
  const range = validityRange(version);
  return (
    <>
      <Breadcrumb
        trail={[
          { label: 'Services', href: '/services' },
          { label: version.title, href: `/services/${serviceId}` },
          { label: `Version ${version.version}` },
        ]}
      />

      <header className="flex flex-col gap-3 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{version.title}</h1>
          <Badge color="yellow" className="capitalize">
            {version.status}
          </Badge>
        </div>
        {typeof description === 'string' && description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="flex items-start gap-2 rounded-lg border-l-2 border-amber-500 bg-amber-50/50 p-3 text-xs text-muted-foreground">
          <History className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            You’re viewing a historical version of this service (version {version.version}
            {range ? ` · ${range}` : ''}).{' '}
            <Link
              to="/services/$serviceId"
              params={{ serviceId }}
              className="text-primary hover:underline"
            >
              View the current service
            </Link>
            .
          </span>
        </div>
      </header>

      <ServiceSections
        serviceId={serviceId}
        schema={version.schema}
        uischema={version.uischema}
        data={version.data}
        applications={applications}
      />
    </>
  );
}

/**
 * A historical service version (`/services/:serviceId/versions/:versionId`) — public. Same layout as
 * the service detail page, driven by the version's content, plus a historical banner + validity range
 * + a link to the current service. If the version IS the current published one, redirect to the
 * canonical `/services/:serviceId`.
 */
export function ServiceVersionPage() {
  const { serviceId, versionId } = useParams({ from: '/services/$serviceId/versions/$versionId' });
  const version = useQuery(serviceVersionQueryOptions(serviceId, versionId));
  // The current published version is redirected away in the route's beforeLoad; here `service` only
  // supplies the (current) application methods for the shared "How to apply" section.
  const service = useQuery(serviceQueryOptions(serviceId));

  return (
    <CitizenShell activeNav="services">
      <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
        {version.isPending || service.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        ) : version.isError || !version.data ? (
          <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <h1 className="font-heading text-lg font-semibold">Version not available</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This version doesn’t exist or isn’t published.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              render={<Link to="/services/$serviceId" params={{ serviceId }} />}
            >
              Back to the service
            </Button>
          </div>
        ) : (
          <VersionDetail
            serviceId={serviceId}
            version={version.data}
            applications={service.data?.applications ?? []}
          />
        )}
      </div>
    </CitizenShell>
  );
}
