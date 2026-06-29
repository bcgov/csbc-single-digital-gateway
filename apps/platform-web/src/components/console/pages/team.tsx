import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { ListPage } from '@/components/console/list-page';
import { initials, useAuth } from '@/lib/auth';
import { workspaceBySlugQueryOptions, workspaceMembersQueryOptions } from '@/lib/workspaces';

export function TeamPage() {
  const { slug } = useParams({ from: '/app/$slug/team' });
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const { data: auth } = useAuth();
  const members = useQuery({
    ...workspaceMembersQueryOptions(workspace?.id ?? ''),
    enabled: workspace != null,
  });
  const rows = members.data ?? [];

  return (
    <ListPage
      toolbar={
        <span className="text-sm text-muted-foreground">People with access to this workspace</span>
      }
      actions={
        <Button variant="outline" size="sm" type="button">
          <UserPlus className="size-4" aria-hidden />
          Invite member
        </Button>
      }
      emptyTitle="Just you so far"
      emptyDescription="Use Invite member to add teammates."
    >
      {members.isSuccess && rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.displayName}</span>
                    {auth?.id === member.userId ? <Badge variant="secondary">You</Badge> : null}
                    {member.status === 'suspended' ? (
                      <Badge variant="outline">Suspended</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{member.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </ListPage>
  );
}
