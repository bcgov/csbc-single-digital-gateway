import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@repo/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { ListPagination } from '@/components/console/list/list-pagination';
import { ListSearchInput } from '@/components/console/list/list-search-input';
import { SortableHeader } from '@/components/console/list/sortable-header';
import { useListSearch } from '@/lib/list-search';
import {
  type AgreementSort,
  agreementsPageQueryOptions,
  type ServiceAgreementSummary,
} from '@/lib/service-agreements';
import { type AgreementScope, scopeWorkspaceId } from './scope';

const STATUS_COLOR = {
  draft: 'grey',
  published: 'blue',
  archived: 'grey',
  none: 'grey',
} as const;

/** Shared Service Agreements list — workspace-scoped (staff) or global (admin) per `scope`.
 * Searchable, sortable, paged. The workspace scope lists the workspace's OWN agreements (globals are
 * excluded server-side, feature 150); the admin scope lists global agreements. */
export function AgreementsList({ scope }: { scope: AgreementScope }) {
  const navigate = useNavigate();
  const workspaceId = scopeWorkspaceId(scope);
  // Workspace scope may still be resolving (empty id) → gate the query; global (null) is always ready.
  const ready = scope.kind === 'admin' || scope.workspaceId !== '';
  const { sort, order, q, limit, offset, setPage, setSort, setQ } = useListSearch<AgreementSort>({
    defaultSort: 'updated',
  });
  const { data, isFetching } = useQuery({
    ...agreementsPageQueryOptions(workspaceId, { q, sort, order, limit, offset }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const goNew = () => {
    if (scope.kind === 'workspace') {
      void navigate({ to: '/app/$slug/service-agreements/new', params: { slug: scope.slug } });
    } else {
      void navigate({ to: '/admin/service-agreements/new' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-end gap-3">
        <Button size="sm" type="button" disabled={!ready} onClick={goNew}>
          <Plus className="size-4" aria-hidden />
          New agreement
        </Button>
        <ListSearchInput value={q} onChange={setQ} placeholder="Search agreements…" />
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
              <SortableHeader
                column="updated"
                label="Updated"
                active={sort}
                order={order}
                onSort={setSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  {q === ''
                    ? 'No service agreements yet — create one with the New button.'
                    : `No agreements match “${q}”.`}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: ServiceAgreementSummary) => (
                <TableRow key={item.id} data-pending={isFetching ? '' : undefined}>
                  <TableCell>
                    {scope.kind === 'workspace' ? (
                      <Link
                        to="/app/$slug/service-agreements/$id"
                        params={{ slug: scope.slug, id: item.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <Link
                        to="/admin/service-agreements/$id"
                        params={{ id: item.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {item.title}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLOR[item.status]}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <ListPagination total={total} limit={limit} offset={offset} onPageChange={setPage} />
      </div>
    </div>
  );
}
