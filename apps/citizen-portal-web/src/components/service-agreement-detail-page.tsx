import type { ReactNode } from 'react';
import { mdiArrowLeft, mdiCheckCircle, mdiFileDocumentCheckOutline, mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { AgreementCard, type AgreementContent } from '@/components/agreement-card';
import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { useAuth, useLoginUrl } from '@/lib/auth';
import { RequestError, serviceAgreementQueryOptions } from '@/lib/service-agreements';

const formatConsentedAt = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

/** Link back to the timeline. */
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

/**
 * `/account/service-agreements/:serviceAgreementId` (feature 139) — the full content of one approved
 * agreement, scoped to the signed-in citizen. Login-gated; an unknown / not-yours id shows an
 * in-shell not-found (the BFF 404s).
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
    const { title, description, content, consentedAt } = agreement.data;
    body = (
      <>
        <BackLink />
        <AgreementCard
          title={title}
          description={description}
          content={content as AgreementContent}
          divided
          aside={
            <span className="flex items-center gap-1.5 text-sm font-normal whitespace-nowrap text-muted-foreground">
              <Icon
                path={mdiCheckCircle}
                size="18px"
                className="text-icon-success"
                aria-hidden={true}
              />
              Approved on {formatConsentedAt(consentedAt)}
            </span>
          }
        />
      </>
    );
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

  return (
    <CitizenShell>
      <div className="flex flex-col">
        <SettingsPageHeader
          icon={mdiFileDocumentCheckOutline}
          title="Service Agreement"
          subtitle="A record of an agreement you accepted."
          breadcrumb={
            <Breadcrumb
              trail={[
                { label: 'Account settings', href: '/account' },
                { label: 'Service Agreements', href: '/account/service-agreements' },
                { label: agreement.data?.title ?? 'Agreement' },
              ]}
            />
          }
        />
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-6 px-4 md:px-8">{body}</div>
      </div>
    </CitizenShell>
  );
}
