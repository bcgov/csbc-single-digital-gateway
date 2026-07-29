import { Button } from '@repo/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { DeleteWorkspaceButton } from '@/components/console/delete-workspace-button';
import { WorkspaceDefaultAgreements } from '@/components/console/service-agreements/workspace-default-agreements';
import { WorkspaceNameForm } from '@/components/console/workspace-name-form';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

/** Workspace settings. Admins can rename (General) and delete (Danger zone) the workspace. */
export function SettingsPage() {
  const { slug } = useParams({ strict: false });
  const { data: workspace } = useQuery({
    ...workspaceBySlugQueryOptions(slug ?? ''),
    enabled: slug !== undefined,
  });
  const isAdmin = workspace?.role === 'admin';

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic workspace information.</CardDescription>
        </CardHeader>
        <CardContent>
          {workspace ? (
            <WorkspaceNameForm
              key={workspace.id}
              workspaceId={workspace.id}
              initialName={workspace.name}
              canEdit={isAdmin}
            />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </CardContent>
      </Card>

      {workspace ? (
        <WorkspaceDefaultAgreements slug={workspace.slug} workspaceId={workspace.id} />
      ) : (
        <Skeleton className="h-24 w-full" />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions for this workspace.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Deleting a workspace removes all of its data and members.'
              : 'Only workspace admins can delete this workspace.'}
          </span>
          {isAdmin && workspace ? (
            <DeleteWorkspaceButton workspaceId={workspace.id} workspaceName={workspace.name} />
          ) : (
            <Button variant="destructive" type="button" disabled>
              Delete workspace
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
