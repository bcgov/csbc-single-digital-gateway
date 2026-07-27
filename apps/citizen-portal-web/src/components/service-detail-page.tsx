import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
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
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
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
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
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
      <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
        <Breadcrumb
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Services', href: '/services' },
            { label: service.title },
          ]}
        />

        <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{service.title}</h1>
            {service.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{service.description}</p>
            ) : null}
          </div>
          <Button className="shrink-0">Start an application</Button>
        </header>

        <ServiceSections
          serviceId={service.id}
          schema={service.schema}
          uischema={service.uischema}
          data={service.data}
          applications={service.applications}
        />
      </div>
    </CitizenShell>
  );
}
