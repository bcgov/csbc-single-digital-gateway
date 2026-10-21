import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { AnswersForm } from '@/components/application/answers-form';
import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { draftQueryOptions } from '@/lib/applications';
import { useAuth, useLoginUrl } from '@/lib/auth';
import {
  type CatalogApplicationMethodDetail,
  applicationMethodQueryOptions,
  serviceQueryOptions,
} from '@/lib/catalog';

/**
 * Doc 291 rules 10-12, doc 292 rules 1, 6 — `/services/:serviceId/apply/:methodId`: one of a service's PUBLISHED
 * application methods. A signed-out citizen is asked to log in (and comes back here); a signed-in one fills their draft
 * on the method's published version — created, resumed or carried over by the API — and can save or submit it.
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
          <ApplyBody method={method.data} />
        </div>
      </div>
    </CitizenShell>
  );
}

/** Rules 1, 6: log in first; then the citizen's draft on the published version, filled and saved or submitted. */
function ApplyBody({ method }: { method: CatalogApplicationMethodDetail }) {
  const auth = useAuth();
  const loginUrl = useLoginUrl();
  const navigate = useNavigate();
  const signedIn = auth.data !== null && auth.data !== undefined;
  const draft = useQuery({ ...draftQueryOptions(method.versionId), enabled: signedIn });

  if (auth.isPending) return <Skeleton className="h-64 w-full" />;
  if (!signedIn)
    return (
      <div
        data-slot="apply-sign-in"
        className="flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-6"
      >
        <p className="text-sm">
          Log in to start your application. You can save it and come back later.
        </p>
        <Button render={<a href={loginUrl} />}>Log in to apply</Button>
      </div>
    );
  if (draft.isPending) return <Skeleton className="h-64 w-full" />;
  if (draft.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        This application can’t be started right now.
      </p>
    );
  return (
    <AnswersForm
      submission={draft.data}
      schema={method.schema}
      variants={method.variants}
      onSubmitted={(applicationId) =>
        void navigate({ to: '/applications/$applicationId', params: { applicationId } })
      }
    />
  );
}
