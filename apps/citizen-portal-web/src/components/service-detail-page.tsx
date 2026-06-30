import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import {
  ContactInformation,
  EligibilityCriteria,
  HelpAndInformation,
  HowToApply,
  InAGlance,
  OnThisPage,
  Section,
  YourActivity,
} from '@/components/services/detail-sections';
import { Breadcrumb, ServiceContent } from '@/components/services/service-content';
import { serviceQueryOptions } from '@/lib/catalog';

/**
 * A single service's detail page (`/services/:serviceId`) — public (feature 60). Always shows the
 * current PUBLISHED version (no version switcher; a specific version is reachable only via its
 * permalink). Layout follows `inspiration/services-detail.png`: a sticky "On this page" rail beside
 * a sectioned overview. Sections other than the overview use placeholder content (no data model yet).
 */
export function ServiceDetailPage() {
  const { serviceId } = useParams({ from: '/services/$serviceId/' });
  const { data: service, isPending, isError } = useQuery(serviceQueryOptions(serviceId));

  if (isPending) {
    return (
      <CitizenShell activeNav="services">
        <div className="flex flex-col gap-4">
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
        <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
          <h1 className="font-heading text-lg font-semibold">Service not available</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This service doesn’t exist or isn’t published.
          </p>
          <Button variant="outline" className="mt-4" render={<a href="/services" />}>
            Back to services
          </Button>
        </div>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell activeNav="services">
      <div className="flex flex-col gap-6">
        <Breadcrumb
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Services', href: '/services' },
            { label: service.title },
          ]}
        />

        {/* Title + primary CTA */}
        <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{service.title}</h1>
            {service.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{service.description}</p>
            ) : null}
          </div>
          <Button className="shrink-0">Start an application</Button>
        </header>

        {/* Two-column: sticky side nav + sectioned content */}
        <div className="flex gap-10">
          <OnThisPage />
          <div className="flex min-w-0 flex-1 flex-col gap-10">
            <Section id="overview" title="Overview">
              <InAGlance />
              <ServiceContent
                schema={service.schema}
                uischema={service.uischema}
                data={service.data}
                omit={['title', 'description']}
              />
            </Section>

            <Section id="eligibility" title="Eligibility criteria">
              <EligibilityCriteria />
            </Section>

            <Section id="how-to-apply" title="How to apply">
              <HowToApply />
            </Section>

            <Section id="your-activity" title="Your activity">
              <YourActivity />
            </Section>

            <Section id="help" title="Help and information">
              <HelpAndInformation />
            </Section>

            <Section id="contact" title="Contact information">
              <ContactInformation />
            </Section>
          </div>
        </div>
      </div>
    </CitizenShell>
  );
}
