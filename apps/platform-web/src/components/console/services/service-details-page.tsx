import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SectionHeading } from '@/components/console/section-heading';
import { SERVICE_DETAILS_SECTIONS } from '@/lib/service-nav';
import { ServiceConsolePage } from './service-console-page';

/** Scroll the section matching the current `#hash` into view. `<main>` is the scroll container, so
 * `scrollIntoView` (which finds the nearest scrollable ancestor) does the right thing. */
function useHashScroll(hash: string) {
  useEffect(() => {
    if (!hash) {
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
}

/**
 * The Service details page (feature 164) — one scrollable page of sections whose `id`s match the
 * sidebar's "Service details" submenu anchors. Section headings reuse the shared `.section-heading`
 * (gold accent tab from `@repo/ui`, same as the citizen portal). Placeholder bodies for now.
 */
export function ServiceDetailsPage() {
  const hash = useLocation({ select: (location) => location.hash });
  useHashScroll(hash);

  return (
    <ServiceConsolePage title="Service details" description="Configure this service's details.">
      <div className="flex flex-col gap-10">
        {SERVICE_DETAILS_SECTIONS.map((section) => (
          <section key={section.key} id={section.key} className="flex scroll-mt-6 flex-col gap-3">
            <SectionHeading title={section.label} />
            <p className="text-sm text-muted-foreground">This section is coming soon.</p>
          </section>
        ))}
      </div>
    </ServiceConsolePage>
  );
}
