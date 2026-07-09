import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/$slug/service-agreements')({
  component: ServiceAgreementsLayout,
});

function ServiceAgreementsLayout() {
  return <Outlet />;
}
