import { createFileRoute } from '@tanstack/react-router';
import { CardsReferencePage } from '@/components/dev/cards-reference-page';

export const Route = createFileRoute('/dev/cards')({
  component: CardsReferencePage,
});
