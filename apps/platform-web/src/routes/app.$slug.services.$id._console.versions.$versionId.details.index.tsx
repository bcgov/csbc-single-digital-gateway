import { createFileRoute } from '@tanstack/react-router';

/** The bare `…/versions/$versionId/details` leaf. The page itself renders in the parent layout, so
 * this route contributes nothing beyond matching the path (the editor is the sibling `edit` leaf). */
export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details/',
)({});
