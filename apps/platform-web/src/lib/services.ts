/**
 * Service-documents API client (feature 38) — wraps the `/v1/services` facade. Workspace-scoped;
 * all calls carry the session cookie.
 *
 * Feature 217: a service is an AUTHORED document. Its title and description are GENERATED from the
 * current version's content, so both are nullable here; a version carries one `content` instead of
 * `data`, and it pins a `templateVersionId` rather than a document-type version. Gone with
 * `document_references`: the forms catalog, the reference and agreement-ref endpoints, and the
 * `applications` half of create and draft-save.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { Paginated, SortOrder } from '@/lib/list-search';

export type VersionStatus = 'draft' | 'published' | 'archived';

/** The `{ schema, uischema }` a renderer needs. */
export interface FormDefinition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

export interface Service {
  id: string;
  workspaceId: string;
  /** From the current version's generated title — null when its content carries no root label. */
  title: string | null;
  /** From the current version's generated description — null for a rich description. */
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceSummary extends Service {
  status: VersionStatus | 'none';
  versionCount: number;
  /** Whether the service has submissions — gates delete (none) vs archive. */
  hasSubmissions: boolean;
  /** Whether the latest version was ever published — un-archive reads "Publish" (true) vs "Restore". */
  latestPublished: boolean;
}

export interface ServiceVersion {
  id: string;
  documentId: string;
  /** The template version this version conforms to — selects its render template (feature 174). */
  templateVersionId: string | null;
  versionNumber: number;
  revision: number;
  status: VersionStatus;
  title: string | null;
  description: string | null;
  content: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface ServiceDetail {
  service: Service;
  versions: ServiceVersion[];
  /** The template for the current version (latest published, else latest). */
  definition: FormDefinition;
  /**
   * Every template the service's versions span, keyed by `templateVersionId` (feature 174). Read
   * surfaces must look up `definitions[version.templateVersionId]` so a version authored before a
   * template reshape renders against its OWN schema and uischema. Usually a single entry.
   */
  definitions: Record<string, FormDefinition>;
  /** Whether the service has submissions — gates delete vs archive. */
  hasSubmissions: boolean;
}

const BASE = `${BFF_ORIGIN}/v1/services`;

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { message?: unknown; errors?: unknown };
      if (typeof body.message === 'string') {
        message = body.message;
      }
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        message = `${message}: ${body.errors.join('; ')}`;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export type ServiceSort = 'title' | 'updated' | 'status';
export interface ServiceListParams {
  q: string;
  sort: ServiceSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

/** Paginated, sortable, searchable services list (initiative `staff-list-query`). */
export function servicesQueryOptions(workspaceId: string, params: ServiceListParams) {
  return queryOptions({
    queryKey: ['services', workspaceId, params] as const,
    queryFn: async () => {
      const search = new URLSearchParams({
        workspaceId,
        sort: params.sort,
        order: params.order,
        limit: String(params.limit),
        offset: String(params.offset),
      });
      if (params.q !== '') search.set('q', params.q);
      return ok<Paginated<ServiceSummary>>(
        await fetch(`${BASE}?${search.toString()}`, { credentials: 'include' }),
      );
    },
  });
}

export function serviceQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['services', 'detail', id] as const,
    queryFn: async () =>
      ok<ServiceDetail>(
        await fetch(`${BASE}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
    staleTime: 10_000,
  });
}

/**
 * The version a details URL resolves to: the one named in the path, else the published one, else
 * the LATEST one (features 174, 175).
 *
 * The latest-version fallback is what lets a service that has never been published still show its
 * content — otherwise a brand-new service's only page was an empty state until someone published
 * it. It mirrors how the API picks the detail response's `definition`, so the template and the
 * content can't disagree about which version is being shown.
 *
 * `undefined` only when the service has no versions at all, or the path names an unknown id.
 */
export function selectServiceVersion(
  versions: readonly ServiceVersion[],
  versionId?: string,
): ServiceVersion | undefined {
  if (versionId !== undefined) {
    return versions.find((version) => version.id === versionId);
  }
  // Versions arrive oldest-first, so the last entry is the newest.
  return versions.find((version) => version.status === 'published') ?? versions.at(-1);
}

/**
 * The template the selected version was authored under (feature 174) — looked up by the version's
 * `templateVersionId`, so a version predating a template reshape renders against its OWN schema and
 * uischema. Falls back to the detail's current `definition`, then to empty.
 */
export function definitionForServiceVersion(
  detail: ServiceDetail | undefined,
  versionId?: string,
): FormDefinition | undefined {
  if (detail === undefined) {
    return undefined;
  }
  const version = selectServiceVersion(detail.versions, versionId);
  if (version === undefined) {
    return undefined;
  }
  return (
    (version.templateVersionId === null
      ? undefined
      : detail.definitions[version.templateVersionId]) ?? detail.definition
  );
}

export function serviceDefinitionQueryOptions() {
  return queryOptions({
    queryKey: ['services', 'definition'] as const,
    queryFn: async () =>
      ok<FormDefinition>(await fetch(`${BASE}/definition`, { credentials: 'include' })),
    staleTime: 5 * 60_000,
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

/** Create a service — the document + its draft v1, seeded from the published Service template. */
export function createService(input: {
  workspaceId: string;
  title: string;
}): Promise<{ service: Service; versions: ServiceVersion[] }> {
  return send(BASE, 'POST', input);
}

/** Save a draft version's authored content. */
export function updateDraft(
  id: string,
  versionId: string,
  input: { content: FormDefinition },
): Promise<ServiceVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    input,
  );
}

export function publishVersion(id: string, versionId: string): Promise<ServiceVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/publish`,
    'POST',
  );
}

export function archiveVersion(id: string, versionId: string): Promise<ServiceVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/archive`,
    'POST',
  );
}

export function addServiceVersion(id: string): Promise<ServiceVersion> {
  return send(`${BASE}/${encodeURIComponent(id)}/versions`, 'POST');
}

/** Delete a service with no submissions (the server returns 409 otherwise → archive instead). */
export async function deleteService(id: string): Promise<void> {
  await noContent(`${BASE}/${encodeURIComponent(id)}`, 'DELETE');
}

/** Discard a draft version. Refuses the last remaining version — delete the service instead. */
export async function discardServiceVersion(id: string, versionId: string): Promise<void> {
  await noContent(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'DELETE',
  );
}

/** Archive a service (archives every non-archived version). */
export async function archiveService(id: string): Promise<void> {
  await noContent(`${BASE}/${encodeURIComponent(id)}/archive`, 'POST');
}

/** Reactivate an archived service (clears `archived_at` on its latest version). */
export async function reactivateService(id: string): Promise<void> {
  await noContent(`${BASE}/${encodeURIComponent(id)}/reactivate`, 'POST');
}

async function noContent(url: string, method: string): Promise<void> {
  const res = await fetch(url, { method, credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}
