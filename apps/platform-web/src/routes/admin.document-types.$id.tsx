import { createFileRoute } from '@tanstack/react-router';
import { AdminDocumentTypeDetail } from '@/components/admin/document-types/admin-document-type-detail';

export const Route = createFileRoute('/admin/document-types/$id')({
  component: AdminDocumentTypeDetail,
});
