import { Badge } from '@repo/ui/badge';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '@/components/landing/section-heading';
import { type Application, AVAILABLE_SERVICES } from '@/lib/content';

interface AvailableServicesProps {
  /** When provided, a service the citizen has applied to shows its status badge + "Open". */
  applications?: readonly Application[];
}

/** The blue "Available services" panel with service cards. Shared by both landing pages. */
export function AvailableServices({ applications = [] }: AvailableServicesProps) {
  const byService = new Map(applications.map((application) => [application.service, application]));

  return (
    <section className="rounded-xl bg-primary p-6 shadow-sm">
      <SectionHeading
        title="Available services"
        description="Here are some services currently available through the Single Digital Gateway."
        tone="dark"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {AVAILABLE_SERVICES.map((service) => {
          const application = byService.get(service.id);
          return (
            <article key={service.id} className="rounded-lg bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <a
                  href="#"
                  className="inline-flex items-center gap-1 font-heading text-sm font-semibold text-primary hover:underline"
                >
                  {service.title}
                  <ChevronRight className="size-4" aria-hidden />
                </a>
                {application ? (
                  <a href="#" className="text-xs text-primary hover:underline">
                    Open
                  </a>
                ) : null}
              </div>
              {application ? (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{application.status}</Badge>
                  <span>{application.reference}</span>
                </div>
              ) : (
                <p className="mt-2 text-xs/relaxed text-muted-foreground">{service.description}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
