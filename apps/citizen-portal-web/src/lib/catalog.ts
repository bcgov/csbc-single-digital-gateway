/**
 * Browser client + TanStack Query options for the citizen service catalog (feature 60). Talks to
 * the citizen-portal-api catalog endpoints (`/v1/services`, `/v1/me/applications`) on the same BFF
 * origin as the auth calls. The catalog is workspace-free — nothing here references a workspace.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

/** A catalog service card — id + title + description, no workspace. */
export interface CatalogService {
  id: string;
  title: string;
  description: string;
}

/** A service detail — the card fields + its current published version. */
export interface CatalogServiceDetail extends CatalogService {
  publishedVersionId: string;
  version: number;
  publishedAt: string | null;
  data: Record<string, unknown>;
}

/** A historical service version (published or archived). */
export interface CatalogServiceVersion {
  id: string;
  serviceId: string;
  version: number;
  status: 'published' | 'archived';
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

/** Submission-workflow status, mirrored from the API. */
export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'withdrawn';

/** One of the signed-in citizen's applications. */
export interface MyApplication {
  id: string;
  serviceId: string;
  serviceVersionId: string;
  serviceTitle: string;
  reference: string;
  status: ApplicationStatus;
  statusLabel: string;
  lastUpdated: string;
}

/** Published services, optionally filtered by free-text `q`. Public — no session required. */
export async function getServices(q?: string): Promise<CatalogService[]> {
  const query = q && q.trim().length > 0 ? `?q=${encodeURIComponent(q.trim())}` : '';
  const res = await fetch(`${BFF_ORIGIN}/v1/services${query}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET /v1/services failed: ${res.status}`);
  }
  return ((await res.json()) as { items: CatalogService[] }).items;
}

/**
 * The signed-in citizen's applications. Returns `[]` for an anonymous visitor (401) so callers can
 * render the section unconditionally without a separate auth check.
 */
export async function getMyApplications(): Promise<MyApplication[]> {
  const res = await fetch(`${BFF_ORIGIN}/v1/me/applications`, { credentials: 'include' });
  if (res.status === 401) {
    return [];
  }
  if (!res.ok) {
    throw new Error(`GET /v1/me/applications failed: ${res.status}`);
  }
  return ((await res.json()) as { items: MyApplication[] }).items;
}

/** A single published service + its current published version. Throws on 404/any non-OK. */
export async function getService(id: string): Promise<CatalogServiceDetail> {
  const res = await fetch(`${BFF_ORIGIN}/v1/services/${id}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET /v1/services/${id} failed: ${res.status}`);
  }
  return (await res.json()) as CatalogServiceDetail;
}

/** A specific service version (published or archived). Throws on 404/any non-OK. */
export async function getServiceVersion(
  serviceId: string,
  versionId: string,
): Promise<CatalogServiceVersion> {
  const res = await fetch(`${BFF_ORIGIN}/v1/services/${serviceId}/versions/${versionId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`GET /v1/services/${serviceId}/versions/${versionId} failed: ${res.status}`);
  }
  return (await res.json()) as CatalogServiceVersion;
}

/** Query for the published services list (keyed by the search term). */
export function servicesQueryOptions(q?: string) {
  return queryOptions({
    queryKey: ['services', q ?? ''] as const,
    queryFn: () => getServices(q),
    staleTime: 60 * 1000,
  });
}

/** Query for the signed-in citizen's applications. */
export function myApplicationsQueryOptions() {
  return queryOptions({
    queryKey: ['me', 'applications'] as const,
    queryFn: getMyApplications,
    staleTime: 60 * 1000,
  });
}

/** Query for a single service's detail. */
export function serviceQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['services', 'detail', id] as const,
    queryFn: () => getService(id),
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Query for a specific service version (published or archived). */
export function serviceVersionQueryOptions(serviceId: string, versionId: string) {
  return queryOptions({
    queryKey: ['services', serviceId, 'versions', versionId] as const,
    queryFn: () => getServiceVersion(serviceId, versionId),
    staleTime: 60 * 1000,
    retry: false,
  });
}
