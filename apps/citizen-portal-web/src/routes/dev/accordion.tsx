import { createFileRoute } from '@tanstack/react-router';
import { AccordionReferencePage } from '@/components/dev/accordion-reference-page';

export const Route = createFileRoute('/dev/accordion')({
  component: AccordionReferencePage,
});
