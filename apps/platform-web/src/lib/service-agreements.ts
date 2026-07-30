/**
 * Service Agreements API client (feature 83) — wraps the `/v1/service-agreements` facade. Staff
 * author workspace-scoped agreements (pass `workspaceId`); admins author global ones (omit it).
 * All calls carry the session cookie.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { Paginated, SortOrder } from '@/lib/list-search';

export type VersionStatus = 'draft' | 'published' | 'archived';

export interface ServiceAgreement {
  id: string;
  /** Null for a global (admin-authored) agreement. */
  workspaceId: string | null;
  title: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAgreementSummary extends ServiceAgreement {
  status: VersionStatus | 'none';
  isGlobal: boolean;
}

export interface ServiceAgreementVersion {
  id: string;
  version: number;
  status: VersionStatus;
  data: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

/** A service this agreement is attached to (agreements may be attached to many services). */
export interface AssociatedService {
  id: string;
  title: string;
  workspaceSlug: string;
}

export interface ServiceAgreementDetail {
  agreement: ServiceAgreement;
  versions: ServiceAgreementVersion[];
  definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
  services: AssociatedService[];
}

const BASE = `${BFF_ORIGIN}/v1/service-agreements`;

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

/** List: a workspace's agreements + global ones (staff), or global only (admin, no workspaceId).
 * Full (unpaginated) set — feeds the attach/default pickers, which need workspace + global. */
export function agreementsQueryOptions(workspaceId: string | null) {
  const suffix = workspaceId === null ? '' : `?workspaceId=${encodeURIComponent(workspaceId)}`;
  return queryOptions({
    queryKey: ['service-agreements', workspaceId ?? 'global'] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: ServiceAgreementSummary[] }>(
        await fetch(`${BASE}${suffix}`, { credentials: 'include' }),
      );
      return envelope.items;
    },
  });
}

export type AgreementSort = 'title' | 'updated' | 'status';
export interface AgreementListParams {
  q: string;
  sort: AgreementSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

/** Paginated, sortable, searchable agreements browse (initiative `staff-list-query`). Workspace scope
 * lists the workspace's OWN agreements only (globals excluded, feature 150); `null` = admin/global. */
export function agreementsPageQueryOptions(
  workspaceId: string | null,
  params: AgreementListParams,
) {
  return queryOptions({
    queryKey: ['service-agreements', 'page', workspaceId ?? 'global', params] as const,
    queryFn: async () => {
      const search = new URLSearchParams({
        sort: params.sort,
        order: params.order,
        limit: String(params.limit),
        offset: String(params.offset),
      });
      if (workspaceId !== null) search.set('workspaceId', workspaceId);
      if (params.q !== '') search.set('q', params.q);
      return ok<Paginated<ServiceAgreementSummary>>(
        await fetch(`${BASE}/page?${search.toString()}`, { credentials: 'include' }),
      );
    },
  });
}

export function agreementQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['service-agreements', 'detail', id] as const,
    queryFn: async () =>
      ok<ServiceAgreementDetail>(
        await fetch(`${BASE}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
    staleTime: 10_000,
  });
}

export function createAgreement(input: {
  workspaceId?: string;
  data: Record<string, unknown>;
}): Promise<{ agreement: ServiceAgreement; version: ServiceAgreementVersion }> {
  return send(BASE, 'POST', input);
}

export function updateAgreementDraft(
  id: string,
  versionId: string,
  input: { data: Record<string, unknown>; title?: string },
): Promise<ServiceAgreementVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    input,
  );
}

export function addAgreementVersion(id: string): Promise<ServiceAgreementVersion> {
  return send(`${BASE}/${encodeURIComponent(id)}/versions`, 'POST');
}

export function publishAgreementVersion(
  id: string,
  versionId: string,
): Promise<ServiceAgreementVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/publish`,
    'POST',
  );
}

// ── Workspace default agreements (feature 96/98) ────────────────────────────────────────────────

/** A workspace's default service agreement, resolved to its current published version. */
export interface DefaultAgreement {
  id: string;
  agreementDocumentId: string;
  title: string;
  isOptional: boolean;
  isGlobal: boolean;
  createdAt: string;
}

const defaultsUrl = (workspaceId: string) =>
  `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/default-agreements`;

/** The workspace's default agreements (member-read). */
export function workspaceDefaultAgreementsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ['workspace-default-agreements', workspaceId] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: DefaultAgreement[] }>(
        await fetch(defaultsUrl(workspaceId), { credentials: 'include' }),
      );
      return envelope.items;
    },
    enabled: workspaceId !== '',
    staleTime: 10_000,
  });
}

/** Add a published agreement (workspace or global) as a workspace default (admin). */
export function addDefaultAgreement(
  workspaceId: string,
  agreementDocumentId: string,
): Promise<DefaultAgreement> {
  return send(defaultsUrl(workspaceId), 'POST', { agreementDocumentId });
}

/** Remove a workspace default (admin). */
export async function removeDefaultAgreement(workspaceId: string, id: string): Promise<void> {
  const res = await fetch(`${defaultsUrl(workspaceId)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Remove default failed: ${res.status}`);
  }
}
