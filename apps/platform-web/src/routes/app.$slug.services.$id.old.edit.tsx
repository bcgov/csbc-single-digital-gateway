import { Outlet, createFileRoute } from '@tanstack/react-router';

/** `…/services/:id/edit` — the reference editor subtree (feature 164). Sibling of the `_console`
 * shell, so it renders the tabbed `ServiceDetail` editor without the section sidebar. */
export const Route = createFileRoute('/app/$slug/services/$id/old/edit')({
  component: Outlet,
});
