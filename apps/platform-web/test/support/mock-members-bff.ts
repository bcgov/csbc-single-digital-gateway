import { vi } from 'vitest';
import { jsonResponse } from './render-app';
import { adminUser, adminWorkspace, ISO } from './fixtures';
import type { MockAuthOptions } from './render-app';
import { mockAuthUser } from './mock-auth-user';

interface MockMembersListOptions extends MockAuthOptions {
  testFile?: string;
  user?: unknown | null;
  staff?: any[];
  role?: 'admin' | 'member';
  failedApi?: boolean;
  savePromise?: Promise<unknown>;
  transferPromise?: Promise<unknown>;
  resolveStaff?: ((resolve: (r: Response) => void) => void) | null;
  resolveAdd?: ((resolve: (r: Response) => void) => void) | null;
}

/**
 * Mock members BFF for testing.
 * @param members List of members to return.
 * @param options Options for the mock.
 * @returns The fetch mock.
 */
export function mockMembersBff(members: { items: any[] }, options: MockMembersListOptions = {}) {
  const clonedMembers: { items: any[] } = JSON.parse(JSON.stringify(members));
  const mergedOptions: MockMembersListOptions = {
    user: adminUser,
    workspaces: [JSON.parse(JSON.stringify(adminWorkspace))],
    ...options,
  };
  if (options?.workspaces) {
    mergedOptions.workspaces = JSON.parse(JSON.stringify(options.workspaces));
  }
  if (options?.role && mergedOptions.workspaces?.[0]) {
    mergedOptions.workspaces[0].role = options.role;
  }
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.split('?')[0] ?? '';

    if (mergedOptions.testFile === 'add-member-modal.test') {
      if (url.includes('/addable-staff')) {
        if (typeof mergedOptions.resolveStaff === 'function') {
          return new Promise<Response>((resolve) => {
            mergedOptions.resolveStaff!(resolve);
          });
        }
        const q = (new URL(url, 'http://x').searchParams.get('q') ?? '').toLowerCase();
        const staffList = mergedOptions.staff ?? [];
        const items = q
          ? staffList.filter(
              (u) => u.displayName.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
            )
          : staffList;
        return jsonResponse({ items });
      }
      if (url.includes('/members/page')) {
        return jsonResponse({
          items: clonedMembers.items,
          total: clonedMembers.items.length,
          limit: 20,
          offset: 0,
        });
      }
      if (path.endsWith('/members')) {
        if (method === 'POST') {
          if (typeof mergedOptions.resolveAdd === 'function') {
            return new Promise<Response>((resolve) => {
              mergedOptions.resolveAdd!(resolve);
            });
          }
          if (mergedOptions.failedApi) {
            return jsonResponse({ message: 'User is already a member of this workspace.' }, 400);
          }
          const body = JSON.parse(String(init?.body)) as {
            userId: string;
            role: 'admin' | 'member';
          };
          const picked = (mergedOptions.staff ?? []).find((u) => u.id === body.userId);
          return jsonResponse(
            {
              id: 'm2',
              userId: picked?.id ?? body.userId,
              role: body.role,
              status: 'active',
              displayName: picked?.displayName ?? 'New Member',
              email: picked?.email ?? null,
              isOwner: false,
              joinedAt: ISO,
            },
            201,
          );
        }
        if (method === 'GET') {
          return jsonResponse(clonedMembers);
        }
      }
    }

    if (mergedOptions.testFile === 'team-member.test') {
      if (url.includes('/v1/workspaces/w1/members')) {
        const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
        if (segs.length === 0) {
          return jsonResponse(clonedMembers);
        }
        const memberId = decodeURIComponent(segs[0]!);
        const memberIdx = clonedMembers.items.findIndex((m) => m.id === memberId);
        if (memberIdx === -1) {
          return new Response(null, { status: 404 });
        }
        const targetMember = clonedMembers.items[memberIdx]!;
        if (method === 'PATCH') {
          if (options?.failedApi) {
            return jsonResponse({ message: 'Update failed' }, 500);
          }
          if (mergedOptions.savePromise) {
            return mergedOptions.savePromise;
          }
          const body = JSON.parse(String(init?.body)) as {
            role: 'admin' | 'member';
            status: 'active' | 'suspended';
          };
          const updated = { ...targetMember, ...body } as any;
          clonedMembers.items[memberIdx] = updated;
          return jsonResponse(updated);
        }
        return jsonResponse(targetMember);
      }
      if (url.includes('/v1/workspaces/w1/transfer-ownership') && method === 'POST') {
        if (options?.failedApi) {
          return jsonResponse({ message: 'Transfer failed' }, 500);
        }
        if (mergedOptions.transferPromise) {
          return mergedOptions.transferPromise;
        }
        const body = JSON.parse(String(init?.body)) as { userId?: string; newOwnerId?: string };
        const newOwnerId = body.userId ?? body.newOwnerId;
        if (newOwnerId) {
          mergedOptions.workspaces![0]!.ownerId = newOwnerId;
          const prevOwner = clonedMembers.items.find((m) => m.isOwner);
          if (prevOwner) prevOwner.isOwner = false;
          const newOwner = clonedMembers.items.find((m) => m.userId === newOwnerId);
          if (newOwner) newOwner.isOwner = true;
        }
        return jsonResponse(mergedOptions.workspaces![0]!);
      }
    }

    if (mergedOptions.testFile === 'team.test') {
      if (url.includes('/members/page')) {
        return jsonResponse({
          items: clonedMembers.items,
          total: clonedMembers.items.length,
          limit: 20,
          offset: 0,
        });
      }
      if (path.endsWith('/members') && method === 'GET') {
        return jsonResponse(clonedMembers);
      }
    }

    if (mergedOptions.testFile === 'app.slug.team.index.test') {
      if (url.includes('/members/page')) {
        return jsonResponse({
          items: clonedMembers.items,
          total: clonedMembers.items.length,
          limit: 20,
          offset: 0,
        });
      }
      if (path.endsWith('/members') && method === 'GET') {
        return jsonResponse(clonedMembers);
      }
    }

    if (mergedOptions.testFile === 'app.slug.team.memberId.test') {
      if (url.includes('/v1/workspaces/w1/members')) {
        const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
        if (segs.length === 0) {
          return jsonResponse(clonedMembers);
        }
        const memberId = decodeURIComponent(segs[0]!);
        const targetMember =
          clonedMembers.items.find((m) => m.id === memberId) ?? clonedMembers.items[0];
        return jsonResponse(targetMember);
      }
    }

    if (mergedOptions.testFile === 'team-list.e2e.test') {
      if (url.includes('/members/page')) {
        return jsonResponse({
          items: clonedMembers.items,
          total: clonedMembers.items.length,
          limit: 20,
          offset: 0,
        });
      }
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
