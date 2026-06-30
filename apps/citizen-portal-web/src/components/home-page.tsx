import { useQuery } from '@tanstack/react-query';
import { AvailableServices } from '@/components/landing/available-services';
import { Hero } from '@/components/landing/hero';
import { LoginCta } from '@/components/landing/login-cta';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { PageShell } from '@/components/layout/page-shell';
import { servicesQueryOptions } from '@/lib/catalog';

/**
 * The anonymous landing page (`/`) — markets the Single Digital Gateway and drives login.
 * Skeleton layout per `inspiration/landing-anonymous.png` (feature 59); the available-services
 * panel is now powered by the real catalog (feature 60).
 */
export function HomePage() {
  const { data: services, isPending } = useQuery(servicesQueryOptions());

  return (
    <PageShell variant="anonymous" activeNav="home">
      <div className="flex flex-col gap-12">
        <Hero />
        <WhatYouCanDo />
        <AvailableServices services={(services ?? []).slice(0, 4)} loading={isPending} />
        <LoginCta />
      </div>
    </PageShell>
  );
}
