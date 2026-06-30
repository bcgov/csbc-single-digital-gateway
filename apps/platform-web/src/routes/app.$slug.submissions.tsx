import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/$slug/submissions')({
  component: SubmissionsLayout,
});

function SubmissionsLayout() {
  return <Outlet />;
}
