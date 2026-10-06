import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth, renderApp } from '../../support/render-app';
import { Route as teamLayoutRoute } from '@/routes/app.$slug.team';
import { adminWorkspace } from '../../support/fixtures';
import { addMembers } from '../../support/testHelpers';

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

function withEmptyMembers(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return jsonResponse({
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

const mockMembersList = addMembers([
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
]);

function withMembers(base: ReturnType<typeof mockAuth>, membersList: any[] = mockMembersList) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return jsonResponse({
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
  it('renders the child route inside the Outlet for app slug team layout route', async () => {
    withEmptyMembers(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
    renderApp('/app/riverton/team/');

    // Verify child team index page content renders through the Outlet (Team sub-nav tab).
    expect(
      await screen.findByRole('link', { name: 'Team' }, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('renders team list table correctly with all roles, statuses, and fallback labels', async () => {
    withMembers(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
    renderApp('/app/riverton/team/');

    expect(await screen.findByText('Maya Reyes', {}, { timeout: 32000 })).toBeInTheDocument();
    expect(screen.getByText('maya@riverton.gov')).toBeInTheDocument();
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
    withMembers(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
    const { router } = renderApp('/app/riverton/team/');

    const rowElement = await screen.findByText('Bob Smith', {}, { timeout: 32000 });
    await user.click(rowElement);

    expect(router.state.location.pathname).toBe('/app/riverton/team/m2');
  });

  it('opens AddMemberModal when clicking Add member as admin', async () => {
    const user = userEvent.setup();
    withMembers(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
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
