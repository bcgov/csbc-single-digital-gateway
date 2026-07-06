import { Badge } from '@repo/ui/badge';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
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
    <section className="rounded-(--layout-margin-xs,4px) bg-primary p-6 shadow-sm bg-linear-to-r from-(--theme-blue-90,#1E5189) to-(--theme-blue-70,#5595D9)">
      <SectionHeading
        title="Discover services"
        description="Here are some services currently available through the Single Digital Gateway."
        tone="dark"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {loading
          ? [0, 1].map((i) => (
              <div key={i} className="rounded-lg bg-background p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-3 w-full" />
              </div>
            ))
          : services.map((service) => {
              const application = byService.get(service.id);
              return (
                <article key={service.id} className="rounded-lg bg-background p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/services"
                      hash={service.id}
                      className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:underline"
                    >
                      {service.title}
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                    {application ? (
                      <Link to="/" className="text-xs text-primary hover:underline">
                        Open
                      </Link>
                    ) : null}
                  </div>
                  {application ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{application.statusLabel}</Badge>
                      <span>{application.reference}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs/relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </article>
              );
            })}
      </div>
    </section>
  );
}
