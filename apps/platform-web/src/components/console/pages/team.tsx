import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { ListPage } from '@/components/console/list-page';
import { initials } from '@/lib/auth';
import { workspaceBySlugQueryOptions, workspaceMembersQueryOptions } from '@/lib/workspaces';

// Code-split the add-member dialog (and its search/Dialog deps) out of the team route's critical
// path — it only loads when an admin opens it, keeping the route's first render light.
const AddMemberModal = lazy(() =>
  import('@/components/console/add-member-modal').then((m) => ({ default: m.AddMemberModal })),
);

export function TeamPage() {
  const { slug } = useParams({ from: '/app/$slug/team' });
  const navigate = useNavigate();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const members = useQuery({
    ...workspaceMembersQueryOptions(workspace?.id ?? ''),
    enabled: workspace != null,
  });
  const rows = members.data ?? [];
  const isAdmin = workspace?.role === 'admin';
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <ListPage
        toolbar={
          <span className="text-sm text-muted-foreground">
            People with access to this workspace
          </span>
        }
        actions={
          isAdmin ? (
            <Button variant="outline" size="sm" type="button" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-4" aria-hidden />
              Add member
            </Button>
          ) : null
        }
        emptyTitle="Just you so far"
        emptyDescription={isAdmin ? 'Use Add member to add teammates.' : 'No teammates yet.'}
      >
        {members.isSuccess && rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
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
                      <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </Badge>
                      {member.isOwner ? <Badge variant="secondary">Owner</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.status === 'suspended' ? (
                      <Badge variant="outline">Suspended</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Active</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </ListPage>
      {workspace && isAdmin && addOpen ? (
        <Suspense fallback={null}>
          <AddMemberModal workspaceId={workspace.id} open onOpenChange={setAddOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
