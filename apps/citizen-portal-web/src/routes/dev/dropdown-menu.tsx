import { createFileRoute } from '@tanstack/react-router';
import { DropdownMenuReferencePage } from '@/components/dev/dropdown-menu-reference-page';

export const Route = createFileRoute('/dev/dropdown-menu')({
  component: DropdownMenuReferencePage,
});
