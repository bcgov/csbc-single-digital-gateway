import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { Breadcrumb } from '@/components/breadcrumb';
import { serviceQueryOptions } from '@/lib/catalog';
import { ServiceSections } from './services/detail-sections';
import { StartApplication, citizenReferenceSource } from './services/start-application';

/**
 * A single service's detail page (`/services/:serviceId`) — public (feature 60). Always shows the
 * current PUBLISHED version (no version switcher; a specific version is reachable only via its
 * permalink).
 *
 * The header — title, description and "Start an application" over the service's published application methods
 * (doc 291) — then the service's citizen variant read back through `@repo/documents`, with "On this page" built from
 * its Section titles (`ServiceSections`) and its application-method cards linked to their apply page.
 */
export function ServiceDetailPage() {
  const { serviceId } = useParams({ from: '/services/$serviceId/' });
  const { data: service, isPending, isError } = useQuery(serviceQueryOptions(serviceId));
  const methods = service?.applicationMethods;
  const references = useMemo(
    () => (methods === undefined ? undefined : citizenReferenceSource(serviceId, methods)),
    [serviceId, methods],
  );

  if (isPending) {
    return (
      <CitizenShell activeNav="services">
        <div className="mx-auto px-4 md:px-3 my-6 w-full max-w-285 flex flex-col gap-9">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
      </CitizenShell>
    );
  }

  if (isError || !service) {
    return (
      <CitizenShell activeNav="services">
        <div className="mx-auto px-4 md:px-3 my-6 w-full max-w-285 flex flex-col gap-9">
          {/* <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10"> */}
          <h1 className="font-heading text-lg font-semibold">Service not available</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This service doesn’t exist or isn’t published.
          </p>
          <Button variant="outline" className="mt-4" render={<Link to="/services" />}>
            Back to services
          </Button>
        </div>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell activeNav="services">
      <div className="flex flex-col">
        {/* Header region — breadcrumb + title/description + action above the shared full-width
            bcgov-gold divider. */}
        <PageHeaderBanner
          breadcrumb={
            <Breadcrumb
              trail={[
                { label: 'Home', href: '/' },
                { label: 'Services', href: '/services' },
                { label: service.title ?? 'Service' },
              ]}
            />
          }
        >
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {service.title ?? 'Service'}
              </h1>
              {service.description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">{service.description}</p>
              ) : null}
            </div>
            <StartApplication serviceId={serviceId} methods={service.applicationMethods ?? []} />
          </header>
        </PageHeaderBanner>

        <div className="mx-auto mb-6 flex w-full max-w-285 flex-col gap-9 px-4 md:px-3">
          <ServiceSections
            schema={service.schema}
            variants={service.variants}
            data={service.data}
            references={references}
          />
        </div>
      </div>
    </CitizenShell>
  );
}
