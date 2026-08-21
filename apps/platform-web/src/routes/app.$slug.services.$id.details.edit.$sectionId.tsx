import { createFileRoute } from '@tanstack/react-router';
import { SectionEditPage } from '@/components/console/services/section-edit/section-edit-page';

/**
 * `…/services/:id/details/edit/:sectionId` — the canonical (non-permalink) section editor.
 *
 * Same page as the version permalink, with no `versionId` in the path, so
 * `selectServiceVersion(versions, undefined)` resolves published-else-newest. A service whose only
 * version is a draft is therefore editable from here; once a version is published this URL resolves
 * to it and the page refuses the edit, exactly as the permalink does for a non-draft.
 *
 * Sibling of the `_console` shell, so it renders sidebar-free like its permalink twin.
 */
export const Route = createFileRoute('/app/$slug/services/$id/details/edit/$sectionId')({
  component: SectionEditPage,
});
