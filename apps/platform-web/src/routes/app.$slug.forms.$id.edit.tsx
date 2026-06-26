import { createFileRoute } from '@tanstack/react-router';
import { FormBuilderEditPage } from '@/components/console/pages/form-builder-page';

export const Route = createFileRoute('/app/$slug/forms/$id/edit')({
  component: FormBuilderEditPage,
});
