import { createFileRoute } from '@tanstack/react-router';
import { FormStudioPage } from '@/components/admin/pages/form-studio-page';

export const Route = createFileRoute('/admin/studio')({
  component: FormStudioPage,
});
