import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb } from '@/components/breadcrumb';
import { type CatalogServiceVersion, serviceVersionQueryOptions } from '@/lib/catalog';

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

/** The loaded historical version: a historical header over the version's (unrendered) content. */
function VersionDetail({
  serviceId,
  version,
}: {
  serviceId: string;
  version: CatalogServiceVersion;
}) {
  const range = validityRange(version);
  return (
    <>
      <Breadcrumb
        trail={[
          { label: 'Services', href: '/services' },
          { label: version.title ?? 'Service', href: `/services/${serviceId}` },
          { label: `Version ${String(version.versionNumber)}` },
        ]}
      />

      <header className="flex flex-col gap-3 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {version.title ?? 'Service'}
          </h1>
          <Badge color="yellow" className="capitalize">
            {version.status}
          </Badge>
        </div>
        <div className="flex items-start gap-2 rounded-lg border-l-2 border-amber-500 bg-amber-50/50 p-3 text-xs text-muted-foreground">
          <History className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            You’re viewing a historical version of this service (version {version.versionNumber}
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

      {/* Feature 217: the sectioned render of the version's content is gone with the
          `@repo/react` renderers. */}
      <p className="text-sm text-muted-foreground">
        The full service details are not available yet.
      </p>
    </>
  );
}

/**
 * A historical service version (`/services/:serviceId/versions/:versionId`) — public. A historical
 * banner + validity range + a link to the current service. If the version IS the current published
 * one, redirect to the canonical `/services/:serviceId`.
 */
export function ServiceVersionPage() {
  const { serviceId, versionId } = useParams({ from: '/services/$serviceId/versions/$versionId' });
  const version = useQuery(serviceVersionQueryOptions(serviceId, versionId));

  return (
    <CitizenShell activeNav="services">
      <div className="mx-auto px-4 md:px-3 my-6 w-full max-w-285 flex flex-col gap-9">
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
          <VersionDetail serviceId={serviceId} version={version.data} />
        )}
      </div>
    </CitizenShell>
  );
}
