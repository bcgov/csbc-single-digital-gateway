import { screen, within, act, waitFor } from '@testing-library/react';
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
  ownerId: 'u1',
  createdAt: ISO,
};

const mockWorkspaceMember = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'member' as const,
  ownerId: 'u2',
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

function mockTeamApi(workspace: Workspace = mockWorkspaceAdmin, members = membersList) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      return json(authedUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(workspace);
    }
    if (url.includes('/members')) {
      return json({ items: members });
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [workspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/addable-staff')) {
      return json({ items: [] });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('TeamPage Component Test Suite', () => {
  it('renders list of members and action buttons when viewed by admin', async () => {
    mockTeamApi();
    renderApp('/app/riverton/team');

    // Toolbar header
    expect(
      await screen.findByText(/People with access to this workspace/, undefined, {
        timeout: 32000,
      }),
    ).toBeInTheDocument();

    // Admin action button
    const addMemberBtn = await screen.findByRole('button', { name: 'Add member' });
    expect(addMemberBtn).toBeInTheDocument();

    // Table content verification
    const main = screen.getByRole('main');

    const mayaRow = within(main).getByText('Maya Reyes').closest('tr')!;
    expect(within(mayaRow).getByText('maya@riverton.gov')).toBeInTheDocument();
    expect(within(mayaRow).getByText('Admin')).toBeInTheDocument();
    expect(within(mayaRow).getByText('Owner')).toBeInTheDocument();
    expect(within(mayaRow).getByText('Active')).toBeInTheDocument();

    const samRow = within(main).getByText('Sam Lee').closest('tr')!;
    expect(within(samRow).getByText('sam@riverton.gov')).toBeInTheDocument();
    expect(within(samRow).getByText('Member')).toBeInTheDocument();
    expect(within(samRow).getByText('Active')).toBeInTheDocument();

    const danaRow = within(main).getByText('Dana Kim').closest('tr')!;
    expect(within(danaRow).getByText('dana@riverton.gov')).toBeInTheDocument();
    expect(within(danaRow).getByText('Member')).toBeInTheDocument();
    expect(within(danaRow).getByText('Suspended')).toBeInTheDocument();
  });

  it('hides Add member action when viewed by non-admin member', async () => {
    mockTeamApi(mockWorkspaceMember);
    renderApp('/app/riverton/team');

    // Wait for the rows to render
    await screen.findByText('Sam Lee');

    // Add member action should not be visible
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('navigates to member profile page when a row is clicked', async () => {
    mockTeamApi();
    const { router } = renderApp('/app/riverton/team');
    const user = userEvent.setup();

    const navigateSpy = vi.spyOn(router, 'navigate');

    const samRow = await screen.findByText('Sam Lee');
    await user.click(samRow);

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/$slug/team/$memberId',
        params: { slug: 'riverton', memberId: 'm2' },
      }),
    );
  });

  it('opens add member modal when clicking Add member button', async () => {
    mockTeamApi();
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addMemberBtn = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addMemberBtn);

    // Dialog trigger loads the lazy component
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Add member')).toBeInTheDocument();
  });

  it('renders "—" when member email is not present', async () => {
    const noEmailMember = [
      {
        id: 'm4',
        userId: 'u4',
        role: 'member' as const,
        status: 'active' as const,
        displayName: 'No Email Guy',
        email: null as any,
        isOwner: false,
        joinedAt: ISO,
      },
    ];
    mockTeamApi(mockWorkspaceAdmin, noEmailMember);
    renderApp('/app/riverton/team');

    expect(await screen.findByText('No Email Guy')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('handles workspace with missing/null id gracefully', async () => {
    const mockWorkspaceNoId = {
      id: null as any,
      slug: 'riverton',
      name: 'Riverton',
      role: 'member' as const,
      ownerId: 'u2',
      createdAt: ISO,
    };
    mockTeamApi(mockWorkspaceNoId);
    renderApp('/app/riverton/team');

    expect(await screen.findByPlaceholderText('Search name or email…')).toBeInTheDocument();
  });

  it('renders no matches empty state when search term returns no results', async () => {
    mockTeamApi(mockWorkspaceAdmin, []);
    renderApp('/app/riverton/team?q=nonexistent');

    expect(await screen.findByText('No members match “nonexistent”.')).toBeInTheDocument();
  });

  it('renders rows with data-pending attribute when query is refetching in the background', async () => {
    mockTeamApi();
    const { queryClient } = renderApp('/app/riverton/team');

    expect(await screen.findByText('Sam Lee')).toBeInTheDocument();

    const row = screen.getByText('Sam Lee').closest('tr')!;
    expect(row).not.toHaveAttribute('data-pending');

    let resolveRefetch: any;
    const refetchPromise = new Promise<any>((resolve) => {
      resolveRefetch = resolve;
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/members')) {
        return refetchPromise;
      }
      return (originalFetch as any)(input);
    }) as any;

    act(() => {
      queryClient.refetchQueries({ queryKey: ['workspaces', 'members', 'page', 'w1'] });
    });

    await waitFor(() => {
      expect(row).toHaveAttribute('data-pending', '');
    });

    resolveRefetch(json({ items: membersList }));
  });
});
