/**
 * Workspaces data (feature 32) — reads the platform-api `/v1/workspaces` endpoints via the BFF origin
 * with the session cookie. The console is workspace-scoped; the `/app` gate uses the newest workspace
 * to choose a redirect target.
 */
import { queryOptions, useQuery } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { Paginated, SortOrder } from '@/lib/list-search';

export type WorkspaceRole = 'admin' | 'member';

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  role: WorkspaceRole;
  /** User id of the workspace owner (creator, or whoever it was transferred to). */
  ownerId: string;
  createdAt: string;
}

interface WorkspaceListEnvelope {
  items: Workspace[];
  total: number;
  limit: number;
  offset: number;
}

async function fetchWorkspaces(search: string): Promise<WorkspaceListEnvelope> {
  const res = await fetch(`${BFF_ORIGIN}/v1/workspaces${search}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET /v1/workspaces failed: ${res.status}`);
  }
  return (await res.json()) as WorkspaceListEnvelope;
}

/** The caller's workspaces, name-ascending (the switcher + membership guard read this). */
export function workspacesQueryOptions() {
  return queryOptions({
    queryKey: ['workspaces', 'list'] as const,
    queryFn: () => fetchWorkspaces('?sort=name&order=asc&limit=100'),
    staleTime: 60 * 1000,
  });
}

/** The most recently created workspace, or `null` — the `/app` gate's redirect target. */
export function newestWorkspaceQueryOptions() {
  return queryOptions({
    queryKey: ['workspaces', 'newest'] as const,
    queryFn: async (): Promise<Workspace | null> => {
      const envelope = await fetchWorkspaces('?sort=createdAt&order=desc&limit=1');
      return envelope.items[0] ?? null;
    },
    staleTime: 60 * 1000,
  });
}

export function useWorkspaces() {
  // The query caches the full envelope (the membership guard reads it via ensureQueryData); components
  // want just the array.
  return useQuery({ ...workspacesQueryOptions(), select: (envelope) => envelope.items });
}

/** Load one workspace by slug; `null` on 404 (not a member / doesn't exist) so the route can show
 * a not-found state. */
export function workspaceBySlugQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ['workspaces', 'by-slug', slug] as const,
    queryFn: async (): Promise<Workspace | null> => {
      const res = await fetch(`${BFF_ORIGIN}/v1/workspaces/by-slug/${encodeURIComponent(slug)}`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`GET /v1/workspaces/by-slug failed: ${res.status}`);
      }
      return (await res.json()) as Workspace;
    },
    staleTime: 60 * 1000,
  });
}

/** A member of a workspace — the membership joined to the user's profile. */
export interface WorkspaceMember {
  id: string;
  userId: string;
  role: 'admin' | 'member';
  status: 'active' | 'suspended';
  displayName: string;
  email: string | null;
  /** The workspace owner — their role/status cannot be changed (enforced server-side). */
  isOwner: boolean;
  joinedAt: string;
}

/** List a workspace's members (admins first, then by name). Full (unpaginated) set — feeds the
 * member-detail lookup, which resolves one member out of the whole list. */
export function workspaceMembersQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: ['workspaces', 'members', workspaceId] as const,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const res = await fetch(
        `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        throw new Error(`GET /v1/workspaces/:id/members failed: ${res.status}`);
      }
      const envelope = (await res.json()) as { items: WorkspaceMember[] };
      return envelope.items;
    },
    staleTime: 30 * 1000,
  });
}

export type MemberSort = 'name' | 'role' | 'joined';
export interface MemberListParams {
  q: string;
  sort: MemberSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

/** Paginated, sortable, searchable members browse (initiative `staff-list-query`) — the Team page. */
export function workspaceMembersPageQueryOptions(workspaceId: string, params: MemberListParams) {
  return queryOptions({
    queryKey: ['workspaces', 'members', 'page', workspaceId, params] as const,
    queryFn: async (): Promise<Paginated<WorkspaceMember>> => {
      const search = new URLSearchParams({
        sort: params.sort,
        order: params.order,
        limit: String(params.limit),
        offset: String(params.offset),
      });
      if (params.q !== '') search.set('q', params.q);
      const res = await fetch(
        `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/members/page?${search}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        throw new Error(`GET /v1/workspaces/:id/members/page failed: ${res.status}`);
      }
      return (await res.json()) as Paginated<WorkspaceMember>;
    },
    staleTime: 30 * 1000,
  });
}

/** A staff user eligible to be added to a workspace (addable-staff search result). */
export interface StaffUser {
  id: string;
  displayName: string;
  email: string | null;
}

/** Search staff users who can be added to this workspace (admin only). `q` filters by name/email;
 * empty `q` returns the first page. Previous results are kept while typing to avoid flicker. */
export function workspaceAddableStaffQueryOptions(workspaceId: string, q: string) {
  const search = q.trim();
  return queryOptions({
    queryKey: ['workspaces', 'addable-staff', workspaceId, search] as const,
    queryFn: async (): Promise<StaffUser[]> => {
      const qs = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetch(
        `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/addable-staff${qs}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        throw new Error(`GET /v1/workspaces/:id/addable-staff failed: ${res.status}`);
      }
      const envelope = (await res.json()) as { items: StaffUser[] };
      return envelope.items;
    },
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

/** Add an existing staff user to the workspace with a chosen role (admin only, enforced server-side). */
export async function addWorkspaceMember(
  workspaceId: string,
  body: { userId: string; role: WorkspaceRole },
): Promise<WorkspaceMember> {
  const res = await fetch(
    `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/members`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`POST /v1/workspaces/:id/members failed: ${res.status}`);
  }
  return (await res.json()) as WorkspaceMember;
}

/** Change a member's role and/or status (admin only, enforced server-side). */
export async function updateWorkspaceMember(
  workspaceId: string,
  memberId: string,
  patch: { role?: WorkspaceMember['role']; status?: WorkspaceMember['status'] },
): Promise<void> {
  const res = await fetch(
    `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) {
    throw new Error(`PATCH /v1/workspaces/:id/members/:memberId failed: ${res.status}`);
  }
}

/** Transfer ownership to another active member (owner only, enforced server-side). The new owner is
 * promoted to active admin; the previous owner keeps their admin membership. */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  userId: string,
): Promise<Workspace> {
  const res = await fetch(
    `${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(workspaceId)}/transfer-ownership`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    },
  );
  if (!res.ok) {
    throw new Error(`POST /v1/workspaces/:id/transfer-ownership failed: ${res.status}`);
  }
  return (await res.json()) as Workspace;
}

/** Create a workspace (the caller becomes its admin member, server-side). */
export async function createWorkspace(name: string): Promise<Workspace> {
  const res = await fetch(`${BFF_ORIGIN}/v1/workspaces`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`POST /v1/workspaces failed: ${res.status}`);
  }
  return (await res.json()) as Workspace;
}

/** Rename a workspace by id (admin only, enforced server-side). */
export async function updateWorkspace(id: string, name: string): Promise<Workspace> {
  const res = await fetch(`${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`PATCH /v1/workspaces failed: ${res.status}`);
  }
  return (await res.json()) as Workspace;
}

/** Delete a workspace by id (admin only, enforced server-side). */
export async function deleteWorkspace(id: string): Promise<void> {
  const res = await fetch(`${BFF_ORIGIN}/v1/workspaces/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`DELETE /v1/workspaces failed: ${res.status}`);
  }
}
