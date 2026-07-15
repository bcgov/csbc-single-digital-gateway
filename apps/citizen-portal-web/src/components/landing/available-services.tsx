import { Card, CardHeader, CardDescription, CardTitle } from '@repo/ui/card';
import { mdiChevronRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { SectionHeading } from '@/components/landing/section-heading';
import type { CatalogService } from '@/lib/catalog';

interface AvailableServicesProps {
  services: readonly CatalogService[];
  /** Render skeleton cards while the services query is loading. */
  loading?: boolean;
}

/** The disclosure chevron shown at the top-right of a card, signalling "there's more here". */
function DisclosureChevron() {
  return (
    <Icon
      path={mdiChevronRight}
      size="20px"
      className="mt-0.5 shrink-0 text-link"
      aria-hidden={true}
    />
  );
}

/**
 * The blue "Available services" panel with service cards. Shared by both landing pages and identical
 * whether or not the citizen is signed in — every card simply links to its service detail (a citizen's
 * in-flight applications are surfaced separately by the "Track your applications" section).
 */
export function AvailableServices({ services, loading = false }: AvailableServicesProps) {
  // The home panel is capped at 3 services (see home-page.tsx); when it is full, offer a link to
  // the full catalog so citizens know there is more to browse.
  const showBrowseAll = !loading && services.length >= 3;

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
          : services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    <Link
                      to="/services/$serviceId"
                      params={{ serviceId: service.id }}
                      className="flex items-start justify-between gap-2 no-underline hover:underline"
                    >
                      <span>{service.title}</span>
                      <DisclosureChevron />
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
      </div>
      {showBrowseAll ? (
        <div className="mt-6 text-right">
          <Link
            to="/services"
            className="inline-flex items-center gap-1 font-semibold text-white no-underline hover:underline"
          >
            Browse all services
            <Icon path={mdiChevronRight} size="20px" className="inline-flex" aria-hidden={true} />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
