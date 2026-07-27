import { mdiFileDocumentCheckOutline, mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { useAuth, useLoginUrl } from '@/lib/auth';

/**
 * `/account/service-agreements` (feature 138) — a login-gated placeholder for the service
 * agreements a citizen has accepted. Content is built in a later feature; for now it renders the
 * branded header and an empty state.
 */
export function ServiceAgreementsPage() {
  const { data: user, isPending } = useAuth();
  const loginUrl = useLoginUrl();

  if (isPending) {
    return (
      <CitizenShell>
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-3 px-4 md:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CitizenShell>
    );
  }

  if (!user) {
    return (
      <CitizenShell>
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col px-4 md:px-8">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to view your service agreements.
            </p>
            <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
              <Icon path={mdiLogin} aria-hidden={true} />
              Log in
            </a>
          </div>
        </div>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell>
      <div className="flex flex-col">
        <div className="border-b-2 border-bcgov-gold">
          <div className="mx-auto flex w-full max-w-280 items-center gap-4 px-4 py-6 md:px-8">
            <Icon
              path={mdiFileDocumentCheckOutline}
              size="40px"
              className="text-blue-80"
              aria-hidden={true}
            />
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Service Agreements
              </h1>
              <p className="text-sm text-muted-foreground">
                Agreements you've accepted to use government services.
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-9 px-4 md:px-8">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You have no service agreements yet. Agreements you accept will appear here.
            </p>
          </div>
        </div>
      </div>
    </CitizenShell>
  );
}
