import { createFileRoute } from '@tanstack/react-router';
import { ButtonReferencePage } from '@/components/dev/button-reference-page';

export const Route = createFileRoute('/dev/button')({
  component: ButtonReferencePage,
});
