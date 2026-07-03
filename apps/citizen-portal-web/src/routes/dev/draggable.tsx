import { createFileRoute } from '@tanstack/react-router';
import { DraggableReferencePage } from '@/components/dev/draggable-reference-page';

export const Route = createFileRoute('/dev/draggable')({
  component: DraggableReferencePage,
});
