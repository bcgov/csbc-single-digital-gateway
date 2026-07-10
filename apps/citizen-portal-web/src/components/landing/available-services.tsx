import { Badge } from '@repo/ui/badge';
import { Card, CardHeader, CardDescription, CardTitle } from '@repo/ui/card';
import { mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { SectionHeading } from '@/components/landing/section-heading';
import type { CatalogService, MyApplication } from '@/lib/catalog';

interface AvailableServicesProps {
  services: readonly CatalogService[];
  /** When the citizen has applied to a service, its card shows the application status + "Open". */
  applications?: readonly MyApplication[];
  /** Render skeleton cards while the services query is loading. */
  loading?: boolean;
}

/** The blue "Available services" panel with service cards. Shared by both landing pages. */
export function AvailableServices({
  services,
  applications = [],
  loading = false,
}: AvailableServicesProps) {
  const byService = new Map(
    applications.map((application) => [application.serviceId, application]),
  );

  return (
    <section className="rounded-sm bg-linear-to-r from-blue-90 to-blue-70 p-6 shadow-lg text-white my-6">
      <SectionHeading
        title="Available services"
        description="Here are some services currently available through the Single Digital Gateway."
      />
      <div className="mt-5 grid gap-6 md:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg bg-background p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-3 w-full" />
              </div>
            ))
          : services.map((service) => {
              const application = byService.get(service.id);
              return application ? (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        to="/applications/$id"
                        params={{ id: application.id }}
                        className="no-underline hover:underline"
                      >
                        {service.title}
                        <Icon
                          path={mdiChevronRight}
                          size="20px"
                          className="inline-flex text-link"
                          aria-hidden={true}
                        />
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      Description
                      <br />
                      <Badge color="yellow">{application.statusLabel}</Badge> •{' '}
                      {application.reference}
                    </CardDescription>
                  </CardHeader>
                  {/* need to see what this looks like */}
                </Card>
              ) : (
                <Card key={service.id} centered>
                  <CardHeader>
                    <CardTitle>
                      <Link
                        to="/services"
                        hash={service.id}
                        className="no-underline hover:underline"
                      >
                        {service.title}
                        <Icon
                          path={mdiChevronRight}
                          size="20px"
                          className="inline-flex text-link"
                          aria-hidden={true}
                        />
                      </Link>
                    </CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
      </div>
    </section>
  );
}
