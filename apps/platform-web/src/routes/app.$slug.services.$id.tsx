import { Outlet, createFileRoute } from '@tanstack/react-router';

/** Service-detail layout: the detail content lives at the index; builder children replace it. */
export const Route = createFileRoute('/app/$slug/services/$id')({
  component: Outlet,
});
