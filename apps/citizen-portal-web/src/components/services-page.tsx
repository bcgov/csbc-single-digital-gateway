import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { SectionHeading } from '@/components/landing/section-heading';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { ServiceCard } from '@/components/services/service-card';
import { servicesQueryOptions } from '@/lib/catalog';

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
          className="h-10 pl-9"
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}

/**
 * The services catalog (`/services`) — browsable by anyone (feature 60). Search + a grid of
 * published service cards (the shared, fully-clickable {@link ServiceCard}). No categories /
 * availability / recommendations, and no application tracking — that lives on the home page.
 */
export function ServicesPage() {
  const [query, setQuery] = useState('');
  const services = useQuery(servicesQueryOptions(query));

  const items = services.data ?? [];

  return (
    <CitizenShell activeNav="services">
      <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
        <header className="flex flex-col gap-2">
          <h1>Services</h1>
          <p className="text-lg">Find and use Government of British Columbia services.</p>
        </header>

        <ServiceSearch onSearch={setQuery} />

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
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      </div>
    </CitizenShell>
  );
}
