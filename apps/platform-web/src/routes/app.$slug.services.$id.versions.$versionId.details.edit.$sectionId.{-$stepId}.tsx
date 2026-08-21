import { createFileRoute } from '@tanstack/react-router';
import { SectionEditPage } from '@/components/console/services/section-edit/section-edit-page';

/**
 * `…/services/:id/versions/:versionId/details/edit/:sectionId` — the section editor.
 *
 * Deliberately a SIBLING of the `_console` shell (feature 176): `_console` is pathless, so the URL
 * is unchanged, but the page renders without the service sidebar.
 *
 * `{-$stepId}` is OPTIONAL (feature 177) — see the canonical route for why.
 */
export const Route = createFileRoute(
  '/app/$slug/services/$id/versions/$versionId/details/edit/$sectionId/{-$stepId}',
)({
  component: SectionEditPage,
});
