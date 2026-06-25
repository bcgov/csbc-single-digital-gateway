import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/document-types')({
  component: DocumentTypesLayout,
});

function DocumentTypesLayout() {
  return <Outlet />;
}
