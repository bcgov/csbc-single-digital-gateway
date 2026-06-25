import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/$slug/services')({
  component: ServicesLayout,
});

function ServicesLayout() {
  return <Outlet />;
}
