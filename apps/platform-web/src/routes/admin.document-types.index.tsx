import { createFileRoute } from '@tanstack/react-router';
import { AdminDocumentTypesList } from '@/components/admin/document-types/admin-document-types-list';

export const Route = createFileRoute('/admin/document-types/')({
  component: AdminDocumentTypesList,
});
