/**
 * Service-documents API client (feature 38) — wraps the `/v1/services` facade. Workspace-scoped;
 * all calls carry the session cookie.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

export type VersionStatus = 'draft' | 'published' | 'archived';

export interface Service {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface ServiceSummary extends Service {
  status: VersionStatus | 'none';
  versionCount: number;
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

export function servicesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ['services', workspaceId] as const,
    queryFn: async () => {
      const envelope = await ok<{ items: ServiceSummary[] }>(
        await fetch(`${BASE}?workspaceId=${encodeURIComponent(workspaceId)}`, {
          credentials: 'include',
        }),
      );
      return envelope.items;
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

export function createService(input: {
  workspaceId: string;
  title: string;
}): Promise<{ service: Service; versions: ServiceVersion[] }> {
  return send(BASE, 'POST', input);
}

export function updateDraft(
  id: string,
  versionId: string,
  data: Record<string, unknown>,
): Promise<ServiceVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    { data },
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
