import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronRight, CircleHelp, EllipsisVertical, Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { PageBody, PageHeader } from '@/components/console/page-header';
import { ListPagination } from '@/components/console/list/list-pagination';
import { useListSearch } from '@/lib/list-search';
import { type ServiceSort, type ServiceSummary, servicesQueryOptions } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

// Lazy so the heavy JSONForms/Lexical modal bundle loads only when "New" is clicked.
const NewServiceModal = lazy(() =>
  import('@/components/console/services/new-service-modal').then((m) => ({
    default: m.NewServiceModal,
  })),
);

/** Status → 4px left-border color (published green, archived red; draft/none the subtle default border). */
const STATUS_BORDER = {
  published: 'border-l-success-border',
  draft: 'border-l-border',
  archived: 'border-l-danger-border',
  none: 'border-l-border',
} as const;

/** Status → Badge color (mirrors the border). */
const STATUS_BADGE = {
  published: 'green',
  draft: 'grey',
  archived: 'red',
  none: 'grey',
} as const;

/** "Last updated: Aug 7, 2026, 2:05 PM" (no date-fns in platform-web). */
const lastUpdated = (iso: string): string =>
  `Last updated: ${new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

export function ServiceCard({ service, slug }: { service: ServiceSummary; slug: string }) {
  return (
    <Link to="/app/$slug/services/$id" params={{ slug, id: service.id }} className="no-underline">
      <Card
        column
        className={`border-l-4 ${STATUS_BORDER[service.status]} transition-colors hover:bg-blue-10`}
      >
        <CardHeader className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{service.title}</CardTitle>
            <Badge color={STATUS_BADGE[service.status]}>{service.status}</Badge>
          </div>
          <CardDescription>{lastUpdated(service.updatedAt)}</CardDescription>
        </CardHeader>
        <ChevronRight className="mr-4 size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Card>
    </Link>
  );
}

/** Workspace Services list — a status-bordered card list; "New" opens the client-first editor. */
export function ServicesList() {
  const { slug } = useParams({ from: '/app/$slug' });
  const [newOpen, setNewOpen] = useState(false);
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { sort, order, q, limit, offset, setPage } = useListSearch<ServiceSort>();
  const { data } = useQuery({
    ...servicesQueryOptions(workspaceId, { q, sort, order, limit, offset }),
    enabled: workspaceId !== '',
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Services"
        size="lg"
        extra={[
          <Button
            key="more"
            variant="outline"
            size="icon-sm"
            type="button"
            aria-label="More options"
          >
            <EllipsisVertical className="size-[18px]" aria-hidden />
          </Button>,
          <Button key="help" variant="outline" size="icon-sm" type="button" aria-label="Help">
            <CircleHelp className="size-[18px]" aria-hidden />
          </Button>,
          <Button
            key="new"
            size="sm"
            type="button"
            disabled={workspaceId === ''}
            onClick={() => setNewOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            New
          </Button>,
        ]}
      />
      <PageBody className="flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-10 text-center text-muted-foreground">
            No services yet — create one with the New button.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((service) => (
              <ServiceCard key={service.id} service={service} slug={slug} />
            ))}
          </div>
        )}
        <ListPagination total={total} limit={limit} offset={offset} onPageChange={setPage} />
      </PageBody>
      {newOpen ? (
        <Suspense fallback={null}>
          <NewServiceModal open={newOpen} onOpenChange={setNewOpen} />
        </Suspense>
      ) : null}
    </div>
  );
}
