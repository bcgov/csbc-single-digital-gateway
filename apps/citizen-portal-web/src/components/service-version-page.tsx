import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { History } from 'lucide-react';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { MessageCard } from '@/components/layout/message-card';
import { PageContent } from '@/components/layout/page-content';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { PageLoading } from '@/components/layout/page-loading';
import { PageTitle } from '@/components/layout/page-title';
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

/** The loaded historical version: the detail page's layout, plus a historical callout in the banner. */
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
      <PageHeaderBanner
        breadcrumb={
          <Breadcrumb
            trail={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: version.title, href: `/services/${serviceId}` },
              { label: `Version ${version.version}` },
            ]}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <PageTitle>{version.title}</PageTitle>
          <Badge color="yellow" className="capitalize">
            {version.status}
          </Badge>
        </div>
        {typeof description === 'string' && description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="flex items-start gap-2 rounded-lg border-l-2 border-warning-border bg-warning-surface p-3 text-xs text-muted-foreground">
          <History className="mt-0.5 size-4 shrink-0 text-icon-warning" aria-hidden />
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
      </PageHeaderBanner>

      <PageContent>
        <ServiceSections
          serviceId={serviceId}
          schema={version.schema}
          uischema={version.uischema}
          data={version.data}
          applications={applications}
        />
      </PageContent>
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
      {version.isPending || service.isPending ? (
        <PageContent>
          <PageLoading variant="detail" />
        </PageContent>
      ) : version.isError || !version.data ? (
        <PageContent>
          <MessageCard
            title="Version not available"
            actions={
              <Button
                variant="outline"
                render={<Link to="/services/$serviceId" params={{ serviceId }} />}
              >
                Back to the service
              </Button>
            }
          >
            This version doesn’t exist or isn’t published.
          </MessageCard>
        </PageContent>
      ) : (
        <VersionDetail
          serviceId={serviceId}
          version={version.data}
          applications={service.data?.applications ?? []}
        />
      )}
    </CitizenShell>
  );
}
