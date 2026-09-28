/**
 * Admin templates API client — wraps the `/v1/admin/templates` endpoints. All calls go to the BFF
 * origin with the session cookie.
 *
 * Feature 217 replaced document TYPES with templates: a template is a `documents` row with
 * `kind = 'template'`, so a template version is an ordinary document version whose `definition` is
 * now `content`, and whose title/description are GENERATED from it.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

/**
 * Mirrors `@repo/database`'s `DOCUMENT_TYPES` (doc 226). platform-web never imports the database
 * package, so this union is restated; the API's `documentTypeSchema` is the authority.
 */
export type DocumentType =
  | 'services.service'
  | 'services.service-application-method'
  | 'services.service-agreement';

const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = Object.freeze({
  'services.service': 'Service',
  'services.service-application-method': 'Application method',
  'services.service-agreement': 'Service agreement',
});

/** What the console shows for a type — never the raw value. An unknown value shows as itself. */
export function documentTypeLabel(type: string): string {
  return Object.hasOwn(DOCUMENT_TYPE_LABELS, type)
    ? DOCUMENT_TYPE_LABELS[type as DocumentType]
    : type;
}
export type VersionStatus = 'draft' | 'published' | 'archived';

export interface Template {
  id: string;
  workspaceId: string | null;
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  revision: number;
  status: VersionStatus;
  /** GENERATED from `content` — null when its root carries no label. */
  title: string | null;
  /** GENERATED from `content` — null for a rich (Lexical) description. */
  description: string | null;
  content: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface TemplateWithVersions {
  template: Template;
  versions: TemplateVersion[];
}

const ADMIN = `${BFF_ORIGIN}/v1/admin/templates`;

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

export function adminTemplatesQueryOptions() {
  return queryOptions({
    queryKey: ['admin', 'templates'] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: TemplateWithVersions[] }>(
        await fetch(ADMIN, { credentials: 'include' }),
      );
      return envelope.items;
    },
    staleTime: 30_000,
  });
}

export function adminTemplateQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['admin', 'templates', id] as const,
    queryFn: async () =>
      ok<TemplateWithVersions>(
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

export function addVersion(id: string, content: Record<string, unknown>): Promise<TemplateVersion> {
  return send(`${ADMIN}/${encodeURIComponent(id)}/versions`, 'POST', { content });
}

export function editDraft(
  id: string,
  versionId: string,
  content: Record<string, unknown>,
): Promise<TemplateVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    { content },
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

export function publishVersion(id: string, versionId: string): Promise<TemplateVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/publish`,
    'POST',
  );
}

export function archiveVersion(id: string, versionId: string): Promise<TemplateVersion> {
  return send(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/archive`,
    'POST',
  );
}
