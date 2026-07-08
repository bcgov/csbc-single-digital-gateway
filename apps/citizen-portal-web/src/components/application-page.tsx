import { FormRunner } from '@repo/react/form-runner';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConsentGate, consentPending } from '@/components/application/consent-gate';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { Breadcrumb } from '@/components/services/service-content';
import { useAuth, useLoginUrl } from '@/lib/auth';
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
/** Confirmation shown after a successful submit. */
function Submitted({ serviceId, submission }: { serviceId: string; submission: Submission }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
      <CheckCircle2 className="size-10 text-primary" aria-hidden />
      <h1 className="font-heading text-xl font-semibold text-foreground">Application submitted</h1>
      <p className="text-sm text-muted-foreground">
        Your reference is{' '}
        <span className="font-medium text-foreground">{submission.reference}</span>. You can track
        its progress in your applications.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button render={<Link to="/" />}>Track your applications</Button>
        <Button
          variant="outline"
          render={<Link to="/services/$serviceId" params={{ serviceId }} />}
        >
          Back to the service
        </Button>
      </div>
    </div>
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
  // The consent gate blocks the form until every agreement is decided (required = approved). Once
  // the citizen continues we mount the form; a submit-time 422 resets this so the gate can re-open.
  const [proceeded, setProceeded] = useState(false);
  const showGate = agreements.isSuccess && consentPending(agreements.data) && !proceeded;

  return (
    <CitizenShell activeNav="services">
      <p>This is the application-page.tsx</p>
      <div className="mx-4 md:mx-8 xl:mx-auto my-6 w-full max-w-280 flex flex-col gap-9">
        <Breadcrumb
          trail={[
            { label: 'Services', href: '/services' },
            { label: form.data?.title ?? 'Service', href: `/services/${serviceId}` },
            { label: 'Apply' },
          ]}
        />

        {form.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : form.isError || !form.data ? (
          <Unavailable serviceId={serviceId} />
        ) : !authPending && !user ? (
          <LoginPrompt />
        ) : draft.isError || agreements.isError ? (
          <Unavailable serviceId={serviceId} />
        ) : !draft.data || !agreements.isSuccess ? (
          <Skeleton className="h-32 w-full" />
        ) : showGate ? (
          <ConsentGate
            agreements={agreements.data}
            serviceId={serviceId}
            onContinue={() => setProceeded(true)}
          />
        ) : (
          <>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Apply — {form.data.title}
            </h1>
            <ApplicationForm
              form={form.data}
              draft={draft.data}
              onConsentError={() => {
                setProceeded(false);
                void agreements.refetch();
              }}
            />
          </>
        )}
      </div>
    </CitizenShell>
  );
}

function LoginPrompt() {
  const loginUrl = useLoginUrl();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">You need to be signed in to apply.</p>
      <Button render={<a href={loginUrl} />}>Log in to apply</Button>
    </div>
  );
}

function Unavailable({ serviceId }: { serviceId: string }) {
  return (
    <div className="rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
      <h1 className="font-heading text-lg font-semibold">Application unavailable</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This application form isn’t available right now.
      </p>
      <Button
        variant="outline"
        className="mt-4"
        render={<Link to="/services/$serviceId" params={{ serviceId }} />}
      >
        Back to the service
      </Button>
    </div>
  );
}
