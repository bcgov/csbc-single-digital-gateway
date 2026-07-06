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
    <div className="flex flex-col gap-1 mt-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Hi, {firstName(name)}</h1>
      <p className="text-sm text-muted-foreground">Welcome to MyBC.</p>
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
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : user ? (
        <div className="flex flex-col gap-12">
          <Greeting name={displayName(user)} />
          <TrackApplications
            applications={applications.data ?? []}
            loading={applications.isPending}
          />
          <AvailableServices
            services={(services.data ?? []).slice(0, 4)}
            applications={applications.data ?? []}
            loading={services.isPending}
          />
          <WhatYouCanDo />
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          <Hero />
          <WhatYouCanDo />
          <AvailableServices
            services={(services.data ?? []).slice(0, 4)}
            loading={services.isPending}
          />
          <LoginCta />
        </div>
      )}
    </PageShell>
  );
}
