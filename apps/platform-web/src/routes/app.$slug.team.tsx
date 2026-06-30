import { Outlet, createFileRoute } from '@tanstack/react-router';

/** Team layout: the member list lives at the index; the member profile replaces it. */
export const Route = createFileRoute('/app/$slug/team')({
  component: Outlet,
});
