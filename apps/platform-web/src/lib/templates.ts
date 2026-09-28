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

/** Every type, in the order the console offers them. */
export const DOCUMENT_TYPES = Object.freeze(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]);

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

/**
 * Doc 227 (the doc 225 contract): what may be deleted, and why not. The API decides — the browser
 * cannot see which documents are built from a template — so the detail renders from this alone.
 */
export interface TemplateDeletable {
  template: boolean;
  /** Why the template may not go, ready to show. Absent exactly when `template` is true. */
  reason?: string;
  /** Versions deletable on their own — empty when there is only one. */
  versionIds: string[];
}

/** Admin detail: a template, every version, and what may be deleted. */
export interface AdminTemplateDetail extends TemplateWithVersions {
  deletable: TemplateDeletable;
}

const ADMIN = `${BFF_ORIGIN}/v1/admin/templates`;

/** The API's own message — a 409's reason is the whole point of refusing with one. */
async function errorFrom(res: Response): Promise<Error> {
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
  return new Error(message);
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

async function noContent(url: string, method: string): Promise<void> {
  const res = await fetch(url, { method, credentials: 'include' });
  if (!res.ok) throw await errorFrom(res);
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
      ok<AdminTemplateDetail>(
        await fetch(`${ADMIN}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
    staleTime: 30_000,
  });
}

/** Staff catalog entry: a template and its current published version (doc 228's picker). */
export interface PublishedTemplate {
  template: Template;
  published: TemplateVersion;
}

/** Every template with a published version — what a new document may be built from. */
export function publishedTemplatesQueryOptions() {
  return queryOptions({
    queryKey: ['templates', 'published'] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: PublishedTemplate[] }>(
        await fetch(`${BFF_ORIGIN}/v1/templates`, { credentials: 'include' }),
      );
      return envelope.items;
    },
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

/** Doc 227: a new global template — a draft v1 of the type's blank content, titled `title`. */
export function createTemplate(input: {
  type: DocumentType;
  title: string;
}): Promise<TemplateWithVersions> {
  return send(ADMIN, 'POST', input);
}

/** Doc 227: deletes the template. 409 with a reason while any document is built from it. */
export async function deleteTemplate(id: string): Promise<void> {
  await noContent(`${ADMIN}/${encodeURIComponent(id)}`, 'DELETE');
}

/** Doc 227: deletes ONE version, of any status — never the last, never one a document is based on. */
export async function deleteTemplateVersion(id: string, versionId: string): Promise<void> {
  await noContent(
    `${ADMIN}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'DELETE',
  );
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
