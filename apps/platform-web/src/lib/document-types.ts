/**
 * Admin document-types API client (feature 36) — wraps the feature-35 `/v1/admin/document-types`
 * endpoints. All calls go to the BFF origin with the session cookie.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

export type DocumentKind = 'basic-form' | 'multi-stage-form';
export type VersionStatus = 'draft' | 'published' | 'archived';

export interface DocumentType {
  id: string;
  workspaceId: string | null;
  name: string;
  kind: string;
  createdAt: string;
}

export interface DocumentTypeVersion {
  id: string;
  typeId: string;
  version: number;
  status: VersionStatus;
  definition: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface DocumentTypeWithVersions {
  type: DocumentType;
  versions: DocumentTypeVersion[];
}

const ADMIN = `${BFF_ORIGIN}/v1/admin/document-types`;

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string') {
        message = body.message;
      } else if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function adminDocumentTypesQueryOptions() {
  return queryOptions({
    queryKey: ['admin', 'document-types'] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: DocumentTypeWithVersions[] }>(
        await fetch(ADMIN, { credentials: 'include' }),
      );
      return envelope.items;
    },
    staleTime: 30_000,
  });
}

export function adminDocumentTypeQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['admin', 'document-types', id] as const,
    queryFn: async () =>
      ok<DocumentTypeWithVersions>(
        await fetch(`${ADMIN}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
    staleTime: 30_000,
  });
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  return ok<T>(
    await fetch(url, {
      method,
      credentials: 'include',
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    }),
  );
}

export function addVersion(
  id: string,
  definition: Record<string, unknown>,
): Promise<DocumentTypeVersion> {
  return send(`${ADMIN}/${encodeURIComponent(id)}/versions`, 'POST', { definition });
}

export function editDraft(
  id: string,
  versionId: string,
  definition: Record<string, unknown>,
): Promise<DocumentTypeVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    {
      definition,
    },
  );
}

export async function deleteDraft(id: string, versionId: string): Promise<void> {
  const res = await fetch(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

export function publishVersion(id: string, versionId: string): Promise<DocumentTypeVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/publish`,
    'POST',
  );
}

export function archiveVersion(id: string, versionId: string): Promise<DocumentTypeVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/archive`,
    'POST',
  );
}
