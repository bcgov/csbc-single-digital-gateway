import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../../support/render-app';

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

const mockMembersList = {
  items: [
    {
      id: 'mem-123',
      userId: 'u-123',
      displayName: 'Alice Smith',
      email: 'alice@riverton.gov',
      role: 'member',
      status: 'active',
      isOwner: false,
      joinedAt: '2026-06-05T00:00:00.000Z',
    },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withMembers(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/w1/members')) {
      return json(mockMembersList);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Team Member ID Profile Route', () => {
  it('renders the member profile page correctly', async () => {
    withMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/team/mem-123');

    // Wait for the member profile page content to load
    expect(await screen.findByText('Alice Smith', {}, { timeout: 32000 })).toBeInTheDocument();

    // Verify sub-details
    expect(screen.getByText('alice@riverton.gov')).toBeInTheDocument();
    expect(screen.getByText(/Joined/i)).toBeInTheDocument();

    // Verify form role and status toggle sections exist
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Verify edit buttons are available for Admin
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspended' })).toBeInTheDocument();

    // Save changes button should be rendered
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
