import { FormRunner } from '@repo/react/form-runner';
import { Button } from '@repo/ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConsentGate, consentPending } from '@/components/application/consent-gate';
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
  type ApplicationFormToFill,
  RequestError,
  type Submission,
  applicationFormQueryOptions,
  draftQueryOptions,
  saveDraft,
  serviceAgreementsQueryOptions,
  submitApplication,
} from '@/lib/applications';
/** Confirmation shown after a successful submit, under the page's banner (so its heading is an h2). */
function Submitted({ serviceId, submission }: { serviceId: string; submission: Submission }) {
  return (
    <MessageCard
      title="Application submitted"
      headingLevel={2}
      icon={<CheckCircle2 className="size-10 text-primary" aria-hidden />}
      actions={
        <>
          <Button render={<Link to="/" />}>Track your applications</Button>
          <Button
            variant="outline"
            render={<Link to="/services/$serviceId" params={{ serviceId }} />}
          >
            Back to the service
          </Button>
        </>
      }
    >
      Your reference is <span className="font-medium text-foreground">{submission.reference}</span>.
      You can track its progress in your applications.
    </MessageCard>
  );
}

/** The interactive form, mounted only once the form structure + draft are loaded (seeds from draft). */
function ApplicationForm({
  form,
  draft,
  onConsentError,
}: {
  form: ApplicationFormToFill;
  draft: Submission;
  /** Called when submit is rejected server-side (422) — a new agreement version may need consent. */
  onConsentError: (data: Record<string, unknown>) => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>(draft.data ?? {});
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (next: Record<string, unknown>) => saveDraft(draft.id, next),
  });
  const submit = useMutation({
    mutationFn: (next: Record<string, unknown>) => submitApplication(draft.id, next),
    onSuccess: (result) => setSubmitted(result),
    onError: (error, next) => {
      // A 422 can be form-data or consent (a new agreement version published mid-flight). Persist
      // the answers and let the page re-resolve the gate; the server stays authoritative.
      if (error instanceof RequestError && error.status === 422) {
        save.mutate(next);
        onConsentError(next);
      }
    },
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (submitted) {
    return <Submitted serviceId={form.serviceId} submission={submitted} />;
  }

  const handleChange = (next: Record<string, unknown>) => {
    setData(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), 800); // debounced autosave
  };

  return (
    <div className="flex flex-col gap-4">
      <FormRunner
        kind={form.kind}
        definition={form.structure}
        data={data}
        onChange={handleChange}
        onSubmit={(next) => {
          if (timer.current) clearTimeout(timer.current);
          submit.mutate(next);
        }}
        submitting={submit.isPending}
        submitLabel="Submit application"
      />
      <p className="text-right text-xs text-muted-foreground" aria-live="polite">
        {submit.isError
          ? 'Could not submit — please try again.'
          : save.isPending
            ? 'Saving…'
            : save.isSuccess
              ? 'Draft saved'
              : ''}
      </p>
    </div>
  );
}

/**
 * The application page (`/services/:serviceId/apply/:formId`) — feature 63. Loads the form to fill,
 * get-or-creates the citizen's draft, and runs the FormRunner with debounced autosave + submit.
 * Requires a session (applying is private); anonymous visitors get a login prompt.
 */
export function ApplicationPage() {
  const { serviceId, formId } = useParams({ from: '/services/$serviceId/apply/$formId' });
  const { data: user, isPending: authPending } = useAuth();
  const form = useQuery(applicationFormQueryOptions(serviceId, formId));
  const draft = useQuery({
    ...draftQueryOptions(form.data?.formVersionId),
    enabled: Boolean(user) && form.isSuccess,
  });
  const agreements = useQuery(
    serviceAgreementsQueryOptions(serviceId, Boolean(user) && form.isSuccess && draft.isSuccess),
  );
  // The consent gate blocks the form until the citizen explicitly presses Continue. `gateEngaged`
  // latches once consent is needed, so recording the LAST decision doesn't auto-advance the page —
  // only `onContinue` (→ proceeded) mounts the form. A submit-time 422 resets `proceeded` and the
  // refetch re-flags `consentNeeded`, so the gate re-opens for a newly published agreement version.
  const [proceeded, setProceeded] = useState(false);
  const [gateEngaged, setGateEngaged] = useState(false);
  const consentNeeded = agreements.isSuccess && consentPending(agreements.data);
  useEffect(() => {
    if (consentNeeded) setGateEngaged(true);
  }, [consentNeeded]);
  const showGate = (gateEngaged || consentNeeded) && !proceeded;

  // The banner's h1 needs the form title, so it appears once the form loads; until then (and if it
  // fails to load) the body's message card carries the page's h1 instead.
  const title = form.data ? `Apply — ${form.data.title}` : undefined;
  const messageHeadingLevel = title ? 2 : 1;

  return (
    <CitizenShell activeNav="services">
      <PageHeaderBanner
        breadcrumb={
          <Breadcrumb
            trail={[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/services' },
              { label: form.data?.title ?? 'Service', href: `/services/${serviceId}` },
              { label: 'Apply' },
            ]}
          />
        }
      >
        {title ? <PageTitle>{title}</PageTitle> : null}
      </PageHeaderBanner>

      <PageContent>
        {form.isPending ? (
          <PageLoading />
        ) : form.isError || !form.data ? (
          <Unavailable serviceId={serviceId} headingLevel={messageHeadingLevel} />
        ) : !authPending && !user ? (
          <LoginGate message="You need to be signed in to apply." label="Log in to apply" />
        ) : draft.isError || agreements.isError ? (
          <Unavailable serviceId={serviceId} headingLevel={messageHeadingLevel} />
        ) : !draft.data || !agreements.isSuccess ? (
          <PageLoading />
        ) : showGate ? (
          <ConsentGate
            agreements={agreements.data}
            serviceId={serviceId}
            onContinue={() => setProceeded(true)}
          />
        ) : (
          <ApplicationForm
            form={form.data}
            draft={draft.data}
            onConsentError={() => {
              setProceeded(false);
              void agreements.refetch();
            }}
          />
        )}
      </PageContent>
    </CitizenShell>
  );
}

function Unavailable({ serviceId, headingLevel }: { serviceId: string; headingLevel: 1 | 2 }) {
  return (
    <MessageCard
      title="Application unavailable"
      headingLevel={headingLevel}
      actions={
        <Button
          variant="outline"
          render={<Link to="/services/$serviceId" params={{ serviceId }} />}
        >
          Back to the service
        </Button>
      }
    >
      This application form isn’t available right now.
    </MessageCard>
  );
}
