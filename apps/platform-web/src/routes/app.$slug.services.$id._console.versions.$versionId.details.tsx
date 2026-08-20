import { createFileRoute } from '@tanstack/react-router';
import { ServiceDetailsPage } from '@/components/console/services/service-details-page';

/** A specific service version's details (feature 174) — the same page as `…/details`, pinned to the
 * `$versionId` in the path (which may be a draft or an archived version). Inside the `_console`
 * shell. The page reads `versionId` from the route params itself, so this file exports only `Route`. */
export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details',
)({
  component: ServiceDetailsPage,
});
