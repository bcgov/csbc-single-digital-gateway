import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/lib/workspaces';
import { authedUser, renderApp } from '../../../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const mockWorkspaceAdmin = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  ownerId: 'u1', // Maya Reyes (authedUser is u1)
  createdAt: ISO,
};

const mockWorkspaceMember = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'member' as const,
  ownerId: 'u2', // Sam Lee
  createdAt: ISO,
};

const membersList = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Maya Reyes',
    email: 'maya@riverton.gov',
    isOwner: true,
    joinedAt: ISO,
  },
  {
    id: 'm2',
    userId: 'u2',
    role: 'member' as const,
    status: 'active' as const,
    displayName: 'Sam Lee',
    email: 'sam@riverton.gov',
    isOwner: false,
    joinedAt: ISO,
  },
  {
    id: 'm3',
    userId: 'u3',
    role: 'member' as const,
    status: 'suspended' as const,
    displayName: 'Dana Kim',
    email: 'dana@riverton.gov',
    isOwner: false,
    joinedAt: ISO,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockTeamMemberApi(
  workspace: Workspace = mockWorkspaceAdmin,
  members = membersList,
  currentUser = authedUser,
) {
  const clonedWorkspace: Workspace = JSON.parse(JSON.stringify(workspace));
  const clonedMembers: typeof members = JSON.parse(JSON.stringify(members));

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/auth/me')) {
      return json(currentUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(clonedWorkspace);
    }
    if (url.includes('/v1/workspaces/w1/members')) {
      const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
      if (segs.length === 0) {
        return json({ items: clonedMembers });
      }
      const memberId = decodeURIComponent(segs[0]!);
      const memberIdx = clonedMembers.findIndex((m) => m.id === memberId);
      if (memberIdx === -1) {
        return new Response(null, { status: 404 });
      }
      const targetMember = clonedMembers[memberIdx]!;
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as {
          role: 'admin' | 'member';
          status: 'active' | 'suspended';
        };
        const updated = { ...targetMember, ...body } as any;
        clonedMembers[memberIdx] = updated;
        return json(updated);
      }
      return json(targetMember);
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [clonedWorkspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/v1/workspaces/w1/transfer-ownership') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { userId?: string; newOwnerId?: string };
      const newOwnerId = body.userId ?? body.newOwnerId;
      if (newOwnerId) {
        clonedWorkspace.ownerId = newOwnerId;
        const prevOwner = clonedMembers.find((m) => m.isOwner);
        if (prevOwner) prevOwner.isOwner = false;
        const newOwner = clonedMembers.find((m) => m.userId === newOwnerId);
        if (newOwner) newOwner.isOwner = true;
      }
      return json(clonedWorkspace);
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

const workspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  ownerId: 'u1', // the viewer (authedUser.id) owns this workspace
  createdAt: ISO,
};
const members = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Maya Reyes',
    email: 'maya@riverton.gov',
    isOwner: true,
    joinedAt: ISO,
  },
  {
    id: 'm2',
    userId: 'u2',
    role: 'member' as const,
    status: 'active' as const,
    displayName: 'Sam Lee',
    email: 'sam@riverton.gov',
    isOwner: false,
    joinedAt: ISO,
  },
];

