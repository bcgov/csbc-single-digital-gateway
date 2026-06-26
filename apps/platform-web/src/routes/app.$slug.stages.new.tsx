import { createFileRoute } from '@tanstack/react-router';
import { StageBuilderCreatePage } from '@/components/console/pages/stage-builder-page';

export const Route = createFileRoute('/app/$slug/stages/new')({
  validateSearch: (search: Record<string, unknown>): { typeId?: string } =>
    typeof search.typeId === 'string' ? { typeId: search.typeId } : {},
  component: StageBuilderCreatePage,
});
