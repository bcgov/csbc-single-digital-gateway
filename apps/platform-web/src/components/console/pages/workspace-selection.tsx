import { Button } from '@repo/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { Building2, CircleHelp, EllipsisVertical, Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateWorkspaceModal } from '@/components/console/create-workspace-modal';
import { PageBody, PageHeader } from '@/components/console/page-header';
import { useAuth } from '@/lib/auth';
import { displayName } from '@/lib/bff';
import { useWorkspaces } from '@/lib/workspaces';

/**
 * Workspace selection page (feature 161) at `/app`. Replaces the old auto-redirect: signed-in users
 * pick which workspace to enter (or create one). Even a single-workspace user lands here.
 */
export function WorkspaceSelectionPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const hasWorkspaces = workspaces !== undefined && workspaces.length > 0;
  const firstName = user ? (displayName(user).split(' ')[0] ?? '') : '';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Hello'}
        description="Select a workspace"
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
          <Button key="new" size="sm" type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New Workspace
          </Button>,
        ]}
      />

      <PageBody>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : hasWorkspaces ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to="/app/$slug"
                params={{ slug: workspace.slug }}
                className="no-underline"
              >
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader className="flex flex-col items-center gap-1 text-center">
                    <span className="mb-1 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="size-[18px]" aria-hidden />
                    </span>
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>
                      {workspace.role === 'admin' ? 'Admin' : 'Member'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No workspaces yet</CardTitle>
              <CardDescription>Create your first workspace to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Create workspace
              </Button>
            </CardContent>
          </Card>
        )}
      </PageBody>

      {createOpen ? (
        <CreateWorkspaceModal dismissable open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </div>
  );
}
