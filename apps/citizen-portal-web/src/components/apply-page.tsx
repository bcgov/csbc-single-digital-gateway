import { DocumentRunner } from '@repo/documents/runner';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { applicationMethodQueryOptions, serviceQueryOptions } from '@/lib/catalog';
import { citizenUischema } from './services/detail-sections';

/**
 * Doc 291 rules 10-12 — `/services/:serviceId/apply/:methodId`: one of a service's PUBLISHED application methods,
 * filled in a `DocumentRunner` over its Citizen variant (else default). Nothing is submitted or stored yet: the answers
 * live in this page, Submit is hidden and Save draft shows disabled.
 */
export function ApplyPage() {
  const { serviceId, methodId } = useParams({ from: '/services/$serviceId/apply/$methodId' });
  const service = useQuery(serviceQueryOptions(serviceId));
  const method = useQuery(applicationMethodQueryOptions(serviceId, methodId));

  if (service.isPending || method.isPending) {
    return (
      <CitizenShell activeNav="services">
        <div className="mx-auto my-6 flex w-full max-w-285 flex-col gap-9 px-4 md:px-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CitizenShell>
    );
  }

  if (service.isError || method.isError) {
    // Rule 11.
    return (
      <CitizenShell activeNav="services">
        <div className="mx-auto my-6 flex w-full max-w-285 flex-col gap-3 px-4 md:px-3">
          <h1 className="font-heading text-lg font-semibold">This application isn’t available.</h1>
          <p className="text-sm text-muted-foreground">
            It may have closed, or the link may be out of date.
          </p>
          <Button
            variant="outline"
            className="self-start"
            render={<Link to="/services/$serviceId" params={{ serviceId }} />}
          >
            Back to the service
          </Button>
        </div>
      </CitizenShell>
    );
  }

  const serviceTitle = service.data.title ?? 'Service';
  return (
    <CitizenShell activeNav="services">
      <div className="flex flex-col">
        <PageHeaderBanner
          breadcrumb={
            <Breadcrumb
              trail={[
                { label: 'Home', href: '/' },
                { label: 'Services', href: '/services' },
                { label: serviceTitle, href: `/services/${serviceId}` },
                { label: method.data.title ?? 'Application' },
              ]}
            />
          }
        >
          <header className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{serviceTitle}</p>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              {method.data.title ?? 'Application'}
            </h1>
            {method.data.description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">{method.data.description}</p>
            ) : null}
          </header>
        </PageHeaderBanner>
        <div className="mx-auto mb-6 flex w-full max-w-285 flex-col px-4 md:px-3">
          <ApplyForm schema={method.data.schema} variants={method.data.variants} />
        </div>
      </div>
    </CitizenShell>
  );
}

/** Rule 10: the method's citizen form, its answers held here. */
function ApplyForm({
  schema,
  variants,
}: {
  schema: Record<string, unknown>;
  variants: Readonly<Record<string, Record<string, unknown>>>;
}) {
  const uischema = useMemo(() => citizenUischema(variants), [variants]);
  const [answers, setAnswers] = useState<unknown>({});
  return (
    <div data-slot="apply-form" className="rounded-xl border border-border bg-background">
      <DocumentRunner
        schema={schema}
        uischema={uischema}
        data={answers}
        onChange={setAnswers}
        submit={false}
      />
    </div>
  );
}
