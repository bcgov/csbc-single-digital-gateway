import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CircleHelp, EllipsisVertical, Plus } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/console/page-header';
import { ListPagination } from '@/components/console/list/list-pagination';
import { ListSearchInput } from '@/components/console/list/list-search-input';
import { SortableHeader } from '@/components/console/list/sortable-header';
import { useListSearch } from '@/lib/list-search';
import { type ServiceSort, type ServiceSummary, servicesQueryOptions } from '@/lib/services';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';
import { ServiceMenu } from './service-menu';

const STATUS_COLOR = {
  draft: 'yellow',
  published: 'green',
  archived: 'blue',
  none: 'blue',
} as const;

/** Workspace Services list — searchable, sortable, paged; "New service" opens the client-first editor. */
export function ServicesList() {
  const { slug } = useParams({ from: '/app/$slug' });
  const navigate = useNavigate();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const workspaceId = workspace?.id ?? '';
  const { sort, order, q, limit, offset, setPage, setSort, setQ } = useListSearch<ServiceSort>();
  const { data, isFetching } = useQuery({
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
            onClick={() => void navigate({ to: '/app/$slug/services/new', params: { slug } })}
          >
            <Plus className="size-4" aria-hidden />
            New
          </Button>,
        ]}
      />
      <PageBody className="flex flex-col gap-4">
        <div className="flex justify-end">
          <ListSearchInput value={q} onChange={setQ} placeholder="Search services…" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  column="title"
                  label="Title"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <SortableHeader
                  column="status"
                  label="Status"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <TableHead>Versions</TableHead>
                <SortableHeader
                  column="updated"
                  label="Updated"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {q === ''
                      ? 'No services yet — create one with the New button.'
                      : `No services match “${q}”.`}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((service: ServiceSummary) => (
                  <TableRow key={service.id} data-pending={isFetching ? '' : undefined}>
                    <TableCell>
                      <Link
                        to="/app/$slug/services/$id"
                        params={{ slug, id: service.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {service.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge color={STATUS_COLOR[service.status]}>{service.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{service.versionCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(service.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ServiceMenu
                          serviceId={service.id}
                          hasSubmissions={service.hasSubmissions}
                          archived={service.status === 'archived'}
                          latestPublished={service.latestPublished}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListPagination total={total} limit={limit} offset={offset} onPageChange={setPage} />
        </div>
      </PageBody>
    </div>
  );
}
