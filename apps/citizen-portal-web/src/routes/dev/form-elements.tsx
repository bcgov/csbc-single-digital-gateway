import { createFileRoute } from '@tanstack/react-router';
import { FormElementsReferencePage } from '@/components/dev/form-elements-reference-page';

export const Route = createFileRoute('/dev/form-elements')({
  component: FormElementsReferencePage,
});
