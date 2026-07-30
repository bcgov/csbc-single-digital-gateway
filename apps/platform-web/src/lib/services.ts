/**
 * Service-documents API client (feature 38) — wraps the `/v1/services` facade. Workspace-scoped;
 * all calls carry the session cookie.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { Paginated, SortOrder } from '@/lib/list-search';

export type VersionStatus = 'draft' | 'published' | 'archived';

export interface Service {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceSummary extends Service {
  status: VersionStatus | 'none';
  versionCount: number;
  /** Whether any of the service's application forms has submissions — gates delete (none) vs archive. */
  hasSubmissions: boolean;
  /** Whether the latest version was ever published — un-archive reads "Publish" (true) vs "Restore". */
  latestPublished: boolean;
}

export interface ServiceVersion {
  id: string;
  documentId: string;
  version: number;
  status: VersionStatus;
  data: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface ServiceDetail {
  service: Service;
  versions: ServiceVersion[];
  definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
  /** Whether any of the service's application forms has submissions — gates delete vs archive. */
  hasSubmissions: boolean;
}

export interface FormCatalogEntry {
  documentId: string;
  versionId: string;
  title: string;
  kind: string;
}

export interface ServiceReference {
  id: string;
  relation: 'related_service' | 'application_form' | 'external_application';
  position: number;
  label: string | null;
  /** For an `external_application` reference, the external https destination; null for forms. */
  url: string | null;
  targetDocumentId: string;
  targetVersionId: string;
  targetKind: string;
  targetTitle: string;
  targetVersion: number;
  /** Target form version status (draft/published/archived). */
  targetStatus: string;
  /** Whether the target form has submissions — gates delete (none) vs archive (some). */
  hasSubmissions: boolean;
  /** Whether the target form has authored structure (fields/stages/pages) — gates service publish. */
  hasStructure: boolean;
  createdAt: string;
}

/** A JSONForms definition authored by the form builder. */
export interface FormDefinition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

/** An application as sent to the composite create/update endpoints. */
export type ApplicationInput = {
  id?: string;
  label: string;
  position: number;
  form:
    | { mode: 'existing'; versionId: string }
    // `definition` = designed blob: `{schema,uischema}` (basic) or `{stages,edges}` (multi-stage).
    | { mode: 'new'; typeId: string; title: string; definition?: object };
};

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

export function serviceDefinitionQueryOptions() {
  return queryOptions({
    queryKey: ['services', 'definition'] as const,
    queryFn: async () =>
      ok<{ schema: Record<string, unknown>; uischema: Record<string, unknown> }>(
        await fetch(`${BASE}/definition`, { credentials: 'include' }),
      ),
    staleTime: 5 * 60_000,
  });
}

export interface FormType {
  typeId: string;
  name: string;
  kind: string;
}

/** The published form document types (basic-form / multi-stage-form) — for creating a new form inline. */
export function formTypesQueryOptions() {
  return queryOptions({
    queryKey: ['document-types', 'forms'] as const,
    queryFn: async () => {
      const envelope = await ok<{
        items: Array<{ type: { id: string; name: string; kind: string } }>;
      }>(await fetch(`${BFF_ORIGIN}/v1/document-types`, { credentials: 'include' }));
      return envelope.items
        .map((item) => ({ typeId: item.type.id, name: item.type.name, kind: item.type.kind }))
        .filter((type) => type.kind === 'basic-form' || type.kind === 'multi-stage-form');
    },
    staleTime: 5 * 60_000,
  });
}

export function formsCatalogQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ['services', 'forms', workspaceId] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: FormCatalogEntry[] }>(
        await fetch(`${BASE}/forms?workspaceId=${encodeURIComponent(workspaceId)}`, {
          credentials: 'include',
        }),
      );
      return envelope.items;
    },
  });
}

