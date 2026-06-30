import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Clock, Mail, MapPin, Phone, Send, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';

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
        <span className="h-1 w-8 rounded-full bg-amber-500" aria-hidden />
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
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

/** "How to apply" — the online application route. */
export function HowToApply({ onApply }: { onApply?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Send className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-semibold text-foreground">
              Online application
            </span>
            <span className="text-xs text-muted-foreground">
              Apply through the Single Digital Gateway.
            </span>
          </div>
        </div>
        <Button onClick={onApply}>Start an application</Button>
      </CardContent>
    </Card>
  );
}

/** "Your activity" — amber callout prompting the citizen to start (no real applications wired). */
export function YourActivity({ onApply }: { onApply?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">No application yet</span>
        <span className="text-xs text-muted-foreground">
          You haven’t applied for this service. Start an application to track it here.
        </span>
      </div>
      <Button onClick={onApply}>Start an application</Button>
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

const CONTACT = [
  { icon: Phone, label: 'Call us', value: '1-800-000-0000', sub: 'Mon–Fri, 8am–4:30pm' },
  {
    icon: Mail,
    label: 'Other ways',
    value: 'Email or text us',
    sub: 'We reply within 2 business days',
  },
  { icon: MapPin, label: 'Visit us', value: 'Find a service centre', sub: 'Locations across B.C.' },
];

/** "Contact information" — a row of contact cards (placeholder). */
export function ContactInformation() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CONTACT.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex flex-col gap-1 py-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.sub}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
