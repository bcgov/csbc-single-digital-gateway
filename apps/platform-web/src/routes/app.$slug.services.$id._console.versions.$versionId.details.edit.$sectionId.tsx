import { createFileRoute } from '@tanstack/react-router';
import { SectionEditDialog } from '@/components/console/services/section-edit/section-edit-dialog';

export const Route = createFileRoute(
  '/app/$slug/services/$id/_console/versions/$versionId/details/edit/$sectionId',
)({
  component: SectionEditDialog,
});
