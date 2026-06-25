import { createFileRoute } from '@tanstack/react-router';
import { AdminDocumentTypes } from '@/components/admin/pages/admin-document-types';

export const Route = createFileRoute('/admin/document-types')({
  component: AdminDocumentTypes,
});
