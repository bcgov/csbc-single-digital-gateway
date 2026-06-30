import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb, ServiceContent } from '@/components/services/service-content';
import { useAuth } from '@/lib/auth';
import { type ApplicationDetail, applicationQueryOptions } from '@/lib/applications';
import { loginUrl } from '@/lib/bff';

interface StructurePage {
  id?: string;
  name?: string;
  schema?: Record<string, unknown>;
  uischema?: Record<string, unknown>;
}

/** Render the submitted answers read-only — one form for basic, one per page for multi-stage. */
function SubmittedAnswers({ application }: { application: ApplicationDetail }) {
  const { kind, structure, data } = application;
  if (kind === 'multi-stage-form') {
    const stages = (structure['stages'] as Array<{ pages?: StructurePage[] }> | undefined) ?? [];
    const pages = stages.flatMap((stage) => stage.pages ?? []);
    return (
      <div className="flex flex-col gap-6">
        {pages.map((page, index) => (
          <div key={page.id ?? index} className="flex flex-col gap-2">
            {page.name ? (
              <h3 className="font-heading text-sm font-semibold text-foreground">{page.name}</h3>
            ) : null}
            <ServiceContent schema={page.schema ?? {}} uischema={page.uischema ?? {}} data={data} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <ServiceContent
      schema={(structure['schema'] as Record<string, unknown>) ?? {}}
      uischema={(structure['uischema'] as Record<string, unknown>) ?? {}}
      data={data}
    />
  );
}

/**
 * One of the citizen's applications (`/applications/:id`) — feature 63. Shows the application's
 * form + service, status, reference, and the submitted answers (read-only). A draft can be resumed.
 * Requires a session (it's the citizen's private data).
 */
export function ApplicationDetailPage() {
  const { id } = useParams({ from: '/applications/$id' });
  const { data: user, isPending: authPending } = useAuth();
  const { data: application, isPending, isError } = useQuery(applicationQueryOptions(id));

  return (
    <CitizenShell activeNav="services">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {!authPending && !user ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to view this application.
            </p>
            <Button render={<a href={loginUrl} />}>Log in</Button>
          </div>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !application ? (
          <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <h1 className="font-heading text-lg font-semibold">Application not found</h1>
            <Button variant="outline" className="mt-4" render={<a href="/app" />}>
              Your applications
            </Button>
          </div>
        ) : (
          <>
            <Breadcrumb
              trail={[
                { label: 'Services', href: '/services' },
                { label: application.serviceTitle, href: `/services/${application.serviceId}` },
                { label: 'Application' },
              ]}
            />
            <header className="flex flex-col gap-2 border-b pb-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="font-heading text-2xl font-semibold text-foreground">
                  {application.formTitle}
                </h1>
                <Badge variant="secondary">{application.statusLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{application.serviceTitle}</p>
              <p className="text-xs text-muted-foreground">
                {application.reference} ·{' '}
                {application.submittedAt
                  ? `Submitted ${new Date(application.submittedAt).toLocaleDateString()}`
                  : `Last updated ${new Date(application.updatedAt).toLocaleDateString()}`}
              </p>
              {application.status === 'draft' ? (
                <div>
                  <Button
                    render={
                      <a href={`/services/${application.serviceId}/apply/${application.formId}`} />
                    }
                  >
                    Continue your application
                  </Button>
                </div>
              ) : null}
            </header>

            <SubmittedAnswers application={application} />
          </>
        )}
      </div>
    </CitizenShell>
  );
}
