import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { SectionHeading } from '@/components/landing/section-heading';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { ApplicationRow } from '@/components/services/application-row';
import { useAuth } from '@/lib/auth';
import {
  type CatalogService,
  type MyApplication,
  myApplicationsQueryOptions,
  servicesQueryOptions,
} from '@/lib/catalog';

/** Search box + submit button. Submitting sets the active query term (drives the services query). */
function ServiceSearch({ onSearch }: { onSearch: (term: string) => void }) {
  const [term, setTerm] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSearch(term);
      }}
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search services"
          placeholder="Search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
          }}
          className="pl-9"
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}

/** A single service card in the catalog grid. */
function ServiceCard({
  service,
  application,
}: {
  service: CatalogService;
  application?: MyApplication | undefined;
}) {
  return (
    <Link
      to="/services/$serviceId"
      params={{ serviceId: service.id }}
      className="group block rounded-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card id={service.id} className="h-full transition-shadow group-hover:ring-primary/40">
        <CardContent className="flex flex-col gap-2 py-4">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary group-hover:underline">
              {service.title}
              <ChevronRight className="size-4" aria-hidden />
            </span>
            {application ? <Badge color="yellow">{application.statusLabel}</Badge> : null}
          </div>
          <p className="text-xs/relaxed text-muted-foreground">{service.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** The "Your applications" band shown to authenticated citizens above the catalog. */
function YourApplications({ applications }: { applications: readonly MyApplication[] }) {
  if (applications.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col ">
      <SectionHeading title="Your applications" />
      <div className="mt-4">
        {applications.map((application) => (
          <ApplicationRow key={application.id} application={application} />
        ))}
      </div>
    </section>
  );
}

/**
 * The services catalog (`/services`) — browsable by anyone (feature 60). Search + a grid of
 * published service cards; authenticated citizens also see their applications. No categories /
 * availability / recommendations.
 */
export function ServicesPage() {
  const { data: user } = useAuth();
  const [query, setQuery] = useState('');
  const services = useQuery(servicesQueryOptions(query));
  const applications = useQuery({ ...myApplicationsQueryOptions(), enabled: Boolean(user) });

  const items = services.data ?? [];
  const myApps = applications.data ?? [];
  const byService = new Map(myApps.map((application) => [application.serviceId, application]));

  return (
    <CitizenShell activeNav="services">
      <div className="mx-4 md:mx-8 xl:mx-auto my-6 w-full max-w-280 flex flex-col gap-9">
        <header className="flex flex-col gap-2">
          <h1>Services</h1>
          <p className="text-lg">Find and use Government of British Columbia services.</p>
        </header>

        <ServiceSearch onSearch={setQuery} />

        {user ? <YourApplications applications={myApps} /> : null}

        <section className="flex flex-col gap-4">
          <SectionHeading title="All services" />

          {services.isPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No services found{query ? ` for “${query}”` : ''}.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  application={byService.get(service.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </CitizenShell>
  );
}
