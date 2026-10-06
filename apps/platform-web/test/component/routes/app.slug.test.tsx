import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth, renderApp } from '../../support/render-app';
import { adminWorkspace } from '../../support/fixtures';

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

function withWorkspace(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return jsonResponse(adminWorkspace);
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
  it('renders the child route inside the Outlet for app slug layout route when workspace is found', async () => {
    withWorkspace(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
    renderApp('/app/riverton/');

    // Verify child overview page content renders through the Outlet
    expect(
      await screen.findByText('Create new service', {}, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('renders the WorkspaceNotFound state when workspace is not found (404)', async () => {
    // mockAuth with empty workspaces, so by-slug/riverton will return 404
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app/riverton/');

    // Verify WorkspaceNotFound title is displayed
    expect(
      await screen.findByText('Workspace not found', {}, { timeout: 32000 }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('It may have been deleted, or you don’t have access to it.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your workspaces' })).toBeInTheDocument();
  });

  it('bubbles the error when the workspace fetch fails with 500', async () => {
    const mockAuthFn = mockAuth(authedUser, { workspaces: [] });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/workspaces/by-slug/riverton')) {
        return new Response('Internal Server Error', { status: 500 });
      }
      return (mockAuthFn as any)(input, init);
    });

    renderApp('/app/riverton/');

    expect(await screen.findByText(/failed: 500/i, {}, { timeout: 32000 })).toBeInTheDocument();
  });
});
