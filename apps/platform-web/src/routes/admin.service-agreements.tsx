import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/service-agreements')({
  component: AdminServiceAgreementsLayout,
});

function AdminServiceAgreementsLayout() {
  return <Outlet />;
}
