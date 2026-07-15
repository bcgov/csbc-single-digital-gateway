import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { AvailableServices } from '@/components/landing/available-services';
import { Hero } from '@/components/landing/hero';
import { LoginCta } from '@/components/landing/login-cta';
import { TrackApplications } from '@/components/landing/track-applications';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { PageShell } from '@/components/layout/page-shell';
import { firstName, useAuth } from '@/lib/auth';
import { displayName, logout } from '@/lib/bff';
import { myApplicationsQueryOptions, servicesQueryOptions } from '@/lib/catalog';

async function handleLogout(): Promise<void> {
  await logout();
  window.location.assign('/');
}

/** Greeting block for a signed-in citizen: "Hi, <first name>" / "Welcome to MyBC." */
function Greeting({ name }: { name: string }) {
  return (
    <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col">
      <h1>Hi, {firstName(name)}</h1>
      <p>Welcome to MyBC.</p>
    </div>
  );
}

/**
 * The citizen portal home (`/`) — a single auth-aware page (feature 64). Signed out, it markets the
 * gateway (hero + login CTA); signed in, it greets the citizen and surfaces their applications. There
 * is no separate `/app`. Identity comes from BFF auth (feature 27) as a TanStack Query.
 */
export function HomePage() {
  const { data: user, isPending } = useAuth();
  const services = useQuery(servicesQueryOptions());
  const applications = useQuery(myApplicationsQueryOptions());

  const headerUser = user ? { name: displayName(user), email: user.claims.email } : undefined;

  return (
    <PageShell
      variant={user ? 'authenticated' : 'anonymous'}
      activeNav="home"
      user={headerUser}
      onLogout={() => {
        void handleLogout();
      }}
    >
      {isPending ? (
        <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : user ? (
        <div className="flex flex-col">
          <div className="py-6 border-b-2 border-bcgov-gold">
            <Greeting name={displayName(user)} />
          </div>
          <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
            <TrackApplications
              applications={applications.data ?? []}
              loading={applications.isPending}
            />
            <AvailableServices
              services={(services.data ?? []).slice(0, 3)}
              loading={services.isPending}
            />
            <WhatYouCanDo />
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <Hero />
          <div className="mx-auto px-4 md:px-8 my-6 w-full max-w-280 flex flex-col gap-9">
            <WhatYouCanDo />
            <AvailableServices
              services={(services.data ?? []).slice(0, 3)}
              loading={services.isPending}
            />
            <LoginCta />
          </div>
        </div>
      )}
    </PageShell>
  );
}