function mockTeamFetch(options: { user?: typeof authedUser; role?: 'admin' | 'member' } = {}) {
  const user = options.user ?? authedUser;
  const ws = { ...workspace, role: options.role ?? 'admin' };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) return json(user);
    if (url.includes('/auth/logout')) return new Response(null, { status: 200 });
    if (url.includes('/transfer-ownership')) return json({ ...ws, ownerId: 'u2' });
    if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
    if (/\/v1\/workspaces\/[^/]+\/members/.test(url)) return json({ items: members });
    if (url.includes('/v1/workspaces')) {
      return json({ items: [ws], total: 1, limit: 100, offset: 0 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('MemberProfilePage Component Test Suite', () => {
  describe('MemberProfilePage main components', () => {
    it('renders loading spinner while loading member data', async () => {
      const fetchMock = vi.fn(
        async (input: RequestInfo | URL) =>
          new Promise<any>((resolve) => {
            const url = String(input);
            if (url.includes('/auth/me')) resolve(json(authedUser));
            if (url.includes('/v1/workspaces/by-slug/riverton')) resolve(json(mockWorkspaceAdmin));
            // Do not resolve members
          }),
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const { container } = renderApp('/app/riverton/team/m2');

      // Check for spinner class or SVG
      await waitFor(
        () => {
          expect(container.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
        },
        { timeout: 32000 },
      );
    });

    it('renders member not found message when member is not present in workspace', async () => {
      mockTeamMemberApi();
      renderApp('/app/riverton/team/m-unknown');

      expect(
        await screen.findByText('This member is no longer in the workspace.', undefined, {
          timeout: 16000,
        }),
      ).toBeInTheDocument();
    });

    it('renders profile details and allows role/status updates when viewed by admin', async () => {
      const fetchMock = mockTeamMemberApi();
      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2'); // Viewing Sam Lee (member, active)

      // 1. Basic details
      expect(await screen.findByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
      expect(screen.getByText('sam@riverton.gov')).toBeInTheDocument();
      expect(screen.getByText(`Joined ${new Date(ISO).toLocaleDateString()}`)).toBeInTheDocument();

      // 2. Role toggle (Admin/Member options exist)
      const adminRoleBtn = screen.getByRole('button', { name: 'Admin' });
      const memberRoleBtn = screen.getByRole('button', { name: 'Member' });
      expect(adminRoleBtn).toBeInTheDocument();
      expect(memberRoleBtn).toBeInTheDocument();
      expect(memberRoleBtn).toHaveClass('bg-primary'); // Default selected role is Member

      // 3. Status toggle (Active/Suspended options exist)
      const activeStatusBtn = screen.getByRole('button', { name: 'Active' });
      const suspendedStatusBtn = screen.getByRole('button', { name: 'Suspended' });
      expect(activeStatusBtn).toBeInTheDocument();
      expect(suspendedStatusBtn).toBeInTheDocument();
      expect(activeStatusBtn).toHaveClass('bg-primary'); // Default selected status is Active

      // 4. Save button should be disabled since no edits have been made
      const saveBtn = screen.getByRole('button', { name: 'Save changes' });
      expect(saveBtn).toBeDisabled();

      // Make edits (promote to Admin and suspend account)
      await user.click(adminRoleBtn);
      await user.click(suspendedStatusBtn);
      expect(saveBtn).not.toBeDisabled();

      // Submit save
      await user.click(saveBtn);

      await waitFor(() => {
        const patchCall = fetchMock.mock.calls.find(
          ([input, init]) =>
            String(input).includes('/v1/workspaces/w1/members/m2') &&
            (init?.method ?? 'GET').toUpperCase() === 'PATCH',
        );
        expect(patchCall).toBeTruthy();
        expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
          role: 'admin',
          status: 'suspended',
        });
      });
    });

    it('renders read-only badge fields when viewed by non-admin member', async () => {
      mockTeamMemberApi(mockWorkspaceMember);
      renderApp('/app/riverton/team/m3'); // Viewing Dana Kim (suspended)

      expect(await screen.findByRole('heading', { name: 'Dana Kim' })).toBeInTheDocument();

      // Verification of read-only badge styles
      const badges = screen.getAllByRole('generic');
      const badgeText = badges.map((b) => b.textContent);
      expect(badgeText).toContain('Member');
      expect(badgeText).toContain('Suspended');

      // Toggles/Forms should not be interactive buttons
      expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Active' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    });

    it('allows owner to transfer workspace ownership to active member', async () => {
      const fetchMock = mockTeamMemberApi(); // Maya Reyes (owner u1) viewing Sam Lee (m2)
      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2');

      // Ownership section block
      expect(
        await screen.findByText('Ownership', undefined, { timeout: 32000 }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Transferring makes Sam Lee the workspace owner and an admin. You'll stay an admin.",
        ),
      ).toBeInTheDocument();

      const makeOwnerBtn = screen.getByRole('button', { name: 'Make owner' });
      expect(makeOwnerBtn).toBeInTheDocument();

      // Click trigger
      await user.click(makeOwnerBtn);

      // Prompt confirm/cancel buttons
      const confirmBtn = screen.getByRole('button', { name: 'Confirm transfer' });
      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      expect(confirmBtn).toBeInTheDocument();
      expect(cancelBtn).toBeInTheDocument();

      // Click confirm transfer
      await user.click(confirmBtn);

      await waitFor(() => {
        const transferCall = fetchMock.mock.calls.find(
          ([input, init]) =>
            String(input).includes('/v1/workspaces/w1/transfer-ownership') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        );
        expect(transferCall).toBeTruthy();
        expect(JSON.parse(String(transferCall?.[1]?.body))).toEqual({
          userId: 'u2',
        });
      });
    });

    it('prevents mutable operations on current workspace owner', async () => {
      mockTeamMemberApi(); // Maya Reyes (owner u1) viewing Maya Reyes (m1)
      renderApp('/app/riverton/team/m1');

      expect(await screen.findByRole('heading', { name: 'Maya Reyes' })).toBeInTheDocument();
      expect(screen.getByText('Owner')).toBeInTheDocument(); // yellow Owner badge

      // Options toggles are disabled
      const adminBtn = screen.getByRole('button', { name: 'Admin' });
      const activeBtn = screen.getByRole('button', { name: 'Active' });
      expect(adminBtn).toBeDisabled();
      expect(activeBtn).toBeDisabled();

      // Read warning notice
      expect(
        screen.getByText(
          "This member owns the workspace — their role and status can't be changed. The owner can transfer ownership to another member.",
        ),
      ).toBeInTheDocument();
    });

    it('renders "No email on file" when email is not present on member profile', async () => {
      const noEmailMembers = [
        {
          id: 'm2',
          userId: 'u2',
          role: 'member' as const,
          status: 'active' as const,
          displayName: 'Sam Lee',
          email: null as any,
          isOwner: false,
          joinedAt: ISO,
        },
      ];
      mockTeamMemberApi(mockWorkspaceAdmin, noEmailMembers);
      renderApp('/app/riverton/team/m2');

      expect(await screen.findByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
      expect(screen.getByText('No email on file')).toBeInTheDocument();
    });

    it('shows error message if saving changes fails', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/me')) return json(authedUser);
        if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspaceAdmin);
        if (url.includes('/v1/workspaces/w1/members')) {
          const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
          if (segs.length === 0) return json({ items: membersList });
          if ((_init?.method ?? 'GET').toUpperCase() === 'PATCH') {
            return json({ message: 'Update failed' }, 500);
          }
          return json(membersList.find((m) => m.id === segs[0]));
        }
        return new Response(null, { status: 404 });
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2');

      const adminRoleBtn = await screen.findByRole('button', { name: 'Admin' });
      await user.click(adminRoleBtn);

      const saveBtn = screen.getByRole('button', { name: 'Save changes' });
      await user.click(saveBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'PATCH /v1/workspaces/:id/members/:memberId failed: 500',
      );
    });

    it('shows error message if transferring ownership fails', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/me')) return json(authedUser);
        if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspaceAdmin);
        if (url.includes('/v1/workspaces/w1/members')) {
          const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
          if (segs.length === 0) return json({ items: membersList });
          return json(membersList.find((m) => m.id === segs[0]));
        }
        if (url.includes('/v1/workspaces/w1/transfer-ownership')) {
          return json({ message: 'Transfer failed' }, 500);
        }
        return new Response(null, { status: 404 });
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2');

      const makeOwnerBtn = await screen.findByRole('button', { name: 'Make owner' });
      await user.click(makeOwnerBtn);

      const confirmBtn = screen.getByRole('button', { name: 'Confirm transfer' });
      await user.click(confirmBtn);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'POST /v1/workspaces/:id/transfer-ownership failed: 500',
      );
    });

    it('renders "This is your own membership." when an admin views their own membership', async () => {
      const adminUser = {
        id: 'u2',
        roles: ['admin'],
        claims: {
          sub: 'u2',
          name: 'Sam Lee',
          email: 'sam@riverton.gov',
          preferred_username: 'sam',
        },
      };
      const adminMembers = [
        {
          id: 'm1',
          userId: 'u1',
          role: 'admin' as const,
          status: 'active' as const,
          displayName: 'Maya Reyes',
          email: 'maya@riverton.gov',
          isOwner: true,
          joinedAt: ISO,
        },
        {
          id: 'm2',
          userId: 'u2',
          role: 'admin' as const,
          status: 'active' as const,
          displayName: 'Sam Lee',
          email: 'sam@riverton.gov',
          isOwner: false,
          joinedAt: ISO,
        },
      ];
      mockTeamMemberApi(mockWorkspaceAdmin, adminMembers, adminUser);
      renderApp('/app/riverton/team/m2');

      expect(await screen.findByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
      expect(screen.getByText('This is your own membership.')).toBeInTheDocument();
    });

    it('renders "Admin" and "Active" detail badges for non-admin viewers', async () => {
      const adminMembers = [
        {
          id: 'm1',
          userId: 'u1',
          role: 'admin' as const,
          status: 'active' as const,
          displayName: 'Maya Reyes',
          email: 'maya@riverton.gov',
          isOwner: true,
          joinedAt: ISO,
        },
      ];
      mockTeamMemberApi(mockWorkspaceMember, adminMembers);
      renderApp('/app/riverton/team/m1');

      expect(await screen.findByRole('heading', { name: 'Maya Reyes' })).toBeInTheDocument();

      const badges = screen.getAllByRole('generic');
      const badgeText = badges.map((b) => b.textContent);
      expect(badgeText).toContain('Admin');
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('allows owner to cancel workspace ownership transfer dialog', async () => {
      mockTeamMemberApi();
      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2');

      const makeOwnerBtn = await screen.findByRole('button', { name: 'Make owner' });
      await user.click(makeOwnerBtn);

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelBtn).toBeInTheDocument();

      await user.click(cancelBtn);

      // After clicking cancel, "Make owner" button should be back, and "Confirm transfer" should be gone
      expect(screen.queryByRole('button', { name: 'Confirm transfer' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Make owner' })).toBeInTheDocument();
    });

    it('handles workspace with missing or null ID', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me')) {
          return json(authedUser);
        }
        if (url.includes('/v1/workspaces/by-slug/riverton')) {
          // Return workspace without ID
          return json({ slug: 'riverton', name: 'Riverton', role: 'admin' });
        }
        if (url.includes('/v1/workspaces/w1/members')) {
          return json({ items: [] });
        }
        return new Response(null, { status: 404 });
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const { container } = renderApp('/app/riverton/team/m2');

      // Should render the spinner since member cannot be loaded without workspace ID
      await waitFor(() => {
        expect(container.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
      });
    });

    it('renders spinner on Save changes button when save is pending', async () => {
      const user = userEvent.setup();
      let resolveSavePromise!: (val: any) => void;
      const savePromise = new Promise((resolve) => {
        resolveSavePromise = resolve;
      });

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? 'GET').toUpperCase();
        if (url.includes('/auth/me')) return json(authedUser);
        if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspaceAdmin);
        if (url.includes('/v1/workspaces/w1/members/m2') && method === 'PATCH') {
          return savePromise;
        }
        if (url.includes('/v1/workspaces/w1/members')) {
          return json({ items: membersList });
        }
        if (url.includes('/v1/workspaces')) {
          return json({ items: [mockWorkspaceAdmin], total: 1, limit: 100, offset: 0 });
        }
        return new Response(null, { status: 404 });
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      renderApp('/app/riverton/team/m2');

      // Click Admin button to change role (m2 starts as 'member')
      const adminBtn = await screen.findByRole('button', { name: 'Admin' });
      await user.click(adminBtn);

      const saveBtn = screen.getByRole('button', { name: 'Save changes' });
      await user.click(saveBtn);

      // Save should now be pending, showing a spinner
      await waitFor(() => {
        expect(saveBtn.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveSavePromise(json({ ...membersList[1], role: 'admin' }));

      await waitFor(() => {
        expect(saveBtn.querySelector('[data-slot="spinner"]')).not.toBeInTheDocument();
      });
    });

    it('renders spinner on Confirm transfer button when ownership transfer is pending', async () => {
      const user = userEvent.setup();
      let resolveTransferPromise!: (val: any) => void;
      const transferPromise = new Promise((resolve) => {
        resolveTransferPromise = resolve;
      });

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? 'GET').toUpperCase();
        if (url.includes('/auth/me')) return json(authedUser);
        if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspaceAdmin);
        if (url.includes('/v1/workspaces/w1/transfer-ownership') && method === 'POST') {
          return transferPromise;
        }
        if (url.includes('/v1/workspaces/w1/members')) {
          return json({ items: membersList });
        }
        if (url.includes('/v1/workspaces')) {
          return json({ items: [mockWorkspaceAdmin], total: 1, limit: 100, offset: 0 });
        }
        return new Response(null, { status: 404 });
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      renderApp('/app/riverton/team/m2');

      const makeOwnerBtn = await screen.findByRole('button', { name: 'Make owner' });
      await user.click(makeOwnerBtn);

      const confirmBtn = screen.getByRole('button', { name: 'Confirm transfer' });
      await user.click(confirmBtn);

      // Transfer should be pending, showing a spinner
      await waitFor(() => {
        expect(confirmBtn.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
      });

      // Resolve transfer
      resolveTransferPromise(json({ ...mockWorkspaceAdmin, ownerId: 'u2' }));

      await waitFor(() => {
        expect(confirmBtn.querySelector('[data-slot="spinner"]')).not.toBeInTheDocument();
      });
    });
  });

  describe('member profile — workspace owner', () => {
    it('locks the role/status controls and explains it on the owner profile', async () => {
      mockTeamFetch();
      renderApp('/app/riverton/team/m1');

      // First mount compiles the code-split team route — allow extra time (3rd arg waitForOptions).
      expect(
        await screen.findByRole('heading', { name: 'Maya Reyes' }, { timeout: 32000 }),
      ).toBeInTheDocument();
      // The owner badge and the immutability note are shown.
      expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
      expect(screen.getByText(/role and status can't be changed/i)).toBeInTheDocument();
      // Both role toggles and both status toggles are disabled.
      for (const name of ['Admin', 'Member', 'Active', 'Suspended']) {
        expect(screen.getByRole('button', { name })).toBeDisabled();
      }
      // No transfer affordance on the owner's own profile.
      expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
    });

    it('lets the owner transfer ownership to another active member', async () => {
      const fetchMock = mockTeamFetch();
      const user = userEvent.setup();
      renderApp('/app/riverton/team/m2');

      expect(await screen.findByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
      // Sam is editable (not the owner) and the owner can transfer to them.
      expect(screen.getByRole('button', { name: 'Admin' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Make owner' }));
      await user.click(screen.getByRole('button', { name: 'Confirm transfer' }));

      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(
            ([input, init]) =>
              String(input).includes('/v1/workspaces/w1/transfer-ownership') &&
              (init?.method ?? 'GET').toUpperCase() === 'POST',
          ),
        ).toBe(true);
      });
      // The POST body carries the target user id.
      const transferCall = fetchMock.mock.calls.find(([input]) =>
        String(input).includes('/transfer-ownership'),
      );
      expect(JSON.parse(String(transferCall?.[1]?.body))).toEqual({ userId: 'u2' });
    });

    it('shows a regular member another member’s role/status read-only (no form)', async () => {
      const viewer = { ...authedUser, id: 'u3' }; // a plain member, not an admin or the owner
      mockTeamFetch({ user: viewer, role: 'member' });
      renderApp('/app/riverton/team/m2');

      expect(
        await screen.findByRole('heading', { name: 'Sam Lee' }, { timeout: 32000 }),
      ).toBeInTheDocument();
      // Role/status are visible as read-only badges, not interactive toggle buttons.
      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Suspended' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
    });
  });
});