export function serviceReferencesQueryOptions(id: string, versionId: string) {
  return queryOptions({
    queryKey: ['services', 'detail', id, 'references', versionId] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: ServiceReference[] }>(
        await fetch(
          `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/references`,
          { credentials: 'include' },
        ),
      );
      return envelope.items;
    },
    staleTime: 10_000,
  });
}

export interface ServiceAgreementRef {
  id: string;
  /** Document-only pointer — the agreement resolves its current published version server-side. */
  agreementDocumentId: string;
  title: string;
  isOptional: boolean;
  isGlobal: boolean;
  position: number;
  createdAt: string;
}

/** The service agreements attached to a service version (feature 86). */
export function serviceAgreementRefsQueryOptions(id: string, versionId: string) {
  return queryOptions({
    queryKey: ['services', 'detail', id, 'agreements', versionId] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: ServiceAgreementRef[] }>(
        await fetch(
          `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/agreements`,
          { credentials: 'include' },
        ),
      );
      return envelope.items;
    },
    staleTime: 10_000,
  });
}

export function attachServiceAgreement(
  id: string,
  versionId: string,
  agreementDocumentId: string,
): Promise<ServiceAgreementRef> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/agreements`,
    'POST',
    { agreementDocumentId },
  );
}

export async function detachServiceAgreement(
  id: string,
  versionId: string,
  referenceId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/agreements/${encodeURIComponent(referenceId)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
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

/** Composite create — service + draft v1 data + applications (inline forms + references), atomic. */
export function createService(input: {
  workspaceId: string;
  title: string;
  data: Record<string, unknown>;
  applications: ApplicationInput[];
}): Promise<{ service: Service; versions: ServiceVersion[] }> {
  return send(BASE, 'POST', input);
}

/** Composite draft save — data + title + reconciled application references. */
export function updateDraft(
  id: string,
  versionId: string,
  input: {
    data: Record<string, unknown>;
    title?: string;
    applications?: ApplicationInput[];
    /** Ordered application-method reference ids — repositions them on save (feature 132). */
    applicationOrder?: string[];
  },
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

/** Delete a service with no application methods (server returns 409 if it has any → archive instead). */
export async function deleteService(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

/** Discard a draft version (deletes it + its application forms). */
export async function discardServiceVersion(id: string, versionId: string): Promise<void> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

/** Archive a service (archives all its versions). */
export async function archiveService(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

/** Reactivate an archived service (restores its latest version + that version's forms). */
export async function reactivateService(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}/reactivate`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

/** Create a new form (of `typeId`, with an optional designed `definition`) AND reference it from a
 * service draft version — the "Add application method" route flow (feature 44). */
export function createReferencedForm(
  id: string,
  versionId: string,
  input: { typeId: string; title: string; label?: string; definition?: object },
): Promise<ServiceReference> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/forms`,
    'POST',
    input,
  );
}

/** Create an external application method (a labelled https link) on a service draft version and
 * reference it — the External-link "Add application method" flow (feature 131). */
export function createExternalApplication(
  id: string,
  versionId: string,
  input: { label: string; url: string },
): Promise<ServiceReference> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/external-applications`,
    'POST',
    input,
  );
}

/** Edit an external application method's label + url (draft version only). */
export function updateExternalApplication(
  id: string,
  versionId: string,
  referenceId: string,
  input: { label: string; url: string },
): Promise<ServiceReference> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/external-applications/${encodeURIComponent(referenceId)}`,
    'PATCH',
    input,
  );
}

/** Remove an application method from a service draft version. The form is deleted with its last
 * reference when it has no submissions; the server returns 409 when it does (archive instead). */
export async function removeReference(
  id: string,
  versionId: string,
  referenceId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/references/${encodeURIComponent(referenceId)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}

/** Archive an application-method form (for forms with submissions that can't be deleted). */
export async function archiveReference(
  id: string,
  versionId: string,
  referenceId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/references/${encodeURIComponent(referenceId)}/archive`,
    { method: 'POST', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
}
