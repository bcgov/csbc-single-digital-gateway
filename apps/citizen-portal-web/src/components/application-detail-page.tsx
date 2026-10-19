import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { ReviseForm } from '@/components/application/revise-form';
import { StatusBanner } from '@/components/application/status-banner';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { LoginGate } from '@/components/layout/login-gate';
import { MessageCard } from '@/components/layout/message-card';
import { PageContent } from '@/components/layout/page-content';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { PageLoading } from '@/components/layout/page-loading';
import { PageTitle } from '@/components/layout/page-title';
import { Breadcrumb } from '@/components/services/service-content';
import { useAuth } from '@/lib/auth';
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
        <PageContent>
          <LoginGate message="You need to be signed in to view this application." />
        </PageContent>
      ) : isPending ? (
        <PageContent>
          <PageLoading />
        </PageContent>
      ) : isError || !application ? (
        <PageContent>
          <MessageCard
            title="Application not found"
            actions={
              <Button variant="outline" render={<Link to="/" />}>
                Your applications
              </Button>
            }
          />
        </PageContent>
      ) : (
        <>
          <PageHeaderBanner
            breadcrumb={
              <Breadcrumb
                trail={[
                  { label: 'Home', href: '/' },
                  { label: 'Services', href: '/services' },
                  { label: application.serviceTitle, href: `/services/${application.serviceId}` },
                  { label: 'Application' },
                ]}
              />
            }
          >
            <div className="flex flex-col gap-2">
              <PageTitle>{application.formTitle}</PageTitle>
              <p className="text-sm text-muted-foreground">{application.serviceTitle}</p>
              <p className="text-xs text-muted-foreground">
                {application.reference} ·{' '}
                {application.submittedAt
                  ? `Submitted ${new Date(application.submittedAt).toLocaleDateString()}`
                  : `Last updated ${new Date(application.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
          </PageHeaderBanner>
          <PageContent>
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
                  <h2 className="text-sm font-semibold uppercase text-muted-foreground">
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
          </PageContent>
        </>
      )}
    </CitizenShell>
  );
}
