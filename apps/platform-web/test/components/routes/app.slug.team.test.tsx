import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../../support/render-app';
import { Route as teamLayoutRoute } from '@/routes/app.$slug.team';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withEmptyMembers(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return json({
        items: [],
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const mockMembersList = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin',
    status: 'active',
    displayName: 'Alice Cooper',
    email: 'alice@example.com',
    isOwner: true,
    joinedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'm2',
    userId: 'u2',
    role: 'member',
    status: 'suspended',
    displayName: 'Bob Smith',
    email: null,
    isOwner: false,
    joinedAt: '2026-06-02T00:00:00.000Z',
  },
];

function withMembers(base: ReturnType<typeof mockAuth>, membersList: any[] = mockMembersList) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return json({
        items: membersList,
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Team Layout Route', () => {
  it('renders the child route inside the Outlet', async () => {
    withEmptyMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/team/');

    // Verify child team index page content renders through the Outlet
    expect(
      await screen.findByText('People with access to this workspace', {}, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('renders empty state correctly for a member role', async () => {
    const rivertonMember: WorkspaceLike = { ...riverton, role: 'member' };
    withEmptyMembers(mockAuth(authedUser, { workspaces: [rivertonMember] }));
    renderApp('/app/riverton/team/');

    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument();

    expect(
      await screen.findByText('No teammates yet.', {}, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('renders team list table correctly with all roles, statuses, and fallback labels', async () => {
    withMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/team/');

    expect(await screen.findByText('Alice Cooper', {}, { timeout: 32000 })).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getAllByText('Member').length).toBeGreaterThan(0);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('navigates to member profile when clicking a member row', async () => {
    const user = userEvent.setup();
    withMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    const { router } = renderApp('/app/riverton/team/');

    const rowElement = await screen.findByText('Bob Smith', {}, { timeout: 32000 });
    await user.click(rowElement);

    expect(router.state.location.pathname).toBe('/app/riverton/team/m2');
  });

  it('opens AddMemberModal when clicking Add member as admin', async () => {
    const user = userEvent.setup();
    withMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/team/');

    const addMemberBtn = await screen.findByRole(
      'button',
      { name: /add member/i },
      { timeout: 32000 },
    );
    await user.click(addMemberBtn);

    expect(
      await screen.findByText(
        'Search staff by name or email, then choose a role.',
        {},
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
  });

  it('has the correct team layout route definition', () => {
    expect(teamLayoutRoute.options.component).toBeDefined();
  });
});
