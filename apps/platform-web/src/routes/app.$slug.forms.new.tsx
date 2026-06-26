import { createFileRoute } from '@tanstack/react-router';
import { FormBuilderCreatePage } from '@/components/console/pages/form-builder-page';

export const Route = createFileRoute('/app/$slug/forms/new')({
  validateSearch: (search: Record<string, unknown>): { typeId?: string } =>
    typeof search.typeId === 'string' ? { typeId: search.typeId } : {},
  component: FormBuilderCreatePage,
});
