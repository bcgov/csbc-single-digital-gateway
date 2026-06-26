import { createFileRoute } from '@tanstack/react-router';
import { StageBuilderEditPage } from '@/components/console/pages/stage-builder-page';

export const Route = createFileRoute('/app/$slug/stages/$id/edit')({
  component: StageBuilderEditPage,
});
