import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Clock, Send, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApplicationRow } from '@/components/services/application-row';
import { ContactSection } from '@/components/services/contact-section';
import { ServiceContent } from '@/components/services/service-content';
import { myApplicationsQueryOptions } from '@/lib/catalog';

/** The anchor targets shown in the left "On this page" nav and used as section ids. */
export const DETAIL_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility criteria' },
  { id: 'how-to-apply', label: 'How to apply' },
  { id: 'your-activity', label: 'Your activity' },
  { id: 'help', label: 'Help and information' },
  { id: 'contact', label: 'Contact information' },
] as const;

/** Sticky left-rail anchor nav, mirroring the inspiration's "On this page". */
export function OnThisPage() {
  return (
    <nav aria-label="On this page" className="sticky top-6 hidden w-48 shrink-0 lg:block">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l">
        {DETAIL_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="-ml-px block border-l border-transparent pl-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A titled content section with an anchor id for the side nav. */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="section-heading">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const GLANCE = [
  { icon: Wallet, label: 'Cost', value: 'Free' },
  { icon: Clock, label: 'Processing time', value: '2–4 weeks' },
  { icon: Send, label: 'How to apply', value: 'Online' },
];

/** The "in a glance" stat strip near the top of the overview. */
export function InAGlance() {
  return (
    <Card>
      <CardContent className="grid gap-4 py-4 sm:grid-cols-3">
        {GLANCE.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const ELIGIBILITY = [
  {
    id: 'age',
    title: 'Age',
    body: 'You must be 19 years of age or older to apply on your own behalf.',
  },
  {
    id: 'income',
    title: 'Income',
    body: 'Your household income and assets must be below the program thresholds.',
  },
  {
    id: 'residency',
    title: 'Residency',
    body: 'You must be a resident of British Columbia and eligible to work in Canada.',
  },
];

/** Eligibility criteria as an expandable accordion (placeholder copy). */
export function EligibilityCriteria() {
  return (
    <Accordion>
      {ELIGIBILITY.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** One application-method form for a service (its title + the call-to-action label). */
export interface ApplicationMethod {
  id: string;
  label: string | null;
  title: string;
  formId: string;
}

/**
 * "How to apply" — one card per application-method form the service references, each linking to the
 * apply flow. Falls back to a muted message when the service has no online application form.
 */
export function HowToApply({
  serviceId,
  applications,
}: {
  serviceId: string;
  applications: readonly ApplicationMethod[];
}) {
  if (applications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        This service isn’t available to apply for online yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {applications.map((form) => (
        <Card key={form.id}>
          <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Send className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col">
                <span className="font-heading text-sm font-semibold text-foreground">
                  {form.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  Apply through the Single Digital Gateway.
                </span>
              </div>
            </div>
            <Button
              render={
                <Link
                  to="/services/$serviceId/apply/$formId"
                  params={{ serviceId, formId: form.formId }}
                />
              }
            >
              {form.label && form.label !== 'Untitled' ? form.label : 'Start an application'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * "Your activity" — the citizen's applications for THIS service (pulled from the API and filtered to
 * `serviceId`). Empty/anonymous shows an informational callout.
 */
export function YourActivity({ serviceId }: { serviceId: string }) {
  const { data } = useQuery(myApplicationsQueryOptions());
  const mine = (data ?? []).filter((application) => application.serviceId === serviceId);
  if (mine.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-6">
        <span className="text-sm font-semibold text-foreground">No applications yet</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          When you apply for this service, you’ll see your applications and their status here.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {mine.map((application) => (
        <ApplicationRow key={application.id} application={application} />
      ))}
    </div>
  );
}

const HELP = [
  {
    id: 'guides',
    title: 'Guides and resources',
    body: 'Step-by-step guides and frequently asked questions for this service.',
  },
  {
    id: 'policy',
    title: 'Policy and legislation',
    body: 'The policies and legislation that govern this service.',
  },
];

/** "Help and information" accordion (placeholder copy). */
export function HelpAndInformation() {
  return (
    <Accordion>
      {HELP.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger>{item.title}</AccordionTrigger>
          <AccordionContent>{item.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/**
 * The shared two-column body of a service page: the "On this page" rail + all sections, with the
 * overview rendering the given `schema`/`uischema`/`data`. Used by both the live service detail and
 * the historical version page, so they're laid out identically.
 */
export function ServiceSections({
  serviceId,
  schema,
  uischema,
  data,
  applications,
}: {
  serviceId: string;
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  data: Record<string, unknown>;
  applications: readonly ApplicationMethod[];
}) {
  return (
    <div className="flex gap-10">
      <OnThisPage />
      <div className="flex min-w-0 flex-1 flex-col gap-10">
        <Section id="overview" title="Overview">
          <InAGlance />
          <ServiceContent
            schema={schema}
            uischema={uischema}
            data={data}
            omit={['title', 'description', 'contact_methods']}
          />
        </Section>
        <Section id="eligibility" title="Eligibility criteria">
          <EligibilityCriteria />
        </Section>
        <Section id="how-to-apply" title="How to apply">
          <HowToApply serviceId={serviceId} applications={applications} />
        </Section>
        <Section id="your-activity" title="Your activity">
          <YourActivity serviceId={serviceId} />
        </Section>
        <Section id="help" title="Help and information">
          <HelpAndInformation />
        </Section>
        <Section id="contact" title="Contact information">
          <ContactSection value={data.contact_methods} />
        </Section>
      </div>
    </div>
  );
}
