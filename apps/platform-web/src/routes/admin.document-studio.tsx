import {
  DOCUMENT_KINDS,
  DOCUMENT_TYPES,
  DocumentStudio,
  type DocumentKind,
  type DocumentType,
} from '@repo/documents/studio';
import { createFileRoute } from '@tanstack/react-router';

/** `/admin/document-studio?documentId&versionId&kind&type` — what the studio opens or preconfigures. */
export interface DocumentStudioSearch {
  documentId?: string;
  versionId?: string;
  kind?: DocumentKind;
  type?: DocumentType;
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value !== '';
const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  (values as readonly unknown[]).includes(value);

/** Keeps only well-formed keys; an absent or invalid one is omitted (`exactOptionalPropertyTypes`). */
export function validateDocumentStudioSearch(
  search: Record<string, unknown>,
): DocumentStudioSearch {
  const { documentId, versionId, kind, type } = search;
  return {
    ...(nonEmpty(documentId) && { documentId }),
    ...(nonEmpty(versionId) && { versionId }),
    ...(oneOf(DOCUMENT_KINDS, kind) && { kind }),
    ...(oneOf(DOCUMENT_TYPES, type) && { type }),
  };
}

/**
 * Spike host for `@repo/documents`' DocumentStudio. Sized like `/admin/studio`: the admin layout's `<main>`
 * has a definite height, so the frame's `h-full` resolves. A save puts the saved version in the URL, so a
 * new document survives a reload (the stub store keeps it in this browser).
 */
function DocumentStudioRoute() {
  const { documentId, versionId, kind, type } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div data-slot="document-studio-frame" className="h-full border bg-background">
      <DocumentStudio
        documentId={documentId}
        versionId={versionId}
        kind={kind}
        type={type}
        onSaved={(ref) => navigate({ search: ref, replace: true })}
        // Doc 281: the spike fills its canvas too — the browser stub store keeps `content.data`.
        fillable
      />
    </div>
  );
}

export const Route = createFileRoute('/admin/document-studio')({
  validateSearch: validateDocumentStudioSearch,
  component: DocumentStudioRoute,
});
