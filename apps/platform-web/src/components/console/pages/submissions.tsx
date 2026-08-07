import { Badge } from '@repo/ui/badge';
import { Skeleton } from '@repo/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { PageBody, PageHeader } from '@/components/console/page-header';
import { ListPagination } from '@/components/console/list/list-pagination';
import { ListSearchInput } from '@/components/console/list/list-search-input';
import { SortableHeader } from '@/components/console/list/sortable-header';
import { useListSearch } from '@/lib/list-search';
import {
  type SubmissionSort,
  type SubmissionStatus,
  submissionsQueryOptions,
} from '@/lib/submissions';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

const STATUS_TABS: Array<{ value: string; label: string; status?: SubmissionStatus }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending', status: 'pending' },
  { value: 'in_review', label: 'In review', status: 'in_review' },
  { value: 'needs_changes', label: 'Needs changes', status: 'needs_changes' },
  { value: 'approved', label: 'Approved', status: 'approved' },
];

const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : '—');

/** All submissions in the workspace — searchable, sortable, paged, filterable by status tab; the
 * staff review queue (feature 65). Drafts are hidden server-side (feature 151). URL-synced. */
export function SubmissionsPage() {
  const { slug } = useParams({ from: '/app/$slug/submissions' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const { status } = useSearch({ strict: false }) as { status?: SubmissionStatus };
  const { sort, order, q, limit, offset, setPage, setSort, setQ, setFilter } =
    useListSearch<SubmissionSort>({ defaultSort: 'submitted' });
  const tab = STATUS_TABS.find((t) => t.status === status)?.value ?? 'all';

  const submissions = useQuery({
    ...submissionsQueryOptions(workspace?.id ?? '', {
      q,
      sort,
      order,
      limit,
      offset,
      ...(status ? { status } : {}),
    }),
    enabled: workspace != null,
    placeholderData: keepPreviousData,
  });
  const items = submissions.data?.items ?? [];
  const total = submissions.data?.total ?? 0;
  const loading = submissions.isPending && workspace != null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Service Requests" size="lg" />
      <PageBody className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Tabs
            value={tab}
            onValueChange={(value) =>
              setFilter({ status: STATUS_TABS.find((t) => t.value === value)?.status })
            }
          >
            <TabsList className="gap-2">
              {STATUS_TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="bg-gray-20 rounded-full data-active:bg-bcgov-blue data-active:text-background hover:data-active:text-background"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ListSearchInput
            value={q}
            onChange={setQ}
            placeholder="Search applicant, service, ref…"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Application</TableHead>
                    <SortableHeader
                      column="status"
                      label="Status"
                      active={sort}
                      order={order}
                      onSort={setSort}
                    />
                    <SortableHeader
                      column="submitted"
                      label="Submitted"
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
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {q === ''
                          ? 'No submissions yet — they appear here once applicants submit.'
                          : `No submissions match “${q}”.`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((s) => (
                      <TableRow key={s.id} data-pending={submissions.isFetching ? '' : undefined}>
                        <TableCell>
                          <Link
                            to="/app/$slug/submissions/$id"
                            params={{ slug, id: s.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.applicantName}
                          </Link>
                          <div className="text-xs text-muted-foreground">{s.reference}</div>
                        </TableCell>
                        <TableCell>{s.serviceTitle}</TableCell>
                        <TableCell>{s.formTitle}</TableCell>
                        <TableCell>
                          <Badge color="yellow">{s.statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDate(s.submittedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {fmtDate(s.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ListPagination total={total} limit={limit} offset={offset} onPageChange={setPage} />
            </>
          )}
        </div>
      </PageBody>
    </div>
  );
}
