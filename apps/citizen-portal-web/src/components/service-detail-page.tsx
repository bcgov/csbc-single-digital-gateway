import { Button } from '@repo/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { MessageCard } from '@/components/layout/message-card';
import { PageContent } from '@/components/layout/page-content';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { PageLoading } from '@/components/layout/page-loading';
import { PageTitle } from '@/components/layout/page-title';
import { ServiceSections } from '@/components/services/detail-sections';
import { Breadcrumb } from '@/components/services/service-content';
import { serviceQueryOptions } from '@/lib/catalog';

/**
 * A single service's detail page (`/services/:serviceId`) — public (feature 60). Always shows the
 * current PUBLISHED version (no version switcher; a specific version is reachable only via its
 * permalink). Layout follows `inspiration/services-detail.png`: a sticky "On this page" rail beside
 * a sectioned overview (shared with the historical version page via `ServiceSections`).
 */
export function ServiceDetailPage() {
  const { serviceId } = useParams({ from: '/services/$serviceId/' });
  const { data: service, isPending, isError } = useQuery(serviceQueryOptions(serviceId));

  if (isPending) {
    return (
      <CitizenShell activeNav="services">
        <PageContent>
          <PageLoading variant="detail" />
        </PageContent>
      </CitizenShell>
    );
  }

  if (isError || !service) {
    return (
      <CitizenShell activeNav="services">
        <PageContent>
          <MessageCard
            title="Service not available"
            actions={
              <Button variant="outline" render={<Link to="/services" />}>
                Back to services
              </Button>
            }
          >
            This service doesn’t exist or isn’t published.
          </MessageCard>
        </PageContent>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell activeNav="services">
      <PageHeaderBanner
        breadcrumb={
          <Breadcrumb
            trail={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: service.title },
            ]}
          />
        }
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <PageTitle>{service.title}</PageTitle>
            {service.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{service.description}</p>
            ) : null}
          </div>
          <Button className="shrink-0">Start an application</Button>
        </header>
      </PageHeaderBanner>

      <PageContent>
        <ServiceSections
          serviceId={service.id}
          schema={service.schema}
          uischema={service.uischema}
          data={service.data}
          applications={service.applications}
        />
      </PageContent>
    </CitizenShell>
  );
}
