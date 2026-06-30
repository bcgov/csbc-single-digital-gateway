import { AvailableServices } from '@/components/landing/available-services';
import { Hero } from '@/components/landing/hero';
import { LoginCta } from '@/components/landing/login-cta';
import { WhatYouCanDo } from '@/components/landing/what-you-can-do';
import { PageShell } from '@/components/layout/page-shell';

/**
 * The anonymous landing page (`/`) — markets the Single Digital Gateway and drives login.
 * Skeleton layout per `inspiration/landing-anonymous.png` (feature 59).
 */
export function HomePage() {
  return (
    <PageShell variant="anonymous">
      <div className="flex flex-col gap-12">
        <Hero />
        <WhatYouCanDo />
        <AvailableServices />
        <LoginCta />
      </div>
    </PageShell>
  );
}
