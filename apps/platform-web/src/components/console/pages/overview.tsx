import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { Card, CardHeader, CardTitle } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { PageBody, PageHeader } from '@/components/console/page-header';
import { SectionHeading } from '@/components/console/section-heading';
import { ServiceCard } from '@/components/console/services/services-list';

// Lazy so the heavy JSONForms/Lexical modal bundle loads only when the CTA is clicked — the overview
// dashboard itself stays light.
const NewServiceModal = lazy(() =>
  import('@/components/console/services/new-service-modal').then((m) => ({
    default: m.NewServiceModal,
  })),
);
import { servicesQueryOptions } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/** Placeholder "Learn more" resources — external documentation links (2). */
const LEARN_MORE_LINKS = ['Service Catalogue Documentation', 'Service Catalogue Playground'];

/** Placeholder "Legal" resources — a 2-column grid of 5 links. */
const LEGAL_LINKS = ['Disclaimer', 'Privacy', 'Terms of Use', 'Accessibility', 'Copyright'];

/** An analytics placeholder card — title over a skeleton chart body. */
function AnalyticsCard({ title }: { title: string }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <div className="px-4">
        <Skeleton className="mb-4 h-7 w-16" />
        <div className="flex h-24 items-end gap-1.5">
          {[52, 68, 44, 80, 58, 88, 46, 72].map((height, index) => (
            <Skeleton key={index} className="flex-1" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </Card>
  );
}

/** A placeholder resource link — label with an external-link icon on the right. */
function ResourceLink({ label }: { label: string }) {
  return (
    <a
      href="#"
      className="flex items-center justify-between gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ExternalLink className="size-4 shrink-0" aria-hidden />
    </a>
  );
}

/**
 * The workspace Overview screen (feature 165). A responsive 2/3–1/3 split (single column below `lg`):
 * the left column holds the Create-new-service CTA and an Analytics section; the right holds a
 * "Recently updated" services panel and a "Resources" accordion. Every panel except the CTA is a
 * placeholder until live analytics/services data is wired.
 */
export function OverviewPage() {
  const { slug } = useParams({ from: '/app/$slug' });
  const [newOpen, setNewOpen] = useState(false);

  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { data: recentServices, isPending: recentPending } = useQuery({
    ...servicesQueryOptions(workspaceId, {
      q: '',
      sort: 'updated',
      order: 'desc',
      limit: 3,
      offset: 0,
    }),
    enabled: workspaceId !== '',
  });
  const recent = recentServices?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Overview"
        description="A snapshot of activity across your workspace."
        size="lg"
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column — 2/3 */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="group flex w-full flex-col items-center gap-3 rounded-xs border border-dashed border-border bg-card px-4 py-6 text-center shadow-xs ring-1 ring-foreground/10 transition-colors hover:border-bcgov-blue hover:bg-blue-10 lg:w-1/2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center bg-blue-10 text-bcgov-blue transition-colors group-hover:bg-bcgov-blue group-hover:text-white">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="flex items-center gap-1 font-semibold">
                Create new service
                <ChevronRight
                  className="size-5 text-muted-foreground transition-colors group-hover:text-bcgov-blue"
                  aria-hidden
                />
              </span>
            </button>

            <section className="flex flex-col gap-4">
              <SectionHeading title="Analytics" />
              <div className="flex flex-col gap-4">
                <AnalyticsCard title="Page Views" />
                <AnalyticsCard title="Unique Visitors" />
              </div>
            </section>
          </div>

          {/* Right column — 1/3 */}
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <SectionHeading title="Recently updated" />
              <div className="flex flex-col gap-3">
                <h3 className="font-bold">Services</h3>
                {workspaceId === '' || recentPending ? (
                  <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((row) => (
                      <Skeleton key={row} className="h-[70px] w-full" />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No services yet — create one to get started.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recent.map((service) => (
                      <ServiceCard key={service.id} service={service} slug={slug} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionHeading title="Resources" />
              <div className="flex flex-col gap-3">
                <Accordion defaultValue={['learn-more']}>
                  <AccordionItem value="learn-more">
                    <AccordionTrigger>Learn More</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-3">
                        {LEARN_MORE_LINKS.map((label) => (
                          <ResourceLink key={label} label={label} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Accordion>
                  <AccordionItem value="legal">
                    <AccordionTrigger>Legal</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {LEGAL_LINKS.map((label) => (
                          <ResourceLink key={label} label={label} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </section>
          </div>
        </div>
      </PageBody>
      {newOpen ? (
        <Suspense fallback={null}>
          <NewServiceModal open={newOpen} onOpenChange={setNewOpen} />
        </Suspense>
      ) : null}
    </div>
  );
}
