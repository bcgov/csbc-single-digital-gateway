import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/lib/workspaces';
import { authedUser, renderApp } from '../../../support/render-app';

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
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/auth/me')) {
      return json(currentUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(workspace);
    }
    if (url.includes('/v1/workspaces/w1/members')) {
      const segs = url.split('/v1/workspaces/w1/members')[1]?.split('/').filter(Boolean) ?? [];
      if (segs.length === 0) {
        return json({ items: members });
      }
      const memberId = decodeURIComponent(segs[0]!);
      const memberIdx = members.findIndex((m) => m.id === memberId);
      if (memberIdx === -1) {
        return new Response(null, { status: 404 });
      }
      const targetMember = members[memberIdx]!;
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as {
          role: 'admin' | 'member';
          status: 'active' | 'suspended';
        };
        const updated = { ...targetMember, ...body } as any;
        members[memberIdx] = updated;
        return json(updated);
      }
      return json(targetMember);
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [workspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/v1/workspaces/w1/transfer-ownership') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { newOwnerId: string };
      workspace.ownerId = body.newOwnerId;
      const prevOwner = members.find((m) => m.isOwner)!;
      prevOwner.isOwner = false;
      const newOwner = members.find((m) => m.userId === body.newOwnerId)!;
      newOwner.isOwner = true;
      return json(workspace);
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('MemberProfilePage', () => {
  it('renders loading spinner while loading member data', () => {
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
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders member not found message when member is not present in workspace', async () => {
    mockTeamMemberApi();
    renderApp('/app/riverton/team/m-unknown');

    expect(
      await screen.findByText('This member is no longer in the workspace.'),
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
    expect(await screen.findByText('Ownership')).toBeInTheDocument();
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
        newOwnerId: 'u2',
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
});
