import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Button } from '@repo/ui/button';
import { Skeleton } from '@repo/ui/skeleton';
import { AvailableServices } from '@/components/landing/available-services';
import { TrackApplications } from '@/components/landing/track-applications';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { PageShell } from '@/components/layout/page-shell';
import { firstName, initials, useAuth } from '@/lib/auth';
import { displayName, loginUrl, logout } from '@/lib/bff';
import { MOCK_APPLICATIONS } from '@/lib/content';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/** Greeting block: avatar + "Hi, <first name>" / "Welcome to MyBC." (skeleton while loading). */
function Greeting({ name }: { name: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarFallback>{name ? initials(name) : '··'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        {name ? (
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Hi, {firstName(name)}
          </h1>
        ) : (
          <Skeleton className="h-7 w-40" />
        )}
        <p className="text-sm text-muted-foreground">Welcome to MyBC.</p>
      </div>
    </div>
  );
}

/**
 * The authenticated landing page (`/app`) — greets the signed-in citizen and surfaces their
 * applications and available services. Identity comes from real BFF auth (feature 27) as a
 * TanStack Query (`useAuth`); application data is mock (feature 59). Skeleton layout per
 * `inspiration/landing-authenticated-*.png`.
 */
export function AppPage() {
  const { data: user, isPending } = useAuth();

  // Resolved with no session (401): the /app page is not yet route-guarded, so prompt for login.
  if (!isPending && !user) {
    return (
      <PageShell variant="anonymous">
        <section className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">You are not signed in.</p>
          <Button render={<a href={loginUrl} />}>Log in</Button>
        </section>
      </PageShell>
    );
  }

  const name = user ? displayName(user) : null;
  const headerUser = user ? { name: displayName(user), email: user.claims.email } : undefined;

  return (
    <PageShell
      variant="authenticated"
      user={headerUser}
      onLogout={() => {
        void handleLogout();
      }}
    >
      <div className="flex flex-col gap-12">
        <Greeting name={name} />
        <TrackApplications applications={MOCK_APPLICATIONS} />
        <AvailableServices applications={MOCK_APPLICATIONS} />
        <WhatYouCanDo />
      </div>
    </PageShell>
  );
}
