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
