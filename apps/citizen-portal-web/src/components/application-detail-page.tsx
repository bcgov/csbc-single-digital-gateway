import { DocumentView, type DocumentViewProps } from '@repo/documents/view';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useMemo, type ReactNode } from 'react';
import { AnswersForm } from '@/components/application/answers-form';
import { StatusBanner } from '@/components/application/status-banner';
import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { citizenUischema } from '@/components/services/detail-sections';
import {
  APPLICATIONS_KEY,
  type ApplicationDetail,
  applicationQueryOptions,
  reviseApplication,
} from '@/lib/applications';
import { useAuth, useLoginUrl } from '@/lib/auth';

/**
 * Doc 292 rules 8, 10 — `/applications/:applicationId`: one of the citizen's applications. Its title, reference and
 * status (with the reviewer's note when changes are requested), and the answers read back over the form it was made
 * on. A needs-changes application offers Revise, which opens a draft revision of the SAME form version here; while the
 * application is a draft, this page is where it is filled and resubmitted.
 */
export function ApplicationDetailPage() {
  const { applicationId } = useParams({ from: '/applications/$applicationId' });
  const auth = useAuth();
  const loginUrl = useLoginUrl();
  const signedIn = auth.data !== null && auth.data !== undefined;
  const application = useQuery({ ...applicationQueryOptions(applicationId), enabled: signedIn });

  if (auth.isPending || (signedIn && application.isPending)) {
    return (
      <Shell>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </Shell>
    );
  }
  if (!signedIn) {
    return (
      <Shell>
        <h1 className="font-heading text-lg font-semibold">Log in to see your application</h1>
        <Button className="self-start" render={<a href={loginUrl} />}>
          Log in
        </Button>
      </Shell>
    );
  }
  if (application.isError || application.data === undefined) {
    return (
      <Shell>
        <h1 className="font-heading text-lg font-semibold">This application isn’t available.</h1>
        <Button variant="outline" className="self-start" render={<Link to="/" />}>
          Back to home
        </Button>
      </Shell>
    );
  }
  return <ApplicationBody application={application.data} />;
}

function ApplicationBody({ application }: { application: ApplicationDetail }) {
  const queryClient = useQueryClient();
  const title = application.formTitle ?? 'Application';
  const schema = (application.structure['schema'] ?? {}) as Record<string, unknown>;
  const variants = (application.structure['variants'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const uischema = useMemo(() => citizenUischema(variants), [variants]);
  const revise = useMutation({
    mutationFn: () => reviseApplication(application.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY }),
  });
  const reviseAction =
    application.status === 'needs_changes' ? (
      <Button size="sm" disabled={revise.isPending} onClick={() => revise.mutate()}>
        Revise
      </Button>
    ) : undefined;

  return (
    <CitizenShell activeNav="home">
      <div className="flex flex-col">
        <PageHeaderBanner
          breadcrumb={<Breadcrumb trail={[{ label: 'Home', href: '/' }, { label: title }]} />}
        >
          <header className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">Ref #{application.reference}</p>
          </header>
        </PageHeaderBanner>
        <div className="mx-auto mb-6 flex w-full max-w-285 flex-col gap-6 px-4 md:px-3">
          <StatusBanner
            status={application.status}
            reviewReason={application.reviewReason}
            {...(reviseAction !== undefined && { action: reviseAction })}
          />
          {revise.error ? (
            <p role="alert" className="text-sm text-destructive">
              {revise.error.message}
            </p>
          ) : null}
          {application.status === 'draft' ? (
            // Rule 10: a draft (a revision, or one opened from here) is filled and resubmitted in place.
            <AnswersForm
              key={application.updatedAt}
              submission={application}
              schema={schema}
              variants={variants}
              onSubmitted={() => {}}
            />
          ) : (
            <section
              aria-label="Your answers"
              className="rounded-xl border border-border bg-background"
            >
              <DocumentView
                schema={schema as DocumentViewProps['schema']}
                uischema={uischema}
                data={application.data}
                unanswered="hide"
              />
            </section>
          )}
        </div>
      </div>
    </CitizenShell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <CitizenShell activeNav="home">
      <div className="mx-auto my-6 flex w-full max-w-285 flex-col gap-3 px-4 md:px-3">
        {children}
      </div>
    </CitizenShell>
  );
}
