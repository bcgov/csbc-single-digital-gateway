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
  /** From the current version's GENERATED title — null when its content carries no root label. */
  title: string | null;
  type: 'services.service-agreement';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAgreementSummary extends ServiceAgreement {
  status: VersionStatus | 'none';
  isGlobal: boolean;
}

export interface ServiceAgreementVersion {
  id: string;
  versionNumber: number;
  revision: number;
  status: VersionStatus;
  /** GENERATED from `content`; null when its root carries no label. */
  title: string | null;
  /** GENERATED from `content`; null for a rich (Lexical) description. */
  description: string | null;
  content: Record<string, unknown>;
  /**
   * Doc 221: the template version this version is PINNED to (doc 217). Look its template up in
   * `definitions[templateVersionId]` — a version authored before a template reshape must render
   * against the template it was authored under, not whichever one is published now.
   */
  templateVersionId: string | null;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

/**
 * Feature 217 dropped `services` (which services this agreement is attached to): it came from
 * `document_references`, and linking documents is a later feature.
 */
export interface AgreementDefinition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
  /** Doc 220/221: what a consuming document's owner may do. Absent means the template governs nothing. */
  capabilities?: Record<string, unknown>;
}

export interface ServiceAgreementDetail {
  agreement: ServiceAgreement;
  versions: ServiceAgreementVersion[];
  /**
   * Doc 221: the template of every version, keyed by `templateVersionId` — feature 174's shape. A
   * surface MUST look up `definitions[version.templateVersionId]`, never assume one template.
   */
  definitions: Record<string, AgreementDefinition>;
  /**
   * Doc 225 rule 7: what may be deleted, and why not.
   *
   * The API decides. Deletability turns on recorded consents and on workspace defaults, neither of
   * which the browser can see, so a console working it out from `versions` would be guessing — and
   * would guess differently from the endpoint that refuses.
   */
  deletable: {
    agreement: boolean;
    /** Why the agreement may not go, ready to show. Absent exactly when `agreement` is true. */
    reason?: string;
    /** Versions deletable on their own — empty when there is only one (rule 4). */
    versionIds: string[];
  };
}

const BASE = `${BFF_ORIGIN}/v1/service-agreements`;

/**
 * The server's own message for a failed response, falling back to the status.
 *
 * Doc 225 leans on this: a refused delete answers 409 with WHY ("someone has already consented…",
 * "this agreement is a default for Health…"), and that sentence is the entire value of the refusal.
 * `services.ts`'s `noContent` throws `Request failed: 409` instead, which is why this is shared here
 * rather than copied from there.
 */
async function errorFrom(res: Response): Promise<Error> {
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
  return new Error(message);
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

/** A 204 response: no body to parse, but a failure still carries its reason. */
async function noContent(url: string, method: string): Promise<void> {
  const res = await fetch(url, { method, credentials: 'include' });
  if (!res.ok) throw await errorFrom(res);
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
  title: string;
  /** Doc 228: the template to build from. */
  templateId?: string;
}): Promise<{ agreement: ServiceAgreement; version: ServiceAgreementVersion }> {
  return send(BASE, 'POST', input);
}

export function updateAgreementDraft(
  id: string,
  versionId: string,
  input: { content: Record<string, unknown> },
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
/** Doc 225: deletes the whole agreement. 409 with a reason when something is in the way. */
export async function deleteAgreement(id: string): Promise<void> {
  await noContent(`${BASE}/${encodeURIComponent(id)}`, 'DELETE');
}

/** Doc 225: deletes ONE version — never the last, never a consented one. */
export async function deleteAgreementVersion(id: string, versionId: string): Promise<void> {
  await noContent(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'DELETE',
  );
}

export interface DefaultAgreement {
  id: string;
  agreementDocumentId: string;
  /** From the agreement version's GENERATED title — null when it carries no root label. */
  title: string | null;
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
