import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb, ServiceFields } from '@/components/services/service-fields';
import { serviceQueryOptions } from '@/lib/catalog';

/**
 * A single service's detail page (`/services/:serviceId`) — public (feature 60). Always shows the
 * current PUBLISHED version; there is intentionally no version switcher here (a specific version is
 * reachable only by its direct permalink, `/services/:serviceId/versions/:versionId`).
 */
export function ServiceDetailPage() {
  const { serviceId } = useParams({ from: '/services/$serviceId/' });
  const { data: service, isPending, isError } = useQuery(serviceQueryOptions(serviceId));

  return (
    <CitizenShell activeNav="services">
      <div className="flex flex-col gap-6">
        <Breadcrumb
          trail={[{ label: 'Services', href: '/services' }, { label: service?.title ?? 'Service' }]}
        />

        {isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        ) : isError || !service ? (
          <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <h1 className="font-heading text-lg font-semibold">Service not available</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This service doesn’t exist or isn’t published.
            </p>
            <Button variant="outline" className="mt-4" render={<a href="/services" />}>
              Back to services
            </Button>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {service.title}
              </h1>
              {service.description ? (
                <p className="text-sm text-muted-foreground">{service.description}</p>
              ) : null}
            </header>

            <ServiceFields data={service.data} />

            <div className="flex flex-wrap items-center gap-3">
              <Button>Start an application</Button>
            </div>
          </>
        )}
      </div>
    </CitizenShell>
  );
}
