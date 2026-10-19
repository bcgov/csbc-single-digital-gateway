import { useQuery } from '@tanstack/react-query';
import { AvailableServices } from '@/components/landing/available-services';
import { Hero } from '@/components/landing/hero';
import { LoginCta } from '@/components/landing/login-cta';
import { TrackApplications } from '@/components/landing/track-applications';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { PageContent } from '@/components/layout/page-content';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';
import { PageLoading } from '@/components/layout/page-loading';
import { firstName, useAuth } from '@/lib/auth';
import { displayName } from '@/lib/bff';
import { myApplicationsQueryOptions, servicesQueryOptions } from '@/lib/catalog';

/** Greeting band for a signed-in citizen: "Hi, <first name>" / "Welcome to MyBC." */
function Greeting({ name }: { name: string }) {
  return (
    <PageHeaderBanner>
      <h1>Hi, {firstName(name)}</h1>
      <p>Welcome to MyBC.</p>
    </PageHeaderBanner>
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

  return (
    <CitizenShell activeNav="home">
      {isPending ? (
        <PageContent>
          <PageLoading />
        </PageContent>
      ) : user ? (
        <>
          <Greeting name={displayName(user)} />
          <PageContent>
            <TrackApplications
              applications={applications.data ?? []}
              loading={applications.isPending}
            />
            <AvailableServices
              services={(services.data ?? []).slice(0, 3)}
              loading={services.isPending}
            />
            <WhatYouCanDo />
          </PageContent>
        </>
      ) : (
        <>
          <Hero />
          <PageContent>
            <WhatYouCanDo />
            <AvailableServices
              services={(services.data ?? []).slice(0, 3)}
              loading={services.isPending}
            />
            <LoginCta />
          </PageContent>
        </>
      )}
    </CitizenShell>
  );
}
