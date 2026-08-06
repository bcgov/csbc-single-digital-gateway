import { createFileRoute } from '@tanstack/react-router';
import { DialogReferencePage } from '@/components/dev/dialog-reference-page';

export const Route = createFileRoute('/dev/dialog')({
  component: DialogReferencePage,
});
