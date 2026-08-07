import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceSelectionPage } from '@/components/console/pages/workspace-selection';

// No auto-redirect (feature 161): `/app` is the explicit workspace selection page. Authentication is
// still enforced by the parent `/app` route's beforeLoad.
export const Route = createFileRoute('/app/')({
  component: WorkspaceSelectionPage,
});
