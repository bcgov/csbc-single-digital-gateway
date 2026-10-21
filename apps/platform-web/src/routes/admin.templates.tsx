import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/templates')({
  component: TemplatesLayout,
});

function TemplatesLayout() {
  return <Outlet />;
}
