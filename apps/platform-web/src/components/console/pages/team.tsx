import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { SettingsSubNav } from '@/components/console/settings-sub-nav';
import { ListPagination } from '@/components/console/list/list-pagination';
import { ListSearchInput } from '@/components/console/list/list-search-input';
import { SortableHeader } from '@/components/console/list/sortable-header';
import { initials } from '@/lib/auth';
import { useListSearch } from '@/lib/list-search';
import {
  type MemberSort,
  workspaceBySlugQueryOptions,
  workspaceMembersPageQueryOptions,
} from '@/lib/workspaces';

// Code-split the add-member dialog (and its search/Dialog deps) out of the team route's critical
// path — it only loads when an admin opens it, keeping the route's first render light.
const AddMemberModal = lazy(() =>
  import('@/components/console/add-member-modal').then((m) => ({ default: m.AddMemberModal })),
);

const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString();

/** The workspace Team — members, searchable/sortable/paged; admins-first by default (feature 32). */
export function TeamPage() {
  const { slug } = useParams({ from: '/app/$slug/team' });
  const navigate = useNavigate();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const { sort, order, q, limit, offset, setPage, setSort, setQ } = useListSearch<MemberSort>({
    defaultSort: 'role',
    defaultOrder: 'asc',
  });
  const members = useQuery({
    ...workspaceMembersPageQueryOptions(workspace?.id ?? '', { q, sort, order, limit, offset }),
    enabled: workspace != null,
    placeholderData: keepPreviousData,
  });
  const rows = members.data?.items ?? [];
  const total = members.data?.total ?? 0;
  const isAdmin = workspace?.role === 'admin';
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4">
        <SettingsSubNav slug={slug} />
        <div className="flex flex-col items-end gap-3">
          {isAdmin ? (
            <Button size="sm" type="button" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" aria-hidden />
              Add member
            </Button>
          ) : null}
          <ListSearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  column="name"
                  label="Member"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <TableHead>Email</TableHead>
                <SortableHeader
                  column="role"
                  label="Role"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <SortableHeader
                  column="joined"
                  label="Joined"
                  active={sort}
                  order={order}
                  onSort={setSort}
                />
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {q === ''
                      ? 'Just you so far — use Add member to add teammates.'
                      : `No members match “${q}”.`}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    data-pending={members.isFetching ? '' : undefined}
                    onClick={() =>
                      navigate({
                        to: '/app/$slug/team/$memberId',
                        params: { slug, memberId: member.id },
                      })
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge color={member.role === 'admin' ? 'green' : 'blue'}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </Badge>
                        {member.isOwner ? <Badge color="yellow">Owner</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {member.status === 'suspended' ? (
                        <Badge color="blue">Suspended</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListPagination total={total} limit={limit} offset={offset} onPageChange={setPage} />
        </div>
      </div>
      {workspace && isAdmin && addOpen ? (
        <Suspense fallback={null}>
          <AddMemberModal workspaceId={workspace.id} open onOpenChange={setAddOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
