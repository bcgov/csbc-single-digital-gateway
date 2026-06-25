import { createFileRoute, redirect } from '@tanstack/react-router';
import { CreateWorkspaceModal } from '@/components/console/create-workspace-modal';
import { newestWorkspaceQueryOptions } from '@/lib/workspaces';

export const Route = createFileRoute('/app/')({
  // Onboarding gate: with ≥1 workspace, redirect to the most recently created one; otherwise the
  // component below forces workspace creation.
  beforeLoad: async ({ context }) => {
    const newest = await context.queryClient.ensureQueryData(newestWorkspaceQueryOptions());
    if (newest) {
      throw redirect({ to: '/app/$slug', params: { slug: newest.slug } });
    }
  },
  component: WorkspaceGate,
});

function WorkspaceGate() {
  return <CreateWorkspaceModal dismissable={false} />;
}
