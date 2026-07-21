import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

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

function withWorkspace(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(riverton);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Layout Route', () => {
  it('renders the child route inside the Outlet when workspace is found', async () => {
    withWorkspace(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/');

    // Verify child overview page content renders through the Outlet
    expect(
      await screen.findByText(
        'Overview is being set up — placeholder layout shown until you choose what to track.',
        {},
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();
  });

  it('renders the WorkspaceNotFound state when workspace is not found (404)', async () => {
    // mockAuth with empty workspaces, so by-slug/riverton will return 404
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app/riverton/');

    // Verify WorkspaceNotFound title is displayed
    expect(
      await screen.findByText('Workspace not found', {}, { timeout: 8000 }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('It may have been deleted, or you don’t have access to it.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your workspaces' })).toBeInTheDocument();
  });
});
