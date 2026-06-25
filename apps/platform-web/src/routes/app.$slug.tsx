import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';
import { WorkspaceNotFound } from '@/components/console/workspace-not-found';
import { workspaceBySlugQueryOptions } from '@/lib/workspaces';

export const Route = createFileRoute('/app/$slug')({
  // Load the workspace by slug; a 404 (deleted / not a member) renders the not-found state.
  loader: async ({ context, params }) => {
    const workspace = await context.queryClient.ensureQueryData(
      workspaceBySlugQueryOptions(params.slug),
    );
    if (!workspace) {
      throw notFound();
    }
    return { workspace };
  },
  notFoundComponent: WorkspaceNotFound,
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return <Outlet />;
}
