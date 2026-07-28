import type { ComponentProps, ReactNode } from 'react';
import { mdiArrowLeft, mdiFileDocumentCheckOutline, mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { RichTextView } from '@repo/ui/rich-text-view';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { useAuth, useLoginUrl } from '@/lib/auth';
import {
  RequestError,
  serviceAgreementQueryOptions,
  type ServiceAgreementDetail,
} from '@/lib/service-agreements';

const formatConsentedAt = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

/** The header subtitle: the recorded decision + when it was made. */
const statusLine = (a: ServiceAgreementDetail): string =>
  `${a.decision === 'approve' ? 'Approved' : 'Rejected'} on ${formatConsentedAt(a.consentedAt)}`;

/** Link back to the timeline (shown on the not-found state — the breadcrumb covers the happy path). */
function BackLink() {
  return (
    <Link
      to="/account/service-agreements"
      className="inline-flex w-fit items-center gap-1 text-sm text-link"
    >
      <Icon path={mdiArrowLeft} size="18px" aria-hidden={true} />
      Back to service agreements
    </Link>
  );
}

/** The agreement content + a greyed, read-only view of the citizen's recorded decision. */
function AgreementDetailCard({ agreement }: { agreement: ServiceAgreementDetail }) {
  const { content, decision, approveLabel, rejectLabel } = agreement;
  const contentValue = content as ComponentProps<typeof RichTextView>['value'];
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        {contentValue ? (
          <RichTextView value={contentValue} />
        ) : (
          <p className="text-sm text-muted-foreground italic">No content was provided.</p>
        )}
      </CardContent>
      {/* Greyed, read-only decision — the selected option reflects what the citizen chose. */}
      <div className="-mb-4 border-t border-border bg-gray-20 px-4 py-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Your response</p>
        <RadioGroup
          value={decision}
          disabled
          aria-label="Your recorded response"
          className="flex flex-col gap-2"
        >
          <Field orientation="horizontal">
            <RadioGroupItem id="sa-approve" value="approve" />
            <FieldLabel htmlFor="sa-approve">{approveLabel}</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem id="sa-reject" value="reject" />
            <FieldLabel htmlFor="sa-reject">{rejectLabel}</FieldLabel>
          </Field>
        </RadioGroup>
      </div>
    </Card>
  );
}

/**
 * `/account/service-agreements/:serviceAgreementId` (feature 139) — one recorded agreement decision,
 * scoped to the signed-in citizen. The page heading is the agreement name, the subtitle its
 * decision + date; the body is the agreement content with a read-only view of the response.
 * Login-gated; an unknown / not-yours id shows an in-shell not-found (the BFF 404s).
 */
export function ServiceAgreementDetailPage() {
  const { serviceAgreementId } = useParams({
    from: '/account_/service-agreements/$serviceAgreementId',
  });
  const { data: user, isPending: authPending } = useAuth();
  const loginUrl = useLoginUrl();
  const agreement = useQuery({
    ...serviceAgreementQueryOptions(serviceAgreementId),
    enabled: user != null,
    retry: false,
  });

  let body: ReactNode;
  if (authPending) {
    body = <Skeleton className="h-56 w-full" />;
  } else if (!user) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
        <p className="text-sm text-muted-foreground">
          You need to be signed in to view this service agreement.
        </p>
        <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
          <Icon path={mdiLogin} aria-hidden={true} />
          Log in
        </a>
      </div>
    );
  } else if (agreement.isSuccess) {
    body = <AgreementDetailCard agreement={agreement.data} />;
  } else if (agreement.error instanceof RequestError && agreement.error.status === 404) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <BackLink />
        <p className="text-sm text-muted-foreground">This service agreement could not be found.</p>
      </div>
    );
  } else if (agreement.isError) {
    body = (
      <p className="text-sm text-destructive" role="alert">
        This service agreement is temporarily unavailable.
      </p>
    );
  } else {
    body = <Skeleton className="h-56 w-full" />;
  }

  const loaded = agreement.data;
  const title = loaded?.title ?? 'Service Agreement';
  // Line 2 = the agreement description; line 3 = the recorded decision + date.
  const subtitle = loaded ? (loaded.description ?? '') : 'A record of an agreement you accepted.';

  return (
    <CitizenShell>
      <div className="flex flex-col">
        <SettingsPageHeader
          icon={mdiFileDocumentCheckOutline}
          title={title}
          subtitle={subtitle}
          meta={
            loaded ? (
              <p className="text-sm font-medium text-foreground">{statusLine(loaded)}</p>
            ) : undefined
          }
          breadcrumb={
            <Breadcrumb
              trail={[
                { label: 'Account settings', href: '/account' },
                { label: 'Service Agreements', href: '/account/service-agreements' },
                { label: title },
              ]}
            />
          }
        />
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-6 px-4 md:px-8">{body}</div>
      </div>
    </CitizenShell>
  );
}
