import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { buttonVariants } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Skeleton } from '@repo/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { ReviseForm } from '@/components/application/revise-form';
import { StatusBanner } from '@/components/application/status-banner';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb } from '@/components/services/service-content';
import { useAuth, useLoginUrl } from '@/lib/auth';
import {
  type ApplicationDetail,
  applicationQueryOptions,
  reviseApplication,
} from '@/lib/applications';

interface StructurePage {
  id?: string;
  name?: string;
  schema?: Record<string, unknown>;
  uischema?: Record<string, unknown>;
}

/**
 * Render the submitted answers read-only as a **disabled form** (same as the staff submission review,
 * `platform-web` `submission-detail.tsx`) so it's clear what the citizen entered — basic = one form,
 * multi-stage = one form per page with the page name as a heading.
 */
function SubmittedAnswers({ application }: { application: ApplicationDetail }) {
  const { kind, structure, data } = application;
  if (kind === 'multi-stage-form') {
    const stages = (structure['stages'] as Array<{ pages?: StructurePage[] }> | undefined) ?? [];
    const pages = stages.flatMap((stage) => stage.pages ?? []);
    return (
      <div className="flex flex-col gap-6">
        {pages.map((page, index) => (
          <div key={page.id ?? index} className="flex flex-col gap-2">
            {page.name ? <h3 className="text-sm font-semibold">{page.name}</h3> : null}
            <JsonForms
              schema={(page.schema ?? {}) as JsonSchema}
              uischema={page.uischema as unknown as UISchemaElement}
              data={data}
              readonly
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <JsonForms
      schema={(structure['schema'] ?? {}) as JsonSchema}
      uischema={structure['uischema'] as unknown as UISchemaElement}
      data={data}
      readonly
    />
  );
}

/**
 * One of the citizen's applications (`/applications/:id`) — features 63 + 66. Shows the form +
 * service, a status-aware banner (with the reviewer's note when changes are needed), and the
 * submitted answers (read-only). A draft can be resumed, and an "Action needed" application can be
 * revised and resubmitted — both edit inline via the FormRunner. Requires a session.
 */
export function ApplicationDetailPage() {
  const { id } = useParams({ from: '/applications/$id' });
  const { data: user, isPending: authPending } = useAuth();
  const loginUrl = useLoginUrl();
  const { data: application, isPending, isError } = useQuery(applicationQueryOptions(id));
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const revise = useMutation({
    mutationFn: () => reviseApplication(id),
    onSuccess: () => {
      // Enter edit mode immediately; the server's latest version is now the seeded draft, so the
      // form edits correctly off the cached data. Refresh the detail in the background.
      setEditing(true);
      void queryClient.invalidateQueries(applicationQueryOptions(id));
    },
  });

  // A draft opens straight into the editable form (feature 140) — no "Continue your application"
  // card. Only `needs_changes` keeps a banner action (opening a revision draft).
  const bannerAction = (status: ApplicationDetail['status']) => {
    if (status === 'needs_changes') {
      return (
        <Button onClick={() => revise.mutate()} disabled={revise.isPending}>
          Make changes
        </Button>
      );
    }
    return undefined;
  };

  return (
    <CitizenShell activeNav="services">
      {!authPending && !user ? (
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to view this application.
            </p>
            <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
              <Icon path={mdiLogin} aria-hidden={true} />
              Log in
            </a>
          </div>
        </div>
      ) : isPending ? (
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError || !application ? (
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
          <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <h1 className="font-heading text-lg font-semibold">Application not found</h1>
            <Button variant="outline" className="mt-4" render={<Link to="/" />}>
              Your applications
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
            <Breadcrumb
              trail={[
                { label: 'Services', href: '/services' },
                { label: application.serviceTitle, href: `/services/${application.serviceId}` },
                { label: 'Application' },
              ]}
            />
            <header className="flex flex-col gap-2 border-b pb-6">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {application.formTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{application.serviceTitle}</p>
              <p className="text-xs text-muted-foreground">
                {application.reference} ·{' '}
                {application.submittedAt
                  ? `Submitted ${new Date(application.submittedAt).toLocaleDateString()}`
                  : `Last updated ${new Date(application.updatedAt).toLocaleDateString()}`}
              </p>
            </header>
            <div className="flex flex-col gap-9">
              {editing || application.status === 'draft' ? (
                <ReviseForm
                  application={application}
                  onSubmitted={() => setEditing(false)}
                  onCancel={() => setEditing(false)}
                  submitLabel={
                    application.status === 'draft' ? 'Submit application' : 'Resubmit application'
                  }
                  showCancel={application.status !== 'draft'}
                />
              ) : (
                <>
                  <StatusBanner
                    status={application.status}
                    reviewReason={application.reviewReason}
                    action={bannerAction(application.status)}
                  />
                  <section className="flex flex-col gap-3">
                    <h2 className="font-heading text-sm font-semibold uppercase text-muted-foreground">
                      Your answers
                    </h2>
                    <Card>
                      <CardContent className="py-4">
                        <SubmittedAnswers application={application} />
                      </CardContent>
                    </Card>
                  </section>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </CitizenShell>
  );
}
